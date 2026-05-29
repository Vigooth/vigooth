import type { Dungeon } from '@/types/dungeon';

export interface GenerateOptions {
  width: number;
  height: number;
  seed: number;
}

export type GeneratorFn = (opts: GenerateOptions) => Dungeon;

export interface GeneratorDef {
  id: string;
  label: string;
  description: string;
  generate: GeneratorFn;
}
