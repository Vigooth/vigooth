import path from 'node:path';
import { mkdirSync, createWriteStream } from 'node:fs';
import type { WriteStream } from 'node:fs';
import { execa, type ResultPromise } from 'execa';
import treeKill from 'tree-kill';
import type { ServiceConfig } from '../types.js';

export const MAX_LOG_LINES = 500;

export interface ManagedProcess {
  pid: number;
  process: ResultPromise;
  logs: string[];
  logFile: string;
}

export function startService(
  config: ServiceConfig,
  port: number,
  rootDir: string,
  onLog: (line: string) => void,
): ManagedProcess {
  const env = { ...process.env };
  const args = config.args.map((arg) => arg.replace('{port}', String(port)));

  if (config.portEnvVar) {
    env[config.portEnvVar] = String(port);
  }

  let command = config.command;
  let finalArgs = args;
  let cwd = config.cwd ? path.resolve(rootDir, config.cwd) : rootDir;

  if (config.shellSetup) {
    const quotedArgs = args.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ');
    const portOverride = config.portEnvVar ? `export ${config.portEnvVar}=${port}` : '';
    const parts = [config.shellSetup, portOverride, `${config.command} ${quotedArgs}`].filter(
      Boolean,
    );
    const fullCommand = parts.join(' && ');
    command = 'bash';
    finalArgs = ['-c', fullCommand];
    cwd = rootDir;
  }

  const logDir = path.join(rootDir, 'tmp');
  const logFile = path.join(logDir, `${config.id}.log`);
  let logStream: WriteStream | null = null;
  try {
    mkdirSync(logDir, { recursive: true });
    logStream = createWriteStream(logFile, { flags: 'w' });
  } catch {
    // ignore
  }

  const child = execa(command, finalArgs, {
    cwd,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
    detached: true,
  });

  child.unref();

  const logs: string[] = [];

  child.stdout?.on('data', (data: Buffer) => {
    const line = data.toString();
    logs.push(line);
    if (logs.length > MAX_LOG_LINES) logs.shift();
    logStream?.write(line);
    onLog(line);
  });

  child.stderr?.on('data', (data: Buffer) => {
    const line = data.toString();
    logs.push(line);
    if (logs.length > MAX_LOG_LINES) logs.shift();
    logStream?.write(line);
    onLog(line);
  });

  child.on('close', () => {
    logStream?.end();
  });

  return { pid: child.pid!, process: child, logs, logFile };
}

export async function stopService(pid: number, processSettled?: Promise<unknown>): Promise<void> {
  await new Promise<void>((resolve) => {
    treeKill(pid, 'SIGTERM', () => resolve());
  });

  if (processSettled) {
    const exited = await Promise.race([
      processSettled.then(
        () => true,
        () => true,
      ),
      new Promise<boolean>((r) => setTimeout(() => r(false), 5000)),
    ]);
    if (!exited) {
      await new Promise<void>((resolve) => {
        treeKill(pid, 'SIGKILL', () => resolve());
      });
    }
  }
}
