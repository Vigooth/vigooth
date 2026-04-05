import type { ServiceConfig } from '../types.js';

export const services: ServiceConfig[] = [
  {
    id: 'api',
    name: 'api',
    command: 'go',
    args: ['run', './cmd/server'],
    cwd: 'services/api',
    defaultPort: 8090,
    portEnvVar: 'PORT',
    urlTemplate: 'http://localhost:{port}',
    processPattern: /go.*cmd\/server/,
    shellSetup:
      "cd services/api && set -a && [ -f .env ] && . .env && set +a",
  },
  {
    id: 'portal',
    name: 'portal',
    command: 'pnpm',
    args: ['--filter', '@vigooth/portal', 'dev'],
    defaultPort: 5173,
    urlTemplate: 'http://localhost:{port}',
    processPattern: /vite.*portal/,
  },
  {
    id: 'vilock',
    name: 'vilock',
    command: 'pnpm',
    args: ['--filter', '@vigooth/vilock', 'dev'],
    defaultPort: 5174,
    urlTemplate: 'http://localhost:{port}',
    processPattern: /vite.*vilock/,
  },
  {
    id: 'moovi',
    name: 'moovi',
    command: 'pnpm',
    args: ['--filter', '@vigooth/moovi', 'dev'],
    defaultPort: 5176,
    urlTemplate: 'http://localhost:{port}',
    processPattern: /vite.*moovi/,
  },
];
