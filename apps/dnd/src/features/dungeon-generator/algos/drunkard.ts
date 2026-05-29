import { CellType, type Dungeon, cellAt, setCell } from '@/types/dungeon';
import { createRng } from '../rng';
import type { GenerateOptions } from './types';

const TARGET_FILL = 0.45;

export function generateDrunkardDungeon(opts: GenerateOptions): Dungeon {
  const { width, height, seed } = opts;
  const rng = createRng(seed);
  const dungeon: Dungeon = {
    width,
    height,
    cells: Array.from({ length: width * height }, () => CellType.Wall),
    rooms: [],
    stamps: [],
    fog: Array.from({ length: width * height }, () => 0),
    seed,
  };

  const target = Math.floor((width - 2) * (height - 2) * TARGET_FILL);
  let carved = 0;
  let x = Math.floor(width / 2);
  let y = Math.floor(height / 2);
  let safety = target * 20;

  while (carved < target && safety-- > 0) {
    if (cellAt(dungeon, x, y) === CellType.Wall) {
      setCell(dungeon, x, y, CellType.Floor);
      carved++;
    }
    const dir = rng.int(0, 3);
    if (dir === 0 && x > 1) x--;
    else if (dir === 1 && x < width - 2) x++;
    else if (dir === 2 && y > 1) y--;
    else if (dir === 3 && y < height - 2) y++;
  }

  return dungeon;
}
