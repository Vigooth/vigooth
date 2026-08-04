# DND App — Notes de contexte

VTT / éditeur de maps pour MJ. Port `5178`. Lancer : `pnpm dev:dnd`.

## Vue d'ensemble

App React + PixiJS v8 destinée à un MJ solo qui prépare et anime ses sessions
de jeu de rôle. Concept central : **une campagne contient plusieurs scènes**, chaque
scène = une carte 2D grille + stamps (sprites image) + état d'initiative + brouillard
de guerre. Tout est local-first (localStorage), pas de backend pour le moment.

## Architecture

```
apps/dnd/src/
├── app/
│   ├── components/
│   │   ├── EditorHeader.tsx       (barre du haut : algo/seed/W/H, fog buttons, INIT, undo/redo, export, campaigns)
│   │   ├── ToolPalette.tsx        (sidebar gauche resizable : tools de peinture, fog, stamps)
│   │   └── SceneTabs.tsx          (onglets de scènes sous le header)
│   └── pages/EditorPage.tsx       (orchestrateur — gros fichier mais centralisé)
├── components/
│   └── ContextMenu.tsx            (menu contextuel générique positionné au curseur)
├── features/
│   ├── dungeon-generator/
│   │   ├── algos/                 (rooms, bsp, maze, cellular, drunkard + types/registry)
│   │   └── rng.ts                 (mulberry32 seeded)
│   ├── map-editor/
│   │   ├── canvas/                (PixiCanvas, layers, handles + math handles)
│   │   ├── render/                (renderDungeon, renderGrid, renderFog, renderSelection, syncStamps, animatePatterns)
│   │   └── export/                (exportPng — offscreen Pixi → blob)
│   ├── persistence/
│   │   ├── api/campaigns.ts       (localStorage CRUD + migration legacy maps)
│   │   ├── hooks/useCampaigns.ts
│   │   └── components/CampaignDialog.tsx
│   ├── history/
│   │   └── useHistory.ts          (generic snapshot stack, capped à 100)
│   └── initiative/
│       └── components/InitiativePanel.tsx  (panneau droit, resizable)
├── hooks/
│   └── useHorizontalResize.ts     (drag handle réutilisable, side: 'left'|'right')
└── types/
    ├── dungeon.ts                 (Dungeon, CellType, Stamp, cloneDungeon, fog helpers)
    ├── campaign.ts                (Scene, Campaign, makeScene, makeCampaign, activeScene)
    └── initiative.ts              (InitiativeEntry, InitiativeState, ops)
```

## Modèle de données

```ts
Campaign { id, name, scenes: Scene[], activeSceneId, createdAt, updatedAt }
Scene    { id, name, dungeon: Dungeon, initiative: InitiativeState, ... }
Dungeon  { width, height, cells: CellTypeValue[], fog: number[], rooms, stamps: Stamp[], seed }
Stamp    { id, src, x, y, width, height, rotation, layer: 'token' | 'decor' }
InitiativeEntry { id, name, initiative, hp, maxHp, conditions[], isPlayer, stampId? }
```

`cells[i]` est un entier (CellType union). `fog[i]` est 0 ou 1 (parallèle à cells).
Les stamps stockent leur image en data URL inline dans `src`.

### CellType

```
Wall=0, Floor=1, Door=2, Corridor=3,
Water=4, Lava=5, Fire=6,    // animés via Pixi ticker
Grass=7, TallGrass=8        // texture statique
```

## Layers Pixi (ordre z, bas → haut)

```
tiles → animations → grid → decor → tokens → fog → overlay
```

- `tiles` : bg, fills (floor/corridor/water/lava/fire/grass), walls (traits), doors
- `animations` : eau/lave/feu redessinés à chaque tick (proportionnel à `performance.now()`)
- `grid` : grille de tile boundaries, optionnelle
- `decor` : sprites décor (libres, taille variable)
- `tokens` : sprites tokens (snap grille, taille tile)
- `fog` : voile noir sur cells fogged. Alpha 0.55 en DM view, 1.0 en player view
- `overlay` : cadres de sélection cyan + handles (resize/rotate) + marquee

## Persistence & auto-save

`localStorage` keys : `dnd:campaigns:index` (liste de metas) + `dnd:campaigns:item:<id>` (campagne complète).

Auto-save **debounced à 300ms** : tout changement de `campaign` state déclenche
un setTimeout qui écrit en localStorage. Flash "EDITED" visuel court.

Migration auto :
- legacy `dnd:maps:*` → campagnes single-scene au premier load (puis suppression des vieilles clés)
- `dungeon.fog` manquant → initialisé à zéros
- `scene.initiative` manquant → `emptyInitiative()`

## Mutations immutables + history

Pattern central. Chaque opération utilisateur :
1. `beginOp()` capture un `cloneDungeon` du donjon courant (PRE state)
2. Mutation imperative sur `dungeonRef.current` (rapide, pas de re-render React)
3. `commitOp()` :
   - push PRE dans history stack (`history.commit`)
   - clone le donjon courant et le pose dans la scène active du campaign
   - `setCampaign(newCampaign)` → useEffect re-render + auto-save

