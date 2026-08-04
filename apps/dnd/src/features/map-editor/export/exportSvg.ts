import { CellType, cellAt, type CellTypeValue, type Dungeon, type Stamp } from '@/types/dungeon';
import { defaultRenderOptions } from '../render/renderDungeon';

export interface ExportSvgOptions {
  tileSize?: number;
  padding?: number;
}

const COLORS = {
  bg: defaultRenderOptions.bg,
  floor: defaultRenderOptions.floor,
  corridor: defaultRenderOptions.corridor,
  wallLine: defaultRenderOptions.wallLine,
  door: defaultRenderOptions.door,
  water: defaultRenderOptions.water,
  lava: defaultRenderOptions.lava,
  fire: defaultRenderOptions.fire,
  grass: 0x73a743,
  tallGrass: 0x3f7a35,
};

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function escapeXml(s: string): string {
  return s.replaceAll(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export function exportDungeonSvg(dungeon: Dungeon, options: ExportSvgOptions = {}): string {
  const ts = options.tileSize ?? 48;
  const padding = options.padding ?? 0;
  const width = dungeon.width * ts + padding * 2;
  const height = dungeon.height * ts + padding * 2;

  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  parts.push(`<rect width="${width}" height="${height}" fill="${hex(COLORS.bg)}"/>`);
  parts.push(`<g transform="translate(${padding} ${padding})">`);

  // Fills per cell type (grouped for compactness)
  const groups: Record<string, string[]> = {};
  const pushFill = (type: CellTypeValue | 'door-floor', color: number) => {
    const rects: string[] = [];
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const c = cellAt(dungeon, x, y);
        const match = type === 'door-floor' ? c === CellType.Door : c === type;
        if (match) rects.push(`<rect x="${x * ts}" y="${y * ts}" width="${ts}" height="${ts}"/>`);
      }
    }
    if (rects.length === 0) return;
    groups[`fill-${type}`] = [`<g fill="${hex(color)}">`, ...rects, `</g>`];
  };
  pushFill(CellType.Corridor, COLORS.corridor);
  pushFill(CellType.Floor, COLORS.floor);
  pushFill('door-floor', COLORS.floor);
  pushFill(CellType.Water, COLORS.water);
  pushFill(CellType.Lava, COLORS.lava);
  pushFill(CellType.Fire, COLORS.fire);
  pushFill(CellType.Grass, COLORS.grass);
  pushFill(CellType.TallGrass, COLORS.tallGrass);
  for (const group of Object.values(groups)) parts.push(...group);

  // Walls as polylines / segments
  const wallSegments: string[] = [];
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const c = cellAt(dungeon, x, y);
      if (c === CellType.Wall) continue;
      const px = x * ts;
      const py = y * ts;
      if (cellAt(dungeon, x, y - 1) === CellType.Wall) {
        wallSegments.push(`M${px} ${py}L${px + ts} ${py}`);
      }
      if (cellAt(dungeon, x, y + 1) === CellType.Wall) {
        wallSegments.push(`M${px} ${py + ts}L${px + ts} ${py + ts}`);
      }
      if (cellAt(dungeon, x - 1, y) === CellType.Wall) {
        wallSegments.push(`M${px} ${py}L${px} ${py + ts}`);
      }
      if (cellAt(dungeon, x + 1, y) === CellType.Wall) {
        wallSegments.push(`M${px + ts} ${py}L${px + ts} ${py + ts}`);
      }
    }
  }
  if (wallSegments.length > 0) {
    parts.push(
      `<path d="${wallSegments.join('')}" stroke="${hex(COLORS.wallLine)}" stroke-width="${Math.max(2, ts / 12)}" fill="none" stroke-linecap="square"/>`,
    );
  }

  // Doors
  const doorRects: string[] = [];
  const m = ts * 0.25;
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      if (cellAt(dungeon, x, y) !== CellType.Door) continue;
      doorRects.push(
        `<rect x="${x * ts + m}" y="${y * ts + m}" width="${ts - m * 2}" height="${ts - m * 2}"/>`,
      );
    }
  }
  if (doorRects.length > 0) {
    parts.push(
      `<g fill="${hex(COLORS.door)}" stroke="${hex(COLORS.wallLine)}">`,
      ...doorRects,
      `</g>`,
    );
  }

  // Stamps (decor under tokens) — embedded data URLs.
  // Skip stamps whose src is not a data URL to keep the SVG self-contained.
  const decor = dungeon.stamps.filter((s) => s.layer === 'decor');
  const tokens = dungeon.stamps.filter((s) => s.layer === 'token');
  for (const stamp of [...decor, ...tokens]) {
    if (!stamp.src.startsWith('data:')) continue;
    parts.push(renderStampSvg(stamp));
  }

  parts.push(`</g>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}

function renderStampSvg(stamp: Stamp): string {
  const cx = stamp.x;
  const cy = stamp.y;
  const w = stamp.width;
  const h = stamp.height;
  const rot = (stamp.rotation * 180) / Math.PI;
  const href = escapeXml(stamp.src);
  return `<image x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" xlink:href="${href}" transform="translate(${cx} ${cy}) rotate(${rot})"/>`;
}

export function downloadSvg(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
