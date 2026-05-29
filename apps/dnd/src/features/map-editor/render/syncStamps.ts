import { Sprite, Texture, Assets } from 'pixi.js';
import type { Stamp } from '@/types/dungeon';
import type { MapLayers } from '../canvas/layers';

const textureCache = new Map<string, Promise<Texture>>();

async function loadTexture(src: string): Promise<Texture> {
  const cached = textureCache.get(src);
  if (cached) return cached;
  const promise = Assets.load<Texture>({ src, loadParser: 'loadTextures' }).catch(() =>
    Texture.from(src),
  );
  textureCache.set(src, promise);
  return promise;
}

export async function syncStamps(layers: MapLayers, stamps: Stamp[]): Promise<void> {
  const byId = new Map<string, Sprite>();
  for (const child of [...layers.decor.children, ...layers.tokens.children]) {
    if (child instanceof Sprite && child.label) byId.set(child.label, child);
  }

  const keepIds = new Set(stamps.map((s) => s.id));
  for (const [id, sprite] of byId) {
    if (!keepIds.has(id)) {
      sprite.destroy();
      byId.delete(id);
    }
  }

  // Reorder + apply: addChild in array order to enforce z-order within each layer
  for (const stamp of stamps) {
    let sprite = byId.get(stamp.id);
    if (!sprite) {
      const newSprite = new Sprite();
      newSprite.label = stamp.id;
      newSprite.anchor.set(0.5);
      void loadTexture(stamp.src).then((tex) => {
        if (newSprite.destroyed) return;
        newSprite.texture = tex;
      });
      sprite = newSprite;
      byId.set(stamp.id, sprite);
    }
    const parent = stamp.layer === 'token' ? layers.tokens : layers.decor;
    parent.addChild(sprite); // moves to end if already present
    sprite.position.set(stamp.x, stamp.y);
    sprite.width = stamp.width;
    sprite.height = stamp.height;
    sprite.rotation = stamp.rotation;
  }
}
