# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` - starts Vite development server with HMR
- **Build**: `pnpm build` - runs type-check and builds for production
- **Type checking**: `pnpm type-check` - runs TypeScript compiler without emitting files
- **Linting**: `pnpm lint` - runs ESLint on TypeScript/TSX files
- **Preview**: `pnpm preview` - preview production build locally
- **Format**: `pnpm format` - formats code using Prettier

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

### Tech Stack
- **React 19.1.1** with TypeScript
- **Vite** for build tooling and development server
- **ESLint** for linting with React-specific rules
- **Prettier** for code formatting

### Architecture Rules
- Features should not import from each other
- Shared code goes in the appropriate shared directory
- Follow unidirectional dependency flow: shared → features → app
- Keep features modular and self-contained

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