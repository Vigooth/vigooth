import { CpcButton, CpcVectorImage } from '@vigooth/ui';
import type { Occupation, Plant } from '@/types/garden';
import { usePlantPhoto } from '../hooks/usePlantPhoto';

interface PlantCardProps {
  plant: Plant;
  /** This plant's occupations, already resolved to bed names for display. */
  placements: { occupation: Occupation; bedName: string }[];
  /** Omitted on a public garden, where the footer is dropped entirely. */
  onEdit?: (plant: Plant) => void;
  onDelete?: (plant: Plant) => void;
}

const frenchDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

function formatWindow(startsOn: string, endsOn: string): string {
  const start = new Date(`${startsOn}T00:00:00`);
  const end = new Date(`${endsOn}T00:00:00`);
  return `${frenchDate.format(start)} → ${frenchDate.format(end)}`;
}

export function PlantCard({ plant, placements, onEdit, onDelete }: PlantCardProps) {
  const photoUrl = usePlantPhoto(plant.id, plant.has_photo);

  const handleEdit = () => {
    onEdit?.(plant);
  };

  const handleDelete = () => {
    onDelete?.(plant);
  };

  return (
    <article className="flex flex-col gap-3 border-2 border-cpc-green-900 p-3">
      {photoUrl ? (
        <CpcVectorImage
          src={photoUrl}
          alt={plant.name}
          levels={5}
          className="h-52 w-full"
        />
      ) : (
        <div className="grid h-52 w-full place-items-center border border-cpc-green-900 text-xs text-cpc-green-900">
          PAS DE PHOTO
        </div>
      )}

      <header className="flex flex-col gap-0.5">
        <h2 className="text-sm text-cpc-green-500">{plant.name.toUpperCase()}</h2>
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
