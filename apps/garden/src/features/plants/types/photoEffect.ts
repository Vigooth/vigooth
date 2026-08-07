/** Rendering treatment applied to every plant photo in the grid. */
export type PhotoEffect = 'vector' | 'matrix' | 'photo';

export const PHOTO_EFFECTS: { value: PhotoEffect; label: string }[] = [
  { value: 'vector', label: 'VECTEUR' },
  { value: 'matrix', label: 'MATRIX' },
  { value: 'photo', label: 'PHOTO' },
];

export const DEFAULT_PHOTO_EFFECT: PhotoEffect = 'vector';

export function photoEffectLabel(effect: PhotoEffect): string {
  return PHOTO_EFFECTS.find((entry) => entry.value === effect)?.label ?? '';
}
