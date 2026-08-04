import { Application, Assets, Container, Sprite, Texture } from 'pixi.js';
import type { Dungeon } from '@/types/dungeon';
import { createLayers } from '../canvas/layers';
import { defaultRenderOptions, renderDungeon } from '../render/renderDungeon';
import { animatePatterns } from '../render/animatePatterns';

export interface ExportOptions {
  tileSize?: number;
  padding?: number;
}

export async function exportDungeonPng(dungeon: Dungeon, options: ExportOptions = {}): Promise<Blob> {
  const tileSize = options.tileSize ?? 48;
  const padding = options.padding ?? 0;

  const width = dungeon.width * tileSize + padding * 2;
  const height = dungeon.height * tileSize + padding * 2;

  const app = new Application();
  await app.init({
    width,
    height,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: false,
    resolution: 1,
  });

  try {
    const world = new Container();
    world.position.set(padding, padding);
    app.stage.addChild(world);
    const layers = createLayers(world);

    renderDungeon(layers.tiles, dungeon, { ...defaultRenderOptions, tileSize });
    animatePatterns(layers, dungeon, 0, { tileSize });

    const scale = tileSize / defaultRenderOptions.tileSize;
    await Promise.all(
      dungeon.stamps.map(async (stamp) => {
        const texture = await loadExportTexture(stamp.src);
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.position.set(stamp.x * scale, stamp.y * scale);
        sprite.width = stamp.width * scale;
        sprite.height = stamp.height * scale;
        sprite.rotation = stamp.rotation;
        const parent = stamp.layer === 'token' ? layers.tokens : layers.decor;
        parent.addChild(sprite);
      }),
    );

    app.render();
    const canvas = app.renderer.extract.canvas(app.stage) as HTMLCanvasElement;
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode PNG'));
      }, 'image/png');
    });
  } finally {
    app.destroy(true, { children: true });
  }
}

async function loadExportTexture(src: string): Promise<Texture> {
  try {
    return await Assets.load<Texture>({ src, loadParser: 'loadTextures' });
  } catch {
    return Texture.from(src);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
