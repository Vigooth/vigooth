import { Container, Graphics } from 'pixi.js';
import { fogAt, type Dungeon } from '@/types/dungeon';

const TILE_SIZE = 24;
const FOG_COLOR = 0x000000;

export type FogViewMode = 'dm' | 'player';

export function renderFog(
  layer: Container,
  dungeon: Dungeon,
  mode: FogViewMode,
  tileSize: number = TILE_SIZE,
): void {
  layer.removeChildren();
  const alpha = mode === 'player' ? 1 : 0.55;
  const g = new Graphics();
  let drew = false;
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      if (fogAt(dungeon, x, y) !== 1) continue;
      drew = true;
      g.rect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  if (drew) g.fill({ color: FOG_COLOR, alpha });
  layer.addChild(g);
}
