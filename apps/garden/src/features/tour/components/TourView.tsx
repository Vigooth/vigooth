import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { TextField } from '@/components/Field';
import {
  createViewpoint,
  deleteViewpoint,
  updateViewpoint,
  uploadViewpointPanorama,
} from '@/lib/api/garden';
import { useGarden } from '@/stores/GardenStore';
import type { Bed, Point, Viewpoint } from '@/types/garden';
import { polygonCentroid, polygonPath } from '@/utils/geometry';
import {
  azimuthFromViewpoint,
  groundElevation,
  planBearing,
  planDistance,
  radiansToDegrees,
  viewpointPosition,
  wrapAngle,
} from '../utils/panorama';
import { prepareEquirect } from '../utils/prepareEquirect';
import type { Placement } from '../utils/prepareEquirect';
import { PanoramaViewer } from './PanoramaViewer';
import type { TourMarker, ViewerApi } from './PanoramaViewer';

/** What a click on the mini-plan means right now. */
type PlanMode = 'idle' | 'placing' | 'calibrating';

/** Today, as the YYYY-MM-DD the API stores — plain string compares then order dates. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Say how much of the sphere the upload covered, and how sure we are.
 *
 * Worth surfacing because a wrong coverage cannot be calibrated away: it scales
 * the whole image, so every label drifts by an amount that grows with the angle.
 * If the reading looks wrong, that is the number to doubt.
 */
function placementNotice(placement: Placement): string | null {
  const span = Math.round(placement.horizontalCoverage);
  switch (placement.basis) {
    case 'equirect':
      return null;
    case 'gpano':
      return `Panorama de ${span}° placé d'après ses métadonnées GPano — position exacte.`;
    case 'estimated':
      return `Couverture estimée à ${span}° d'après les proportions de l'image, faute de métadonnées. Si les étiquettes dérivent d'autant plus qu'elles sont loin du centre, c'est cette estimation qui est en cause.`;
  }
}

/**
 * The 360° tour: stand at a photographed spot, look around, walk to the next one.
 *
 * Nothing here is authored in 3D. Every label and every "walk over there" marker
 * is derived from the plan the owner already traced — the bearing from a pinned
 * viewpoint to a bed's centroid is an azimuth inside the panorama, once the
 * viewpoint's heading lines the two coordinate spaces up. That is the whole trick,
 * and it is why a bed renamed in the plan is renamed in the tour for free.
 */
