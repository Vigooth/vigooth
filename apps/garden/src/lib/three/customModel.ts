import { Box3, Group, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
