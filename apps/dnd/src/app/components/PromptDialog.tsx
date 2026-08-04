import { useEffect, useState } from 'react';
import { CpcButton, cn } from '@vigooth/ui';

interface PromptOption {
  id: string;
  label: string;
  blurb: string;
  prompt: string;
}

const PROMPTS: PromptOption[] = [
  {
    id: 'battlemap',
    label: 'BATTLEMAP TOP-DOWN',
    blurb: 'Painterly tabletop encounter map, top-down. Best for actual play.',
    prompt: `Transform this top-down dungeon schematic into a richly detailed painted fantasy battlemap, preserving the EXACT same layout, room shapes, corridor positions, and door locations.

Interpret the colored regions as terrain types:
- White areas → polished stone floors with cracks and faint wear patterns
- Beige areas → narrow torchlit corridors with rough cobblestone
- Black outlines → dressed stone walls casting subtle shadows
- Brown squares → wooden plank doors with iron hinges
- Blue areas → clear water pools with subtle ripples and reflections
- Orange/red areas → glowing molten lava with bright yellow cracks
- Bright orange spots → flickering bonfires with cast light on nearby walls
- Light green areas → patches of grass and moss
- Dark green areas → tall reeds and dense undergrowth

Strict top-down 90° camera, soft directional lighting from above, hand-painted digital fantasy art with parchment paper margins, photorealistic stone and water textures blended with painterly highlights. No user interface, no text, no grid overlay, no labels.

The layout must be pixel-accurate to the source. Do not invent new rooms, do not move walls or doors.`,
  },
  {
    id: 'isometric',
    label: 'ISOMETRIC 3D DIORAMA',
    blurb: 'Tilted 45° view, raised walls, miniature feel. Cinematic.',
    prompt: `Convert this top-down dungeon schematic into a detailed isometric 3D scene at a 45° camera angle, treating black wall lines as raised stone walls casting soft shadows, brown squares as wooden barriers, and each colored region as a distinct terrain:
- blue → deep clear water
- red-orange → molten lava with glowing yellow veins
- bright orange → leaping flames and embers
- light green → grass fields
- dark green → tall grass and bushes
- white → polished stone floors
- beige → cobblestone corridors

The room positions, corridor routes and door locations must remain perfectly identical to the source. Painterly fantasy illustration, dramatic warm lighting from torches and lava, miniature diorama feel. No text, no labels, no measurement markers, no rulers.`,
  },
  {
    id: 'parchment',
    label: 'AGED PARCHMENT MAP',
    blurb: 'Hand-drawn cartographer style, sepia, for worldbuilding lore.',
    prompt: `Redraw this top-down dungeon as an aged parchment treasure map illustrated by a medieval-style cartographer. Keep the EXACT room layout and corridor structure. Render walls as dark ink outlines, floors as faintly tinted parchment, and add hand-drawn symbols for the terrain features: stylised waves for water, small flames for lava and bonfires, tufts of grass for vegetated areas. Sepia and ochre tones, ink wash shading, slight aging stains, decorative borders with a compass rose and a heraldic dragon. No modern lettering or numbers.`,
  },
];

interface PromptDialogProps {
  onClose: () => void;
}

export function PromptDialog({ onClose }: PromptDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (option: PromptOption) => {
    try {
      await navigator.clipboard.writeText(option.prompt);
      setCopied(option.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Fallback : prompt() so user can manually copy
      window.prompt('Copy this prompt:', option.prompt);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-black border-2 border-cpc-green-500 w-full max-w-2xl p-4 font-mono max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="text-cpc-cyan-500 font-bold tracking-wider">AI IMAGE PROMPTS</div>
          <CpcButton size="xs" color="green" onClick={onClose}>
            CLOSE
          </CpcButton>
        </div>
        <div className="text-cpc-green-900 text-xs mb-3 leading-tight">
          Export the scene as PNG (use the EXPORT PNG button), then upload it to ChatGPT
          (GPT-4o image), Midjourney, or Stable Diffusion + ControlNet, and paste the
          chosen prompt. ControlNet Canny preserves layout best.
        </div>

        <div className="flex flex-col gap-3">
          {PROMPTS.map((option) => (
            <div key={option.id} className="border border-cpc-green-900 p-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div>
                  <div className="text-cpc-cyan-500 text-xs font-bold tracking-wider">
                    {option.label}
                  </div>
                  <div className="text-cpc-green-900 text-[10px]">{option.blurb}</div>
                </div>
                <CpcButton
                  size="xs"
                  color={copied === option.id ? 'green' : 'cyan'}
                  onClick={() => copy(option)}
                >
                  {copied === option.id ? 'COPIED ✓' : 'COPY'}
                </CpcButton>
              </div>
              <pre
                className={cn(
                  'text-cpc-green-500 text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto',
                  'border border-cpc-green-900 p-2 bg-black/40',
                )}
              >
                {option.prompt}
              </pre>
            </div>
          ))}
        </div>

        <div className="text-cpc-green-900 text-[10px] mt-3 leading-tight">
          Tip: toggle off GRID before exporting; remove tokens if you want a clean
          briefing map; keep fog if you want to hide unexplored zones from the AI.
        </div>
      </div>
    </div>
  );
}
