import { useState } from 'react';
import { cn } from '@vigooth/ui';
import type { AudioCue, SceneAudio } from '@/types/audio';
import { putAsset } from '@/features/assets';
import { useHorizontalResize } from '@/hooks/useHorizontalResize';
import { useAudioActions, usePlayingCues } from '../hooks/useAudioEngine';

interface AudioMixerPanelProps {
  audio: SceneAudio;
  onChange: (audio: SceneAudio) => void;
}

const inputClass =
  'bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-1 py-0.5 outline-none focus:border-cpc-cyan-500';

export function AudioMixerPanel({ audio, onChange }: AudioMixerPanelProps) {
  const { width, onPointerDown } = useHorizontalResize({
    initial: 300,
    min: 240,
    max: 480,
    side: 'right',
  });
  const playing = usePlayingCues();
  const actions = useAudioActions(audio.masterVolume);
  const [adding, setAdding] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('audio/'));
    if (!files.length) return;
    await addFiles(files);
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('audio/'));
    e.target.value = '';
    if (!files.length) return;
    await addFiles(files);
  };

  const addFiles = async (files: File[]) => {
    setAdding(true);
    try {
      const newCues: AudioCue[] = [];
      for (const file of files) {
        const asset = await putAsset(file);
        newCues.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          assetId: asset.id,
          volume: 0.8,
          loop: true,
          autoStart: false,
        });
      }
      onChange({ ...audio, cues: [...audio.cues, ...newCues] });
    } finally {
      setAdding(false);
    }
  };

  const addFromUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      window.alert('URL must start with http:// or https://');
      return;
    }
    const name = url.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'remote';
    const cue: AudioCue = {
      id: crypto.randomUUID(),
      name,
      url,
      volume: 0.8,
      loop: true,
      autoStart: false,
    };
    onChange({ ...audio, cues: [...audio.cues, cue] });
    setUrlInput('');
  };

  const updateCue = (id: string, patch: Partial<AudioCue>) => {
    onChange({
      ...audio,
      cues: audio.cues.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeCue = (id: string) => {
    actions.pause(id);
    onChange({
      ...audio,
      cues: audio.cues.filter((c) => c.id !== id),
      zones: audio.zones.filter((z) => z.cueId !== id),
    });
  };

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 border-l border-cpc-green-900 p-2 flex flex-col gap-2 overflow-y-auto bg-black"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      <div className="text-cpc-cyan-500 font-bold text-xs tracking-wider">SOUNDSCAPE</div>

      <div className="flex items-center gap-2 text-xs text-cpc-green-900">
        <span>MASTER</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={audio.masterVolume}
          onChange={(e) => onChange({ ...audio, masterVolume: Number(e.target.value) })}
          className="flex-1 accent-cpc-cyan-500"
        />
        <span className="w-8 text-right">{Math.round(audio.masterVolume * 100)}</span>
      </div>

      <label className="border border-dashed border-cpc-green-900 p-2 text-center text-cpc-green-900 text-[10px] cursor-pointer hover:border-cpc-cyan-500 hover:text-cpc-cyan-500">
        DROP MP3/OGG/WAV HERE
        <br />
        OR CLICK TO SELECT
        <input
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
      </label>
      {adding && <div className="text-cpc-yellow-500 text-xs">Loading...</div>}

      <div className="flex gap-1">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addFromUrl();
          }}
          placeholder="https://...mp3"
          className={inputClass + ' flex-1 min-w-0'}
        />
        <button
          type="button"
          onClick={addFromUrl}
          disabled={!urlInput.trim()}
          className="border border-cpc-blue-500 text-cpc-blue-500 text-xs px-2 hover:bg-cpc-blue-500 hover:text-black disabled:opacity-40"
        >
          ADD URL
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {audio.cues.length === 0 && (
          <div className="text-cpc-green-900 text-xs text-center py-4">No cues yet</div>
        )}
        {audio.cues.map((cue) => {
          const isPlaying = playing.has(cue.id);
          return (
            <div
              key={cue.id}
              className={cn(
                'border p-1.5 flex flex-col gap-1',
                isPlaying ? 'border-cpc-cyan-500 bg-cpc-cyan-500/5' : 'border-cpc-green-900',
              )}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => actions.toggle(cue)}
                  className={cn(
                    'px-2 py-0.5 text-xs border',
                    isPlaying
                      ? 'border-cpc-cyan-500 text-cpc-cyan-500'
                      : 'border-cpc-green-500 text-cpc-green-500 hover:bg-cpc-green-500 hover:text-black',
                  )}
                >
                  {isPlaying ? '◼' : '▶'}
                </button>
                <input
                  type="text"
                  value={cue.name}
                  onChange={(e) => updateCue(cue.id, { name: e.target.value })}
                  className={inputClass + ' flex-1 min-w-0'}
                />
                <span
                  className={cn(
                    'text-[9px] border px-1 leading-none py-0.5',
                    cue.url
                      ? 'border-cpc-blue-500 text-cpc-blue-500'
                      : 'border-cpc-green-900 text-cpc-green-900',
                  )}
                  title={cue.url ?? 'Local file'}
                >
                  {cue.url ? 'URL' : 'IDB'}
                </span>
                <button
                  type="button"
                  onClick={() => removeCue(cue.id)}
                  className="text-cpc-red-500 text-xs px-1 hover:bg-cpc-red-500 hover:text-black"
                >
                  X
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-cpc-green-900">
                <span>VOL</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={cue.volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateCue(cue.id, { volume: v });
                    actions.setVolume(cue.id, v);
                  }}
                  className="flex-1 accent-cpc-cyan-500"
                />
                <span className="w-8 text-right">{Math.round(cue.volume * 100)}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-cpc-green-900">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cue.loop}
                    onChange={(e) => updateCue(cue.id, { loop: e.target.checked })}
                    className="accent-cpc-cyan-500"
                  />
                  LOOP
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cue.autoStart}
                    onChange={(e) => updateCue(cue.id, { autoStart: e.target.checked })}
                    className="accent-cpc-cyan-500"
                  />
                  AUTO-START
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-cpc-green-900 text-[10px] mt-2 leading-tight">
        Pick ZONE tool in palette, click on map to drop an audio marker.
        <br />
        Click a marker (with SELECT) to toggle its cue.
      </div>

      <div
        onPointerDown={onPointerDown}
        className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize hover:bg-cpc-cyan-500/40 z-10"
      />
    </aside>
  );
}
