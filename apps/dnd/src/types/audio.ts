export interface AudioCue {
  id: string;
  name: string;
  /** Reference to an asset stored in IndexedDB (mutually exclusive with `url`). */
  assetId?: string;
  /** Direct external URL (mutually exclusive with `assetId`). */
  url?: string;
  volume: number;        // 0..1
  loop: boolean;
  autoStart: boolean;    // start playing automatically when the scene becomes active
}

export interface AudioZone {
  id: string;
  cueId: string;
  x: number;             // world coords (px)
  y: number;
  radius: number;        // world units (px)
  label?: string;
}

export interface SceneAudio {
  cues: AudioCue[];
  zones: AudioZone[];
  /** Master volume for this scene, 0..1 */
  masterVolume: number;
}

export function emptySceneAudio(): SceneAudio {
  return { cues: [], zones: [], masterVolume: 1 };
}
