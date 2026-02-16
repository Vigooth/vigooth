# CLAUDE.md - Crypt-Lock

Gestionnaire de mots de passe avec interface terminal style rétro (CPC).

## Commandes

```bash
pnpm dev          # Serveur de développement
pnpm build        # Build production
pnpm type-check   # Vérification TypeScript
```

## Architecture

### Fichiers clés

**Terminal (commandes CLI) :**
```
src/components/terminal/
├── Terminal.tsx              # Composant principal, parsing, historique, navigation clavier
├── index.ts                  # Export public
└── commands/
    ├── index.ts              # Registry des commandes
    ├── types.ts              # CommandContext, CommandFn, CommandResult
    ├── help.ts               # Aide
    ├── cd.ts                 # Navigation dossiers (par index ou nom)
    ├── ls.ts                 # Liste dossiers avec index [n]
    ├── cat.ts                # Liste entrées d'un dossier
    ├── pwd.ts                # Dossier courant
    ├── add.ts                # Ajouter une entrée (par index ou nom)
    ├── mkdir.ts              # Créer un dossier
    ├── rmdir.ts              # Supprimer dossier (--force si non vide)
    ├── rm.ts                 # Supprimer dossier/entrée (n ou n.m)
    ├── mv.ts                 # Déplacer entrées (batch: 1.2, 1{1,3}, 1{1..4}, 1*)
    └── gen.ts                # Générer mot de passe
```

**React Query & State Management :**
```
src/app/providers/
├── QueryProvider.tsx         # QueryClientProvider (mémoire only, pas de persist)
└── index.ts

src/hooks/
├── useVaultQuery.ts          # Hooks React Query (useVaultQuery, useAddFolder, etc.)
├── useSync.ts                # Gestion sync (isSyncing, hasPending, triggerSync)
└── useOnlineStatus.ts        # Détection online/offline
```

**API & Persistence sécurisée :**
```
src/lib/api/
├── client.ts                 # HTTP client (fetch + auth token)
└── vault.ts                  # fetchVault, persistVault (encrypt/decrypt + cache chiffré)

src/lib/storage/
├── encryptedVault.ts         # Cache CHIFFRÉ IndexedDB (sécurisé)
└── index.ts
```

**Vault (données et UI) :**
```
src/app/pages/
└── VaultPage.tsx             # Page principale, utilise les hooks React Query

src/components/vault/
├── FolderCard.tsx            # Carte dossier (affichage)
├── EntryCard.tsx             # Carte entrée mot de passe
├── AddFolderForm.tsx         # Formulaire ajout dossier
├── AddEntryForm.tsx          # Formulaire ajout entrée
├── VaultContext.tsx          # Context React (actions UI: copy, forms)
└── index.ts                  # Exports publics
```

**Utilitaires :**
```
src/utils/
└── folderUtils.ts            # findFolderByName, getFolderByIndex, getEntriesForFolder, etc.

src/types/
└── colors.ts                 # ColorType centralisé, VALID_COLORS, isValidColor
```

**Crypto et types :**
```
src/lib/crypto/
└── vault.ts                  # Types: VaultData, Folder, PasswordEntry
                              # Fonctions: encryptVault, decryptVault, generatePassword, generateId
```

**Traductions :**
```
src/lib/i18n/locales/
├── fr.json                   # Français
└── en.json                   # Anglais
```

### Types principaux

```typescript
// Dossier
interface Folder {
  id: string
  name: string           // Toujours UPPERCASE
  color?: ColorType      // 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'
  createdAt: string
}

// Entrée mot de passe
interface PasswordEntry {
  id: string
  folderId?: string      // undefined = racine (NON CLASSÉ)
  name: string
  username: string
  password: string
  url?: string
  createdAt: string
  updatedAt: string
}

// Vault complet
interface VaultData {
  entries: PasswordEntry[]
  folders: Folder[]
}

// Contexte terminal
interface CommandContext {
  vault: VaultData | null
  currentFolder: { id: string; name: string } | null
  setCurrentFolder: (folder) => void
  addEntry: (folderId, data) => Promise<PasswordEntry>
  addFolder: (folder) => Promise<void>
  removeFolder: (folderId) => Promise<void>
  removeEntry: (entryId) => Promise<void>
  moveEntries: (entryIds, targetFolderId) => Promise<void>
  generatePassword: (length) => string
  generateId: () => string
}
```

