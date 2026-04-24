import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import type { ServiceState } from "../types.js";

export interface LogViewProps {
  service: ServiceState;
  onClose: () => void;
  onRestart: (id: string) => void;
}

export function LogView({ service, onClose, onRestart }: LogViewProps) {
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;
  const [wrapLines, setWrapLines] = useState(false);

  const lines = service.managedByTui ? service.logs.flatMap((l) => l.trimEnd().split("\n")) : [];

  const [scrollOffset, setScrollOffset] = useState(Math.max(0, lines.length - 1));

  useEffect(() => {
    if (lines.length > 0) {
      setScrollOffset(lines.length - 1);
    }
  }, [lines.length]);

  const pageSize = Math.max(1, terminalHeight - 5);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (input === "r") {
      onRestart(service.id);
      return;
    }
    if (input === "w") {
      setWrapLines((v) => !v);
      return;
    }
    if (!service.managedByTui || lines.length === 0) return;

    if (key.upArrow) setScrollOffset((i) => Math.max(0, i - 1));
    if (key.downArrow) setScrollOffset((i) => Math.min(lines.length - 1, i + 1));
    if (input === "b") setScrollOffset((i) => Math.max(0, i - pageSize));
    if (input === "f") setScrollOffset((i) => Math.min(lines.length - 1, i + pageSize));
    if (input === "g") setScrollOffset(0);
    if (input === "G") setScrollOffset(lines.length - 1);
  });

  if (!service.managedByTui) {
    return (
      <Box flexDirection="column" height={terminalHeight}>
        <Box paddingX={1} gap={1}>
          <Text bold>{service.id}</Text>
          <Text dimColor>(external)</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <Text dimColor>Logs unavailable — service not started from TUI</Text>
          <Text dimColor>Press r to restart and capture logs</Text>
        </Box>
        <Box
          borderStyle="single"
          borderTop
          borderBottom={false}
          borderLeft={false}
          borderRight={false}
          paddingX={1}
          gap={1}
        >
          <Text dimColor>[r] restart [Esc] close</Text>
        </Box>
      </Box>
    );
  }

  const visibleStart = Math.max(0, scrollOffset - pageSize + 1);
  const visibleLines = lines.slice(visibleStart, visibleStart + pageSize);

  return (
    <Box flexDirection="column" height={terminalHeight}>
      <Box paddingX={1} gap={1}>
        <Text bold>{service.id}</Text>
        <Text dimColor>— {lines.length} lines</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleLines.map((line, i) => (
          <Text key={visibleStart + i} wrap={wrapLines ? "wrap" : "truncate"}>
            {line}
          </Text>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
        gap={1}
      >
        <Text dimColor>
          [↑/↓] scroll [b/f] page [g/G] top/bottom [r] restart [w] wrap{wrapLines ? ":on" : ":off"}{" "}
          [Esc] close
        </Text>
      </Box>
    </Box>
  );
}
