# Migration Plan: twin.macro + Emotion -> Tailwind CSS v4

## Context

The codebase currently uses **twin.macro** (v3.4.1) + **@emotion/react** (v11.14.0) for styling. twin.macro is unmaintained and incompatible with Tailwind v4. This plan migrates to **Tailwind CSS v4** with its native Vite plugin and CSS-first configuration.

## Current State Audit

| Metric | Count |
|--------|-------|
| Files importing `twin.macro` | 33 |
| Files importing `@emotion/react` | 10 |
| `tw=""` JSX prop usages | ~516 |
| `` tw` ` `` tagged template usages | ~154 |
| `css` prop usages (Emotion) | ~83 |
| Keyframe animations (Emotion) | 7 |
| Apps affected | 3 (moovi, vilock, portal) |
| Packages affected | 2 (ui, styles) |

### Patterns to Migrate

| Pattern | Example | Strategy |
|---------|---------|----------|
| `tw=""` JSX prop | `<div tw="flex p-4">` | `<div className="flex p-4">` |
| `` tw`...` `` tagged template | `` const s = tw`flex p-4` `` | `const s = "flex p-4"` + `className={s}` |
| `css` prop (static) | `` css={tw`flex p-4`} `` | `className="flex p-4"` |
| `css` prop (dynamic color) | `css={getStyles(variant, color)}` | CSS variables + `data-*` attrs or `cva()` |
| `css` + `tw` array | `` css={[tw`flex`, cpcScreen]} `` | `className={cn("flex", "cpc-screen")}` |
| Emotion `keyframes` | `` keyframes`0% {...}` `` | `@keyframes` in `app.css` via `@theme` |
| Emotion `css` (complex) | `` css`&::before { ... }` `` | Tailwind `@utility` / `@layer` or inline `style` |

---

## Phase 0: Preparation (config & tooling)

### 0.1 Install Tailwind v4 + Vite plugin

```bash
pnpm add -w tailwindcss@latest @tailwindcss/vite@latest
pnpm add -w -D clsx tailwind-merge  # utility for className merging
```

Create a shared `cn()` helper in `packages/ui/src/utils/cn.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 0.2 Create the new CSS-first config

Tailwind v4 replaces `tailwind.config.cjs` with CSS directives. Create a shared `packages/styles/src/theme.css`:

```css
@import "tailwindcss";

/* ---- Custom theme (replaces tailwind.config.cjs) ---- */
@theme {
  /* Font */
  --font-cpc: 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;

  /* Colors — CPC palette */
  --color-cpc-blue-50: #8080FF;
  --color-cpc-blue-100: #6666FF;
  --color-cpc-blue-200: #4D4DFF;
  --color-cpc-blue-300: #3333FF;
  --color-cpc-blue-400: #1A1AFF;
  --color-cpc-blue-500: #0000FF;
  --color-cpc-blue-600: #0000E6;
  --color-cpc-blue-700: #0000CC;
  --color-cpc-blue-800: #0000B3;
  --color-cpc-blue-900: #000080;

  --color-cpc-red-50: #FF8080;
  --color-cpc-red-100: #FF6666;
  --color-cpc-red-200: #FF4D4D;
  --color-cpc-red-300: #FF3333;
  --color-cpc-red-400: #FF1A1A;
  --color-cpc-red-500: #FF0000;
  --color-cpc-red-600: #E60000;
  --color-cpc-red-700: #CC0000;
  --color-cpc-red-800: #B30000;
  --color-cpc-red-900: #800000;

  --color-cpc-green-50: #80FF80;
  --color-cpc-green-100: #66FF66;
  --color-cpc-green-200: #4DFF4D;
  --color-cpc-green-300: #33FF33;
  --color-cpc-green-400: #1AFF1A;
  --color-cpc-green-500: #00FF00;
  --color-cpc-green-600: #00E600;
  --color-cpc-green-700: #00CC00;
  --color-cpc-green-800: #00B300;
  --color-cpc-green-900: #008000;

  --color-cpc-yellow-50: #FFFF80;
  --color-cpc-yellow-100: #FFFF66;
  --color-cpc-yellow-200: #FFFF4D;
  --color-cpc-yellow-300: #FFFF33;
  --color-cpc-yellow-400: #FFFF1A;
  --color-cpc-yellow-500: #FFFF00;
  --color-cpc-yellow-600: #E6E600;
  --color-cpc-yellow-700: #CCCC00;
  --color-cpc-yellow-800: #B3B300;
  --color-cpc-yellow-900: #808000;

  --color-cpc-magenta-50: #FF80FF;
  --color-cpc-magenta-100: #FF66FF;
  --color-cpc-magenta-200: #FF4DFF;
  --color-cpc-magenta-300: #FF33FF;
  --color-cpc-magenta-400: #FF1AFF;
  --color-cpc-magenta-500: #FF00FF;
  --color-cpc-magenta-600: #E600E6;
  --color-cpc-magenta-700: #CC00CC;
  --color-cpc-magenta-800: #B300B3;
  --color-cpc-magenta-900: #800080;

  --color-cpc-cyan-50: #80FFFF;
  --color-cpc-cyan-100: #66FFFF;
  --color-cpc-cyan-200: #4DFFFF;
  --color-cpc-cyan-300: #33FFFF;
  --color-cpc-cyan-400: #1AFFFF;
  --color-cpc-cyan-500: #00FFFF;
  --color-cpc-cyan-600: #00E6E6;
  --color-cpc-cyan-700: #00CCCC;
  --color-cpc-cyan-800: #00B3B3;
  --color-cpc-cyan-900: #008080;

  --color-cpc-orange-500: #FF8000;

  --color-cpc-grey-50: #C0C0C0;
  --color-cpc-grey-500: #808080;
  --color-cpc-grey-900: #0a0a0a;

  /* Animations */
  --animate-blink: blink 1s infinite;
  --animate-cursor: cursor 1.2s infinite;
  --animate-fade-in: fade-in 0.5s ease-in;
  --animate-pulse-cpc: pulse-cpc 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  @keyframes cursor {
    0%, 50% { background-color: currentColor; }
    51%, 100% { background-color: transparent; }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse-cpc {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}

/* ---- Shared utilities (replaces @vigooth/styles Emotion exports) ---- */

@utility cpc-screen {
  background: linear-gradient(
    180deg,
    rgba(0, 255, 0, 0.03) 0%,
    rgba(0, 0, 0, 0) 50%,
    rgba(0, 255, 0, 0.03) 100%
  );
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 0, 0.05) 2px,
      rgba(0, 255, 0, 0.05) 4px
    );
    pointer-events: none;
  }
}

