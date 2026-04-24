import React from "react";
import { Box, Text } from "ink";
import type { ServiceState } from "../types.js";
import { SpinnerFrame } from "./SpinnerFrame.js";

export interface ServiceRowProps {
  service: ServiceState;
  selected?: boolean;
}

const NAME_WIDTH = 10;

export function ServiceRow({ service, selected = false }: ServiceRowProps) {
  const isTransitioning = service.status === "starting" || service.status === "stopping";

  if (isTransitioning) {
    return (
      <Box>
        <Text inverse={selected}>
          <SpinnerFrame /> <Text>{service.id.padEnd(NAME_WIDTH)}</Text>{" "}
          <Text dimColor>{service.status}...</Text>
        </Text>
      </Box>
    );
  }

  const icons: Record<string, string> = {
    unknown: "?",
    running: "\u25CF",
    stopped: "\u25CB",
    error: "\u2717",
  };
  const colors: Record<string, string> = {
    unknown: "gray",
    running: "green",
    stopped: "gray",
    error: "red",
  };
  const statusIcon = icons[service.status] ?? "?";
  const statusColor = colors[service.status] ?? "gray";

  return (
    <Box>
      <Text inverse={selected}>
        <Text color={statusColor}>[{statusIcon}]</Text> <Text>{service.id.padEnd(NAME_WIDTH)}</Text>{" "}
        <Text dimColor>{service.url}</Text>
      </Text>
    </Box>
  );
}
