import { generateRoomsDungeon } from './rooms';
import { generateBspDungeon } from './bsp';
import { generateCellularDungeon } from './cellular';
import { generateDrunkardDungeon } from './drunkard';
import { generateMazeDungeon } from './maze';
import type { GeneratorDef } from './types';

export const generators: GeneratorDef[] = [
  {
    id: 'rooms',
    label: 'ROOMS',
    description: 'Rooms + L-shaped corridors',
    generate: generateRoomsDungeon,
  },
  {
    id: 'bsp',
    label: 'BSP',
    description: 'Binary space partitioning',
    generate: generateBspDungeon,
  },
  {
    id: 'maze',
    label: 'MAZE',
    description: 'Rooms + maze + connectors (donjon.bin.sh style)',
    generate: generateMazeDungeon,
  },
  {
    id: 'caves',
    label: 'CAVES',
    description: 'Cellular automata caves',
    generate: generateCellularDungeon,
  },
  {
    id: 'drunkard',
    label: 'DRUNKARD',
    description: "Drunkard's walk",
    generate: generateDrunkardDungeon,
  },
];

export const generatorMap = new Map(generators.map((g) => [g.id, g]));

export type { GenerateOptions, GeneratorDef, GeneratorFn } from './types';