export function TourView() {
  const {
    beds,
    viewpoints,
    occupations,
    loading,
    error,
    reload,
    readOnly,
    hasPlanPhoto,
    planPhotoUrl,
    panoramaUrlFor,
    plantName,
  } = useGarden();

  const [currentId, setCurrentId] = useState<string | null>(null);
  /** Where the visitor came from, so arrival keeps their walking direction. */
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [panorama, setPanorama] = useState<string | null>(null);
  const [planPhoto, setPlanPhoto] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<PlanMode>('idle');
  const [draftName, setDraftName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const viewerApiRef = useRef<ViewerApi | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = viewpoints.find((viewpoint) => viewpoint.id === currentId) ?? null;
  const previous = viewpoints.find((viewpoint) => viewpoint.id === previousId) ?? null;

  // Land on something the moment a tour exists, and recover if the current spot
  // is deleted underneath us.
  useEffect(() => {
    if (viewpoints.length === 0) {
      setCurrentId(null);
      return;
    }
    if (viewpoints.some((viewpoint) => viewpoint.id === currentId)) return;
    const landing = viewpoints.find((viewpoint) => viewpoint.has_photo) ?? viewpoints[0];
    setCurrentId(landing.id);
    setPreviousId(null);
  }, [viewpoints, currentId]);

  // Resolve the current panorama, revoking the previous blob URL as we go.
  useEffect(() => {
    if (!current?.has_photo) {
      setPanorama(null);
      return;
    }

    let revoked = false;
    let created: string | null = null;

    panoramaUrlFor(current.id)
      .then((url) => {
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setPanorama(url);
      })
      .catch(() => setPanorama(null));

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [current?.id, current?.has_photo, panoramaUrlFor]);

  // The mini-plan's backdrop, same blob-URL dance as the plan view.
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

  const shapedBeds = useMemo(
    () => beds.filter((bed) => bed.shape && bed.shape.length >= 3),
    [beds],
  );

  /** What is growing in each bed today, for the bed labels. */
  const plantingToday = useMemo(() => {
    const now = today();
    const byBed = new Map<string, string>();
    for (const occupation of occupations) {
      if (occupation.starts_on <= now && now <= occupation.ends_on) {
        byBed.set(occupation.bed_id, plantName(occupation.plant_id));
      }
    }
    return byBed;
  }, [occupations, plantName]);

  /** Walk to another viewpoint, remembering where we left so arrival can face on. */
  const handleWalkTo = useCallback(
    (viewpointId: string) => {
      if (viewpointId === currentId) return;
      setPreviousId(currentId);
      setCurrentId(viewpointId);
      setPlanMode('idle');
      setNotice(null);
    },
    [currentId],
  );

  /**
   * Every marker for the current viewpoint: the beds it can see, and the other
   * viewpoints it can walk to. Both fall out of plan bearings.
   */
  const markers = useMemo<TourMarker[]>(() => {
    if (!current) return [];
    const origin = viewpointPosition(current);
    if (!origin) return [];

    const bedMarkers = shapedBeds.flatMap((bed) => {
      const centroid = polygonCentroid(bed.shape ?? []);
      const azimuth = azimuthFromViewpoint(current, centroid);
      if (azimuth == null) return [];
      return [
        {
          id: `bed-${bed.id}`,
          label: bed.name,
          sublabel: plantingToday.get(bed.id),
          azimuth,
          elevation: groundElevation(planDistance(origin, centroid)),
          kind: 'bed' as const,
        },
      ];
    });

    const viewpointMarkers = viewpoints.flatMap((viewpoint) => {
      if (viewpoint.id === current.id || !viewpoint.has_photo) return [];
      const target = viewpointPosition(viewpoint);
      if (!target) return [];
      const azimuth = azimuthFromViewpoint(current, target);
      if (azimuth == null) return [];
      return [
        {
          id: `viewpoint-${viewpoint.id}`,
          label: viewpoint.name,
          azimuth,
          elevation: groundElevation(planDistance(origin, target)),
          kind: 'viewpoint' as const,
          onActivate: () => handleWalkTo(viewpoint.id),
        },
      ];
    });

    return [...bedMarkers, ...viewpointMarkers];
  }, [current, shapedBeds, viewpoints, plantingToday, handleWalkTo]);

  /**
   * Which way to face on arrival: straight on past the viewpoint we came from, so
   * walking through the garden feels continuous rather than like being spun round.
   */
  const initialYaw = useMemo(() => {
    if (!current || !previous) return 0;
    const from = viewpointPosition(previous);
    if (!from) return 0;
    const back = azimuthFromViewpoint(current, from);
    if (back == null) return 0;
    return wrapAngle(back + Math.PI);
  }, [current, previous]);

  const handleViewerReady = useCallback((api: ViewerApi) => {
    viewerApiRef.current = api;
  }, []);

  const handleViewerError = useCallback((message: string) => {
    setActionError(message);
  }, []);

  const handleAddViewpoint = async () => {
    const name = draftName.trim() || `Point ${viewpoints.length + 1}`;
    try {
      const created = await createViewpoint({ name, sort_order: viewpoints.length });
      setDraftName('');
      setCurrentId(created.id);
      setPreviousId(null);
      setNotice('Point créé. Charge son panorama, puis pose-le sur le plan.');
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Création impossible');
    }
  };

  const handlePickPanorama = () => {
    fileRef.current?.click();
  };

  const handlePanoramaChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !current) return;
    // Let the same file be picked twice in a row, e.g. after a failed upload.
    event.target.value = '';

    try {
      const prepared = await prepareEquirect(file);
      await uploadViewpointPanorama(current.id, prepared.blob);
      setNotice(placementNotice(prepared.placement));
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Envoi du panorama impossible');
    }
  };

  const handleStartPlacing = () => {
    setPlanMode('placing');
    setNotice('Clique sur le plan à l’endroit où tu te tenais pour la photo.');
  };

  const handleStartCalibrating = () => {
    setPlanMode('calibrating');
    setNotice(
      'Centre la vue sur un emplacement que tu reconnais, puis clique ce même emplacement sur le plan.',
    );
  };

  const handleCancelPlanMode = () => {
    setPlanMode('idle');
    setNotice(null);
  };

  /** Save the pin the owner just dropped on the mini-plan. */
  const handlePlacePin = async (position: Point) => {
    if (!current) return;
    try {
      await updateViewpoint(current.id, {
        name: current.name,
        plan_x: position.x,
        plan_y: position.y,
        heading_deg: current.heading_deg,
        sort_order: current.sort_order,
      });
      setPlanMode('idle');
      setNotice('Point posé. Calibre maintenant son orientation.');
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Mise à jour impossible');
    }
  };

  /**
   * Derive the heading from one landmark: the owner has the view centred on a bed
   * and just told us which bed it is. The difference between that bed's plan
   * bearing and the camera's current azimuth *is* the panorama's rotation.
   */
  const handleCalibrateAgainst = async (bed: Bed) => {
    if (!current) return;
    const origin = viewpointPosition(current);
    if (!origin) {
      setActionError('Pose d’abord ce point sur le plan');
      return;
    }
    const camera = viewerApiRef.current?.getCamera();
    if (!camera) return;

    const bearing = planBearing(origin, polygonCentroid(bed.shape ?? []));
    const heading = radiansToDegrees(wrapAngle(bearing - camera.yaw));

    try {
      await updateViewpoint(current.id, {
        name: current.name,
        plan_x: current.plan_x,
        plan_y: current.plan_y,
        heading_deg: heading,
        sort_order: current.sort_order,
      });
      setPlanMode('idle');
      setNotice(`Orientation calée sur « ${bed.name} ».`);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Calibration impossible');
    }
  };

  const handleRenameCurrent = async (name: string) => {
    if (!current) return;
    try {
      await updateViewpoint(current.id, {
        name,
        plan_x: current.plan_x,
        plan_y: current.plan_y,
        heading_deg: current.heading_deg,
        sort_order: current.sort_order,
      });
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Renommage impossible');
    }
  };

  const handleDeleteCurrent = async () => {
    if (!current) return;
    if (!window.confirm(`Supprimer le point « ${current.name} » ?`)) return;
    try {
      await deleteViewpoint(current.id);
      setCurrentId(null);
      setPreviousId(null);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Suppression impossible');
    }
  };

  /** Placing sends a spot, calibrating sends a bed — never both. */
  const handlePlanClick = (position: Point | null, bed: Bed | null) => {
    if (planMode === 'placing' && position) {
      void handlePlacePin(position);
      return;
    }
    if (planMode === 'calibrating' && bed) {
      void handleCalibrateAgainst(bed);
    }
  };

  const isPinned = current ? viewpointPosition(current) != null : false;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm text-cpc-green-500">VISITE 360°</h1>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePanoramaChange}
            />
            {current && (
              <CpcButton variant="outlined" color="cyan" size="xs" onClick={handlePickPanorama}>
                {current.has_photo ? 'CHANGER LE PANORAMA' : 'CHARGER UN PANORAMA'}
              </CpcButton>
            )}
            {current && planMode === 'idle' && (
              <>
                <CpcButton variant="outlined" color="yellow" size="xs" onClick={handleStartPlacing}>
                  {isPinned ? 'DEPLACER SUR LE PLAN' : 'POSER SUR LE PLAN'}
                </CpcButton>
                {isPinned && current.has_photo && (
                  <CpcButton
                    variant="outlined"
                    color="magenta"
                    size="xs"
                    onClick={handleStartCalibrating}
                  >
                    CALIBRER L'ORIENTATION
                  </CpcButton>
                )}
              </>
            )}
            {planMode !== 'idle' && (
              <CpcButton variant="text" color="red" size="xs" onClick={handleCancelPlanMode}>
                ABANDONNER
              </CpcButton>
            )}
          </div>
        )}
      </header>

      {notice && <p className="text-xs text-cpc-yellow-500">{notice}</p>}
      {actionError && <p className="text-xs text-cpc-red-500">{actionError}</p>}
      {error && <p className="text-xs text-cpc-red-500">{error}</p>}
      {loading && <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>}

      {viewpoints.length === 0 ? (
        <EmptyTour readOnly={readOnly} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-2">
            {current && panorama ? (
              <PanoramaViewer
                panoramaUrl={panorama}
                markers={markers}
                initialYaw={initialYaw}
                onReady={handleViewerReady}
                onError={handleViewerError}
              />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center border-2 border-cpc-green-900 px-4 text-center text-xs text-cpc-green-900">
                {current
                  ? readOnly
                    ? 'PAS DE PANORAMA POUR CE POINT'
                    : 'CHARGE UN PANORAMA POUR CE POINT'
                  : 'SELECTIONNE UN POINT'}
              </div>
            )}

            {current && !isPinned && (
              <p className="text-xs text-cpc-yellow-500">
                Ce point n'est pas posé sur le plan — la visite s'affiche, mais sans les étiquettes
                des emplacements ni les passages vers les autres points.
              </p>
            )}
            {current && panorama && (
              <p className="text-xs text-cpc-green-900">
                Glisse pour regarder autour • molette ou pincement pour zoomer
              </p>
            )}
          </div>

          <aside className="flex flex-col gap-3">
            <MiniPlan
              planPhoto={planPhoto}
              beds={shapedBeds}
              viewpoints={viewpoints}
              currentId={currentId}
              mode={planMode}
              onPick={handlePlanClick}
              onSelectViewpoint={handleWalkTo}
            />

            <ViewpointList
              viewpoints={viewpoints}
              currentId={currentId}
              onSelect={handleWalkTo}
            />

            {current && !readOnly && (
              <CurrentViewpointPanel
                viewpoint={current}
                onRename={handleRenameCurrent}
                onDelete={handleDeleteCurrent}
              />
            )}

            {!readOnly && (
              <div className="flex flex-col gap-2 border-2 border-cpc-orange-500 p-3">
                <span className="text-xs text-cpc-orange-500">NOUVEAU POINT</span>
                <TextField
                  label="Nom"
                  value={draftName}
                  onChange={setDraftName}
                  placeholder="Entrée du potager"
                />
                <CpcButton variant="filled" color="orange" size="sm" onClick={handleAddViewpoint}>
                  AJOUTER
                </CpcButton>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function EmptyTour({ readOnly }: { readOnly: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-2 border-cpc-green-900 p-4 text-xs text-cpc-green-900">
      <span className="text-cpc-green-500">AUCUN POINT DE VUE</span>
      {readOnly ? (
        <span>Le propriétaire n'a pas encore photographié son jardin.</span>
      ) : (
        <>
          <span>
            Une visite se construit en trois gestes, par point de vue : photographier un panorama
            360° depuis un endroit du jardin, poser cet endroit sur le plan, puis caler
            l'orientation.
          </span>
          <span>
            Les étiquettes des emplacements et les passages d'un point à l'autre sont ensuite
            calculés à partir de ton plan — rien à placer à la main.
          </span>
        </>
      )}
    </div>
  );
}

interface MiniPlanProps {
  planPhoto: string | null;
  beds: Bed[];
  viewpoints: Viewpoint[];
  currentId: string | null;
  mode: PlanMode;
  onPick: (position: Point | null, bed: Bed | null) => void;
  onSelectViewpoint: (id: string) => void;
}

/**
 * The plan, small, as the tour's map: where each viewpoint stands, which one the
 * visitor is on, and — while placing or calibrating — the surface they click.
 */
function MiniPlan({
  planPhoto,
  beds,
  viewpoints,
  currentId,
  mode,
  onPick,
  onSelectViewpoint,
}: MiniPlanProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  const pinned = viewpoints.flatMap((viewpoint) => {
    const position = viewpointPosition(viewpoint);
    return position ? [{ viewpoint, position }] : [];
  });

  const handleSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'idle') return;
    const bounds = surfaceRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    };
    onPick(position, null);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-cpc-green-900">
        {mode === 'placing'
          ? 'CLIQUE TA POSITION'
          : mode === 'calibrating'
            ? 'CLIQUE L’EMPLACEMENT VISÉ'
            : 'PLAN'}
      </span>
      <div
        ref={surfaceRef}
        onClick={handleSurfaceClick}
        className={`relative aspect-[4/3] w-full border-2 ${
          mode === 'idle' ? 'border-cpc-green-900' : 'cursor-crosshair border-cpc-yellow-500'
        }`}
      >
        {planPhoto ? (
          <img
            src={planPhoto}
            alt="Plan du jardin"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center px-2 text-center text-xs text-cpc-green-900">
            AUCUN PLAN
          </div>
        )}

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {beds.map((bed) => (
            <path
              key={bed.id}
              d={polygonPath(bed.shape ?? [])}
              fill="rgba(0,255,65,0.10)"
              stroke="#00ff41"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
              className={mode === 'calibrating' ? 'cursor-pointer' : 'pointer-events-none'}
              onClick={(event) => {
                if (mode !== 'calibrating') return;
                // Calibrating means "this bed", not "this spot".
                event.stopPropagation();
                onPick(null, bed);
              }}
            />
          ))}
        </svg>

        {pinned.map(({ viewpoint, position }) => (
          <ViewpointPin
            key={viewpoint.id}
            viewpoint={viewpoint}
            position={position}
            isCurrent={viewpoint.id === currentId}
            disabled={mode !== 'idle'}
            onSelect={onSelectViewpoint}
          />
        ))}
      </div>
    </div>
  );
}

interface ViewpointPinProps {
  viewpoint: Viewpoint;
  position: Point;
  isCurrent: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}

function ViewpointPin({ viewpoint, position, isCurrent, disabled, onSelect }: ViewpointPinProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // A pin sits over the click surface used for placing; selecting must not also
    // drop a pin.
    event.stopPropagation();
    onSelect(viewpoint.id);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      title={viewpoint.name}
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 px-1 font-mono text-xs leading-tight ${
        isCurrent
          ? 'border-cpc-yellow-500 bg-cpc-yellow-500 text-cpc-grey-900'
          : 'border-cpc-cyan-500 bg-black/70 text-cpc-cyan-500'
      } ${disabled ? 'pointer-events-none' : ''}`}
    >
      ◎
    </button>
  );
}

interface ViewpointListProps {
  viewpoints: Viewpoint[];
  currentId: string | null;
  onSelect: (id: string) => void;
}

function ViewpointList({ viewpoints, currentId, onSelect }: ViewpointListProps) {
  return (
    <ul className="flex flex-col gap-1">
      {viewpoints.map((viewpoint) => {
        const pinned = viewpointPosition(viewpoint) != null;
        return (
          <li key={viewpoint.id}>
            <CpcButton
              variant={viewpoint.id === currentId ? 'filled' : 'outlined'}
              color={viewpoint.id === currentId ? 'green' : 'cyan'}
              size="xs"
              onClick={() => onSelect(viewpoint.id)}
            >
              {viewpoint.name}
              {!viewpoint.has_photo && ' — SANS PANORAMA'}
              {viewpoint.has_photo && !pinned && ' — NON POSE'}
            </CpcButton>
          </li>
        );
      })}
    </ul>
  );
}

interface CurrentViewpointPanelProps {
  viewpoint: Viewpoint;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function CurrentViewpointPanel({ viewpoint, onRename, onDelete }: CurrentViewpointPanelProps) {
  const [name, setName] = useState(viewpoint.name);

  // Follow the selection: this panel is reused as the visitor walks around.
  useEffect(() => {
    setName(viewpoint.name);
  }, [viewpoint.id, viewpoint.name]);

  const handleRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== viewpoint.name) onRename(trimmed);
  };

  return (
    <div className="flex flex-col gap-2 border-2 border-cpc-yellow-500 p-3">
      <span className="text-xs text-cpc-yellow-500">POINT COURANT</span>
      <TextField label="Nom" value={name} onChange={setName} />
      <span className="text-xs text-cpc-green-900">
        Orientation : {Math.round(viewpoint.heading_deg)}°
      </span>
      <div className="flex flex-wrap gap-2">
        <CpcButton
          variant="outlined"
          color="yellow"
          size="xs"
          onClick={handleRename}
          disabled={name.trim() === '' || name.trim() === viewpoint.name}
        >
          RENOMMER
        </CpcButton>
        <CpcButton variant="text" color="red" size="xs" onClick={onDelete}>
          SUPPRIMER
        </CpcButton>
      </div>
    </div>
  );
}