@utility cpc-text-shadow {
  text-shadow: 0 0 5px currentColor;
}

@utility cpc-cursor {
  background-color: #00FF00;
  animation: var(--animate-cursor);
}
```

Each app's `src/index.css` becomes:

```css
@import "@vigooth/styles/theme.css";
```

### 0.3 Update Vite configs (all 3 apps)

**Before:**
```ts
import macrosPlugin from 'vite-plugin-babel-macros'

plugins: [
  macrosPlugin(),
  react({
    jsxImportSource: '@emotion/react',
    babel: {
      plugins: ['babel-plugin-macros', '@emotion/babel-plugin']
    }
  }),
]
```

**After:**
```ts
import tailwindcss from '@tailwindcss/vite'

plugins: [
  tailwindcss(),
  react(),
]
```

### 0.4 Remove PostCSS configs

Delete all 3 `postcss.config.js` files (Tailwind v4 Vite plugin handles it).

### 0.5 Clean up type declarations

Remove twin.macro type augmentation from all `vite-env.d.ts` files (the `tw` prop and `css` prop declarations).

---

## Phase 1: Migrate `packages/styles`

**Scope:** 1 file (`packages/styles/src/cpc.ts`)

Replace all Emotion exports with CSS classes defined in `theme.css` (Phase 0.2 above).

**Migration mapping:**

| Emotion export | Tailwind class |
|---------------|----------------|
| `cpcScreen` | `cpc-screen` |
| `cpcTextShadow` | `cpc-text-shadow` |
| `cpcCursor` | `cpc-cursor` |
| `animateFadeIn` | `animate-fade-in` |
| `animatePulse` | `animate-pulse-cpc` |
| `animateEnterDoor` | Inline `@keyframes` in Door component CSS module |
| `animateZoomIn` | Inline `@keyframes` in Door component CSS module |

After migration, `packages/styles` exports CSS (the `theme.css` file) instead of JS. Update `package.json` exports accordingly.

---

## Phase 2: Migrate `packages/ui`

**Scope:** 10 files (CpcButton, CpcInput, Door, Terminal, Navigation, Layout, AppMenu, Drawer, Menu, Icons)

### 2.1 Simple `tw` prop -> `className`

Most components use `tw=""` on plain elements. This is a direct replacement:

```tsx
// Before
<div tw="flex items-center gap-2">

// After
<div className="flex items-center gap-2">
```

### 2.2 Emotion `css` arrays with `tw` -> `cn()` helper

```tsx
// Before
<div css={[tw`h-full w-full bg-cpc-grey-900`, cpcScreen]}>

// After
<div className={cn("h-full w-full bg-cpc-grey-900", "cpc-screen")}>
```

### 2.3 Dynamic styling (CpcButton, CpcMenu)

CpcButton uses Emotion's `css` function with dynamic color values from a JS map. Two strategies:

**Option A: CSS variables + data attributes (recommended)**

```css
/* In theme.css */
@utility cpc-btn {
  @apply inline-flex items-center px-3 py-1 text-xs font-cpc cursor-pointer transition-colors outline-none bg-transparent;

  &:disabled {
    @apply opacity-40 cursor-not-allowed;
  }
}
```

```tsx
// CpcButton.tsx
<button
  className={cn("cpc-btn", variantClass)}
  style={{
    '--btn-color': colorMap[color].base,
    '--btn-dark': colorMap[color].dark,
  } as React.CSSProperties}
