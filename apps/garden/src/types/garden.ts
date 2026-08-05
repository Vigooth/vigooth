/** Mirrors services/api/internal/model/garden.go. Dates are always YYYY-MM-DD. */

export type BedKind = 'bed' | 'row' | 'pot' | 'greenhouse';

export type PhaseKind = 'sowing' | 'planting' | 'growth' | 'flowering' | 'harvest';

export interface Point {
  x: number;
  y: number;
}

export interface Bed {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  area_m2?: number;
  /** Polygon on the traced plan, in normalised 0..1 coordinates. */
  shape?: Point[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Plant {
  id: string;
  user_id: string;
  name: string;
  latin_name: string;
  family: string;
  description: string;
  sun: string;
  water: string;
  spacing_cm?: number;
  has_photo: boolean;
  photo_mime?: string;
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: string;
  occupation_id: string;
  kind: string;
  starts_on: string;
  ends_on: string;
}

export interface Occupation {
  id: string;
  user_id: string;
  plant_id: string;
  bed_id: string;
  starts_on: string;
  ends_on: string;
  notes: string;
  phases: Phase[];
  created_at: string;
  updated_at: string;
}

export interface Conflict {
  bed_id: string;
  occupation_a_id: string;
  occupation_b_id: string;
  overlap_start: string;
  overlap_end: string;
  overlap_dayspan: number;
}

export interface Garden {
  beds: Bed[];
  plants: Plant[];
  occupations: Occupation[];
  /** Computed server-side, so the timeline and any later consumer agree. */
  conflicts: Conflict[];
}

export interface SaveBedInput {
  name: string;
  kind?: string;
  area_m2?: number | null;
  shape?: Point[];
  sort_order?: number;
}

export interface SavePlantInput {
  name: string;
  latin_name?: string;
  family?: string;
  description?: string;
  sun?: string;
  water?: string;
  spacing_cm?: number | null;
}

export interface PhaseInput {
  kind: string;
  starts_on: string;
  ends_on: string;
}

export interface SaveOccupationInput {
  plant_id: string;
  bed_id: string;
  starts_on: string;
  ends_on: string;
  notes?: string;
  phases?: PhaseInput[];
}

export const BED_KINDS: readonly BedKind[] = ['bed', 'row', 'pot', 'greenhouse'];

export const PHASE_KINDS: readonly PhaseKind[] = [
  'sowing',
  'planting',
  'growth',
  'flowering',
  'harvest',
];

export const PHASE_LABELS: Record<PhaseKind, string> = {
  sowing: 'Semis',
  planting: 'Plantation',
  growth: 'Croissance',
  flowering: 'Floraison',
  harvest: 'Récolte',
};

export const BED_KIND_LABELS: Record<BedKind, string> = {
  bed: 'Bac',
  row: 'Rang',
  pot: 'Pot',
  greenhouse: 'Serre',
};
