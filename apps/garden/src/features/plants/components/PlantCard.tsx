import { Suspense, lazy, useState } from 'react';
import { CpcButton, CpcMatrixImage, CpcVectorImage } from '@vigooth/ui';
import type { Occupation, Plant } from '@/types/garden';
import { usePlantPhoto } from '../hooks/usePlantPhoto';
import type { PhotoEffect } from '../types/photoEffect';

interface PlantCardProps {
  plant: Plant;
  /** This plant's occupations, already resolved to bed names for display. */
  placements: { occupation: Occupation; bedName: string }[];
  /** Treatment applied to the photo, picked once for the whole grid. */
  effect: PhotoEffect;
  /** Omitted on a public garden, where the footer is dropped entirely. */
  onEdit?: (plant: Plant) => void;
  onDelete?: (plant: Plant) => void;
}

// three.js only reaches this tab for plants that carry an uploaded model.
const PlantModelPreview = lazy(() =>
  import('./PlantModelPreview').then((module) => ({ default: module.PlantModelPreview })),
);

const frenchDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function formatWindow(startsOn: string, endsOn: string): string {
  const start = new Date(`${startsOn}T00:00:00`);
  const end = new Date(`${endsOn}T00:00:00`);
  return `${frenchDate.format(start)} → ${frenchDate.format(end)}`;
}

/** Every treatment fits the photo whole, so no leaf ever gets cropped away. */
function PlantPhoto({ url, alt, effect }: { url: string; alt: string; effect: PhotoEffect }) {
  if (effect === 'matrix') {
    return (
      <CpcMatrixImage src={url} alt={alt} cellSize={8} fit="contain" className="h-52 w-full" />
    );
  }

  if (effect === 'photo') {
    return (
      <img src={url} alt={alt} className="h-52 w-full bg-black object-contain" loading="lazy" />
    );
  }

  return <CpcVectorImage src={url} alt={alt} levels={5} fit="contain" className="h-52 w-full" />;
}

export function PlantCard({ plant, placements, effect, onEdit, onDelete }: PlantCardProps) {
  const photoUrl = usePlantPhoto(plant.id, plant.has_photo);
  // With a model, the 3D view takes the photo's slot; the photo stays a tap away.
  const [showModel, setShowModel] = useState(plant.has_model);

  const handleShowModel = () => setShowModel(true);
  const handleShowPhoto = () => setShowModel(false);

  const handleEdit = () => {
    onEdit?.(plant);
  };

  const handleDelete = () => {
    onDelete?.(plant);
  };

  return (
    <article className="flex flex-col gap-3 border-2 border-cpc-green-900 p-3">
      {plant.has_model && showModel ? (
        <Suspense
          fallback={
            <div className="grid h-52 w-full place-items-center border border-cpc-green-900 text-xs text-cpc-green-900">
              CHARGEMENT DE LA 3D...
            </div>
          }
        >
          <PlantModelPreview plantId={plant.id} version={plant.updated_at} />
        </Suspense>
      ) : photoUrl ? (
        <PlantPhoto url={photoUrl} alt={plant.name} effect={effect} />
      ) : (
        <div className="grid h-52 w-full place-items-center border border-cpc-green-900 text-xs text-cpc-green-900">
          PAS DE PHOTO
        </div>
      )}

      {plant.has_model && (plant.has_photo || !showModel) && (
        <div className="flex gap-2">
          <CpcButton
            variant={showModel ? 'filled' : 'outlined'}
            color="cyan"
            size="xs"
            onClick={handleShowModel}
          >
            3D
          </CpcButton>
          {plant.has_photo && (
            <CpcButton
              variant={showModel ? 'outlined' : 'filled'}
              color="cyan"
              size="xs"
              onClick={handleShowPhoto}
            >
              PHOTO
            </CpcButton>
          )}
        </div>
      )}

      <header className="flex flex-col gap-0.5">
        <h2 className="flex items-baseline gap-2 text-sm text-cpc-green-500">
          {plant.name.toUpperCase()}
          {plant.has_model && (
            <span className="border border-cpc-cyan-500 px-1 text-[10px] text-cpc-cyan-500">
              3D
            </span>
          )}
        </h2>
        {plant.latin_name && (
          <p className="text-xs italic text-cpc-green-900">{plant.latin_name}</p>
        )}
      </header>

      {plant.description && (
        <p className="text-xs leading-relaxed text-cpc-green-700">{plant.description}</p>
      )}

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cpc-green-900">
        {plant.family && (
          <div className="flex gap-1">
            <dt>Famille:</dt>
            <dd className="text-cpc-green-700">{plant.family}</dd>
          </div>
        )}
        {plant.sun && (
          <div className="flex gap-1">
            <dt>Expo:</dt>
            <dd className="text-cpc-green-700">{plant.sun}</dd>
          </div>
        )}
        {plant.water && (
          <div className="flex gap-1">
            <dt>Eau:</dt>
            <dd className="text-cpc-green-700">{plant.water}</dd>
          </div>
        )}
        {plant.spacing_cm != null && (
          <div className="flex gap-1">
            <dt>Espacement:</dt>
            <dd className="text-cpc-green-700">{plant.spacing_cm} cm</dd>
          </div>
        )}
      </dl>

      {placements.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-cpc-green-900 pt-2 text-xs">
          {placements.map(({ occupation, bedName }) => (
            <li key={occupation.id} className="flex justify-between gap-2 text-cpc-green-700">
              <span className="text-cpc-yellow-500">{bedName}</span>
              <span>{formatWindow(occupation.starts_on, occupation.ends_on)}</span>
            </li>
          ))}
        </ul>
      )}

      {(onEdit || onDelete) && (
        <footer className="flex gap-2">
          {onEdit && (
            <CpcButton variant="outlined" color="green" size="xs" onClick={handleEdit}>
              MODIFIER
            </CpcButton>
          )}
          {onDelete && (
            <CpcButton variant="text" color="red" size="xs" onClick={handleDelete}>
              SUPPRIMER
            </CpcButton>
          )}
        </footer>
      )}
    </article>
  );
}