## Sécurité & Gestion Offline

### Principe de sécurité

**IMPORTANT : Les mots de passe ne sont JAMAIS stockés en clair.**

```
┌─────────────────────────────────────────────────────────────────┐
│                        STOCKAGE                                  │
├─────────────────────────────────────────────────────────────────┤
│  IndexedDB (persistant)     │  Mémoire (session)                │
│  ─────────────────────────  │  ────────────────────             │
│  ✅ Vault CHIFFRÉ           │  ✅ Vault DÉCRYPTÉ                │
│  ✅ Token auth              │  ✅ Master password               │
│  ❌ Mots de passe en clair  │  ✅ React Query cache             │
└─────────────────────────────────────────────────────────────────┘
```

### Flux offline sécurisé

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CHARGEMENT (online ou offline)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Online?  ──YES──→  Fetch serveur  ──→  Cache chiffré local    │
│      │                                          │                │
│      NO                                         │                │
│      │                                          ↓                │
│      └──────────→  Charger cache chiffré  ←────┘                │
│                           │                                      │
│                           ↓                                      │
│              Demander master password                            │
│                           │                                      │
│                           ↓                                      │
│              Décrypter → Mémoire uniquement                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  2. MUTATION (add, edit, delete)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Modifier vault en mémoire                                      │
│            │                                                     │
│            ↓                                                     │
│   Chiffrer avec master password                                 │
│            │                                                     │
│            ├──→  Sauvegarder chiffré dans IndexedDB (toujours)  │
│            │                                                     │
│            └──→  Online? ──YES──→ Sync serveur                  │
│                     │                                            │
│                     NO → Sync au retour online                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  3. LOGOUT                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Effacer master password (mémoire)                             │
│   Effacer cache React Query (mémoire)                           │
│   Effacer vault chiffré (IndexedDB)  ← Sécurité maximale        │
│   Effacer token auth                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fichiers de stockage sécurisé

```
src/lib/storage/
├── encryptedVault.ts    # Cache chiffré IndexedDB (clé: crypt-lock-encrypted-vault)
├── syncQueue.ts         # État de sync (clé: crypt-lock-sync-status)
└── index.ts

Fonctions encryptedVault:
- saveEncryptedVaultToCache(encryptedData)  # Sauvegarde chiffrée
- loadEncryptedVaultFromCache()             # Charge chiffré
- clearEncryptedVaultCache()                # Efface au logout

Fonctions syncQueue:
- markPendingSync()     # Marque changements en attente
- markSyncComplete()    # Marque sync terminée
- hasPendingSync()      # Vérifie si sync nécessaire
```

### React Query (mémoire uniquement)

```typescript
// QueryClient - PAS de persistence IndexedDB pour les données décryptées
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 minute
      refetchOnWindowFocus: true, // Données fraîches au focus
      // Pas de persistence - mots de passe en mémoire uniquement
    },
  },
})
```

### Synchronisation simplifiée

