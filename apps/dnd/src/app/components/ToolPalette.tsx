import type { RefObject } from 'react';
import { CpcButton } from '@vigooth/ui';
import { CellType, type CellTypeValue, type StampLayer } from '@/types/dungeon';
import { useHorizontalResize } from '@/hooks/useHorizontalResize';

export type ToolId = 'select' | 'fog' | 'reveal' | 'zone' | CellTypeValue;

const paintTools: { label: string; cellType: CellTypeValue; color: 'green' | 'cyan' | 'blue' | 'red' | 'yellow' | 'orange' | 'magenta' }[] = [
  { label: 'WALL', cellType: CellType.Wall, color: 'green' },
  { label: 'FLOOR', cellType: CellType.Floor, color: 'green' },
  { label: 'CORRIDOR', cellType: CellType.Corridor, color: 'green' },
  { label: 'DOOR', cellType: CellType.Door, color: 'green' },
  { label: 'WATER', cellType: CellType.Water, color: 'blue' },
  { label: 'LAVA', cellType: CellType.Lava, color: 'red' },
  { label: 'FIRE', cellType: CellType.Fire, color: 'orange' },
  { label: 'GRASS', cellType: CellType.Grass, color: 'green' },
  { label: 'TALL GRASS', cellType: CellType.TallGrass, color: 'green' },
];

interface ToolPaletteProps {
  tool: ToolId;
  onToolChange: (t: ToolId) => void;
  dropLayer: StampLayer;
  onDropLayerChange: (l: StampLayer) => void;
  onUploadClick: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ToolPalette(props: ToolPaletteProps) {
  const { width, onPointerDown } = useHorizontalResize({
    initial: 144,
    min: 120,
    max: 360,
    side: 'left',
  });

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 border-r border-cpc-green-900 p-2 flex flex-col gap-1 overflow-y-auto"
    >
      <div className="text-cpc-green-900 text-xs mb-1">TOOL</div>
      <CpcButton
        size="xs"
        fullWidth
        color={props.tool === 'select' ? 'cyan' : 'green'}
        className="justify-start"
        onClick={() => props.onToolChange('select')}
      >
        SELECT
      </CpcButton>
      {paintTools.map((t) => (
        <CpcButton
          key={t.label}
          size="xs"
          fullWidth
          color={props.tool === t.cellType ? 'cyan' : t.color}
          className="justify-start"
          onClick={() => props.onToolChange(t.cellType)}
        >
          {t.label}
        </CpcButton>
      ))}

      <div className="text-cpc-green-900 text-xs mt-3 mb-1">FOG</div>
      <CpcButton
        size="xs"
        fullWidth
        color={props.tool === 'fog' ? 'cyan' : 'magenta'}
        className="justify-start"
        onClick={() => props.onToolChange('fog')}
      >
        HIDE
      </CpcButton>
      <CpcButton
        size="xs"
        fullWidth
        color={props.tool === 'reveal' ? 'cyan' : 'yellow'}
        className="justify-start"
        onClick={() => props.onToolChange('reveal')}
      >
        REVEAL
      </CpcButton>

      <div className="text-cpc-green-900 text-xs mt-3 mb-1">AUDIO</div>
      <CpcButton
        size="xs"
        fullWidth
        color={props.tool === 'zone' ? 'cyan' : 'blue'}
        className="justify-start"
        onClick={() => props.onToolChange('zone')}
      >
        ZONE
      </CpcButton>

      <div className="text-cpc-green-900 text-xs mt-3 mb-1">STAMPS</div>
      <div className="flex gap-1">
        <CpcButton
          size="xs"
          fullWidth
          color={props.dropLayer === 'decor' ? 'magenta' : 'green'}
          className="justify-center"
          onClick={() => props.onDropLayerChange('decor')}
        >
          DECOR
        </CpcButton>
        <CpcButton
          size="xs"
          fullWidth
          color={props.dropLayer === 'token' ? 'magenta' : 'green'}
          className="justify-center"
          onClick={() => props.onDropLayerChange('token')}
        >
          TOKEN
        </CpcButton>
      </div>
      <CpcButton
        size="xs"
        fullWidth
        color="yellow"
        className="justify-center mt-1"
        onClick={props.onUploadClick}
      >
        UPLOAD
      </CpcButton>
      <input
        ref={props.fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={props.onFileChange}
      />

      <div className="text-cpc-green-900 text-[10px] mt-3 leading-tight">
        LMB: paint/select
        <br />
        Shift+LMB: add to sel
        <br />
        RMB: stamp menu
        <br />
        Wheel / MMB / Space+drag: pan
        <br />
        Cmd/Ctrl+Wheel: zoom
        <br />
        Drop image: stamp
        <br />
        Del: remove
        <br />
        Cmd/Ctrl+Z: undo
      </div>

      <div
        onPointerDown={onPointerDown}
        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-cpc-cyan-500/40 z-10"
      />
    </aside>
  );
}
