import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';
import type { ModelLibrary, ModelName, Tint } from './modelLibrary';

/**
 * One recipe per kind of plant: which low-poly model to stand there, painted
 * what colours, and how big — or, when the kit has nothing close, a shape
 * built from spheres and cones.
 *
 * Nothing here tries to be botanical. A liquidambar is the kit's conical
 * autumn tree painted russet; that is enough for "ah, the liquidambar" from
 * across the garden, which is the whole point of the walk. Recipes are matched
 * on the plant's name, Latin name and family, so "Rosier grimpant" and "Rosa
 * gallica" land on the same shape.
 */

/** Where the plant is in its life, read off the occupation's phases. */
export type GrowthStage = 'sprout' | 'young' | 'growing' | 'flowering' | 'harvest';

export interface PlantRecipe {
  /** Distance between two plants, in metres. Drives how many fill a bed. */
  spacingM: number;
  /** Adult height, in metres, so the bed's label can float clear of the canopy. */
  heightM: number;
  build: (stage: GrowthStage, random: () => number, library: ModelLibrary | null) => Group;
}

// Shared geometries: hundreds of plants would otherwise allocate hundreds of
// identical spheres. Materials are shared for the same reason.
const SPHERE = new SphereGeometry(1, 10, 8);
const CONE = new ConeGeometry(1, 1, 7);
const STICK = new CylinderGeometry(1, 1, 1, 6);
// Flagged so a scene rebuild leaves them alone: see `disposeGarden`.
for (const shared of [SPHERE, CONE, STICK]) shared.userData.shared = true;

const materialCache = new Map<number, MeshLambertMaterial>();
function material(color: number): MeshLambertMaterial {
  let cached = materialCache.get(color);
  if (!cached) {
    cached = new MeshLambertMaterial({ color });
    materialCache.set(color, cached);
  }
  return cached;
}

const GREEN = 0x3f8f3a;
const DARK_GREEN = 0x2f6b2c;
const LIGHT_GREEN = 0x7fc45a;
const LIME = 0x8fcf5a;
const BLUE_GREEN = 0x5f9c86;
const GREY_GREEN = 0x8aa08a;
const WILLOW = 0x9fbf6a;
const PINE = 0x2b5d3a;
const RED = 0xd63a2f;
const ORANGE = 0xe8862a;
const RUSSET = 0xb0452b;
const WINE = 0x6e2a3f;
const YELLOW = 0xf2c531;
const WHEAT = 0xd9b45a;
const PINK = 0xe46fa0;
const PURPLE = 0x7b4fb3;
const WHITE = 0xf4f1e6;
const WOOD = 0x8b5a2b;
const PALE_TRUNK = 0xd9d4c7;
const SOIL = 0x5a3e2b;

/** The kit's leaf and bark materials, painted to this garden's palette. */
const leaves = (color: number, bark = WOOD): Tint => ({
  leafsGreen: color,
  leafsDark: color,
  leafsFall: color,
  woodBark: bark,
  woodBarkDark: bark,
  woodBirch: bark,
});

// --- Procedural primitives ---------------------------------------------------

function sphere(radius: number, color: number, x = 0, y = 0, z = 0, squash = 1): Mesh {
  const mesh = new Mesh(SPHERE, material(color));
  mesh.scale.set(radius, radius * squash, radius);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function cone(radius: number, height: number, color: number, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(CONE, material(color));
  mesh.scale.set(radius, height, radius);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  return mesh;
}

function stick(radius: number, height: number, color: number, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(STICK, material(color));
  mesh.scale.set(radius, height, radius);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  return mesh;
}

/** How big a plant is for its stage, as a fraction of its adult size. */
function stageScale(stage: GrowthStage): number {
  switch (stage) {
    case 'sprout':
      return 0.25;
    case 'young':
      return 0.5;
    case 'growing':
      return 0.8;
    case 'flowering':
    case 'harvest':
      return 1;
  }
}

/** Dots on a blob: flowers or fruit, sprinkled over the upper half of a sphere. */
function sprinkle(
  group: Group,
  count: number,
  color: number,
  radius: number,
  dotRadius: number,
  centreY: number,
  random: () => number,
): void {
  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2;
    const phi = random() * Math.PI * 0.5;
    const x = Math.cos(theta) * Math.sin(phi) * radius;
    const z = Math.sin(theta) * Math.sin(phi) * radius;
    const y = centreY + Math.cos(phi) * radius;
    group.add(sphere(dotRadius, color, x, y, z));
  }
}

