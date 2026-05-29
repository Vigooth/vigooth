import type { Campaign, CampaignMeta } from '@/types/campaign';
import { campaignMeta, makeCampaign, makeScene } from '@/types/campaign';
import type { Dungeon } from '@/types/dungeon';
import { emptyInitiative } from '@/types/initiative';

const INDEX_KEY = 'dnd:campaigns:index';
const ITEM_PREFIX = 'dnd:campaigns:item:';

const LEGACY_INDEX_KEY = 'dnd:maps:index';
const LEGACY_ITEM_PREFIX = 'dnd:maps:item:';

interface LegacyMap {
  id: string;
  name: string;
  dungeon: Dungeon;
  createdAt: number;
  updatedAt: number;
}

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function migrateLegacyMaps(): void {
  const legacyIndex = readJson<{ id: string }[]>(LEGACY_INDEX_KEY);
  if (!legacyIndex || legacyIndex.length === 0) return;
  const existingIndex = readJson<CampaignMeta[]>(INDEX_KEY) ?? [];
  const existingIds = new Set(existingIndex.map((m) => m.id));

  for (const entry of legacyIndex) {
    const legacy = readJson<LegacyMap>(LEGACY_ITEM_PREFIX + entry.id);
    if (!legacy) continue;
    if (existingIds.has(legacy.id)) continue;
    const scene = makeScene(legacy.name, legacy.dungeon);
    scene.id = legacy.id; // reuse to preserve uniqueness
    scene.createdAt = legacy.createdAt;
    scene.updatedAt = legacy.updatedAt;
    const campaign = makeCampaign(legacy.name, scene);
    campaign.id = legacy.id;
    campaign.createdAt = legacy.createdAt;
    campaign.updatedAt = legacy.updatedAt;
    saveCampaign(campaign);
    localStorage.removeItem(LEGACY_ITEM_PREFIX + legacy.id);
  }
  localStorage.removeItem(LEGACY_INDEX_KEY);
}

export function listCampaigns(): CampaignMeta[] {
  const index = readJson<CampaignMeta[]>(INDEX_KEY);
  if (!index) return [];
  return index.toSorted((a, b) => b.updatedAt - a.updatedAt);
}

export function loadCampaign(id: string): Campaign | null {
  const c = readJson<Campaign>(ITEM_PREFIX + id);
  if (!c) return null;
  for (const scene of c.scenes) {
    const d = scene.dungeon;
    if (!Array.isArray(d.fog) || d.fog.length !== d.width * d.height) {
      d.fog = Array.from({ length: d.width * d.height }, () => 0);
    }
    if (!scene.initiative) {
      scene.initiative = emptyInitiative();
    }
  }
  return c;
}

export function saveCampaign(campaign: Campaign): CampaignMeta {
  const now = Date.now();
  const updated: Campaign = { ...campaign, updatedAt: now };
  writeJson(ITEM_PREFIX + updated.id, updated);

  const index = listCampaigns();
  const meta = campaignMeta(updated);
  const next = index.some((m) => m.id === meta.id)
    ? index.map((m) => (m.id === meta.id ? meta : m))
    : [...index, meta];
  writeJson(INDEX_KEY, next);
  return meta;
}

export function deleteCampaign(id: string): void {
  localStorage.removeItem(ITEM_PREFIX + id);
  const index = listCampaigns().filter((m) => m.id !== id);
  writeJson(INDEX_KEY, index);
}

export function renameCampaign(id: string, name: string): CampaignMeta | null {
  const campaign = loadCampaign(id);
  if (!campaign) return null;
  const updated: Campaign = { ...campaign, name, updatedAt: Date.now() };
  writeJson(ITEM_PREFIX + id, updated);
  const index = listCampaigns().map((m) =>
    m.id === id ? { ...m, name, updatedAt: updated.updatedAt } : m,
  );
  writeJson(INDEX_KEY, index);
  return campaignMeta(updated);
}

export function getUsageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('dnd:')) continue;
    const v = localStorage.getItem(key);
    if (v) total += key.length + v.length;
  }
  return total * 2;
}
