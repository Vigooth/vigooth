import {
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  Vector3,
} from 'three';
import type { Bed, Occupation, Plant } from '@/types/garden';
import { polygonCentroid } from '@/utils/geometry';
import type { PlanFrame } from './layout';
import { polygonAreaM2, scatterInPolygon, seededRandom, toWorld } from './layout';
import type { GrowthStage } from './plantShapes';
import { buildPlant, recipeFor } from './plantShapes';

/**
 * The whole garden as a three.js group, generated from the plan and the
 * calendar. No asset is loaded: every bed is its traced polygon extruded, every
 * plant a recipe from ./plantShapes placed on a grid inside its bed.
 */

/** A bed's label, floating above it. Positions are world space. */
export interface BedAnchor {
  bedId: string;
  name: string;
  /** What grows there today, or null for bare soil. */
  planted: string | null;
  position: Vector3;
}

export interface GardenModel {
  group: Group;
  anchors: BedAnchor[];
  /** Clickable meshes and the bed each belongs to. */
  pickables: Map<Object3D, string>;
  /** Centroid of each shaped bed on the ground, for "go there" moves. */
  centres: Map<string, Vector3>;
  /** Each bed's footprint on the ground in world x/z, for the selection outline. */
  rings: Map<string, [number, number][]>;
}

const GRASS = 0x4c8c3f;
const SOIL = 0x5a3e2b;
const WOOD = 0x8b5a2b;
const TERRACOTTA = 0xb5651d;
const PATH = 0xa89f91;

const BED_WALL_HEIGHT = 0.35;
const ROW_HEIGHT = 0.12;
const GREENHOUSE_HEIGHT = 2.2;
/** Beyond this the scene gets heavy on phones; the grid is thinned, not cut. */
const MAX_PLANTS_PER_BED = 80;

const soilMaterial = new MeshLambertMaterial({ color: SOIL });
const woodMaterial = new MeshLambertMaterial({ color: WOOD });
const potMaterial = new MeshLambertMaterial({ color: TERRACOTTA });
const glassMaterial = new MeshLambertMaterial({
  color: 0xcfeeff,
  transparent: true,
  opacity: 0.28,
  side: DoubleSide,
  depthWrite: false,
});

/**
 * Extrude a ground polygon straight up. ExtrudeGeometry builds in the xy plane
 * and extrudes along +z, so the result is rotated to lie flat with the plan's
 * y becoming world z — the same mapping `toWorld` uses.
 */
function extrudeRing(
  ring: [number, number][],
  height: number,
  material: MeshLambertMaterial,
): Mesh {
  const shape = new Shape();
  ring.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  const mesh = new Mesh(geometry, material);
  // Lay the xy shape onto the xz ground; the extrusion then rises along +y.
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = height;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Shrink a ring towards its centre, for a soil top that sits inside the wood. */
function shrinkRing(ring: [number, number][], factor: number): [number, number][] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([x, z]) => [cx + (x - cx) * factor, cz + (z - cz) * factor]);
}

/**
 * Where a plant is in its life today. The phases are what the calendar shows;
 * a plant outside every phase is either not up yet or fully grown, depending
 * on which side of the phases today falls. No phases at all means the owner did
 * not bother, and a full-grown plant in bloom is the least surprising default.
 */
export function stageToday(occupation: Occupation, today: string): GrowthStage {
  if (occupation.phases.length === 0) return 'harvest';

  const current = occupation.phases.find((p) => p.starts_on <= today && today <= p.ends_on);
  if (current) {
    switch (current.kind) {
      case 'sowing':
        return 'sprout';
      case 'planting':
        return 'young';
      case 'growth':
        return 'growing';
      case 'flowering':
        return 'flowering';
      case 'harvest':
        return 'harvest';
      default:
        return 'growing';
    }
  }

  const first = occupation.phases.reduce((a, b) => (a.starts_on < b.starts_on ? a : b));
  return today < first.starts_on ? 'sprout' : 'harvest';
}

interface BuildInput {
  beds: Bed[];
  occupations: Occupation[];
  plants: Plant[];
  frame: PlanFrame;
  /** YYYY-MM-DD; what is planted is judged against this. */
  today: string;
}

