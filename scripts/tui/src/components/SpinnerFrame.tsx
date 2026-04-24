import React from "react";
import { Text } from "ink";
import { useSpinner } from "@inkjs/ui";

export function SpinnerFrame() {
  const { frame } = useSpinner({ type: "dots" });
  return <Text color="yellow">{frame}</Text>;
}
