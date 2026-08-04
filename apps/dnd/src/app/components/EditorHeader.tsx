import { CpcButton } from '@vigooth/ui';
import { generators } from '@/features/dungeon-generator';

const inputClass =
  'bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-2 py-1 outline-none focus:border-cpc-cyan-500';

interface EditorHeaderProps {
  algoId: string;
  onAlgoChange: (id: string) => void;
  seed: number;
  onSeedChange: (n: number) => void;
  width: number;
  onWidthChange: (n: number) => void;
  height: number;
  onHeightChange: (n: number) => void;
  edited: boolean;
  currentMapName: string | null;
  gridVisible: boolean;
  onGridToggle: () => void;
  playerView: boolean;
  onPlayerViewToggle: () => void;
  onFogAll: () => void;
  onRevealAll: () => void;
  initiativeOpen: boolean;
  onInitiativeToggle: () => void;
  audioOpen: boolean;
  onAudioToggle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRender: () => void;
  onNewSeed: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onExportSvg: () => void;
  onPromptHelp: () => void;
}

export function EditorHeader(props: EditorHeaderProps) {
  return (
    <header className="border-b border-cpc-green-900 px-4 py-2 flex items-center gap-2 flex-wrap">
      <div className="text-cpc-cyan-500 font-bold tracking-wider">DND</div>
      <div className="text-cpc-green-900 text-xs">v0</div>
      {props.currentMapName && (
        <span className="text-cpc-green-500 text-xs">· {props.currentMapName}</span>
      )}
      {props.edited && (
        <span className="text-cpc-yellow-500 text-xs font-bold tracking-wider">EDITED</span>
      )}

      <div className="flex items-center gap-1 ml-3">
        <CpcButton size="xs" color="green" disabled={!props.canUndo} onClick={props.onUndo}>
          UNDO
        </CpcButton>
        <CpcButton size="xs" color="green" disabled={!props.canRedo} onClick={props.onRedo}>
          REDO
        </CpcButton>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <CpcButton size="xs" color="cyan" onClick={props.onSave}>
          SAVE
        </CpcButton>
        <CpcButton size="xs" color="cyan" onClick={props.onLoad}>
          LOAD
        </CpcButton>
        <CpcButton size="xs" color="yellow" onClick={props.onExport}>
          EXPORT PNG
        </CpcButton>
        <CpcButton size="xs" color="yellow" onClick={props.onExportSvg}>
          EXPORT SVG
        </CpcButton>
        <CpcButton size="xs" color="magenta" onClick={props.onPromptHelp}>
          AI PROMPT
        </CpcButton>
        <CpcButton
          size="xs"
          color={props.gridVisible ? 'cyan' : 'green'}
          onClick={props.onGridToggle}
        >
          GRID
        </CpcButton>
        <CpcButton size="xs" color="magenta" onClick={props.onFogAll}>
          FOG ALL
        </CpcButton>
        <CpcButton size="xs" color="yellow" onClick={props.onRevealAll}>
          REVEAL ALL
        </CpcButton>
        <CpcButton
          size="xs"
          color={props.playerView ? 'red' : 'green'}
          onClick={props.onPlayerViewToggle}
        >
          {props.playerView ? 'PLAYER VIEW' : 'DM VIEW'}
        </CpcButton>
        <CpcButton
          size="xs"
          color={props.initiativeOpen ? 'cyan' : 'green'}
          onClick={props.onInitiativeToggle}
        >
          INIT
        </CpcButton>
        <CpcButton
          size="xs"
          color={props.audioOpen ? 'cyan' : 'blue'}
          onClick={props.onAudioToggle}
        >
          AUDIO
        </CpcButton>
      </div>

      <div className="ml-auto flex items-center gap-2 flex-wrap">
        <label className="text-xs text-cpc-green-900">ALGO</label>
        <select
          value={props.algoId}
          onChange={(e) => props.onAlgoChange(e.target.value)}
          className={inputClass}
        >
          {generators.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        <label className="text-xs text-cpc-green-900">SEED</label>
        <input
          type="number"
          value={props.seed}
          onChange={(e) => props.onSeedChange(Number(e.target.value) || 0)}
          className={inputClass + ' w-32'}
        />
        <label className="text-xs text-cpc-green-900">W</label>
        <input
          type="number"
          value={props.width}
          onChange={(e) =>
            props.onWidthChange(Math.max(8, Math.min(200, Number(e.target.value) || 0)))
          }
          className={inputClass + ' w-16'}
        />
        <label className="text-xs text-cpc-green-900">H</label>
        <input
          type="number"
          value={props.height}
          onChange={(e) =>
            props.onHeightChange(Math.max(8, Math.min(200, Number(e.target.value) || 0)))
          }
          className={inputClass + ' w-16'}
        />
        <CpcButton size="xs" color="cyan" onClick={props.onRender}>
          RENDER
        </CpcButton>
        <CpcButton size="xs" color="green" onClick={props.onNewSeed}>
          NEW SEED
        </CpcButton>
      </div>
    </header>
  );
}