>
```

```css
@utility cpc-btn-outlined {
  border: 2px solid var(--btn-color);
  color: var(--btn-color);
  &:hover:not(:disabled) {
    background: var(--btn-color);
    color: black;
  }
}
```

**Option B: class-variance-authority (cva)**

```tsx
import { cva } from 'class-variance-authority'

const button = cva("inline-flex items-center px-3 py-1 ...", {
  variants: {
    variant: { outlined: "border-2", filled: "border-2", text: "border-2 border-transparent" },
    color: { green: "...", cyan: "...", ... }
  },
  compoundVariants: [
    { variant: "outlined", color: "green", className: "border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-black" },
    // ...
  ]
})
```

> **Recommendation:** Use Option A (CSS variables) for CpcButton/CpcMenu because the color palette is large (7 colors x 3 variants = 21 compound variants) and Option A keeps the CSS lean. Use `cva` only if the component API evolves to need more complex variant combinations.

### 2.4 Keyframe animations (Door component)

Door uses component-scoped `keyframes` via Emotion. Migrate to a CSS module or `@utility`:

```css
/* Door.module.css or in theme.css */
@keyframes door-swing {
  0% { transform: perspective(1000px) rotateY(0deg); }
  100% { transform: perspective(1000px) rotateY(-105deg); }
}

@keyframes door-glow {
  0%, 100% { box-shadow: inset 0 0 15px rgba(0,255,0,0.3); }
  50% { box-shadow: inset 0 0 25px rgba(0,255,0,0.6); }
}

@utility door-swing {
  animation: door-swing 0.7s ease-in-out forwards;
  backface-visibility: hidden;
}
```

---

## Phase 3: Migrate apps (portal -> moovi -> vilock)

Start with the smallest app first to validate the approach, then tackle larger apps.

### 3.1 `apps/portal` (2 files)

Smallest app. Quick win to validate the full pipeline works end-to-end.

### 3.2 `apps/moovi` (10 files)

Patterns: mostly `tw=""` props + some `css` arrays with shared styles. After Phase 1-2, imports from `@vigooth/styles` and `@vigooth/ui` are already migrated — just replace local `tw` usage.

### 3.3 `apps/vilock` (14 files)

Largest app. Same patterns as moovi. The TOTP components are newer and may use heavier Emotion patterns.

---

## Phase 4: Cleanup

### 4.1 Remove dependencies

```bash
pnpm remove -w twin.macro @emotion/react @emotion/styled @emotion/babel-plugin babel-plugin-macros vite-plugin-babel-macros
```

Remove from each app's `package.json` as well.

### 4.2 Delete dead config files

- `tailwind.config.cjs` (root + packages/config) — replaced by `theme.css`
- `postcss.config.js` (all 3 apps) — replaced by Vite plugin
- Update `vite-env.d.ts` — remove twin.macro augmentations

### 4.3 Verify

- `pnpm build` passes on all apps
- `pnpm type-check` passes on all apps
- `pnpm lint` passes on all apps
- Visual regression check on all pages

---

## Migration Order Summary

```
Phase 0  Config & tooling setup
   |
Phase 1  packages/styles (1 file)
   |
Phase 2  packages/ui (10 files)
   |
Phase 3a portal (2 files)     <- validate pipeline
   |
Phase 3b moovi (10 files)
   |
Phase 3c vilock (14 files)
   |
Phase 4  Cleanup & verify
```

Each phase should be a separate PR for reviewability.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tailwind v4 class names differ from v3 | Use the official [v4 upgrade tool](https://tailwindcss.com/docs/upgrade-guide) to scan for renames |
| `cpc-*` custom colors break | Theme is defined in `@theme` CSS, same class names apply — test early in Phase 0 |
| Dynamic color styles (CpcButton) lose runtime flexibility | CSS variables approach preserves full runtime dynamism |
| Scanline/screen effects (`cpcScreen`) hard to express in Tailwind | Use `@utility` directive — Tailwind v4 explicitly supports this |
| Build size regression | twin.macro generates atomic CSS at build time; Tailwind v4 does the same — no regression expected |
| Incremental migration breaks during coexistence | Not possible — twin.macro and Tailwind v4 cannot coexist (different PostCSS/build pipelines). Migration must be done per-app atomically |

## Dependencies to Add

```
tailwindcss@^4
@tailwindcss/vite@^4
clsx@^2
tailwind-merge@^3
```

## Dependencies to Remove

```
twin.macro
@emotion/react
@emotion/styled
@emotion/babel-plugin
babel-plugin-macros
vite-plugin-babel-macros
autoprefixer (handled by Tailwind v4)
postcss (handled by @tailwindcss/vite)
```