```
┌─────────────────────────────────────────────────────────────────┐
│  SYNC AUTOMATIQUE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Focus fenêtre (online) ──→ refetchOnWindowFocus ──→ Données    │
│                              fraîches du serveur                 │
│                                                                  │
│  Retour online ──→ Push local vers serveur ──→ Sync complète    │
│                                                                  │
│  Indicateurs header:                                             │
│  - "HORS LIGNE" : pas de connexion                              │
│  - "EN ATTENTE" : changements locaux non sync                   │
│  - "SYNC..."    : synchronisation en cours                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Pas de merge complexe** : un seul utilisateur = pas de conflits réels.
Au focus, les données serveur écrasent. Simple et efficace.

### Hooks disponibles

**Vault (src/hooks/useVaultQuery.ts) :**

| Hook | Description |
|------|-------------|
| `useVaultQuery` | Fetch + decrypt du vault |
| `useAddFolder` | Mutation pour ajouter un dossier |
| `useDeleteFolder` | Mutation pour supprimer un dossier |
| `useAddEntry` | Mutation pour ajouter une entrée |
| `useDeleteEntry` | Mutation pour supprimer une entrée |
| `useMoveEntries` | Mutation batch pour déplacer des entrées |

**Sync (src/hooks/useSync.ts) :**

| Hook | Description |
|------|-------------|
| `useSync` | Gère sync: `isSyncing`, `hasPending`, `triggerSync()` |
| `useOnlineStatus` | Détection online/offline |

### Ajout d'une nouvelle mutation

1. Créer le hook dans `src/hooks/useVaultQuery.ts`
2. Utiliser `queryClient.getQueryData(VAULT_QUERY_KEY)` pour lire le cache mémoire
3. Appeler `persistVault()` → chiffre ET sauvegarde localement ET sync serveur
4. Mettre à jour le cache mémoire avec `queryClient.setQueryData()`
5. Exposer dans VaultPage si nécessaire pour le terminal

## Commandes terminal disponibles

| Commande | Description |
|----------|-------------|
| `HELP` | Afficher l'aide |
| `LS` | Lister les dossiers avec index [n] |
| `CD <n\|nom>` | Naviguer par index ou nom (CD .. pour ROOT) |
| `PWD` | Dossier courant |
| `CAT [n\|nom]` | Lister les entrées d'un dossier |
| `ADD <nom> [user] [pass] [url]` | Ajouter entrée au dossier courant |
| `ADD <n\|nom> <nom> [...]` | Ajouter dans dossier par index ou nom |
| `MKDIR <nom> [couleur]` | Créer dossier |
| `RMDIR <nom> [--force]` | Supprimer dossier (--force si non vide) |
| `RM <n>` | Supprimer dossier par index |
| `RM <n.m>` | Supprimer entrée (dossier.entrée) |
| `MV <source> <dest>` | Déplacer entrées vers dossier |
| `GEN [longueur]` | Générer mot de passe |

### Syntaxe MV (batch)

| Pattern | Exemple | Description |
|---------|---------|-------------|
| `n.m` | `MV 1.2 3` | Entrée unique |
| `n{a,b,c}` | `MV 1{1,3,5} 2` | Liste d'entrées |
| `n{a..b}` | `MV 1{1..4} 2` | Range d'entrées |
| `n*` | `MV 1* 2` | Toutes les entrées |

## Conventions

- **Named exports** uniquement, jamais de `export default`
- **Noms de dossiers** : toujours en MAJUSCULES
- **Commandes terminal** : arguments parsés avec support des guillemets ("mon dossier")
- **Comparaison noms** : utiliser `.normalize()` pour les accents
- **Couleurs** : bordures vertes uniformes, couleur du dossier uniquement sur le titre
- **Folder lookup** : utiliser `getFolderByIndex()` et `findFolderByName()` de `@/utils/folderUtils`
- **Mutations** : utiliser les hooks React Query, pas de setState direct pour le vault
- **Sécurité** : JAMAIS stocker de données décryptées dans IndexedDB/localStorage

## Notes

- "NON CLASSÉ" n'est pas un vrai dossier, c'est l'affichage des entrées sans `folderId`
- Les guillemets permettent les noms avec espaces : `RMDIR "MON DOSSIER"`
- Flèches haut/bas pour naviguer dans l'historique des commandes
- Clic dans le terminal = auto-focus sur l'input
- Index 0 = ROOT, index 1+ = dossiers dans l'ordre de création
- Le vault est persisté **CHIFFRÉ** dans IndexedDB pour le mode offline
- Indicateur "HORS LIGNE" visible dans le header quand déconnecté
- Au reload, le master password est redemandé pour décrypter le cache local
- React Query Devtools uniquement en mode développement
