import { Box3, Color, Group, Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Low-poly models from Kenney's Nature Kit (CC0), bundled under ../assets/models.
 *
 * The kit has no species: it has "an oak-shaped tree", "a conical tree in
 * autumn colours", "a pumpkin". Species come from two things layered on top —
 * which silhouette is picked, and what colour each named material is painted.
 * Every model uses a handful of shared material names (`leafsGreen`,
 * `woodBark`, `grass`, `colorRed`…), so a recipe can say "this tree, but the
 * leaves in wine red and the bark pale" and get a purple maple or a birch.
 */

/** Names of the bundled models, without extension. */
export type ModelName =
  | 'tree_oak'
  | 'tree_tall'
  | 'tree_fat'
  | 'tree_cone_fall'
  | 'tree_detailed'
  | 'tree_thin'
  | 'tree_plateau'
  | 'tree_small'
  | 'tree_default'
  | 'tree_simple'
  | 'tree_palm'
  | 'tree_pineTallA'
  | 'tree_pineTallB'
  | 'tree_pineDefaultA'
  | 'tree_pineRoundA'
  | 'plant_bush'
  | 'plant_bushDetailed'
  | 'plant_bushLarge'
  | 'plant_bushSmall'
  | 'crop_carrot'
  | 'crop_turnip'
  | 'crop_pumpkin'
  | 'crop_melon'
  | 'crops_cornStageB'
  | 'crops_cornStageD'
  | 'crops_wheatStageA'
  | 'crops_wheatStageB'
  | 'crops_leafsStageA'
  | 'crops_leafsStageB'
  | 'flower_redA'
  | 'flower_redB'
  | 'flower_purpleA'
  | 'flower_purpleB'
  | 'flower_yellowA'
  | 'flower_yellowB';

/** Material name in the kit → colour to paint it. Unlisted materials keep the kit's colour. */
export type Tint = Partial<Record<string, number>>;

export interface ModelLibrary {
  /**
   * A fresh copy of a model, painted and scaled so its bounding box is
   * `heightM` tall, feet at y = 0. Returns null for a model that failed to load,
   * so a recipe can fall back to its procedural shape.
   */
  instantiate: (name: ModelName, heightM: number, tint?: Tint) => Group | null;
}

// Vite resolves every .glb in the folder to a served URL at build time.
const MODEL_URLS = import.meta.glob<string>('../assets/models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

function urlFor(name: ModelName): string | undefined {
  return MODEL_URLS[`../assets/models/${name}.glb`];
}

/** Every name the type allows, for the loader to fetch them all up front. */
const ALL_MODELS: ModelName[] = [
  'tree_oak',
  'tree_tall',
  'tree_fat',
  'tree_cone_fall',
  'tree_detailed',
  'tree_thin',
  'tree_plateau',
  'tree_small',
  'tree_default',
  'tree_simple',
  'tree_palm',
  'tree_pineTallA',
  'tree_pineTallB',
  'tree_pineDefaultA',
  'tree_pineRoundA',
  'plant_bush',
  'plant_bushDetailed',
  'plant_bushLarge',
  'plant_bushSmall',
  'crop_carrot',
  'crop_turnip',
  'crop_pumpkin',
  'crop_melon',
  'crops_cornStageB',
  'crops_cornStageD',
  'crops_wheatStageA',
  'crops_wheatStageB',
  'crops_leafsStageA',
  'crops_leafsStageB',
  'flower_redA',
  'flower_redB',
  'flower_purpleA',
  'flower_purpleB',
  'flower_yellowA',
  'flower_yellowB',
];

interface LoadedModel {
  scene: Group;
  /** Height of the untouched model, so scaling to metres is one division. */
  nativeHeight: number;
  /** Original colour of each named material, for the ones a tint leaves alone. */
  baseColors: Map<string, number>;
}

// Painted materials are shared across every instance that asks for the same
// name + colour: a hundred oaks are a hundred meshes but one leaf material.
const paintedMaterials = new Map<string, MeshLambertMaterial>();
function painted(key: string, color: number): MeshLambertMaterial {
  const cacheKey = `${key}:${color}`;
  let material = paintedMaterials.get(cacheKey);
  if (!material) {
    material = new MeshLambertMaterial({ color });
    material.userData.shared = true;
    paintedMaterials.set(cacheKey, material);
  }
  return material;
}

/** The kit's material colour as a hex number, whatever material type it shipped as. */
function baseColorOf(material: unknown): number {
  if (material instanceof Object && 'color' in material && material.color instanceof Color) {
    return material.color.getHex();
  }
  return 0xffffff;
}

/**
 * Fetch every bundled model once. A model that fails to load is simply absent,
 * and `instantiate` returns null for it — the walk still renders, with the
 * procedural shape for that species instead.
 */
export async function loadModelLibrary(): Promise<ModelLibrary> {
  const loader = new GLTFLoader();
  const loaded = new Map<ModelName, LoadedModel>();

  await Promise.all(
    ALL_MODELS.map(async (name) => {
      const url = urlFor(name);
      if (!url) return;
      try {
        const gltf = await loader.loadAsync(url);
        const scene = gltf.scene;
        const baseColors = new Map<string, number>();
        scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            baseColors.set(material.name, baseColorOf(material));
          }
        });
        const size = new Box3().setFromObject(scene).getSize(new Vector3());
        loaded.set(name, { scene, nativeHeight: Math.max(size.y, 1e-3), baseColors });
      } catch {
        // Missing model: the recipe's procedural fallback takes over.
      }
    }),
  );

  return {
    instantiate: (name, heightM, tint = {}) => {
      const model = loaded.get(name);
      if (!model) return null;

      const copy = model.scene.clone(true);
      copy.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = false;
        // Geometry is shared with the source scene: never disposed per instance.
        object.geometry.userData.shared = true;
        const paint = (materialName: string) =>
          painted(
            materialName,
            tint[materialName] ?? model.baseColors.get(materialName) ?? 0xffffff,
          );
        object.material = Array.isArray(object.material)
          ? object.material.map((material) => paint(material.name))
          : paint(object.material.name);
      });

      const scale = heightM / model.nativeHeight;
      copy.scale.setScalar(scale);
      return copy;
    },
  };
}

/**
 * A model the owner uploaded for one plant — typically a .glb from an
 * image-to-3D service. Unlike the kit, it keeps its own materials and textures;
 * the walk only sizes it and stands it on the ground.
 */
export interface CustomModel {
  instantiate: (heightM: number) => Group;
}

/**
 * Fetch one uploaded model. Resolves to null on any failure so the plant falls
 * back to its recipe rather than vanishing from the walk.
 */
export async function loadCustomModel(url: string): Promise<CustomModel | null> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    const scene = gltf.scene;
    const bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    const nativeHeight = Math.max(size.y, 1e-3);
    // Feet on the ground and centred: exporters put the origin anywhere.
    const centre = bounds.getCenter(new Vector3());
    const offset = new Vector3(-centre.x, -bounds.min.y, -centre.z);

    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.geometry.userData.shared = true;
      }
    });

    return {
      instantiate: (heightM) => {
        const holder = new Group();
        const copy = scene.clone(true);
        copy.position.copy(offset);
        holder.add(copy);
        holder.scale.setScalar(heightM / nativeHeight);
        return holder;
      },
    };
  } catch {
    return null;
  }
}
