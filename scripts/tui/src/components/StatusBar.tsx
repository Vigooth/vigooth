import React from "react";
import { Box, Text } from "ink";

export function StatusBar() {
  return (
    <Box borderStyle="single" paddingX={1} justifyContent="space-between">
      <Text bold>Vigooth Dev TUI</Text>
      <Text dimColor>? help | q quit</Text>
    </Box>
  );
}