/** A round leafy mass made of a few overlapping spheres. */
function blob(group: Group, radius: number, color: number, lumps: number, random: () => number) {
  group.add(sphere(radius, color, 0, radius * 0.9, 0));
  for (let i = 0; i < lumps; i++) {
    const angle = random() * Math.PI * 2;
    const offset = radius * 0.5;
    group.add(
      sphere(
        radius * 0.7,
        color,
        Math.cos(angle) * offset,
        radius * 0.9 + (random() - 0.3) * radius * 0.4,
        Math.sin(angle) * offset,
      ),
    );
  }
}

/** Thin leaves splaying up from the ground, the generic "something green". */
function tuft(group: Group, height: number, color: number, blades: number, random: () => number) {
  for (let i = 0; i < blades; i++) {
    const blade = cone(height * 0.12, height * (0.7 + random() * 0.3), color);
    blade.rotation.z = (random() - 0.5) * 0.7;
    blade.rotation.x = (random() - 0.5) * 0.7;
    group.add(blade);
  }
}

/** A procedural tree: trunk plus a canopy of spheres. The fallback when no model loaded. */
function simpleTree(
  group: Group,
  trunkHeight: number,
  canopyRadius: number,
  canopyColor: number,
  trunk = WOOD,
) {
  group.add(stick(canopyRadius * 0.1, trunkHeight, trunk));
  const base = trunkHeight + canopyRadius * 0.6;
  group.add(sphere(canopyRadius, canopyColor, 0, base, 0));
  group.add(
    sphere(canopyRadius * 0.7, canopyColor, canopyRadius * 0.5, base + canopyRadius * 0.4, 0),
  );
}

const inBloom = (stage: GrowthStage) => stage === 'flowering' || stage === 'harvest';

/** Pick one of several models so a row is not the same file stamped along it. */
function pick<T>(options: readonly T[], random: () => number): T {
  return options[Math.floor(random() * options.length)];
}

// --- Trees -------------------------------------------------------------------

interface TreeSpec {
  /** Kit silhouettes to choose from. */
  models: readonly ModelName[];
  heightM: number;
  leaf: number;
  bark?: number;
  /** Dots shown while flowering, if the tree flowers visibly. */
  bloom?: number;
  /** Dots shown at harvest: fruit. */
  fruit?: number;
}

/**
 * A tree from the kit, painted for its species, with the procedural canopy as
 * a stand-in until the models arrive or if one is missing. Flowers and fruit
 * are sprinkled over the top half of the canopy in both cases.
 */
function treeRecipe(spec: TreeSpec): PlantRecipe {
  const bark = spec.bark ?? WOOD;
  return {
    spacingM: spec.heightM * 0.45,
    heightM: spec.heightM,
    build: (stage, random, library) => {
      const group = new Group();
      const model = library?.instantiate(
        pick(spec.models, random),
        spec.heightM,
        leaves(spec.leaf, bark),
      );
      if (model) group.add(model);
      else simpleTree(group, spec.heightM * 0.3, spec.heightM * 0.3, spec.leaf, bark);

      const canopyRadius = spec.heightM * 0.28;
      const canopyCentre = spec.heightM * 0.62;
      if (spec.bloom !== undefined && stage === 'flowering') {
        sprinkle(group, 18, spec.bloom, canopyRadius, spec.heightM * 0.025, canopyCentre, random);
      }
      if (spec.fruit !== undefined && stage === 'harvest') {
        sprinkle(group, 12, spec.fruit, canopyRadius, spec.heightM * 0.02, canopyCentre, random);
      }
      return group;
    },
  };
}

// --- Ground plants from the kit ----------------------------------------------

interface ModelPlantSpec {
  models: readonly ModelName[];
  heightM: number;
  spacingM: number;
  tint?: Tint;
  /** Built when the model is unavailable. */
  fallback: (group: Group, random: () => number) => void;
  /** Extra decoration on top of the model, by stage. */
  decorate?: (group: Group, stage: GrowthStage, random: () => number) => void;
}

function modelRecipe(spec: ModelPlantSpec): PlantRecipe {
  return {
    spacingM: spec.spacingM,
    heightM: spec.heightM,
    build: (stage, random, library) => {
      const group = new Group();
      const model = library?.instantiate(pick(spec.models, random), spec.heightM, spec.tint);
      if (model) group.add(model);
      else spec.fallback(group, random);
      spec.decorate?.(group, stage, random);
      return group;
    },
  };
}

