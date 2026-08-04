import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { AudioZone, SceneAudio } from '@/types/audio';

const IDLE_COLOR = 0x6cb2e0;
const PLAYING_COLOR = 0xffff00;

export function renderAudioZones(
  layer: Container,
  audio: SceneAudio,
  playingCueIds: Set<string>,
): void {
  layer.removeChildren();
  for (const zone of audio.zones) {
    const isPlaying = playingCueIds.has(zone.cueId);
    layer.addChild(drawZone(zone, isPlaying, audio.cues.find((c) => c.id === zone.cueId)?.name));
  }
}

function drawZone(zone: AudioZone, playing: boolean, cueName?: string): Container {
  const c = new Container();
  c.position.set(zone.x, zone.y);

  const g = new Graphics();
  const color = playing ? PLAYING_COLOR : IDLE_COLOR;
  g.circle(0, 0, zone.radius)
    .fill({ color, alpha: playing ? 0.15 : 0.06 })
    .stroke({ width: 2, color, alpha: playing ? 1 : 0.7 });
  // Speaker glyph at center
  g.circle(0, 0, 10).fill({ color: 0x000000, alpha: 0.6 }).stroke({ width: 1, color });
  c.addChild(g);

  const style = new TextStyle({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
    fill: color,
    fontWeight: 'bold',
  });
  const glyph = new Text({ text: playing ? '♫' : '♪', style });
  glyph.anchor.set(0.5);
  c.addChild(glyph);

  if (cueName) {
    const labelStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      fill: color,
    });
    const label = new Text({ text: cueName, style: labelStyle });
    label.anchor.set(0.5, 0);
    label.position.set(0, 14);
    c.addChild(label);
  }
  return c;
}

export function hitTestZone(audio: SceneAudio, worldX: number, worldY: number): AudioZone | null {
  // Iterate reverse so later-added zones win on overlap.
  for (let i = audio.zones.length - 1; i >= 0; i--) {
    const z = audio.zones[i];
    const dx = worldX - z.x;
    const dy = worldY - z.y;
    if (dx * dx + dy * dy <= z.radius * z.radius) return z;
  }
  return null;
}
