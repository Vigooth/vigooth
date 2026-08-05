import { useMemo, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { deleteOccupation } from '@/lib/api/garden';
import { useGarden } from '@/stores/GardenStore';
import type { Bed, Occupation, PhaseKind } from '@/types/garden';
import { PHASE_LABELS } from '@/types/garden';
import {
  assignLanes,
  bandFor,
  laneCount,
  monthTicks,
  occupiedYears,
  yearWindow,
} from '../utils/timeline';
import { OccupationForm } from './OccupationForm';

const LANE_HEIGHT = 34;

/** Distinct hues per phase so the strips read without a legend lookup. */
const PHASE_COLORS: Record<PhaseKind, string> = {
  sowing: '#00ffff',
  planting: '#00ff41',
  growth: '#7cff00',
  flowering: '#ff00ff',
  harvest: '#ffb000',
};

function phaseColor(kind: string): string {
  return kind in PHASE_COLORS ? PHASE_COLORS[kind as PhaseKind] : '#808080';
}

function phaseLabel(kind: string): string {
  return kind in PHASE_LABELS ? PHASE_LABELS[kind as PhaseKind] : kind;
}

type Editing = { mode: 'none' } | { mode: 'create' } | { mode: 'edit'; occupation: Occupation };

export function TimelineView() {
  const {
    beds,
    plants,
    occupations,
    conflicts,
    loading,
    error,
    reload,
    plantName,
    conflictedOccupationIds,
  } = useGarden();
  const [editing, setEditing] = useState<Editing>({ mode: 'none' });
  const [actionError, setActionError] = useState<string | null>(null);

  const years = useMemo(() => {
    const found = occupiedYears(occupations);
    return found.length > 0 ? found : [new Date().getFullYear()];
  }, [occupations]);

  const [year, setYear] = useState(() => {
    const current = new Date().getFullYear();
    return years.includes(current) ? current : years[0];
  });
  const activeYear = years.includes(year) ? year : years[0];

  // Named `track`, not `window`: shadowing the global would hide `window.confirm`
  // and every other browser API from this scope.
  const track = useMemo(() => yearWindow(activeYear), [activeYear]);
  const ticks = useMemo(() => monthTicks(track), [track]);

  // Lanes are computed per bed: a bed is the unit of contention, so stacking is
  // only meaningful within one.
  const rows = useMemo(
    () =>
      beds.map((bed) => {
        const bedOccupations = occupations.filter((o) => o.bed_id === bed.id);
        const lanes = assignLanes(bedOccupations);
        return { bed, occupations: bedOccupations, lanes, height: laneCount(lanes) * LANE_HEIGHT };
      }),
    [beds, occupations],
  );

  const handleCreate = () => {
    setEditing({ mode: 'create' });
  };

  const handleCancel = () => {
    setEditing({ mode: 'none' });
  };

  const handleSaved = async () => {
    setEditing({ mode: 'none' });
    await reload();
  };

  const handleDelete = async (occupation: Occupation) => {
    if (!window.confirm(`Supprimer l'occupation de ${plantName(occupation.plant_id)} ?`)) return;
    try {
      await deleteOccupation(occupation.id);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Suppression impossible');
    }
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(Number(event.target.value));
  };

  const canCreate = beds.length > 0 && plants.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm text-cpc-green-500">
          CALENDRIER D’OCCUPATION
          {conflicts.length > 0 && (
            <span className="ml-2 text-cpc-red-500">⚠ {conflicts.length} CONFLIT(S)</span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={activeYear}
            onChange={handleYearChange}
            className="border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 outline-none focus:border-cpc-green-500"
          >
            {years.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
          <CpcButton
            variant="filled"
            color="yellow"
            size="xs"
            onClick={handleCreate}
            disabled={!canCreate}
          >
            + OCCUPATION
          </CpcButton>
        </div>
      </header>

      {!canCreate && !loading && (
        <p className="text-xs text-cpc-yellow-500">
          Ajoute au moins une plante et un emplacement avant de planifier une occupation.
        </p>
      )}

      {editing.mode !== 'none' && (
        <OccupationForm
          beds={beds}
          plants={plants}
          occupation={editing.mode === 'edit' ? editing.occupation : undefined}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}

      {actionError && <p className="text-xs text-cpc-red-500">{actionError}</p>}
      {error && <p className="text-xs text-cpc-red-500">{error}</p>}
      {loading && <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>}

      {rows.length === 0 && !loading && (
        <p className="text-xs text-cpc-green-900">AUCUN EMPLACEMENT DEFINI</p>
      )}

      {rows.length > 0 && (
        // The timeline is wider than a phone; it scrolls inside this box rather
        // than pushing the page sideways.
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="flex">
              <div className="w-32 shrink-0" />
              <div className="relative h-6 flex-1">
                {ticks.map((tick) => (
                  <div
                    key={tick.label}
                    className="absolute top-0 border-l border-cpc-green-900 pl-1 text-xs text-cpc-green-900"
                    style={{ left: `${tick.leftPct}%`, width: `${tick.widthPct}%` }}
                  >
                    {tick.label}
                  </div>
                ))}
              </div>
            </div>

            {rows.map(({ bed, occupations: bedOccupations, lanes, height }) => (
              <TimelineRow
                key={bed.id}
                bed={bed}
                occupations={bedOccupations}
                lanes={lanes}
                height={height}
                ticks={ticks}
                track={track}
                plantName={plantName}
                conflicted={conflictedOccupationIds}
                onEdit={(occupation) => setEditing({ mode: 'edit', occupation })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap gap-3 border-t border-cpc-green-900 pt-2 text-xs">
        {Object.entries(PHASE_LABELS).map(([kind, label]) => (
          <span key={kind} className="flex items-center gap-1 text-cpc-green-900">
            <span
              className="inline-block h-2 w-4"
              style={{ backgroundColor: phaseColor(kind) }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </footer>

      {conflicts.length > 0 && (
        <div className="flex flex-col gap-1 border-2 border-cpc-red-500 p-3 text-xs">
          <span className="text-cpc-red-500">CONFLITS D’OCCUPATION</span>
          {conflicts.map((conflict) => (
            <p
              key={`${conflict.occupation_a_id}-${conflict.occupation_b_id}`}
              className="text-cpc-green-700"
            >
              {plantName(
                occupations.find((o) => o.id === conflict.occupation_a_id)?.plant_id ?? '',
              )}{' '}
              et{' '}
              {plantName(
                occupations.find((o) => o.id === conflict.occupation_b_id)?.plant_id ?? '',
              )}{' '}
              se chevauchent {conflict.overlap_dayspan} jour(s) — du {conflict.overlap_start} au{' '}
              {conflict.overlap_end}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

interface TimelineRowProps {
  bed: Bed;
  occupations: Occupation[];
  lanes: Map<string, number>;
  height: number;
  ticks: { label: string; leftPct: number; widthPct: number }[];
  track: ReturnType<typeof yearWindow>;
  plantName: (plantId: string) => string;
  conflicted: Set<string>;
  onEdit: (occupation: Occupation) => void;
  onDelete: (occupation: Occupation) => void;
}

function TimelineRow({
  bed,
  occupations,
  lanes,
  height,
  ticks,
  track,
  plantName,
  conflicted,
  onEdit,
  onDelete,
}: TimelineRowProps) {
  return (
    <div className="flex border-t border-cpc-green-900">
      <div className="w-32 shrink-0 py-2 pr-2">
        <span className="text-xs text-cpc-yellow-500">{bed.name}</span>
      </div>

      <div className="relative flex-1" style={{ height: Math.max(height, LANE_HEIGHT) }}>
        {ticks.map((tick) => (
          <div
            key={tick.label}
            className="absolute top-0 bottom-0 border-l border-cpc-green-900/40"
            style={{ left: `${tick.leftPct}%` }}
            aria-hidden
          />
        ))}

        {occupations.map((occupation) => {
          const band = bandFor(track, occupation.starts_on, occupation.ends_on);
          if (!band) return null;
          const lane = lanes.get(occupation.id) ?? 0;
          const isConflicted = conflicted.has(occupation.id);

          return (
            <div
              key={occupation.id}
              className={`absolute overflow-hidden border-2 ${
                isConflicted
                  ? 'border-cpc-red-500 bg-cpc-red-900/40'
                  : 'border-cpc-green-500 bg-cpc-green-900/30'
              }`}
              style={{
                left: `${band.leftPct}%`,
                width: `${band.widthPct}%`,
                top: lane * LANE_HEIGHT + 3,
                height: LANE_HEIGHT - 8,
              }}
              title={`${plantName(occupation.plant_id)} — ${occupation.starts_on} → ${occupation.ends_on}${
                occupation.notes ? `\n${occupation.notes}` : ''
              }`}
            >
              {/* Phase strips sit along the bottom of the bar, positioned against
                  the same year track — so a phase reaching outside the occupation
                  still lands on the right date. */}
              <div className="absolute inset-x-0 bottom-0 h-1.5">
                {occupation.phases.map((phase) => {
                  const phaseBand = bandFor(track, phase.starts_on, phase.ends_on);
                  if (!phaseBand) return null;
                  // Re-express the phase against the bar's own box.
                  const relativeLeft =
                    ((phaseBand.leftPct - band.leftPct) / band.widthPct) * 100;
                  const relativeWidth = (phaseBand.widthPct / band.widthPct) * 100;
                  return (
                    <div
                      key={phase.id || `${phase.kind}-${phase.starts_on}`}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${Math.max(0, relativeLeft)}%`,
                        width: `${Math.min(100, relativeWidth)}%`,
                        backgroundColor: phaseColor(phase.kind),
                      }}
                      title={`${phaseLabel(phase.kind)}: ${phase.starts_on} → ${phase.ends_on}`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                className="h-full w-full px-1 text-left text-xs text-cpc-green-500"
                onClick={() => onEdit(occupation)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onDelete(occupation);
                }}
                title="Clic pour modifier, clic droit pour supprimer"
              >
                <span className="truncate">
                  {band.clippedStart && '‹'}
                  {plantName(occupation.plant_id)}
                  {band.clippedEnd && '›'}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
