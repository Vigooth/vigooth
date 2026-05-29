import type { Dungeon } from './dungeon';
import { emptyInitiative, type InitiativeState } from './initiative';

export interface Scene {
  id: string;
  name: string;
  dungeon: Dungeon;
  initiative: InitiativeState;
  createdAt: number;
  updatedAt: number;
}

export interface Campaign {
  id: string;
  name: string;
  scenes: Scene[];
  activeSceneId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CampaignMeta {
  id: string;
  name: string;
  sceneCount: number;
  createdAt: number;
  updatedAt: number;
}

export function makeScene(name: string, dungeon: Dungeon): Scene {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    dungeon,
    initiative: emptyInitiative(),
    createdAt: now,
    updatedAt: now,
  };
}

export function makeCampaign(name: string, firstScene: Scene): Campaign {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    scenes: [firstScene],
    activeSceneId: firstScene.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function activeScene(campaign: Campaign): Scene {
  return campaign.scenes.find((s) => s.id === campaign.activeSceneId) ?? campaign.scenes[0];
}

export function campaignMeta(c: Campaign): CampaignMeta {
  return {
    id: c.id,
    name: c.name,
    sceneCount: c.scenes.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
