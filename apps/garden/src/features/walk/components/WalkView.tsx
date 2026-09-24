import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { SelectField } from '@/components/Field';
import { useGarden } from '@/stores/GardenStore';
import type { BedKind, PhaseKind } from '@/types/garden';
import { BED_KINDS, BED_KIND_LABELS, PHASE_KINDS, PHASE_LABELS } from '@/types/garden';
import type { GardenModel } from '../utils/buildGarden';
import { buildGarden } from '../utils/buildGarden';
import { makeFrame } from '../utils/layout';
import type { CustomModel } from '@/lib/three/customModel';
import { loadCustomModel } from '@/lib/three/customModel';
import type { ModelLibrary } from '../utils/modelLibrary';
import { loadModelLibrary } from '../utils/modelLibrary';
import type { MoveDirection, WalkApi, WalkMode } from './WalkCanvas';
import { WalkCanvas } from './WalkCanvas';

/**
 * The plan has no scale, so the owner says how wide it really is. Remembered
 * per browser: it is a property of the garden, not of the visit, but the API
 * has no field for it and one number is not worth a migration yet.
 */
const WIDTH_STORAGE_KEY = 'garden.walk.widthM';
const DEFAULT_WIDTH_M = 20;
const WIDTH_OPTIONS = [8, 12, 16, 20, 25, 30, 40, 60].map((metres) => ({
  value: String(metres),
  label: `${metres} m`,
}));

