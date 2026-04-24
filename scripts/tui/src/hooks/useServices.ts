import { useReducer, useRef, useEffect, useCallback } from "react";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ServiceState, ServiceConfig } from "../types.js";
import { services as serviceConfigs } from "../lib/config.js";
import { detectServiceStatus } from "../lib/detection.js";
import { startService, stopService, type ManagedProcess, MAX_LOG_LINES } from "../lib/process.js";

type Action =
  | {
      type: "SET_STATUS";
      id: string;
      status: ServiceState["status"];
      pid?: number;
      managedByTui?: boolean;
      errorMessage?: string;
      logFile?: string;
    }
  | { type: "APPEND_LOG"; id: string; line: string }
  | { type: "CLEAR_LOGS"; id: string }
  | { type: "INIT"; services: ServiceState[] };

function reducer(state: ServiceState[], action: Action): ServiceState[] {
  switch (action.type) {
    case "INIT":
      return action.services;
    case "SET_STATUS": {
      const current = state.find((s) => s.id === action.id);
      const newStatus = action.status;
      const newPid = action.pid ?? current?.pid;
      const newManaged = action.managedByTui ?? current?.managedByTui;
      if (
        current &&
        current.status === newStatus &&
        current.pid === newPid &&
        current.managedByTui === newManaged &&
        current.errorMessage === action.errorMessage &&
        current.logFile === action.logFile
      ) {
        return state;
      }
      return state.map((s) =>
        s.id === action.id
          ? {
              ...s,
              status: newStatus,
              pid: newPid,
              managedByTui: newManaged ?? s.managedByTui,
              errorMessage: action.errorMessage,
              logFile: action.logFile ?? s.logFile,
            }
          : s,
      );
    }
    case "APPEND_LOG":
      return state.map((s) =>
        s.id === action.id
          ? {
              ...s,
              logs: [...s.logs.slice(-(MAX_LOG_LINES - 1)), action.line],
            }
          : s,
      );
    case "CLEAR_LOGS":
      return state.map((s) => (s.id === action.id ? { ...s, logs: [] } : s));
    default:
      return state;
  }
}

function buildInitialState(rootDir: string): ServiceState[] {
  return serviceConfigs.map((config) => ({
    id: config.id,
    status: "unknown" as const,
    port: config.defaultPort,
    url: config.urlTemplate.replace("{port}", String(config.defaultPort)),
    managedByTui: false,
    logs: [],
    logFile: join(rootDir, "tmp", `${config.id}.log`),
  }));
}

export interface UseServicesReturn {
  services: ServiceState[];
  start: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  restart: (id: string) => Promise<void>;
  startAll: () => Promise<void>;
  stopAll: () => Promise<void>;
}

export function useServices(rootDir: string): UseServicesReturn {
  const [services, dispatch] = useReducer(reducer, []);
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const processesRef = useRef<Map<string, ManagedProcess>>(new Map());
  const stoppingRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initialState = buildInitialState(rootDir);
    dispatch({ type: "INIT", services: initialState });
  }, [rootDir]);

  // Poll for external services every 2 seconds
  useEffect(() => {
    const detectAll = async () => {
      for (const config of serviceConfigs) {
        const managed = processesRef.current.get(config.id);
        if (managed) continue;
        if (stoppingRef.current.has(config.id)) continue;

        const { status, pid } = detectServiceStatus(config, config.defaultPort);
        dispatch({
          type: "SET_STATUS",
          id: config.id,
          status,
          pid: pid ?? undefined,
          managedByTui: false,
        });
      }
    };

    detectAll();
    const interval = setInterval(detectAll, 2000);
    return () => clearInterval(interval);
  }, []);

  const getConfig = useCallback(
    (id: string): ServiceConfig | undefined => serviceConfigs.find((c) => c.id === id),
    [],
  );

  const start = useCallback(
    async (id: string): Promise<void> => {
      const config = getConfig(id);
      if (!config) return;

      const currentService = servicesRef.current.find((s) => s.id === id);
      if (currentService?.status === "running" || currentService?.status === "starting") {
        return;
      }

      dispatch({ type: "SET_STATUS", id, status: "starting" });

      const port = config.defaultPort;
      const onLog = (line: string) => {
        dispatch({ type: "APPEND_LOG", id, line });
      };

      const managed = startService(config, port, rootDir, onLog);
      processesRef.current.set(id, managed);

      dispatch({
        type: "SET_STATUS",
        id,
        status: "running",
        pid: managed.pid,
        managedByTui: true,
        logFile: managed.logFile,
      });

      managed.process.catch(async (err) => {
        if (stoppingRef.current.has(id)) {
          stoppingRef.current.delete(id);
          processesRef.current.delete(id);
          return;
        }

        const logDir = join(rootDir, "tmp");
        const logFile = join(logDir, `${id}.log`);

        try {
          await mkdir(logDir, { recursive: true });
          const logContent = managed.logs.join("\n") + "\n\nError: " + err.message;
          await writeFile(logFile, logContent);
        } catch {
          // ignore
        }

        processesRef.current.delete(id);
        dispatch({
          type: "SET_STATUS",
          id,
          status: "error",
          errorMessage: err.message,
          logFile,
          managedByTui: false,
        });
      });
    },
    [getConfig, rootDir],
  );

  const stop = useCallback(
    async (id: string): Promise<void> => {
      const currentService = servicesRef.current.find((s) => s.id === id);
      if (currentService?.status === "stopped" || currentService?.status === "stopping") {
        return;
      }

      dispatch({ type: "SET_STATUS", id, status: "stopping" });
      stoppingRef.current.add(id);

      try {
        const managed = processesRef.current.get(id);
        if (managed) {
          await stopService(managed.pid, managed.process);
          processesRef.current.delete(id);
        } else if (currentService?.pid) {
          await stopService(currentService.pid);
        }
      } catch {
        // ignore
      } finally {
        stoppingRef.current.delete(id);
      }

      dispatch({
        type: "SET_STATUS",
        id,
        status: "stopped",
        pid: undefined,
        managedByTui: false,
      });
    },
    [rootDir],
  );

  const restart = useCallback(
    async (id: string): Promise<void> => {
      await stop(id);
      await start(id);
    },
    [start, stop],
  );

  const startAll = useCallback(async (): Promise<void> => {
    for (const service of servicesRef.current) {
      if (service.status === "stopped") {
        await start(service.id);
      }
    }
  }, [start]);

  const stopAll = useCallback(async (): Promise<void> => {
    for (const service of servicesRef.current) {
      if (service.status === "running" && service.managedByTui) {
        await stop(service.id);
      }
    }
  }, [stop]);

  return { services, start, stop, restart, startAll, stopAll };
}
