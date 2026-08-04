import { Container } from 'pixi.js';

export interface MapLayers {
  tiles: Container;
  animations: Container;
  grid: Container;
  decor: Container;
  tokens: Container;
  fog: Container;
  audio: Container;
  overlay: Container;
}

export function createLayers(world: Container): MapLayers {
  const tiles = new Container({ label: 'tiles' });
  const animations = new Container({ label: 'animations' });
  const grid = new Container({ label: 'grid' });
  const decor = new Container({ label: 'decor' });
  const tokens = new Container({ label: 'tokens' });
  const fog = new Container({ label: 'fog' });
  const audio = new Container({ label: 'audio' });
  const overlay = new Container({ label: 'overlay' });
  world.addChild(tiles, animations, grid, decor, tokens, fog, audio, overlay);
  return { tiles, animations, grid, decor, tokens, fog, audio, overlay };
}