/** A stem with a coloured head: the fallback for every kit flower. */
const flowerFallback = (color: number) => (group: Group) => {
  group.add(stick(0.008, 0.4, GREEN));
  group.add(sphere(0.06, color, 0, 0.43, 0));
};

const RECIPES: { match: RegExp; recipe: PlantRecipe }[] = [
  // --- Ornamental and park trees ---
  {
    match: /liquidambar|copalme/,
    recipe: treeRecipe({ models: ['tree_cone_fall'], heightM: 9, leaf: RUSSET }),
  },
  {
    match: /catalpa/,
    recipe: treeRecipe({ models: ['tree_fat'], heightM: 7, leaf: LIME, bloom: WHITE }),
  },
  {
    match: /tilleul|\btilia\b/,
    recipe: treeRecipe({ models: ['tree_tall'], heightM: 10, leaf: GREEN, bloom: YELLOW }),
  },
  {
    match: /ch[eê]ne|quercus/,
    recipe: treeRecipe({ models: ['tree_oak'], heightM: 10, leaf: DARK_GREEN }),
  },
  {
    match: /[eé]rable|\bacer\b/,
    recipe: treeRecipe({ models: ['tree_detailed'], heightM: 7, leaf: WINE }),
  },
  {
    match: /bouleau|betula/,
    recipe: treeRecipe({ models: ['tree_thin'], heightM: 9, leaf: LIGHT_GREEN, bark: PALE_TRUNK }),
  },
  {
    match: /saule|salix/,
    recipe: treeRecipe({ models: ['tree_plateau'], heightM: 7, leaf: WILLOW }),
  },
  {
    match: /magnolia/,
    recipe: treeRecipe({ models: ['tree_small'], heightM: 4.5, leaf: DARK_GREEN, bloom: PINK }),
  },
  {
    match: /palmier|palm|phoenix|trachycarpus/,
    recipe: treeRecipe({ models: ['tree_palm'], heightM: 6, leaf: GREEN }),
  },
  {
    match: /sapin|[eé]pic[eé]a|abies|picea/,
    recipe: treeRecipe({ models: ['tree_pineDefaultA'], heightM: 9, leaf: PINE }),
  },
  {
    match: /\bpin\b|cypr[eè]s|thuya|\bif\b|c[eè]dre|conif|pinus|cupressus|taxus|cedrus/,
    recipe: treeRecipe({
      models: ['tree_pineTallA', 'tree_pineTallB', 'tree_pineRoundA'],
      heightM: 9,
      leaf: PINE,
    }),
  },
  // --- Fruit trees ---
  {
    match: /pommier|\bmalus\b/,
    recipe: treeRecipe({
      models: ['tree_default'],
      heightM: 4.5,
      leaf: GREEN,
      bloom: WHITE,
      fruit: RED,
    }),
  },
  {
    match: /cerisier|prunier|abricotier|p[eê]cher|amandier|prunus/,
    recipe: treeRecipe({
      models: ['tree_default'],
      heightM: 5,
      leaf: GREEN,
      bloom: PINK,
      fruit: RED,
    }),
  },
  {
    match: /poirier|pyrus|cognassier|n[eé]flier/,
    recipe: treeRecipe({
      models: ['tree_tall'],
      heightM: 5.5,
      leaf: GREEN,
      bloom: WHITE,
      fruit: YELLOW,
    }),
  },
  {
    match: /figuier|ficus|noyer|juglans|ch[aâ]taignier|castanea/,
    recipe: treeRecipe({ models: ['tree_fat'], heightM: 6, leaf: DARK_GREEN }),
  },
  {
    match: /olivier|\bolea\b/,
    recipe: treeRecipe({ models: ['tree_plateau'], heightM: 4.5, leaf: GREY_GREEN }),
  },
  {
    match: /citronnier|oranger|agrume|citrus|mandarinier/,
    recipe: treeRecipe({
      models: ['tree_small'],
      heightM: 3.5,
      leaf: DARK_GREEN,
      bloom: WHITE,
      fruit: YELLOW,
    }),
  },
  {
    match:
      /arbre|h[eê]tre|fagus|platane|platanus|marronnier|fr[eê]ne|fraxinus|peuplier|populus|orme|ulmus|charme|carpinus|robinier|acacia|albizia|mimosa/,
    recipe: treeRecipe({ models: ['tree_simple', 'tree_default'], heightM: 9, leaf: GREEN }),
  },

  // --- Shrubs and perennials ---
  {
    match: /rosier|\brose\b|\brosa\b/,
    recipe: modelRecipe({
      models: ['plant_bushDetailed'],
      heightM: 1.1,
      spacingM: 0.9,
      tint: { grass: DARK_GREEN },
      fallback: (group, random) => blob(group, 0.4, DARK_GREEN, 3, random),
      decorate: (group, stage, random) => {
        if (inBloom(stage)) {
          sprinkle(group, 10, random() < 0.5 ? RED : PINK, 0.45, 0.07, 0.55, random);
        }
      },
    }),
  },
  {
    match: /lavand/,
    recipe: modelRecipe({
      models: ['plant_bush', 'plant_bushSmall'],
      heightM: 0.6,
      spacingM: 0.5,
      tint: { grass: GREY_GREEN },
      fallback: (group, random) => tuft(group, 0.45, GREY_GREEN, 9, random),
      decorate: (group, stage, random) => {
        if (inBloom(stage)) sprinkle(group, 10, PURPLE, 0.28, 0.03, 0.4, random);
      },
    }),
  },
  {
    match: /hortensia|hydrangea/,
    recipe: modelRecipe({
      models: ['plant_bushLarge'],
      heightM: 1.2,
      spacingM: 1,
      tint: { grass: GREEN },
      fallback: (group, random) => blob(group, 0.5, GREEN, 3, random),
      decorate: (group, stage, random) => {
        if (inBloom(stage)) {
          sprinkle(group, 7, random() < 0.5 ? PINK : PURPLE, 0.5, 0.14, 0.6, random);
        }
      },
    }),
  },
  {
    match: /buis|buxus|haie|arbuste|buisson|troène|laurier|photinia|fusain/,
    recipe: modelRecipe({
      models: ['plant_bushLarge', 'plant_bush'],
      heightM: 1.4,
      spacingM: 0.9,
      tint: { grass: DARK_GREEN },
      fallback: (group, random) => blob(group, 0.6, DARK_GREEN, 3, random),
    }),
  },
  {
    match: /framboisier|cassis|groseill|m[uû]rier|myrtill|ribes|rubus|vaccinium/,
    recipe: modelRecipe({
      models: ['plant_bushDetailed', 'plant_bush'],
      heightM: 1.3,
      spacingM: 0.6,
      tint: { grass: GREEN },
      fallback: (group, random) => blob(group, 0.4, GREEN, 3, random),
      decorate: (group, stage, random) => {
        if (stage === 'harvest') {
          sprinkle(group, 8, random() < 0.5 ? RED : WINE, 0.45, 0.035, 0.6, random);
        }
      },
    }),
  },
  {
    match:
      /basilic|thym|menthe|persil|ciboulette|origan|romarin|sauge|coriandre|lamiaceae|estragon|aneth|apiaceae|aromat/,
    recipe: modelRecipe({
      models: ['plant_bushSmall'],
      heightM: 0.35,
      spacingM: 0.3,
      tint: { grass: GREEN },
      fallback: (group, random) => blob(group, 0.14, GREEN, 2, random),
    }),
  },

  // --- Vegetables with a kit model ---
  {
    match: /courgette|concombre|cucumis/,
    recipe: modelRecipe({
      models: ['crop_melon'],
      heightM: 0.45,
      spacingM: 0.9,
      tint: { grass: DARK_GREEN, leafsDark: DARK_GREEN, dirt: SOIL },
      fallback: (group, random) => blob(group, 0.3, DARK_GREEN, 2, random),
    }),
  },
  {
    match: /courge|potiron|citrouille|cucurbit|butternut|potimarron/,
    recipe: modelRecipe({
      models: ['crop_pumpkin'],
      heightM: 0.5,
      spacingM: 1,
      tint: { grass: DARK_GREEN, leafsFall: ORANGE },
      fallback: (group, random) => blob(group, 0.3, DARK_GREEN, 2, random),
    }),
  },
  {
    match: /melon|past[eè]que/,
    recipe: modelRecipe({
      models: ['crop_melon'],
      heightM: 0.4,
      spacingM: 1,
      tint: { grass: GREEN, leafsDark: DARK_GREEN, dirt: SOIL },
      fallback: (group, random) => blob(group, 0.3, GREEN, 2, random),
    }),
  },
  {
    match: /carott|daucus|panais/,
    recipe: modelRecipe({
      models: ['crop_carrot'],
      heightM: 0.4,
      spacingM: 0.2,
      tint: { grass: GREEN, leafsFall: ORANGE },
      fallback: (group, random) => tuft(group, 0.32, GREEN, 5, random),
    }),
  },
  {
    match: /radis|navet|betterave|c[eé]leri|raphanus|\bbeta\b/,
    recipe: modelRecipe({
      models: ['crop_turnip'],
      heightM: 0.35,
      spacingM: 0.2,
      tint: { grass: GREEN, woodBirch: WHITE },
      fallback: (group, random) => tuft(group, 0.3, GREEN, 5, random),
    }),
  },
  {
    match: /oignon|poireau|\bail\b|[eé]chalote|allium/,
    recipe: modelRecipe({
      models: ['crops_wheatStageA'],
      heightM: 0.5,
      spacingM: 0.15,
      tint: { grass: BLUE_GREEN },
      fallback: (group, random) => tuft(group, 0.4, BLUE_GREEN, 5, random),
    }),
  },
  {
    match: /ma[iï]s|\bzea\b/,
    recipe: {
      spacingM: 0.4,
      heightM: 2,
      build: (stage, random, library) => {
        const group = new Group();
        const young = stage === 'sprout' || stage === 'young';
        const model = library?.instantiate(
          young ? 'crops_cornStageB' : 'crops_cornStageD',
          young ? 0.8 : 2,
          { grass: GREEN, corn: YELLOW },
        );
        if (model) group.add(model);
        else tuft(group, 1.6, GREEN, 5, random);
        return group;
      },
    },
  },
  {
    match: /bl[eé]\b|orge|avoine|seigle|c[eé]r[eé]ale|triticum/,
    recipe: {
      spacingM: 0.3,
      heightM: 0.9,
      build: (stage, random, library) => {
        const group = new Group();
        const ripe = inBloom(stage);
        const model = library?.instantiate(ripe ? 'crops_wheatStageB' : 'crops_wheatStageA', 0.9, {
          grass: LIGHT_GREEN,
          woodInner: WHEAT,
          _defaultMat: WHEAT,
        });
        if (model) group.add(model);
        else tuft(group, 0.8, ripe ? WHEAT : LIGHT_GREEN, 7, random);
        return group;
      },
    },
  },
  {
    match: /salade|laitue|lactuca|chicor|m[aâ]che|[eé]pinard|roquette|batavia|scarole|endive/,
    recipe: modelRecipe({
      models: ['crops_leafsStageA', 'crops_leafsStageB'],
      heightM: 0.3,
      spacingM: 0.3,
      tint: { grass: LIGHT_GREEN },
      fallback: (group) => {
        group.add(sphere(0.17, LIGHT_GREEN, 0, 0.06, 0, 0.55));
      },
    }),
  },
  {
    match: /chou|brassica|brocoli|kale|blette|poir[eé]e/,
    recipe: modelRecipe({
      models: ['crops_leafsStageB'],
      heightM: 0.45,
      spacingM: 0.5,
      tint: { grass: BLUE_GREEN },
      fallback: (group) => {
        group.add(sphere(0.28, BLUE_GREEN, 0, 0.1, 0, 0.6));
      },
    }),
  },
  {
    match: /pomme de terre|patate|tuberosum|topinambour/,
    recipe: modelRecipe({
      models: ['plant_bushSmall'],
      heightM: 0.5,
      spacingM: 0.35,
      tint: { grass: GREEN },
      fallback: (group, random) => blob(group, 0.2, GREEN, 2, random),
    }),
  },

  // --- Flowers ---
  {
    match: /tournesol|helianthus/,
    recipe: {
      spacingM: 0.45,
      heightM: 1.9,
      build: (stage) => {
        const group = new Group();
        group.add(stick(0.02, 1.7, GREEN));
        group.add(sphere(0.12, GREEN, 0.1, 0.8, 0, 0.3));
        const open = inBloom(stage);
        group.add(sphere(open ? 0.18 : 0.06, open ? YELLOW : GREEN, 0, 1.75, 0, 0.4));
        return group;
      },
    },
  },
  {
    match: /tulipe|coquelicot|pavot|g[eé]ranium|zinnia|[oœ]eillet|dahlia|pivoine/,
    recipe: modelRecipe({
      models: ['flower_redA', 'flower_redB'],
      heightM: 0.45,
      spacingM: 0.3,
      tint: { grass: GREEN },
      fallback: flowerFallback(RED),
    }),
  },
  {
    match: /iris|lilas|glycine|cl[eé]matite|aster|violette|jacinthe|crocus|campanule|agapanthe/,
    recipe: modelRecipe({
      models: ['flower_purpleA', 'flower_purpleB'],
      heightM: 0.45,
      spacingM: 0.3,
      tint: { grass: GREEN },
      fallback: flowerFallback(PURPLE),
    }),
  },
  {
    match:
      /narcisse|jonquille|souci|capucine|forsythia|primev[eè]re|marguerite|fleur|cosmos|asteraceae/,
    recipe: modelRecipe({
      models: ['flower_yellowA', 'flower_yellowB', 'flower_redA', 'flower_purpleA'],
      heightM: 0.45,
      spacingM: 0.3,
      tint: { grass: GREEN },
      fallback: flowerFallback(YELLOW),
    }),
  },

  // --- Vegetables the kit has no model for: kept procedural ---
  {
    match: /tomat|lycopersic/,
    recipe: {
      spacingM: 0.55,
      heightM: 1.7,
      build: (stage, random) => {
        const group = new Group();
        group.add(stick(0.02, 1.6, WOOD));
        group.add(sphere(0.22, GREEN, 0, 0.5, 0));
        group.add(sphere(0.2, GREEN, 0.05, 0.9, 0.04));
        group.add(sphere(0.16, GREEN, -0.04, 1.25, -0.03));
        if (stage === 'harvest') sprinkle(group, 5, RED, 0.24, 0.06, 0.75, random);
        else if (stage === 'flowering') sprinkle(group, 5, YELLOW, 0.24, 0.03, 0.75, random);
        return group;
      },
    },
  },
  {
    match: /haricot|\bpois\b|f[eè]ve|fabaceae|phaseolus|pisum/,
    recipe: {
      spacingM: 0.5,
      heightM: 1.7,
      build: (stage) => {
        const group = new Group();
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const pole = stick(0.015, 1.7, WOOD, Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18);
          pole.rotation.z = -Math.cos(angle) * 0.2;
          pole.rotation.x = Math.sin(angle) * 0.2;
          group.add(pole);
        }
        group.add(cone(0.28, 1.4, GREEN));
        if (stage === 'flowering') group.add(sphere(0.05, WHITE, 0.15, 1, 0.1));
        return group;
      },
    },
  },
  {
    match: /frais|fragaria/,
    recipe: {
      spacingM: 0.3,
      heightM: 0.25,
      build: (stage, random) => {
        const group = new Group();
        group.add(sphere(0.16, GREEN, 0, 0.05, 0, 0.6));
        if (stage === 'harvest') sprinkle(group, 3, RED, 0.16, 0.03, 0.03, random);
        if (stage === 'flowering') sprinkle(group, 3, WHITE, 0.16, 0.025, 0.03, random);
        return group;
      },
    },
  },
  {
    match: /poivron|piment|aubergine|capsicum|melongena|physalis/,
    recipe: {
      spacingM: 0.5,
      heightM: 0.8,
      build: (stage, random) => {
        const group = new Group();
        blob(group, 0.28, GREEN, 2, random);
        if (stage === 'harvest') {
          sprinkle(group, 4, random() < 0.5 ? RED : PURPLE, 0.28, 0.07, 0.25, random);
        }
        return group;
      },
    },
  },
];

const FALLBACK: PlantRecipe = {
  spacingM: 0.35,
  heightM: 0.5,
  build: (_stage, random) => {
    const group = new Group();
    tuft(group, 0.4, GREEN, 6, random);
    return group;
  },
};

/** Pick the recipe for a plant from whatever names it carries. */
export function recipeFor(...names: string[]): PlantRecipe {
  const haystack = names.join(' ').toLowerCase();
  return RECIPES.find(({ match }) => match.test(haystack))?.recipe ?? FALLBACK;
}

/**
 * One plant, sized for its stage and given a little individuality: a slight
 * turn and a size within ±15 %, so a row reads as living things rather than a
 * stamp repeated.
 */
export function buildPlant(
  recipe: PlantRecipe,
  stage: GrowthStage,
  random: () => number,
  library: ModelLibrary | null,
): Group {
  const plant = recipe.build(stage, random, library);
  const size = stageScale(stage) * (0.85 + random() * 0.3);
  plant.scale.setScalar(size);
  plant.rotation.y = random() * Math.PI * 2;
  return plant;
}
