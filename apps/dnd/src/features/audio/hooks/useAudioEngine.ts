import { useEffect, useRef, useState } from 'react';
import type { AudioCue, SceneAudio } from '@/types/audio';
import { audioEngine } from '../engine';

const SCENE_FADE_MS = 800;

export function usePlayingCues(): Set<string> {
  const [playing, setPlaying] = useState<Set<string>>(() => audioEngine.playingIds());
  useEffect(() => audioEngine.subscribe(setPlaying), []);
  return playing;
}

/**
 * Syncs the audio engine with the active scene's audio:
 * - Auto-starts cues marked autoStart on scene entry
 * - Fades out cues from the previous scene
 * - Updates master volume on change
 * - Cleans up engine elements for cues that no longer exist
 */
export function useSceneAudioSync(sceneId: string, audio: SceneAudio): void {
  const prevSceneIdRef = useRef<string | null>(null);
  const prevCueIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const cueIds = audio.cues.map((c) => c.id);
    audioEngine.cleanup(cueIds);

    const isNewScene = prevSceneIdRef.current !== sceneId;
    if (isNewScene) {
      // Fade out everything that's still playing
      audioEngine.stopAll(SCENE_FADE_MS);
      // Start auto-start cues
      const masterVol = audio.masterVolume;
      for (const cue of audio.cues) {
        if (cue.autoStart) {
          void audioEngine.play(cue, masterVol, SCENE_FADE_MS);
        }
      }
      prevSceneIdRef.current = sceneId;
    } else {
      // Same scene, sync volumes
      audioEngine.updateMasterVolume(audio.cues, audio.masterVolume);
    }
    prevCueIdsRef.current = new Set(cueIds);
  }, [sceneId, audio]);

  useEffect(() => {
    return () => {
      audioEngine.stopAll(SCENE_FADE_MS);
    };
  }, []);
}

export function useAudioActions(masterVolume: number) {
  return {
    play: (cue: AudioCue) => void audioEngine.play(cue, masterVolume, 200),
    pause: (cueId: string) => audioEngine.pause(cueId, 200),
    toggle: (cue: AudioCue) => {
      if (audioEngine.isPlaying(cue.id)) audioEngine.pause(cue.id, 200);
      else void audioEngine.play(cue, masterVolume, 200);
    },
    setVolume: (cueId: string, vol: number) => audioEngine.setVolume(cueId, vol, masterVolume),
  };
}