function readStoredWidth(): number {
  try {
    const stored = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
    return stored > 0 ? stored : DEFAULT_WIDTH_M;
  } catch {
    return DEFAULT_WIDTH_M;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isBedKind(kind: string): kind is BedKind {
  return BED_KINDS.some((candidate) => candidate === kind);
}

function isPhaseKind(kind: string): kind is PhaseKind {
  return PHASE_KINDS.some((candidate) => candidate === kind);
}

const PAD: { direction: MoveDirection; glyph: string; cell: string }[] = [
  { direction: 'forward', glyph: '▲', cell: 'col-start-2 row-start-1' },
  { direction: 'left', glyph: '◀', cell: 'col-start-1 row-start-2' },
  { direction: 'right', glyph: '▶', cell: 'col-start-3 row-start-2' },
  { direction: 'back', glyph: '▼', cell: 'col-start-2 row-start-2' },
];

/**
 * A walk through the garden in 3D, generated from the plan and the calendar.
 *
 * Nothing is modelled by hand: the beds are the traced polygons raised off the
 * ground, and what grows in them today is read from the occupations. That is
 * what keeps the walk honest — rename a bed, move a planting, and the walk
 * follows without anyone touching a 3D tool.
 */
export function WalkView() {
  const {
    beds,
    plants,
    occupations,
    loading,
    error,
    hasPlanPhoto,
    planPhotoUrl,
    plantName,
    modelUrlFor,
  } = useGarden();

  const [mode, setMode] = useState<WalkMode>('orbit');
  const [widthM, setWidthM] = useState<number>(readStoredWidth);
  const [aspect, setAspect] = useState(1);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const apiRef = useRef<WalkApi | null>(null);
  const [library, setLibrary] = useState<ModelLibrary | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);

  // The low-poly models load once per mount. Until they arrive, or if they
  // never do, the garden is built from procedural shapes instead — the walk
  // is never blocked on half a megabyte of trees.
  useEffect(() => {
    let cancelled = false;
    loadModelLibrary()
      .then((loaded) => {
        if (!cancelled) setLibrary(loaded);
      })
      .catch(() => {
        // Procedural shapes it is.
      })
      .finally(() => {
        if (!cancelled) setLibraryReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The plan photo's proportions decide the plot's depth for its width. Without
  // a photo the plot is assumed square, which is the only honest guess.
  useEffect(() => {
    if (!hasPlanPhoto) {
      setAspect(1);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    planPhotoUrl()
      .then((resolved) => {
        url = resolved;
        const image = new Image();
        image.addEventListener(
          'load',
          () => {
            if (!cancelled && image.naturalWidth > 0) {
              setAspect(image.naturalHeight / image.naturalWidth);
            }
            if (url) URL.revokeObjectURL(url);
          },
          { once: true },
        );
        image.src = resolved;
      })
      .catch(() => {
        // No aspect is still a walkable garden, just a square one.
      });
    return () => {
      cancelled = true;
    };
  }, [hasPlanPhoto, planPhotoUrl]);

  // Models the owner uploaded for specific plants. Keyed by plant id and
  // re-fetched when the set of plants carrying one changes; a model that fails
  // to load is simply absent and the recipe stands in.
  const [customModels, setCustomModels] = useState<Map<string, CustomModel>>(new Map());
  const modelledIds = useMemo(
    () =>
      plants
        .filter((plant) => plant.has_model)
        .map((plant) => `${plant.id}@${plant.updated_at}`)
        .join(','),
    [plants],
  );
  useEffect(() => {
    if (modelledIds === '') {
      setCustomModels(new Map());
      return;
    }
    let cancelled = false;
    const ids = modelledIds.split(',').map((entry) => entry.split('@')[0]);
    Promise.all(
      ids.map(async (id) => {
        try {
          const url = await modelUrlFor(id);
          const loaded = await loadCustomModel(url);
          URL.revokeObjectURL(url);
          return [id, loaded] satisfies [string, CustomModel | null];
        } catch {
          return [id, null] satisfies [string, CustomModel | null];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next = new Map<string, CustomModel>();
      for (const [id, loaded] of entries) if (loaded) next.set(id, loaded);
      setCustomModels(next);
    });
    return () => {
      cancelled = true;
    };
  }, [modelledIds, modelUrlFor]);

  const frame = useMemo(() => makeFrame(widthM, aspect), [widthM, aspect]);

  const shapedBeds = useMemo(
    () => beds.filter((bed) => bed.shape && bed.shape.length >= 3),
    [beds],
  );

  const model = useMemo<GardenModel | null>(() => {
    if (shapedBeds.length === 0 || !libraryReady) return null;
    return buildGarden({
      beds: shapedBeds,
      occupations,
      plants,
      frame,
      today: today(),
      library,
      customModels,
    });
  }, [shapedBeds, occupations, plants, frame, library, libraryReady, customModels]);

  const selectedBed = beds.find((bed) => bed.id === selectedBedId) ?? null;
  const selectedOccupations = useMemo(() => {
    if (!selectedBedId) return [];
    const now = today();
    return occupations
      .filter((o) => o.bed_id === selectedBedId)
      .toSorted((a, b) => a.starts_on.localeCompare(b.starts_on))
      .map((o) => ({
        occupation: o,
        current: o.starts_on <= now && now <= o.ends_on,
        phase: o.phases.find((p) => p.starts_on <= now && now <= p.ends_on) ?? null,
      }));
  }, [occupations, selectedBedId]);

  const handleReady = useCallback((api: WalkApi) => {
    apiRef.current = api;
  }, []);

  const handleWidthChange = (value: string) => {
    const metres = Number(value);
    if (!(metres > 0)) return;
    setWidthM(metres);
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(metres));
    } catch {
      // Private mode or blocked storage: the choice just does not survive a reload.
    }
  };

  const handleGoTo = () => {
    if (selectedBedId) apiRef.current?.goTo(selectedBedId);
  };

  const handleClearSelection = () => setSelectedBedId(null);

  const padPress = (direction: MoveDirection, pressed: boolean) => () => {
    apiRef.current?.setMove(direction, pressed);
  };

  if (loading) return <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>;
  if (error) return <p className="text-xs text-cpc-red-500">ERREUR : {error}</p>;

  if (shapedBeds.length === 0) {
    return (
      <div className="flex flex-col gap-2 text-xs text-cpc-green-900">
        <p>Aucun emplacement n'a encore de forme sur le plan.</p>
        <p>Trace les bacs dans l'onglet PLAN : la balade se construit à partir d'eux.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CpcButton
            variant={mode === 'orbit' ? 'filled' : 'outlined'}
            color={mode === 'orbit' ? 'green' : 'cyan'}
            size="xs"
            onClick={() => setMode('orbit')}
          >
            MAQUETTE
          </CpcButton>
          <CpcButton
            variant={mode === 'walk' ? 'filled' : 'outlined'}
            color={mode === 'walk' ? 'green' : 'cyan'}
            size="xs"
            onClick={() => setMode('walk')}
          >
            BALADE
          </CpcButton>
          <span className="text-[10px] text-cpc-green-900">
            {mode === 'orbit'
              ? 'Glisse pour tourner, molette ou pince pour zoomer, clic sur un bac pour sa fiche.'
              : 'Glisse pour regarder, flèches / ZQSD ou le pavé pour marcher.'}
          </span>
        </div>
        <div className="w-32">
          <SelectField
            label="Largeur du jardin"
            value={String(widthM)}
            onChange={handleWidthChange}
            options={WIDTH_OPTIONS}
          />
        </div>
      </div>

      <div className="relative">
        <WalkCanvas
          model={model}
          frame={frame}
          mode={mode}
          selectedBedId={selectedBedId}
          onSelectBed={setSelectedBedId}
          onReady={handleReady}
        />

        {mode === 'walk' && (
          <div className="absolute bottom-3 left-3 grid grid-cols-3 grid-rows-2 gap-1 select-none">
            {PAD.map(({ direction, glyph, cell }) => (
              <button
                key={direction}
                type="button"
                aria-label={direction}
                className={`${cell} h-10 w-10 touch-none border-2 border-cpc-green-500 bg-black/70 font-mono text-cpc-green-500 active:bg-cpc-green-500 active:text-black`}
                onPointerDown={padPress(direction, true)}
                onPointerUp={padPress(direction, false)}
                onPointerLeave={padPress(direction, false)}
                onPointerCancel={padPress(direction, false)}
                onContextMenu={(event) => event.preventDefault()}
              >
                {glyph}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBed && (
        <section className="flex flex-col gap-2 border-2 border-cpc-yellow-500 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-cpc-yellow-500">{selectedBed.name}</span>
              <span className="text-cpc-green-900">
                {isBedKind(selectedBed.kind) ? BED_KIND_LABELS[selectedBed.kind] : selectedBed.kind}
                {selectedBed.area_m2 ? ` · ${selectedBed.area_m2} m²` : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <CpcButton variant="outlined" color="cyan" size="xs" onClick={handleGoTo}>
                {mode === 'walk' ? 'Y ALLER' : 'CENTRER'}
              </CpcButton>
              <CpcButton variant="text" color="red" size="xs" onClick={handleClearSelection}>
                FERMER
              </CpcButton>
            </div>
          </div>

          {selectedOccupations.length === 0 ? (
            <p className="text-cpc-green-900">Rien de planté ici.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {selectedOccupations.map(({ occupation, current, phase }) => (
                <li
                  key={occupation.id}
                  className={`flex flex-wrap items-baseline gap-2 ${current ? 'text-cpc-green-500' : 'text-cpc-green-900'}`}
                >
                  <span>{plantName(occupation.plant_id)}</span>
                  <span className="text-cpc-green-900">
                    {occupation.starts_on} → {occupation.ends_on}
                  </span>
                  {current && phase && (
                    <span className="border border-cpc-green-900 px-1 text-[10px]">
                      {isPhaseKind(phase.kind) ? PHASE_LABELS[phase.kind] : phase.kind}
                    </span>
                  )}
                  {current && !phase && (
                    <span className="border border-cpc-green-900 px-1 text-[10px]">EN PLACE</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
