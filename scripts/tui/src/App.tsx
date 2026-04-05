import React, { useState } from 'react';
import { exec } from 'child_process';
import { Box, useApp, useInput, useStdout } from 'ink';
import { useServices } from './hooks/useServices.js';
import { Dashboard } from './components/Dashboard.js';
import { HelpModal } from './components/HelpModal.js';
import { ExitPrompt, type ExitChoice } from './components/ExitPrompt.js';
import { LogView } from './components/LogView.js';

export interface AppProps {
  rootDir: string;
}

export function App({ rootDir }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { services, start, stop, restart, startAll, stopAll } =
    useServices(rootDir);

  const [selectedRow, setSelectedRow] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [logServiceId, setLogServiceId] = useState<string | null>(null);

  const hasRunningManagedServices = services.some(
    (s) => s.status === 'running' && s.managedByTui,
  );

  const openUrl = (url: string) => exec(`open "${url}"`);

  const handleExitConfirm = async (choice: ExitChoice) => {
    if (choice === 'cancel') {
      setShowExitPrompt(false);
      return;
    }
    if (choice === 'no') {
      if (!hasRunningManagedServices) {
        setShowExitPrompt(false);
        return;
      }
      exit();
      return;
    }
    try {
      await stopAll();
    } catch (err) {
      console.error('Error stopping services:', err);
    }
    exit();
  };

  useInput(
    (input, key) => {
      if (showExitPrompt || logServiceId) return;

      if (showHelp) {
        if (key.escape || input) setShowHelp(false);
        return;
      }

      // Navigation
      if (key.upArrow) {
        setSelectedRow((r) => Math.max(0, r - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedRow((r) => Math.min(services.length - 1, r + 1));
        return;
      }

      // Global shortcuts
      if (input === 'a') {
        startAll();
        return;
      }
      if (input === 'X') {
        stopAll();
        return;
      }
      if (input === 'q') {
        setShowExitPrompt(true);
        return;
      }
      if (input === '?') {
        setShowHelp(true);
        return;
      }

      // Per-service actions
      const svc = services[selectedRow];
      if (!svc) return;
      if (input === 's') start(svc.id);
      else if (input === 'x') stop(svc.id);
      else if (input === 'r') restart(svc.id);
      else if (input === 'l') setLogServiceId(svc.id);
      else if (key.return && svc.url) openUrl(svc.url);
    },
    { isActive: !showExitPrompt && !logServiceId },
  );

  const terminalHeight = stdout?.rows ?? 24;

  const logService = logServiceId
    ? services.find((s) => s.id === logServiceId)
    : null;

  if (logService) {
    return (
      <Box flexDirection="column" width="100%" height={terminalHeight}>
        <LogView
          service={logService}
          onClose={() => setLogServiceId(null)}
          onRestart={restart}
        />
      </Box>
    );
  }

  const clampedRow = Math.min(
    selectedRow,
    Math.max(0, services.length - 1),
  );

  return (
    <Box flexDirection="column" width="100%" height={terminalHeight}>
      <Dashboard services={services} selectedRow={clampedRow} />
      {showHelp && <HelpModal />}
      {showExitPrompt && (
        <ExitPrompt
          hasRunningServices={hasRunningManagedServices}
          onConfirm={handleExitConfirm}
        />
      )}
    </Box>
  );
}
