import React from 'react';
import { Box, Text, useInput } from 'ink';

export type ExitChoice = 'yes' | 'no' | 'cancel';

export interface ExitPromptProps {
  hasRunningServices?: boolean;
  onConfirm: (choice: ExitChoice) => void;
}

export function ExitPrompt({
  hasRunningServices = false,
  onConfirm,
}: ExitPromptProps) {
  useInput((input, key) => {
    const lower = input.toLowerCase();
    if (lower === 'y') onConfirm('yes');
    else if (lower === 'n') onConfirm('no');
    else if (lower === 'c' || key.escape) onConfirm('cancel');
  });

  if (!hasRunningServices) {
    return (
      <Box borderStyle="single" paddingX={2} paddingY={1}>
        <Text>Quit? </Text>
        <Text dimColor>[y/n]</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="single" paddingX={2} paddingY={1}>
      <Text>Stop all services before quitting? </Text>
      <Text dimColor>[y/n/c]</Text>
    </Box>
  );
}
