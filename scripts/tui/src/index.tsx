import React from "react";
import { render } from "ink";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { App } from "./App.js";

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

const rootDir = findRepoRoot(process.cwd());

// Enter alternate screen buffer
process.stdout.write("\x1b[?1049h");

const instance = render(<App rootDir={rootDir} />);

instance.waitUntilExit().then(() => {
  // Leave alternate screen buffer
  process.stdout.write("\x1b[?1049l");
  process.exit(0);
});