`cloneDungeon` est une copie *suffisamment détachée* : nouveau cells array, nouveau
stamps array (shallow-clone des stamps), fog array copié. `src` strings partagés
(les data URLs ne sont JAMAIS dupliqués → snapshot léger malgré les images embarquées).

Pour les actions atomiques (delete, duplicate, reorder, switch layer, fillFog…),
helper `commitImmediate(mutate)` qui fait le snapshot + apply + commit en une passe.

**Historique scoped par scène** : history.clear() au switch de scène. Pas de
persistance de l'historique (in-memory seulement, perdu au reload).

## Pointer flow (state machine)

`modeRef.current` est de type union :
```ts
'idle' | 'drag' | 'marquee' | 'paint'
      | { kind: 'handle', handleKind, stampId, original }
```

Sur pointerdown, dispatch par priorité :
1. **Handle** sur le stamp seul sélectionné → resize/rotate
2. **Stamp hit** → select + drag (peu importe le tool actif, les stamps sont toujours interactifs)
3. **Vide** : si tool=`select` → marquee ; sinon → paint avec le tool

Shift+clic sur stamp = toggle dans la sélection.
Shift+marquee = additif (préserve la sélection précédente).

## Pan / zoom (PixiCanvas)

- **Wheel / scroll** = pan (deltaX horizontal, deltaY vertical)
- **Shift+wheel** = pan horizontal forcé pour souris verticale
- **Cmd/Ctrl+wheel** = zoom proportionnel `Math.exp(-deltaY*0.01)`, ancré au curseur
- **Pinch trackpad Mac** = idem zoom (le navigateur émet wheel + ctrlKey=true)
- **Middle-click drag** ou **Space+drag** = pan
- **Right-click** = capté via event `contextmenu` natif (fiable sur tous OS contrairement à pointerdown button=2)

PixiCanvas expose `CanvasApi { setViewport, getViewport }` via `onReady` —
**ne JAMAIS modifier `world.position/scale` directement** depuis l'extérieur,
toujours passer par `api.setViewport`. Sinon les coords écran↔monde se désynchronisent
(bug réglé après un refresh où les clics atterrissaient à côté du curseur).

## Outils

Palette gauche, `ToolId = 'select' | 'fog' | 'reveal' | CellTypeValue` :

- **SELECT** (défaut) : drag/marquee/handles/rotate
- **WALL / FLOOR / CORRIDOR / DOOR** : brushes cellules
- **WATER / LAVA / FIRE** : brushes textures animées
- **GRASS / TALL GRASS** : brushes textures statiques
- **HIDE (fog) / REVEAL** : peint/efface le fog of war

Tools de peinture utilisent tous le même paint-flow (commit avec last-painted-tile cache).

## Stamps (sprites image)

- **Drag & drop** d'un PNG/JPG sur le canvas → place le stamp au point du drop
- **UPLOAD** dans la palette → file picker, place au centre du viewport
- Layer cible (DECOR / TOKEN) toggleable dans la palette
- TOKEN : snap grille, taille = TILE_SIZE (24px)
- DECOR : libre, taille = 2× TILE_SIZE par défaut
- Resize/rotate via handles quand exactement 1 sélectionné
- Z-order = ordre dans `dungeon.stamps` array. `syncStamps` réordonne via `addChild`
- Clic droit sur stamp → menu (DUPLICATE / BRING TO FRONT / SEND TO BACK / SWITCH LAYER / DELETE)

## Décisions / contexte

- **Pas de backend** pour le moment. Discuté Cloudflare R2 pour images partagées,
  reporté tant que l'usage reste solo.
- **Pas de Turborepo** ; pnpm workspace simple suffit à la taille actuelle.
- Default tool = **select** (sinon les nouveaux utilisateurs paignent par accident
  en cliquant sur les stamps).
- Stamps **interactifs même en mode peinture** : un clic sur un stamp le sélectionne
  toujours, le paint n'agit que sur les cellules vides (priorité hit > paint).
- **Auto-save explicite > bouton SAVE manuel** car le user mute du temps en édition,
  on évite la perte de travail.
- **Multi-scènes > campaign monolithique** pour permettre au MJ de pré-construire
  plusieurs lieux d'une session et switcher rapidement.

## Roadmap restante

Suivante : audio par scène (drop MP3, loop, crossfade — pattern similaire aux stamps).
Plus tard : dice roller, notes par scène, light/vision, player view (window.open),
intégration multi-joueur via backend Go + R2 si jamais besoin.

## Conventions à respecter

- **Imports type-only** : `import type` quand on n'importe que des types
- **Pas de cast TS** (cf. `feedback_no_cast.md` mémoire) : préférer derive ou `satisfies`
- **Spacing parent** : gap/space-* sur le parent, pas de margin entre siblings
- **CpcButton from @vigooth/ui** plutôt que `<button>` brut
- **Extraire les handlers JSX** quand ils contiennent de la logique
- **No `Array#sort()`** → `toSorted()` (oxlint le bloque)
- Lint warnings tolérables (~13 sur l'app), errors = 0 obligatoire
- **Mode de mutation** : passe toujours par `commitImmediate` ou `beginOp/commitOp`
  pour que l'undo et l'auto-save marchent
