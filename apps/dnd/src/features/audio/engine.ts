import { getAssetObjectUrl } from '@/features/assets';
import type { AudioCue } from '@/types/audio';

type Listener = (playingIds: Set<string>) => void;

class AudioEngine {
  private elements = new Map<string, HTMLAudioElement>();
  private listeners = new Set<Listener>();
  private fadeRafs = new Map<string, number>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.playingIds());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    const ids = this.playingIds();
    for (const fn of this.listeners) fn(ids);
  }

  playingIds(): Set<string> {
    const set = new Set<string>();
    for (const [id, el] of this.elements) {
      if (!el.paused && !el.ended) set.add(id);
    }
    return set;
  }

  isPlaying(id: string): boolean {
    const el = this.elements.get(id);
    return Boolean(el && !el.paused && !el.ended);
  }

  private async ensureElement(cue: AudioCue): Promise<HTMLAudioElement | null> {
    let el = this.elements.get(cue.id);
    if (!el) {
      el = new Audio();
      el.preload = 'auto';
      el.addEventListener('play', () => this.notify());
      el.addEventListener('pause', () => this.notify());
      el.addEventListener('ended', () => this.notify());
      this.elements.set(cue.id, el);
    }
    let src: string | null = null;
    if (cue.url) src = cue.url;
    else if (cue.assetId) src = await getAssetObjectUrl(cue.assetId);
    if (!src) return null;
    if (el.src !== src) el.src = src;
    return el;
  }

  async play(cue: AudioCue, sceneVolume: number, fadeMs = 0): Promise<void> {
    const el = await this.ensureElement(cue);
    if (!el) return;
    el.loop = cue.loop;
    const target = clamp01(cue.volume * sceneVolume);
    if (fadeMs > 0) {
      el.volume = 0;
      try {
        await el.play();
      } catch {
        // autoplay blocked — user gesture required
        return;
      }
      this.fadeTo(cue.id, target, fadeMs);
    } else {
      el.volume = target;
      try {
        await el.play();
      } catch {
        /* ignore */
      }
    }
  }

  pause(id: string, fadeMs = 0): void {
    const el = this.elements.get(id);
    if (!el) return;
    if (fadeMs > 0) {
      this.fadeTo(id, 0, fadeMs, () => {
        el.pause();
      });
    } else {
      el.pause();
    }
  }

  stop(id: string): void {
    const el = this.elements.get(id);
    if (!el) return;
    this.cancelFade(id);
    el.pause();
    el.currentTime = 0;
  }

  stopAll(fadeMs = 0): void {
    for (const id of this.elements.keys()) {
      this.pause(id, fadeMs);
    }
  }

  setVolume(id: string, vol: number, sceneVolume: number): void {
    const el = this.elements.get(id);
    if (!el) return;
    this.cancelFade(id);
    el.volume = clamp01(vol * sceneVolume);
  }

  updateMasterVolume(cues: AudioCue[], sceneVolume: number): void {
    for (const cue of cues) {
      const el = this.elements.get(cue.id);
      if (!el) continue;
      if (this.fadeRafs.has(cue.id)) continue;
      el.volume = clamp01(cue.volume * sceneVolume);
    }
  }

  cleanup(cueIds: string[]): void {
    const keep = new Set(cueIds);
    for (const [id, el] of this.elements) {
      if (!keep.has(id)) {
        this.cancelFade(id);
        el.pause();
        el.src = '';
        this.elements.delete(id);
      }
    }
  }

  private fadeTo(id: string, target: number, durationMs: number, onDone?: () => void): void {
    const el = this.elements.get(id);
    if (!el) return;
    this.cancelFade(id);
    const start = el.volume;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      el.volume = clamp01(start + (target - start) * t);
      if (t < 1) {
        const raf = requestAnimationFrame(step);
        this.fadeRafs.set(id, raf);
      } else {
        this.fadeRafs.delete(id);
        onDone?.();
      }
    };
    const raf = requestAnimationFrame(step);
    this.fadeRafs.set(id, raf);
  }

  private cancelFade(id: string): void {
    const raf = this.fadeRafs.get(id);
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
      this.fadeRafs.delete(id);
    }
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export const audioEngine = new AudioEngine();
