import { useEffect, useMemo, useRef, useState } from 'react';
import { CpcButton, CpcVectorImage } from '@vigooth/ui';
import { NumberField, SelectField, TextField } from '@/components/Field';
import {
  createBed,
  deleteBed,
  deletePlanPhoto,
  updateBed,
  uploadPlanPhoto,
} from '@/lib/api/garden';
import { useGarden } from '@/stores/GardenStore';
import type { Bed, BedKind, Point } from '@/types/garden';
import { BED_KIND_LABELS, BED_KINDS } from '@/types/garden';
import { downscaleImage } from '@/utils/downscaleImage';
import { normalisedPoint, polygonCentroid, polygonPath } from '../utils/geometry';

function bedKindLabel(kind: string): string {
  return kind in BED_KIND_LABELS ? BED_KIND_LABELS[kind as BedKind] : kind;
}

export function PlanView() {
  const {
    beds,
    loading,
    error,
    reload,
    occupationsForBed,
    plantName,
    conflictsForBed,
    readOnly,
    hasPlanPhoto,
    planPhotoUrl,
  } = useGarden();

  /**
   * The backdrop is fetched as a blob URL rather than pointed at directly: the
   * tracer reads its pixels off a canvas, and a cross-origin image response would
   * taint it. Same reason as the plant photos.
   */
  const [planPhoto, setPlanPhoto] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Point[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const selectedBed = beds.find((bed) => bed.id === selectedBedId) ?? null;

  const shapedBeds = useMemo(
    () => beds.filter((bed) => bed.shape && bed.shape.length >= 3),
    [beds],
  );

  // Resolve the stored backdrop, revoking the blob URL on unmount or replacement.
  useEffect(() => {
    if (!hasPlanPhoto) {
      setPlanPhoto(null);
      return;
    }

    let revoked = false;
    let created: string | null = null;

    planPhotoUrl()
      .then((url) => {
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setPlanPhoto(url);
      })
      .catch(() => setPlanPhoto(null));

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [hasPlanPhoto, planPhotoUrl]);

  const handlePickPhoto = () => {
    fileRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      // Downscaled first, as with plant photos: an aerial shot off a phone is
      // several megabytes, and the tracer samples it down to a small grid anyway.
      await uploadPlanPhoto(await downscaleImage(file));
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Envoi de la photo impossible');
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Retirer la photo du plan ?')) return;
    try {
      await deletePlanPhoto();
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Suppression impossible');
    }
  };

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draft) return;
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setDraft([...draft, normalisedPoint(event, bounds)]);
  };

  const handleStartDraft = () => {
    setDraft([]);
    setSelectedBedId(null);
  };

  const handleCancelDraft = () => {
    setDraft(null);
  };

  const handleUndoPoint = () => {
    setDraft((previous) => (previous && previous.length > 0 ? previous.slice(0, -1) : previous));
  };

  const handleSaveDraft = async (name: string, kind: string, areaM2: string) => {
    if (!draft || draft.length < 3) {
      setActionError('Un emplacement demande au moins 3 points');
      return;
    }
    try {
      const area = areaM2.trim() === '' ? null : Number(areaM2);
      await createBed({
        name,
        kind,
        area_m2: area != null && Number.isFinite(area) ? area : null,
        shape: draft,
        sort_order: beds.length,
      });
      setDraft(null);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Création impossible');
    }
  };

  const handleClearShape = async (bed: Bed) => {
    try {
      await updateBed(bed.id, {
        name: bed.name,
        kind: bed.kind,
        area_m2: bed.area_m2 ?? null,
        shape: [],
        sort_order: bed.sort_order,
      });
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Mise à jour impossible');
    }
  };

  const handleSaveBed = async (bed: Bed, name: string, kind: string, areaM2: string) => {
    const area = areaM2.trim() === '' ? null : Number(areaM2);
    try {
      await updateBed(bed.id, {
        name: name.trim() || bed.name,
        kind,
        area_m2: area != null && Number.isFinite(area) ? area : null,
        // Carried through untouched: the endpoint replaces the whole record, so
        // leaving these out would erase the tracing and reorder the bed.
        shape: bed.shape ?? [],
        sort_order: bed.sort_order,
      });
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Renommage impossible');
    }
  };

  const handleDeleteBed = async (bed: Bed) => {
    const count = occupationsForBed(bed.id).length;
    const warning = count > 0 ? ` et ${count} occupation(s)` : '';
    if (!window.confirm(`Supprimer ${bed.name}${warning} ?`)) return;
    try {
      await deleteBed(bed.id);
      setSelectedBedId(null);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Suppression impossible');
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm text-cpc-green-500">PLAN DU JARDIN</h1>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          {!readOnly && (
            <CpcButton variant="outlined" color="cyan" size="xs" onClick={handlePickPhoto}>
              {hasPlanPhoto ? 'CHANGER LE PLAN' : 'CHARGER UNE PHOTO'}
            </CpcButton>
          )}
          {!readOnly && hasPlanPhoto && (
            <CpcButton variant="text" color="red" size="xs" onClick={handleRemovePhoto}>
              RETIRER LE PLAN
            </CpcButton>
          )}
          {readOnly ? null : draft === null ? (
            <CpcButton variant="filled" color="orange" size="xs" onClick={handleStartDraft}>
              + TRACER UN EMPLACEMENT
            </CpcButton>
          ) : (
            <>
              <CpcButton variant="text" color="yellow" size="xs" onClick={handleUndoPoint}>
                ANNULER LE POINT
              </CpcButton>
              <CpcButton variant="text" color="red" size="xs" onClick={handleCancelDraft}>
                ABANDONNER
              </CpcButton>
            </>
          )}
        </div>
      </header>

      {draft !== null && (
        <p className="text-xs text-cpc-yellow-500">
          Clique sur le plan pour poser les sommets ({draft.length} point
          {draft.length === 1 ? '' : 's'}). Il en faut au moins 3.
        </p>
      )}

      {actionError && <p className="text-xs text-cpc-red-500">{actionError}</p>}
      {error && <p className="text-xs text-cpc-red-500">{error}</p>}
      {loading && <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={surfaceRef}
          onClick={handleSurfaceClick}
          className={`relative aspect-[4/3] w-full border-2 border-cpc-green-900 ${
            draft !== null ? 'cursor-crosshair' : ''
          }`}
        >
          {planPhoto ? (
            // The plan is traced too, and held revealed: a vector plan reads as a
            // map, while the raw photo is just clutter under the overlays.
            <CpcVectorImage
              src={planPhoto}
              alt="Plan du jardin"
              levels={4}
              color="#00ff41"
              revealed={false}
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-cpc-green-900">
              {readOnly ? 'AUCUN PLAN' : 'CHARGE UNE PHOTO AERIENNE DU JARDIN'}
            </div>
          )}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {shapedBeds.map((bed) => {
              const shape = bed.shape ?? [];
              const centroid = polygonCentroid(shape);
              const isSelected = bed.id === selectedBedId;
              const hasConflict = conflictsForBed(bed.id).length > 0;
              const stroke = hasConflict ? '#ff0000' : isSelected ? '#ffff00' : '#00ff41';
              return (
                <g key={bed.id}>
                  <path
                    d={polygonPath(shape)}
                    fill={isSelected ? 'rgba(255,255,0,0.18)' : 'rgba(0,255,65,0.12)'}
                    stroke={stroke}
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onClick={(event) => {
                      // Selecting a bed must not also drop a draft vertex.
                      event.stopPropagation();
                      setSelectedBedId(bed.id);
                    }}
                  />
                  <text
                    x={centroid.x * 100}
                    y={centroid.y * 100}
                    fill={stroke}
                    fontSize={3}
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                  >
                    {bed.name}
                  </text>
                </g>
              );
            })}

            {draft && draft.length > 0 && (
              <g>
                <path
                  d={polygonPath(draft.length >= 3 ? draft : [...draft, draft[0]])}
                  fill="rgba(255,176,0,0.15)"
                  stroke="#ffb000"
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                  className="pointer-events-none"
                />
                {draft.map((point, index) => (
                  <circle
                    key={`${point.x}-${point.y}-${index}`}
                    cx={point.x * 100}
                    cy={point.y * 100}
                    r={0.9}
                    fill="#ffb000"
                    className="pointer-events-none"
                  />
                ))}
              </g>
            )}
          </svg>
        </div>

        <aside className="flex flex-col gap-3">
          {draft !== null && !readOnly ? (
            <DraftPanel pointCount={draft.length} onSave={handleSaveDraft} />
          ) : selectedBed ? (
            <BedPanel
              bed={selectedBed}
              occupations={occupationsForBed(selectedBed.id).map((occupation) => ({
                id: occupation.id,
                label: plantName(occupation.plant_id),
                window: `${occupation.starts_on} → ${occupation.ends_on}`,
              }))}
              conflictCount={conflictsForBed(selectedBed.id).length}
              onSave={readOnly ? undefined : handleSaveBed}
              onClearShape={readOnly ? undefined : handleClearShape}
              onDelete={readOnly ? undefined : handleDeleteBed}
            />
          ) : (
            <div className="border-2 border-cpc-green-900 p-3 text-xs text-cpc-green-900">
              {beds.length === 0
                ? 'AUCUN EMPLACEMENT. TRACE LE PREMIER SUR LE PLAN.'
                : 'SELECTIONNE UN EMPLACEMENT SUR LE PLAN.'}
            </div>
          )}

          {beds.length > shapedBeds.length && (
            <div className="border border-cpc-yellow-500 p-3 text-xs text-cpc-yellow-500">
              {beds.length - shapedBeds.length} emplacement(s) sans tracé — ils existent dans le
              calendrier mais n'apparaissent pas sur le plan.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

interface DraftPanelProps {
  pointCount: number;
  onSave: (name: string, kind: string, areaM2: string) => void;
}

function DraftPanel({ pointCount, onSave }: DraftPanelProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<string>('bed');
  const [areaM2, setAreaM2] = useState('');

  const handleSave = () => {
    onSave(name.trim() || 'Sans nom', kind, areaM2);
    setName('');
    setAreaM2('');
  };

  return (
    <div className="flex flex-col gap-3 border-2 border-cpc-orange-500 p-3">
      <span className="text-xs text-cpc-orange-500">NOUVEL EMPLACEMENT</span>
      <TextField label="Nom" value={name} onChange={setName} placeholder="Bac A" />
      <SelectField
        label="Type"
        value={kind}
        onChange={setKind}
        options={BED_KINDS.map((candidate) => ({
          value: candidate,
          label: BED_KIND_LABELS[candidate],
        }))}
      />
      <NumberField label="Surface (m²)" value={areaM2} onChange={setAreaM2} min={0} step={0.1} />
      <CpcButton
        variant="filled"
        color="orange"
        size="sm"
        onClick={handleSave}
        disabled={pointCount < 3}
      >
        {pointCount < 3 ? `${3 - pointCount} POINT(S) MANQUANT(S)` : 'ENREGISTRER'}
      </CpcButton>
    </div>
  );
}

interface BedPanelProps {
  bed: Bed;
  occupations: { id: string; label: string; window: string }[];
  conflictCount: number;
  /** All omitted on a public garden, where the panel is informational only. */
  onSave?: (bed: Bed, name: string, kind: string, areaM2: string) => void;
  onClearShape?: (bed: Bed) => void;
  onDelete?: (bed: Bed) => void;
}

function BedPanel({
  bed,
  occupations,
  conflictCount,
  onSave,
  onClearShape,
  onDelete,
}: BedPanelProps) {
  const [name, setName] = useState(bed.name);
  const [kind, setKind] = useState(bed.kind);
  const [areaM2, setAreaM2] = useState(bed.area_m2?.toString() ?? '');

  // Follow the selection: one panel is reused for whichever bed is picked, so its
  // fields have to be refilled rather than keeping the previous bed's values.
  useEffect(() => {
    setName(bed.name);
    setKind(bed.kind);
    setAreaM2(bed.area_m2?.toString() ?? '');
  }, [bed.id, bed.name, bed.kind, bed.area_m2]);

  const isDirty =
    name.trim() !== bed.name ||
    kind !== bed.kind ||
    areaM2.trim() !== (bed.area_m2?.toString() ?? '');

  const handleSave = () => {
    onSave?.(bed, name, kind, areaM2);
  };

  const handleClear = () => {
    onClearShape?.(bed);
  };

  const handleDelete = () => {
    onDelete?.(bed);
  };

  return (
    <div className="flex flex-col gap-3 border-2 border-cpc-yellow-500 p-3">
      {onSave ? (
        <div className="flex flex-col gap-3">
          <TextField label="Nom" value={name} onChange={setName} />
          <SelectField
            label="Type"
            value={kind}
            onChange={setKind}
            options={BED_KINDS.map((candidate) => ({
              value: candidate,
              label: BED_KIND_LABELS[candidate],
            }))}
          />
          <NumberField
            label="Surface (m²)"
            value={areaM2}
            onChange={setAreaM2}
            min={0}
            step={0.1}
          />
          <CpcButton
            variant="filled"
            color="yellow"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || name.trim() === ''}
          >
            {isDirty ? 'ENREGISTRER' : 'AUCUNE MODIFICATION'}
          </CpcButton>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-cpc-yellow-500">{bed.name}</span>
          <span className="text-xs text-cpc-green-900">
            {bedKindLabel(bed.kind)}
            {bed.area_m2 != null && ` • ${bed.area_m2} m²`}
          </span>
        </div>
      )}

      {conflictCount > 0 && (
        <span className="text-xs text-cpc-red-500">⚠ {conflictCount} conflit(s) sur ce bac</span>
      )}

      {occupations.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs">
          {occupations.map((occupation) => (
            <li key={occupation.id} className="flex flex-col text-cpc-green-700">
              <span className="text-cpc-green-500">{occupation.label}</span>
              <span className="text-cpc-green-900">{occupation.window}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-xs text-cpc-green-900">Aucune occupation planifiée</span>
      )}

      {(onClearShape || onDelete) && (
        <div className="flex flex-wrap gap-2">
          {onClearShape && (
            <CpcButton variant="outlined" color="yellow" size="xs" onClick={handleClear}>
              EFFACER LE TRACE
            </CpcButton>
          )}
          {onDelete && (
            <CpcButton variant="text" color="red" size="xs" onClick={handleDelete}>
              SUPPRIMER
            </CpcButton>
          )}
        </div>
      )}
    </div>
  );
}
