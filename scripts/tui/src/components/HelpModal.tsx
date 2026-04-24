import React from "react";
import { Box, Text } from "ink";

const keybindings = [
  { key: "\u2191/\u2193", action: "Move selection" },
  { key: "s", action: "Start selected service" },
  { key: "x", action: "Stop selected service" },
  { key: "r", action: "Restart selected service" },
  { key: "l", action: "View service logs" },
  { key: "\u21B5", action: "Open URL in browser" },
  { key: "a", action: "Start all services" },
  { key: "X", action: "Stop all services" },
  { key: "q", action: "Quit" },
  { key: "Esc", action: "Cancel" },
  { key: "?", action: "Show help" },
];

export function HelpModal() {
  return (
    <Box flexDirection="column" borderStyle="single" paddingX={2} paddingY={1}>
      <Text bold>Keybindings</Text>
      <Text> </Text>
      {keybindings.map(({ key, action }) => (
        <Box key={key}>
          <Text color="cyan">{key.padEnd(6)}</Text>
          <Text> </Text>
          <Text>{action}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>Press Esc to close</Text>
    </Box>
  );
}