function makeGround(frame: PlanFrame): Group {
  const ground = new Group();

  const lawn = new Mesh(
    new PlaneGeometry(frame.widthM + 6, frame.depthM + 6),
    new MeshLambertMaterial({ color: GRASS }),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  ground.add(lawn);

  // A faint lighter rectangle marks the plan's own extent, so the visitor can
  // tell where the traced garden ends and the padding lawn begins.
  const plot = new Mesh(
    new PlaneGeometry(frame.widthM, frame.depthM),
    new MeshLambertMaterial({ color: PATH, transparent: true, opacity: 0.25 }),
  );
  plot.rotation.x = -Math.PI / 2;
  plot.position.y = 0.005;
  plot.receiveShadow = true;
  ground.add(plot);

  return ground;
}

export function buildGarden({ beds, occupations, plants, frame, today }: BuildInput): GardenModel {
  const group = new Group();
  const anchors: BedAnchor[] = [];
  const pickables = new Map<Object3D, string>();
  const centres = new Map<string, Vector3>();
  const rings = new Map<string, [number, number][]>();

  group.add(makeGround(frame));

  const plantsById = new Map(plants.map((plant) => [plant.id, plant]));

  for (const bed of beds) {
    if (!bed.shape || bed.shape.length < 3) continue;

    const ring = bed.shape.map((point) => toWorld(point, frame));
    const centroid = toWorld(polygonCentroid(bed.shape), frame);
    const random = seededRandom(bed.id);
    const bedGroup = new Group();

    let soilTop: number;
    let plantRing = ring;

    switch (bed.kind) {
      case 'pot': {
        // A pot is round whatever was traced; its size comes from the traced area.
        const radius = Math.max(0.2, Math.sqrt(polygonAreaM2(ring) / Math.PI));
        const height = Math.min(0.6, radius * 1.1);
        const pot = new Mesh(new CylinderGeometry(radius, radius * 0.8, height, 16), potMaterial);
        pot.position.set(centroid[0], height / 2, centroid[1]);
        pot.castShadow = true;
        pot.receiveShadow = true;
        bedGroup.add(pot);
        pickables.set(pot, bed.id);

        const soil = new Mesh(
          new CylinderGeometry(radius * 0.92, radius * 0.92, 0.04, 16),
          soilMaterial,
        );
        soil.position.set(centroid[0], height - 0.02, centroid[1]);
        bedGroup.add(soil);

        soilTop = height;
        plantRing = shrinkRing(ring, 0.6);
        break;
      }
      case 'greenhouse': {
        const soil = extrudeRing(ring, ROW_HEIGHT, soilMaterial);
        bedGroup.add(soil);
        pickables.set(soil, bed.id);

        const glass = extrudeRing(shrinkRing(ring, 1.02), GREENHOUSE_HEIGHT, glassMaterial);
        glass.castShadow = false;
        bedGroup.add(glass);
        pickables.set(glass, bed.id);

        soilTop = ROW_HEIGHT;
        plantRing = shrinkRing(ring, 0.85);
        break;
      }
      case 'row': {
        const soil = extrudeRing(ring, ROW_HEIGHT, soilMaterial);
        bedGroup.add(soil);
        pickables.set(soil, bed.id);
        soilTop = ROW_HEIGHT;
        break;
      }
      default: {
        const wall = extrudeRing(ring, BED_WALL_HEIGHT, woodMaterial);
        bedGroup.add(wall);
        pickables.set(wall, bed.id);

        const soil = extrudeRing(shrinkRing(ring, 0.92), BED_WALL_HEIGHT + 0.01, soilMaterial);
        soil.castShadow = false;
        bedGroup.add(soil);
        pickables.set(soil, bed.id);

        soilTop = BED_WALL_HEIGHT;
        plantRing = shrinkRing(ring, 0.85);
      }
    }

    // Everything growing here today. Several occupations may overlap (the
    // calendar flags that as a conflict) — each still gets planted, so the
    // conflict is visible as a crowded bed rather than hidden.
    const active = occupations.filter(
      (o) => o.bed_id === bed.id && o.starts_on <= today && today <= o.ends_on,
    );
    const plantedNames: string[] = [];
    let tallest = 0;

    for (const occupation of active) {
      const plant = plantsById.get(occupation.plant_id);
      if (!plant) continue;
      plantedNames.push(plant.name);

      const recipe = recipeFor(plant.name, plant.latin_name, plant.family);
      const spacing = plant.spacing_cm ? Math.max(0.15, plant.spacing_cm / 100) : recipe.spacingM;
      const stage = stageToday(occupation, today);
      const spots = scatterInPolygon(plantRing, spacing, random, MAX_PLANTS_PER_BED);

      for (const [x, z] of spots) {
        const specimen = buildPlant(recipe, stage, random);
        specimen.position.set(x, soilTop, z);
        bedGroup.add(specimen);
        // Plants are clickable too: aiming at the rose rather than the soil
        // under it should still open the bed.
        specimen.traverse((child) => pickables.set(child, bed.id));
      }
      tallest = Math.max(tallest, recipe.heightM);
    }

    group.add(bedGroup);

    const centre = new Vector3(centroid[0], soilTop, centroid[1]);
    centres.set(bed.id, centre);
    rings.set(bed.id, ring);
    anchors.push({
      bedId: bed.id,
      name: bed.name,
      planted: plantedNames.length > 0 ? plantedNames.join(', ') : null,
      position: new Vector3(centroid[0], soilTop + tallest + 0.3, centroid[1]),
    });
  }

  return { group, anchors, pickables, centres, rings };
}

/**
 * Free the GPU resources of a model that is being replaced. Plant geometries
 * are shared across every plant and every rebuild, so they are skipped.
 */
export function disposeGarden(model: GardenModel): void {
  model.group.traverse((object) => {
    if (object instanceof Mesh && object.geometry.userData.shared !== true) {
      object.geometry.dispose();
    }
  });
}
