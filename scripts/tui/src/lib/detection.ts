import { execaSync } from 'execa';
import type { ServiceConfig } from '../types.js';

export function getPidFromPort(port: number): number | null {
  try {
    const { stdout } = execaSync('lsof', ['-i', `:${port}`, '-sTCP:LISTEN', '-t'], {
      reject: false,
    });
    const pid = parseInt(stdout.trim().split('\n')[0], 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export function findProcessByPattern(pattern: RegExp): number | null {
  try {
    const { stdout } = execaSync('pgrep', ['-f', pattern.source], {
      reject: false,
    });
    const pids = stdout.trim().split('\n').filter(Boolean);
    return pids.length > 0 ? parseInt(pids[0], 10) : null;
  } catch {
    return null;
  }
}

export type ServiceStatus = 'running' | 'stopped';

export function detectServiceStatus(
  config: ServiceConfig,
  port: number,
): { status: ServiceStatus; pid: number | null } {
  const pid = getPidFromPort(port);
  return { status: pid !== null ? 'running' : 'stopped', pid };
}
