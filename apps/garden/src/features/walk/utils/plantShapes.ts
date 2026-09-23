import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';

/**
 * Stylised plants, one recipe per family of look.
 *
 * Nothing here tries to be botanical. A rose bush is a green blob with red dots;
 * that is enough for "ah, the roses are there" from across the garden, which is
 * the whole point of the walk. Recipes are matched on the plant's name, Latin
 * name and family, so "Rosier grimpant", "Rosa gallica" and anything in
 * Rosaceae all land on the same shape.
 */

/** Where the plant is in its life, read off the occupation's phases. */
export type GrowthStage = 'sprout' | 'young' | 'growing' | 'flowering' | 'harvest';

export interface PlantRecipe {
  /** Distance between two plants, in metres. Drives how many fill a bed. */
  spacingM: number;
  build: (stage: GrowthStage, random: () => number) => Group;
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
const BLUE_GREEN = 0x5f9c86;
const GREY_GREEN = 0x8aa08a;
const RED = 0xd63a2f;
const ORANGE = 0xe8862a;
const YELLOW = 0xf2c531;
const PINK = 0xe46fa0;
const PURPLE = 0x7b4fb3;
const WHITE = 0xf4f1e6;
const WOOD = 0x8b5a2b;

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

const inBloom = (stage: GrowthStage) => stage === 'flowering' || stage === 'harvest';

const RECIPES: { match: RegExp; recipe: PlantRecipe }[] = [
  {
    match: /rosier|\brose\b|\brosa\b|rosaceae/,
    recipe: {
      spacingM: 0.9,
      build: (stage, random) => {
        const group = new Group();
        blob(group, 0.4, DARK_GREEN, 3, random);
        if (inBloom(stage))
          sprinkle(group, 9, random() < 0.5 ? RED : PINK, 0.42, 0.07, 0.36, random);
        return group;
      },
    },
  },
  {
    match: /tomat|lycopersic/,
    recipe: {
      spacingM: 0.55,
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
    match: /salade|laitue|lactuca|chicor|m[aâ]che|[eé]pinard|roquette|batavia/,
    recipe: {
      spacingM: 0.3,
      build: (_stage, random) => {
        const group = new Group();
        group.add(sphere(0.17, random() < 0.3 ? RED : LIGHT_GREEN, 0, 0.06, 0, 0.55));
        return group;
      },
    },
  },
  {
    match: /chou|brassica|brocoli|kale|navet/,
    recipe: {
      spacingM: 0.5,
      build: (_stage, _random) => {
        const group = new Group();
        group.add(sphere(0.28, BLUE_GREEN, 0, 0.1, 0, 0.6));
        group.add(sphere(0.14, LIGHT_GREEN, 0, 0.2, 0));
        return group;
      },
    },
  },
  {
    match: /courge|potiron|citrouille|cucurbit|concombre|melon|past[eè]que|butternut/,
    recipe: {
      spacingM: 1,
      build: (stage, random) => {
        const group = new Group();
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + random() * 0.5;
          group.add(
            sphere(0.3, DARK_GREEN, Math.cos(angle) * 0.3, 0.12, Math.sin(angle) * 0.3, 0.4),
          );
        }
        if (stage === 'flowering') group.add(sphere(0.08, YELLOW, 0.2, 0.28, 0.1));
        if (stage === 'harvest') group.add(sphere(0.18, ORANGE, 0.35, 0.16, -0.2));
        return group;
      },
    },
  },
  {
    match: /haricot|\bpois\b|f[eè]ve|fabaceae|phaseolus|pisum/,
    recipe: {
      spacingM: 0.5,
      build: (stage, _random) => {
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
    match: /lavand/,
    recipe: {
      spacingM: 0.5,
      build: (stage, random) => {
        const group = new Group();
        tuft(group, 0.45, GREY_GREEN, 9, random);
        if (inBloom(stage)) sprinkle(group, 8, PURPLE, 0.2, 0.03, 0.35, random);
        return group;
      },
    },
  },
  {
    match:
      /basilic|thym|menthe|persil|ciboulette|origan|romarin|sauge|coriandre|lamiaceae|estragon|aneth|apiaceae|aromat/,
    recipe: {
      spacingM: 0.3,
      build: (_stage, random) => {
        const group = new Group();
        blob(group, 0.14, random() < 0.5 ? GREEN : GREY_GREEN, 2, random);
        return group;
      },
    },
  },
  {
    match:
      /carott|radis|oignon|poireau|\bail\b|[eé]chalote|allium|daucus|betterave|pomme de terre|patate|tuberosum/,
    recipe: {
      spacingM: 0.2,
      build: (_stage, random) => {
        const group = new Group();
        tuft(group, 0.32, GREEN, 5, random);
        return group;
      },
    },
  },
  {
    match:
      /arbre|pommier|poirier|cerisier|prunier|figuier|abricotier|p[eê]cher|olivier|noyer|\bmalus\b|prunus|ficus|\bolea\b|citronnier|oranger/,
    recipe: {
      spacingM: 3.5,
      build: (stage, random) => {
        const group = new Group();
        group.add(stick(0.12, 1.8, WOOD));
        group.add(sphere(1, GREEN, 0, 2.5, 0));
        group.add(sphere(0.7, GREEN, 0.5, 2.9, 0.3));
        group.add(sphere(0.6, GREEN, -0.5, 2.8, -0.3));
        if (stage === 'flowering') sprinkle(group, 14, PINK, 1, 0.08, 2.5, random);
        if (stage === 'harvest') sprinkle(group, 10, RED, 1, 0.08, 2.5, random);
        return group;
      },
    },
  },
  {
    match: /tournesol|helianthus/,
    recipe: {
      spacingM: 0.45,
      build: (stage, _random) => {
        const group = new Group();
        group.add(stick(0.02, 1.7, GREEN));
        group.add(sphere(0.12, GREEN, 0.1, 0.8, 0, 0.3));
        group.add(
          sphere(inBloom(stage) ? 0.18 : 0.06, inBloom(stage) ? YELLOW : GREEN, 0, 1.75, 0, 0.4),
        );
        return group;
      },
    },
  },
  {
    match:
      /fleur|dahlia|tulipe|cosmos|zinnia|[oœ]eillet|pivoine|capucine|souci|asteraceae|iris|narcisse|jonquille/,
    recipe: {
      spacingM: 0.35,
      build: (stage, random) => {
        const group = new Group();
        const colours = [RED, PINK, YELLOW, PURPLE, WHITE, ORANGE];
        const colour = colours[Math.floor(random() * colours.length)];
        for (let i = 0; i < 3; i++) {
          const x = (random() - 0.5) * 0.2;
          const z = (random() - 0.5) * 0.2;
          const height = 0.45 + random() * 0.25;
          group.add(stick(0.008, height, GREEN, x, 0, z));
          if (inBloom(stage)) group.add(sphere(0.06, colour, x, height + 0.03, z));
        }
        group.add(sphere(0.12, GREEN, 0, 0.06, 0, 0.5));
        return group;
      },
    },
  },
  {
    match: /poivron|piment|aubergine|capsicum|melongena|physalis/,
    recipe: {
      spacingM: 0.5,
      build: (stage, random) => {
        const group = new Group();
        blob(group, 0.28, GREEN, 2, random);
        if (stage === 'harvest')
          sprinkle(group, 4, random() < 0.5 ? RED : PURPLE, 0.28, 0.07, 0.25, random);
        return group;
      },
    },
  },
];

const FALLBACK: PlantRecipe = {
  spacingM: 0.35,
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
export function buildPlant(recipe: PlantRecipe, stage: GrowthStage, random: () => number): Group {
  const plant = recipe.build(stage, random);
  const size = stageScale(stage) * (0.85 + random() * 0.3);
  plant.scale.setScalar(size);
  plant.rotation.y = random() * Math.PI * 2;
  return plant;
}
