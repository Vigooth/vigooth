# Architecture Vigooth

## Vue d'ensemble

Monorepo multi-applications avec pnpm workspaces (sans Turborepo pour l'instant, à ajouter si besoin de cache/orchestration).

## Structure

```
vigooth/
├── apps/
│   ├── portal/              # App principale (accueil CPC rétro)
│   ├── passwords/           # Gestionnaire de mots de passe sécurisé
│   └── movies/              # Gestion de films favoris (futur)
│
├── packages/
│   ├── ui/                  # Composants partagés + fichiers .stories.tsx
│   │   ├── Door/
│   │   │   ├── Door.tsx
│   │   │   └── Door.stories.tsx
│   │   ├── Terminal/
│   │   ├── CpcLayout/
│   │   └── ...
│   │
│   ├── styles/              # Styles CPC partagés (emotion)
│   │   ├── cpc.ts           # cpcScreen, cpcCursor, animations
│   │   └── theme.ts
│   │
│   ├── auth/                # Authentification partagée
│   │   ├── AuthProvider.tsx
│   │   ├── useAuth.ts
│   │   └── api.ts
│   │
│   └── config/              # Configurations partagées
│       ├── tsconfig.base.json
│       ├── tailwind.config.cjs
│       └── eslint.config.js
│
├── pnpm-workspace.yaml
└── package.json
```

## Authentification

**Stratégie : Auth commune, données isolées**

- Une seule authentification partagée entre toutes les apps (Supabase Auth ou Clerk)
- Package `@vigooth/auth` utilisé par toutes les apps
- Session/cookies partagés sur le même domaine

## Sécurité Passwords

L'app passwords a des couches de sécurité supplémentaires :

1. **Master password** - 2ème mot de passe pour déverrouiller (non stocké)
2. **Chiffrement côté client** - Données chiffrées AVANT envoi au serveur
3. **Base de données séparée** - Isolation complète des autres apps
4. **Zero-knowledge** - Le serveur ne voit jamais les mots de passe en clair

```
Flux:
1. Login vigooth (auth commune)
2. Ouvre /passwords → demande master password
3. Master password → déchiffre localement
4. Utilisateur voit ses mots de passe en clair
5. Serveur ne stocke que des données chiffrées
```

## APIs

**Stratégie : API par app** (recommandé pour isolation passwords)

- `passwords/` → API dédiée + DB séparée (sécurité maximale)
- `movies/` → API dédiée ou mutualisée (données non sensibles)
- `packages/api-utils/` → Helpers communs (fetch wrapper, interceptors)

## Imports entre packages

```typescript
// Dans apps/portal/
import { Door } from '@vigooth/ui'
import { cpcScreen } from '@vigooth/styles'
import { useAuth } from '@vigooth/auth'
```

## Stack technique

- **React 19** + TypeScript
- **Vite** - Build tooling
- **pnpm workspaces** - Gestion monorepo
- **twin.macro** + **Emotion** - CSS-in-JS
- **Tailwind CSS v3** - Utilities (v4 incompatible avec twin.macro)
- **Storybook** - Documentation composants (stories colocalisées dans packages/ui/)

## Hébergement (options économiques)

- **Frontend** : Vercel/Netlify (gratuit)
- **API** : Cloudflare Workers / Railway (free tier)
- **DB** : Supabase / PlanetScale (free tier)
- **Auth** : Supabase Auth / Clerk (gratuit)

## Commandes

```bash
# Développement
pnpm dev                    # Lance toutes les apps
pnpm --filter portal dev    # Lance uniquement portal
pnpm --filter passwords dev # Lance uniquement passwords

# Build
pnpm build                  # Build tout
pnpm --filter portal build  # Build uniquement portal

# Storybook
pnpm storybook              # Lance Storybook
```

## Migration future

- **Turborepo** : À ajouter si les builds deviennent lents (cache intelligent)
- **Nouvelles apps** : Créer dans `apps/` avec son propre package.json
