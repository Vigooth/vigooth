import { useCallback, useEffect, useRef, useState } from 'react';
import type { Application, Container } from 'pixi.js';
import { generators, generatorMap, randomSeed } from '@/features/dungeon-generator';
import {
  PixiCanvas,
  renderDungeon,
  renderGrid,
  renderFog,
  type FogViewMode,
  createLayers,
  syncStamps,
  renderSelection,
  animatePatterns,
  hitTestHandle,
  applyResize,
  applyRotation,
  exportDungeonPng,
  downloadBlob,
  type HandleKind,
  type WorldPointerEvent,
  type ContextMenuEvent,
  type MapLayers,
  type MarqueeRect,
  type CanvasApi,
} from '@/features/map-editor';
import { useHistory } from '@/features/history';
import { useCampaigns, CampaignDialog } from '@/features/persistence';
import { InitiativePanel } from '@/features/initiative';
import type { InitiativeState } from '@/types/initiative';
import {
  activeScene as activeSceneOf,
  makeCampaign,
  makeScene,
  type Campaign,
  type Scene,
} from '@/types/campaign';
import {
  cloneDungeon,
  fillFog,
  setFog,
  type Dungeon,
  type Stamp,
  type StampLayer,
  setCell,
} from '@/types/dungeon';
import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import { EditorHeader } from '../components/EditorHeader';
import { ToolPalette, type ToolId } from '../components/ToolPalette';
import { SceneTabs } from '../components/SceneTabs';

const TILE_SIZE = 24;
const TOKEN_SIZE = TILE_SIZE;
const DECOR_SIZE = TILE_SIZE * 2;

type Mode =
  | { kind: 'idle' }
  | { kind: 'drag' }
  | { kind: 'marquee' }
  | { kind: 'paint' }
  | { kind: 'handle'; handleKind: HandleKind; stampId: string; original: Stamp };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function makeInitialCampaign(): Campaign {
  const dungeon = generators[0].generate({ width: 48, height: 32, seed: randomSeed() });
  const scene = makeScene('Scene 1', dungeon);
  return makeCampaign('Untitled Campaign', scene);
}

function withUpdatedActiveScene(campaign: Campaign, newDungeon: Dungeon): Campaign {
  const now = Date.now();
  return {
    ...campaign,
    scenes: campaign.scenes.map((s) =>
      s.id === campaign.activeSceneId ? { ...s, dungeon: newDungeon, updatedAt: now } : s,
    ),
    updatedAt: now,
  };
}

interface CtxMenuState {
  x: number;
  y: number;
  stampIds: string[];
}

