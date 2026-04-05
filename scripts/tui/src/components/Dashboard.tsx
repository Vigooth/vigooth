import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import type { ServiceState } from '../types.js';
import { StatusBar } from './StatusBar.js';
import { ServiceRow } from './ServiceRow.js';

export interface DashboardProps {
  services: ServiceState[];
  selectedRow: number;
}

interface CrashAlert {
  id: string;
  serviceId: string;
  message: string;
}

export function Dashboard({ services, selectedRow }: DashboardProps) {
  const errorServices = services.filter((s) => s.status === 'error');
  const prevStatusesRef = useRef<Record<string, string>>({});
  const [crashAlerts, setCrashAlerts] = useState<CrashAlert[]>([]);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const prev = prevStatusesRef.current;
    for (const s of services) {
      if (prev[s.id] === 'running' && s.status === 'error') {
        const alert: CrashAlert = {
          id: `${s.id}-${Date.now()}`,
          serviceId: s.id,
          message: s.errorMessage ?? 'crashed',
        };
        setCrashAlerts((a) => [...a, alert]);
        const tid = setTimeout(() => {
          setCrashAlerts((a) => a.filter((x) => x.id !== alert.id));
          timeoutsRef.current.delete(tid);
        }, 5000);
        timeoutsRef.current.add(tid);
      }
    }
    const next: Record<string, string> = {};
    for (const s of services) next[s.id] = s.status;
    prevStatusesRef.current = next;
  }, [services]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <StatusBar />
      <Box flexDirection="column" paddingX={1} paddingY={1} flexGrow={1}>
        {services.map((service, i) => (
          <ServiceRow
            key={service.id}
            service={service}
            selected={i === selectedRow}
          />
        ))}
        {errorServices.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            {errorServices.map((s) => (
              <StatusMessage key={`error-${s.id}`} variant="error">
                {s.id}: {s.errorMessage ?? 'error'}
                {s.logFile ? ` (${s.logFile})` : ''}
              </StatusMessage>
            ))}
          </Box>
        )}
      </Box>
      {crashAlerts.map((alert) => (
        <Box key={alert.id} paddingX={1}>
          <Text color="red">
            {alert.serviceId} crashed: {alert.message}
          </Text>
        </Box>
      ))}
      <Box
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
        gap={1}
      >
        <Text>
          <Text color="cyan">s</Text>
          <Text dimColor> start</Text>
        </Text>
        <Text>
          <Text color="cyan">x</Text>
          <Text dimColor> stop</Text>
        </Text>
        <Text>
          <Text color="cyan">r</Text>
          <Text dimColor> restart</Text>
        </Text>
        <Text>
          <Text color="cyan">l</Text>
          <Text dimColor> logs</Text>
        </Text>
        <Text>
          <Text color="cyan">{'\u21B5'}</Text>
          <Text dimColor> open</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="cyan">a</Text>
          <Text dimColor> all</Text>
        </Text>
        <Text>
          <Text color="cyan">X</Text>
          <Text dimColor> stop-all</Text>
        </Text>
        <Text dimColor>|</Text>
        <Text>
          <Text color="cyan">?</Text>
          <Text dimColor> help</Text>
        </Text>
        <Text>
          <Text color="cyan">q</Text>
          <Text dimColor> quit</Text>
        </Text>
      </Box>
    </Box>
  );
}
