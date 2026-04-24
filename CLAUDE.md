# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` - starts Vite development server with HMR
- **Build**: `pnpm build` - runs type-check and builds for production
- **Type checking**: `pnpm type-check` - runs TypeScript compiler without emitting files
- **Linting**: `pnpm lint` - runs oxlint on the repo
- **Preview**: `pnpm preview` - preview production build locally
- **Format**: `pnpm format` - formats code using oxfmt

## Package Manager

This project uses **pnpm** (version 10.14.0) as specified in package.json. Always use `pnpm` instead of npm or yarn.

## Project Architecture

This project follows the **Bulletproof React** architecture pattern with feature-based modular organization and unidirectional code flow (shared → features → app).

### Path Aliases
The project uses slash-based path aliases configured in both vite.config.ts and tsconfig.json:
- `@/` → `src/` (root access)
- `@/app/*` → `src/app/*` (application layer)
- `@/components/*` → `src/components/*` (shared components)
- `@/features/*` → `src/features/*` (feature modules)
- `@/assets/*` → `src/assets/*` (static assets)
- `@/utils/*` → `src/utils/*` (shared utilities)
- `@/hooks/*` → `src/hooks/*` (shared React hooks)
- `@/types/*` → `src/types/*` (global TypeScript types)
- `@/config/*` → `src/config/*` (global configuration)
- `@/lib/*` → `src/lib/*` (reusable libraries)
- `@/stores/*` → `src/stores/*` (global state management)
- `@/testing/*` → `src/testing/*` (test utilities)

### Directory Structure
```
src/
├── app/          # Application layer (routes, main app, providers)
├── assets/       # Static files (images, fonts, etc.)
├── components/   # Shared/reusable UI components
├── config/       # Global configurations, constants
├── features/     # Feature-based modules (self-contained)
├── hooks/        # Shared React hooks
├── lib/          # Reusable libraries and configurations
├── stores/       # Global state management
├── testing/      # Test utilities and setup
├── types/        # Global TypeScript type definitions
└── utils/        # Shared utility functions
```

### Feature Module Structure
Each feature should be self-contained with its own:
- `api/` - Feature-specific API requests
- `assets/` - Feature-specific static files
- `components/` - Feature-scoped components
- `hooks/` - Feature-specific hooks
- `stores/` - Feature state management
- `types/` - Feature-specific TypeScript types
- `utils/` - Feature utility functions

### Monorepo Structure
```
apps/
├── moovi/        # Movie collection app (React + Vite)
├── vilock/       # Vault/notepad app (React + Vite)
└── portal/       # Portal/launcher app (React + Vite)
packages/
├── ui/           # Shared component library (@vigooth/ui)
└── styles/       # Shared animations and style utilities (@vigooth/styles)
services/
└── api/          # Go backend (Gin + PostgreSQL)
```

### Tech Stack
- **React 19.1.1** with TypeScript
- **Vite** for build tooling and development server
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **@base-ui-components/react** for headless UI primitives (Menu, Drawer)
- **TanStack Query** for server state management
- **Oxlint** for linting (Rust-based, replaces ESLint)
- **Oxfmt** for code formatting (Rust-based, replaces Prettier)
- **Go + Gin** for backend API (services/api/)

### Shared UI Library (@vigooth/ui)
- `CpcButton` — variants: outlined/filled/text, colors: green/cyan/red/yellow/magenta/blue/orange
- `CpcMenu` — dropdown with `color` prop, plus CpcMenuItem/CpcMenuSeparator/CpcMenuGroup/CpcSubmenu
- Icon system: `createIcon` factory, SVGs in `packages/ui/src/Icons/svg/` with viewBox `0 0 24 24`
- Always check for existing components before building inline

### Architecture Rules
- Features should not import from each other
- Shared code goes in the appropriate shared directory
- Follow unidirectional dependency flow: shared → features → app
- Keep features modular and self-contained

## Git Workflow Rules
- **Never create a PR with unpushed commits.** After every commit, push immediately. Before creating a PR, verify local and remote are in sync.
- **Commit all pending changes before creating a PR.** Do not leave uncommitted work behind — commit it automatically without asking for confirmation.
- **Always rebase on `origin/main`** before creating a PR or deploying.

## Code Style Conventions

### Exports
- **Always use named exports**, never use `export default`
- Example:
  ```typescript
  // ✅ Good - Named export
  export function MyComponent() { ... }
  export const MyComponent = () => { ... }

  // ❌ Bad - Default export
  export default function MyComponent() { ... }
  export default MyComponent
  ```
- This applies to all files: components, utilities, hooks, pages, etc.