export function EditorPage() {
  const { campaigns, save: persistSave, load: persistLoad, remove: persistRemove, rename: persistRename } =
    useCampaigns();

  const [campaign, setCampaign] = useState<Campaign>(() => {
    if (campaigns.length > 0) {
      const loaded = persistLoad(campaigns[0].id);
      if (loaded) return loaded;
    }
    return makeInitialCampaign();
  });

  const scene = activeSceneOf(campaign);
  const dungeon = scene.dungeon;

  const [seed, setSeed] = useState(dungeon.seed);
  const [width, setWidth] = useState(dungeon.width);
  const [height, setHeight] = useState(dungeon.height);
  const [algoId, setAlgoId] = useState('rooms');
  const [tool, setTool] = useState<ToolId>('select');
  const [dropLayer, setDropLayer] = useState<StampLayer>('decor');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [gridVisible, setGridVisible] = useState(false);
  const [playerView, setPlayerView] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const history = useHistory<Dungeon>();

  const worldRef = useRef<Container | null>(null);
  const appRef = useRef<Application | null>(null);
  const apiRef = useRef<CanvasApi | null>(null);
  const layersRef = useRef<MapLayers | null>(null);
  const dungeonRef = useRef(dungeon);
  const campaignRef = useRef(campaign);
  const toolRef = useRef<ToolId>(tool);
  const selectedRef = useRef<Set<string>>(new Set());
  const gridVisibleRef = useRef(gridVisible);
  const playerViewRef = useRef(playerView);
  const lastPaintedRef = useRef<{ x: number; y: number } | null>(null);
  const modeRef = useRef<Mode>({ kind: 'idle' });
  const dragOriginsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const cursorStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const marqueeRef = useRef<MarqueeRect | null>(null);
  const prevSelectedAtStartRef = useRef<Set<string>>(new Set());
  const preSnapshotRef = useRef<Dungeon | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadLayerRef = useRef<StampLayer>('decor');
  const previousSceneIdRef = useRef<string>(campaign.activeSceneId);

  dungeonRef.current = dungeon;
  campaignRef.current = campaign;
  toolRef.current = tool;
  selectedRef.current = selectedIds;
  gridVisibleRef.current = gridVisible;
  playerViewRef.current = playerView;

  // Auto-save with debounce on campaign changes
  useEffect(() => {
    const t = setTimeout(() => {
      persistSave(campaign);
      setSavedFlash(true);
      const flashT = setTimeout(() => setSavedFlash(false), 800);
      return () => clearTimeout(flashT);
    }, 300);
    return () => clearTimeout(t);
  }, [campaign, persistSave]);

  // Clear history on scene switch
  useEffect(() => {
    if (previousSceneIdRef.current !== campaign.activeSceneId) {
      history.clear();
      setSelectedIds(new Set());
      selectedRef.current = new Set();
      setSeed(dungeon.seed);
      setWidth(dungeon.width);
      setHeight(dungeon.height);
      previousSceneIdRef.current = campaign.activeSceneId;
    }
  }, [campaign.activeSceneId, dungeon.seed, dungeon.width, dungeon.height, history]);

  // --- rendering ---

  const refreshOverlay = useCallback(() => {
    const layers = layersRef.current;
    if (!layers) return;
    const sel = dungeonRef.current.stamps.filter((s) => selectedRef.current.has(s.id));
    renderSelection(layers.overlay, sel, marqueeRef.current, toolRef.current === 'select');
  }, []);

  const refreshGrid = useCallback(() => {
    const layers = layersRef.current;
    if (!layers) return;
    renderGrid(layers.grid, gridVisibleRef.current, {
      tileSize: TILE_SIZE,
      width: dungeonRef.current.width,
      height: dungeonRef.current.height,
    });
  }, []);

  const refreshFog = useCallback(() => {
    const layers = layersRef.current;
    if (!layers) return;
    const mode: FogViewMode = playerViewRef.current ? 'player' : 'dm';
    renderFog(layers.fog, dungeonRef.current, mode, TILE_SIZE);
  }, []);

  const handleReady = useCallback(
    (world: Container, app: Application, api: CanvasApi) => {
      worldRef.current = world;
      appRef.current = app;
      apiRef.current = api;
      layersRef.current = createLayers(world);
      renderDungeon(layersRef.current.tiles, dungeonRef.current);
      void syncStamps(layersRef.current, dungeonRef.current.stamps);
      refreshGrid();
      refreshFog();
      fitToView(api, app, dungeonRef.current.width, dungeonRef.current.height);

      const tick = () => {
        const layers = layersRef.current;
        if (!layers) return;
        animatePatterns(layers, dungeonRef.current, performance.now());
      };
      app.ticker.add(tick);
    },
    [refreshGrid, refreshFog],
  );

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;
    renderDungeon(layers.tiles, dungeon);
    void syncStamps(layers, dungeon.stamps);
    refreshGrid();
    refreshFog();
    refreshOverlay();
  }, [dungeon, refreshGrid, refreshFog, refreshOverlay]);

  useEffect(() => {
    refreshOverlay();
  }, [selectedIds, refreshOverlay]);

  useEffect(() => {
    refreshOverlay();
  }, [tool, refreshOverlay]);

  useEffect(() => {
    refreshGrid();
  }, [gridVisible, refreshGrid]);

  useEffect(() => {
    refreshFog();
  }, [playerView, refreshFog]);

  // Re-fit view when scene changes
  useEffect(() => {
    const api = apiRef.current;
    const app = appRef.current;
    if (!api || !app) return;
    fitToView(api, app, dungeon.width, dungeon.height);
  }, [campaign.activeSceneId, dungeon.width, dungeon.height]);

  // --- history + persistence helpers ---

  const beginOp = useCallback(() => {
    preSnapshotRef.current = cloneDungeon(dungeonRef.current);
  }, []);

  const applyDungeonMutation = useCallback((newDungeon: Dungeon) => {
    const next = withUpdatedActiveScene(campaignRef.current, newDungeon);
    campaignRef.current = next;
    setCampaign(next);
  }, []);

  const commitOp = useCallback(() => {
    if (!preSnapshotRef.current) return;
    history.commit(preSnapshotRef.current);
    preSnapshotRef.current = null;
    applyDungeonMutation(cloneDungeon(dungeonRef.current));
  }, [history, applyDungeonMutation]);

  const commitImmediate = useCallback(
    (mutate: (d: Dungeon) => void) => {
      const before = cloneDungeon(dungeonRef.current);
      mutate(dungeonRef.current);
      history.commit(before);
      applyDungeonMutation(cloneDungeon(dungeonRef.current));
    },
    [history, applyDungeonMutation],
  );

  const handleUndo = useCallback(() => {
    const prev = history.undo(cloneDungeon(dungeonRef.current));
    if (!prev) return;
    setSelectedIds(new Set());
    selectedRef.current = new Set();
    applyDungeonMutation(prev);
  }, [history, applyDungeonMutation]);

  const handleRedo = useCallback(() => {
    const next = history.redo(cloneDungeon(dungeonRef.current));
    if (!next) return;
    setSelectedIds(new Set());
    selectedRef.current = new Set();
    applyDungeonMutation(next);
  }, [history, applyDungeonMutation]);

  // --- hit testing ---

  const findStampAt = useCallback((worldX: number, worldY: number): Stamp | null => {
    const stamps = dungeonRef.current.stamps;
    for (let i = stamps.length - 1; i >= 0; i--) {
      const s = stamps[i];
      if (s.layer !== 'token') continue;
      if (hitTestStamp(s, worldX, worldY)) return s;
    }
    for (let i = stamps.length - 1; i >= 0; i--) {
      const s = stamps[i];
      if (s.layer !== 'decor') continue;
      if (hitTestStamp(s, worldX, worldY)) return s;
    }
    return null;
  }, []);

  // --- paint ---

  const paintAt = useCallback(
    (worldX: number, worldY: number) => {
      const tx = Math.floor(worldX / TILE_SIZE);
      const ty = Math.floor(worldY / TILE_SIZE);
      const d = dungeonRef.current;
      if (tx < 0 || ty < 0 || tx >= d.width || ty >= d.height) return;
      const last = lastPaintedRef.current;
      if (last && last.x === tx && last.y === ty) return;
      lastPaintedRef.current = { x: tx, y: ty };
      const t = toolRef.current;
      if (t === 'select') return;
      if (t === 'fog' || t === 'reveal') {
        setFog(d, tx, ty, t === 'fog' ? 1 : 0);
        refreshFog();
        return;
      }
      setCell(d, tx, ty, t);
      const layers = layersRef.current;
      if (layers) renderDungeon(layers.tiles, d);
    },
    [refreshFog],
  );

  // --- stamp multi-drag ---

  const startMultiDrag = useCallback((cursorX: number, cursorY: number) => {
    cursorStartRef.current = { x: cursorX, y: cursorY };
    const origins = new Map<string, { x: number; y: number }>();
    for (const s of dungeonRef.current.stamps) {
      if (selectedRef.current.has(s.id)) origins.set(s.id, { x: s.x, y: s.y });
    }
    dragOriginsRef.current = origins;
    modeRef.current = { kind: 'drag' };
  }, []);

  const moveMultiDrag = useCallback(
    (cursorX: number, cursorY: number) => {
      const dx = cursorX - cursorStartRef.current.x;
      const dy = cursorY - cursorStartRef.current.y;
      const d = dungeonRef.current;
      for (const stamp of d.stamps) {
        const origin = dragOriginsRef.current.get(stamp.id);
        if (!origin) continue;
        let nx = origin.x + dx;
        let ny = origin.y + dy;
        if (stamp.layer === 'token') {
          nx = Math.floor(nx / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
          ny = Math.floor(ny / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        }
        stamp.x = nx;
        stamp.y = ny;
      }
      const layers = layersRef.current;
      if (layers) {
        void syncStamps(layers, d.stamps);
        refreshOverlay();
      }
    },
    [refreshOverlay],
  );

  // --- marquee ---

  const updateMarquee = useCallback(
    (cursorX: number, cursorY: number) => {
      const start = cursorStartRef.current;
      marqueeRef.current = {
        x: Math.min(start.x, cursorX),
        y: Math.min(start.y, cursorY),
        width: Math.abs(cursorX - start.x),
        height: Math.abs(cursorY - start.y),
      };
      refreshOverlay();
    },
    [refreshOverlay],
  );

  const finalizeMarquee = useCallback(
    (additive: boolean) => {
      const rect = marqueeRef.current;
      marqueeRef.current = null;
      if (!rect) {
        refreshOverlay();
        return;
      }
      const hit = new Set<string>();
      for (const s of dungeonRef.current.stamps) {
        if (
          s.x >= rect.x &&
          s.x <= rect.x + rect.width &&
          s.y >= rect.y &&
          s.y <= rect.y + rect.height
        ) {
          hit.add(s.id);
        }
      }
      const next = new Set(additive ? prevSelectedAtStartRef.current : []);
      for (const id of hit) next.add(id);
      setSelectedIds(next);
      selectedRef.current = next;
    },
    [refreshOverlay],
  );

  // --- handle drag ---

  const applyHandleDrag = useCallback(
    (cursorX: number, cursorY: number) => {
      const m = modeRef.current;
      if (m.kind !== 'handle') return;
      const d = dungeonRef.current;
      const stamp = d.stamps.find((s) => s.id === m.stampId);
      if (!stamp) return;
      if (m.handleKind === 'rotate') {
        stamp.rotation = applyRotation(m.original, cursorStartRef.current, {
          x: cursorX,
          y: cursorY,
        });
      } else {
        const next = applyResize(m.original, m.handleKind, { x: cursorX, y: cursorY });
        stamp.x = next.x;
        stamp.y = next.y;
        stamp.width = next.width;
        stamp.height = next.height;
      }
      const layers = layersRef.current;
      if (layers) {
        void syncStamps(layers, d.stamps);
        refreshOverlay();
      }
    },
    [refreshOverlay],
  );

  // --- main pointer flow ---

  const handleWorldPointer = useCallback(
    (e: WorldPointerEvent) => {
      if (e.phase === 'down') {
        if (selectedRef.current.size === 1) {
          const onlyId = Array.from(selectedRef.current)[0];
          const stamp = dungeonRef.current.stamps.find((s) => s.id === onlyId);
          if (stamp) {
            const handle = hitTestHandle(stamp, e.worldX, e.worldY);
            if (handle) {
              beginOp();
              cursorStartRef.current = { x: e.worldX, y: e.worldY };
              modeRef.current = {
                kind: 'handle',
                handleKind: handle,
                stampId: stamp.id,
                original: { ...stamp },
              };
              return;
            }
          }
        }

        const hit = findStampAt(e.worldX, e.worldY);
        prevSelectedAtStartRef.current = new Set(selectedRef.current);
        if (hit) {
          if (e.shiftKey) {
            const next = new Set(selectedRef.current);
            if (next.has(hit.id)) next.delete(hit.id);
            else next.add(hit.id);
            setSelectedIds(next);
            selectedRef.current = next;
            modeRef.current = { kind: 'idle' };
          } else {
            if (!selectedRef.current.has(hit.id)) {
              const next = new Set([hit.id]);
              setSelectedIds(next);
              selectedRef.current = next;
            }
            beginOp();
            startMultiDrag(e.worldX, e.worldY);
          }
          return;
        }

        if (toolRef.current === 'select') {
          if (!e.shiftKey) {
            setSelectedIds(new Set());
            selectedRef.current = new Set();
          }
          cursorStartRef.current = { x: e.worldX, y: e.worldY };
          marqueeRef.current = { x: e.worldX, y: e.worldY, width: 0, height: 0 };
          modeRef.current = { kind: 'marquee' };
          refreshOverlay();
        } else {
          beginOp();
          modeRef.current = { kind: 'paint' };
          paintAt(e.worldX, e.worldY);
        }
      } else if (e.phase === 'move') {
        const m = modeRef.current;
        if (m.kind === 'drag') moveMultiDrag(e.worldX, e.worldY);
        else if (m.kind === 'marquee') updateMarquee(e.worldX, e.worldY);
        else if (m.kind === 'handle') applyHandleDrag(e.worldX, e.worldY);
        else if (m.kind === 'paint') paintAt(e.worldX, e.worldY);
      } else {
        const m = modeRef.current;
        if (m.kind === 'drag' || m.kind === 'handle') commitOp();
        else if (m.kind === 'paint') {
          lastPaintedRef.current = null;
          commitOp();
        } else if (m.kind === 'marquee') finalizeMarquee(e.shiftKey);
        modeRef.current = { kind: 'idle' };
      }
    },
    [
      applyHandleDrag,
      beginOp,
      commitOp,
      findStampAt,
      finalizeMarquee,
      moveMultiDrag,
      paintAt,
      refreshOverlay,
      startMultiDrag,
      updateMarquee,
    ],
  );

  const handleContextMenu = useCallback(
    (e: ContextMenuEvent): boolean => {
      const hit = findStampAt(e.worldX, e.worldY);
      if (!hit) {
        setCtxMenu(null);
        return false;
      }
      let ids: string[];
      if (selectedRef.current.has(hit.id)) {
        ids = Array.from(selectedRef.current);
      } else {
        const next = new Set([hit.id]);
        setSelectedIds(next);
        selectedRef.current = next;
        ids = [hit.id];
      }
      setCtxMenu({ x: e.clientX, y: e.clientY, stampIds: ids });
      return true;
    },
    [findStampAt],
  );

  // --- stamp ops ---

  const duplicateStamps = useCallback(
    (ids: string[]) => {
      commitImmediate((d) => {
        const newIds = new Set<string>();
        const newStamps = [...d.stamps];
        for (const id of ids) {
          const orig = d.stamps.find((s) => s.id === id);
          if (!orig) continue;
          const copy: Stamp = {
            ...orig,
            id: crypto.randomUUID(),
            x: orig.x + TILE_SIZE,
            y: orig.y + TILE_SIZE,
          };
          newStamps.push(copy);
          newIds.add(copy.id);
        }
        d.stamps = newStamps;
        setSelectedIds(newIds);
        selectedRef.current = newIds;
      });
    },
    [commitImmediate],
  );

  const reorderStamps = useCallback(
    (ids: string[], direction: 'front' | 'back') => {
      commitImmediate((d) => {
        const idSet = new Set(ids);
        const targets = d.stamps.filter((s) => idSet.has(s.id));
        const others = d.stamps.filter((s) => !idSet.has(s.id));
        d.stamps = direction === 'front' ? [...others, ...targets] : [...targets, ...others];
      });
    },
    [commitImmediate],
  );

  const switchLayer = useCallback(
    (ids: string[]) => {
      commitImmediate((d) => {
        for (const stamp of d.stamps) {
          if (!ids.includes(stamp.id)) continue;
          const target: StampLayer = stamp.layer === 'token' ? 'decor' : 'token';
          stamp.layer = target;
          if (target === 'token') {
            stamp.width = TOKEN_SIZE;
            stamp.height = TOKEN_SIZE;
            stamp.x = Math.floor(stamp.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
            stamp.y = Math.floor(stamp.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
          } else {
            stamp.width = DECOR_SIZE;
            stamp.height = DECOR_SIZE;
          }
        }
      });
    },
    [commitImmediate],
  );

  const deleteStamps = useCallback(
    (ids: string[]) => {
      commitImmediate((d) => {
        const idSet = new Set(ids);
        d.stamps = d.stamps.filter((s) => !idSet.has(s.id));
      });
      setSelectedIds(new Set());
      selectedRef.current = new Set();
    },
    [commitImmediate],
  );

  const addStamp = useCallback(
    (src: string, worldX: number, worldY: number, layer: StampLayer) => {
      const size = layer === 'token' ? TOKEN_SIZE : DECOR_SIZE;
      let x = worldX;
      let y = worldY;
      if (layer === 'token') {
        x = Math.floor(worldX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        y = Math.floor(worldY / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      }
      commitImmediate((d) => {
        const stamp: Stamp = {
          id: crypto.randomUUID(),
          src,
          x,
          y,
          width: size,
          height: size,
          rotation: 0,
          layer,
        };
        d.stamps = [...d.stamps, stamp];
        const next = new Set([stamp.id]);
        setSelectedIds(next);
        selectedRef.current = next;
      });
    },
    [commitImmediate],
  );

  // --- file IO ---

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      const world = worldRef.current;
      if (!world) return;
      const localX = (e.clientX - world.worldTransform.tx) / world.worldTransform.a;
      const localY = (e.clientY - world.worldTransform.ty) / world.worldTransform.d;
      for (const file of files) {
        const src = await readFileAsDataUrl(file);
        addStamp(src, localX, localY, dropLayer);
      }
    },
    [addStamp, dropLayer],
  );

  const handleUploadClick = useCallback(() => {
    pendingUploadLayerRef.current = dropLayer;
    fileInputRef.current?.click();
  }, [dropLayer]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
      e.target.value = '';
      if (!files.length) return;
      const world = worldRef.current;
      const app = appRef.current;
      if (!world || !app) return;
      const wx = (app.screen.width / 2 - world.worldTransform.tx) / world.worldTransform.a;
      const wy = (app.screen.height / 2 - world.worldTransform.ty) / world.worldTransform.d;
      for (const file of files) {
        const src = await readFileAsDataUrl(file);
        addStamp(src, wx, wy, pendingUploadLayerRef.current);
      }
    },
    [addStamp],
  );

  // --- scenes ---

  const switchScene = useCallback((id: string) => {
    setCampaign((c) => ({ ...c, activeSceneId: id, updatedAt: Date.now() }));
  }, []);

  const addScene = useCallback(() => {
    const algo = generatorMap.get(algoId) ?? generators[0];
    const newDungeon = algo.generate({ width, height, seed: randomSeed() });
    setCampaign((c) => {
      const created = makeScene(`Scene ${c.scenes.length + 1}`, newDungeon);
      return {
        ...c,
        scenes: [...c.scenes, created],
        activeSceneId: created.id,
        updatedAt: Date.now(),
      };
    });
  }, [algoId, height, width]);

  const renameScene = useCallback((id: string, name: string) => {
    setCampaign((c) => ({
      ...c,
      scenes: c.scenes.map((s) =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const duplicateScene = useCallback((id: string) => {
    setCampaign((c) => {
      const orig = c.scenes.find((s) => s.id === id);
      if (!orig) return c;
      const copy: Scene = {
        ...makeScene(`${orig.name} (copy)`, cloneDungeon(orig.dungeon)),
      };
      return {
        ...c,
        scenes: [...c.scenes, copy],
        activeSceneId: copy.id,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const deleteScene = useCallback((id: string) => {
    setCampaign((c) => {
      if (c.scenes.length <= 1) return c;
      const remaining = c.scenes.filter((s) => s.id !== id);
      const activeSceneId =
        c.activeSceneId === id ? remaining[0].id : c.activeSceneId;
      return {
        ...c,
        scenes: remaining,
        activeSceneId,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // --- regenerate active scene ---

  const regenerate = useCallback(
    (newSeed: number, newAlgoId = algoId): boolean => {
      if (
        !window.confirm(
          'Regenerate the current scene? Local edits to this scene will be lost.',
        )
      ) {
        return false;
      }
      const algo = generatorMap.get(newAlgoId) ?? generators[0];
      const next = algo.generate({ width, height, seed: newSeed });
      setSeed(newSeed);
      applyDungeonMutation(next);
      setSelectedIds(new Set());
      selectedRef.current = new Set();
      history.clear();
      return true;
    },
    [algoId, applyDungeonMutation, height, history, width],
  );

  // --- initiative ---

  const updateInitiative = useCallback((next: InitiativeState) => {
    const now = Date.now();
    setCampaign((c) => ({
      ...c,
      scenes: c.scenes.map((s) =>
        s.id === c.activeSceneId ? { ...s, initiative: next, updatedAt: now } : s,
      ),
      updatedAt: now,
    }));
  }, []);

  // --- fog bulk ---

  const fogAll = useCallback(() => {
    commitImmediate((d) => fillFog(d, 1));
  }, [commitImmediate]);

  const revealAll = useCallback(() => {
    commitImmediate((d) => fillFog(d, 0));
  }, [commitImmediate]);

  // --- export ---

  const handleExport = useCallback(async () => {
    const blob = await exportDungeonPng(dungeonRef.current, { tileSize: 64, padding: 16 });
    const name = `${campaignRef.current.name}-${activeSceneOf(campaignRef.current).name}`
      .replace(/[^a-z0-9-_]+/gi, '_')
      .toLowerCase();
    downloadBlob(blob, `${name}.png`);
  }, []);

  // --- campaign management ---

  const loadCampaignById = useCallback(
    (id: string) => {
      const next = persistLoad(id);
      if (!next) return;
      setCampaign(next);
      history.clear();
      setCampaignDialogOpen(false);
    },
    [persistLoad, history],
  );

  const createCampaign = useCallback(
    (name: string) => {
      const d = generators[0].generate({ width: 48, height: 32, seed: randomSeed() });
      const newScene = makeScene('Scene 1', d);
      const newCampaign = makeCampaign(name, newScene);
      setCampaign(newCampaign);
      history.clear();
      setCampaignDialogOpen(false);
    },
    [history],
  );

  // --- keyboard ---

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRef.current.size === 0) return;
        e.preventDefault();
        deleteStamps(Array.from(selectedRef.current));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteStamps, handleRedo, handleUndo]);

  const ctxItems: ContextMenuItem[] = ctxMenu
    ? [
        { label: 'DUPLICATE', onClick: () => duplicateStamps(ctxMenu.stampIds) },
        { label: 'BRING TO FRONT', onClick: () => reorderStamps(ctxMenu.stampIds, 'front') },
        { label: 'SEND TO BACK', onClick: () => reorderStamps(ctxMenu.stampIds, 'back') },
        { label: 'SWITCH LAYER', onClick: () => switchLayer(ctxMenu.stampIds) },
        { label: 'DELETE', onClick: () => deleteStamps(ctxMenu.stampIds), danger: true },
      ]
    : [];

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-cpc-green-500 font-mono">
      <EditorHeader
        algoId={algoId}
        onAlgoChange={(id) => {
          if (regenerate(seed, id)) setAlgoId(id);
        }}
        seed={seed}
        onSeedChange={setSeed}
        width={width}
        onWidthChange={setWidth}
        height={height}
        onHeightChange={setHeight}
        edited={savedFlash}
        currentMapName={`${campaign.name} · ${scene.name}`}
        gridVisible={gridVisible}
        onGridToggle={() => setGridVisible((v) => !v)}
        playerView={playerView}
        onPlayerViewToggle={() => setPlayerView((v) => !v)}
        onFogAll={fogAll}
        onRevealAll={revealAll}
        initiativeOpen={initiativeOpen}
        onInitiativeToggle={() => setInitiativeOpen((v) => !v)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRender={() => regenerate(seed)}
        onNewSeed={() => regenerate(randomSeed())}
        onSave={() => setCampaignDialogOpen(true)}
        onLoad={() => setCampaignDialogOpen(true)}
        onExport={handleExport}
      />

      <SceneTabs
        scenes={campaign.scenes}
        activeSceneId={campaign.activeSceneId}
        onSwitch={switchScene}
        onAdd={addScene}
        onRename={renameScene}
        onDuplicate={duplicateScene}
        onDelete={deleteScene}
      />

      <div className="flex-1 flex">
        <ToolPalette
          tool={tool}
          onToolChange={setTool}
          dropLayer={dropLayer}
          onDropLayerChange={setDropLayer}
          onUploadClick={handleUploadClick}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
        />

        <div
          className="flex-1 relative min-w-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <PixiCanvas
            onReady={handleReady}
            onWorldPointer={handleWorldPointer}
            onContextMenu={handleContextMenu}
            className="absolute inset-0"
          />
          <div className="absolute bottom-2 left-2 text-cpc-green-900 text-xs pointer-events-none">
            ROOMS: {dungeon.rooms.length} · STAMPS: {dungeon.stamps.length} · SEL:{' '}
            {selectedIds.size}
          </div>
        </div>

        {initiativeOpen && (
          <InitiativePanel state={scene.initiative} onChange={updateInitiative} />
        )}
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {campaignDialogOpen && (
        <CampaignDialog
          campaigns={campaigns}
          currentId={campaign.id}
          usage={0}
          onLoad={loadCampaignById}
          onCreate={createCampaign}
          onRename={persistRename}
          onDelete={persistRemove}
          onClose={() => setCampaignDialogOpen(false)}
        />
      )}
    </div>
  );
}

function hitTestStamp(stamp: Stamp, x: number, y: number): boolean {
  const dx = x - stamp.x;
  const dy = y - stamp.y;
  const cos = Math.cos(-stamp.rotation);
  const sin = Math.sin(-stamp.rotation);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= stamp.width / 2 && Math.abs(ly) <= stamp.height / 2;
}

function fitToView(api: CanvasApi, app: Application, w: number, h: number) {
  const padding = 40;
  const scaleX = (app.screen.width - padding * 2) / (w * TILE_SIZE);
  const scaleY = (app.screen.height - padding * 2) / (h * TILE_SIZE);
  const scale = Math.min(scaleX, scaleY, 1);
  api.setViewport({
    x: (app.screen.width - w * TILE_SIZE * scale) / 2,
    y: (app.screen.height - h * TILE_SIZE * scale) / 2,
    scale,
  });
}
