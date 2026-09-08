import { useRef, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { NumberField, TextAreaField, TextField } from '@/components/Field';
import {
  createPlant,
  enrichPlant,
  identifyPlant,
  updatePlant,
  uploadPlantPhoto,
} from '@/lib/api/garden';
import type { Plant, PlantCandidate, SavePlantInput } from '@/types/garden';
import { downscaleImage } from '@/utils/downscaleImage';

interface PlantFormProps {
  /** Absent for a new plant. */
  plant?: Plant;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  latinName: string;
  family: string;
  description: string;
  sun: string;
  water: string;
  spacingCm: string;
}

function initialState(plant?: Plant): FormState {
  return {
    name: plant?.name ?? '',
    latinName: plant?.latin_name ?? '',
    family: plant?.family ?? '',
    description: plant?.description ?? '',
    sun: plant?.sun ?? '',
    water: plant?.water ?? '',
    spacingCm: plant?.spacing_cm != null ? String(plant.spacing_cm) : '',
  };
}

export function PlantForm({ plant, onSaved, onCancel }: PlantFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(plant));
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [candidates, setCandidates] = useState<PlantCandidate[] | null>(null);
  const [enriching, setEnriching] = useState(false);
  /** Drives the "these came from a model, check them" note under the fields. */
  const [enriched, setEnriched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof FormState>(key: K) => (value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handlePickPhoto = () => {
    fileRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhoto(event.target.files?.[0] ?? null);
    // Suggestions belong to the previous photo; keeping them next to a new one
    // would invite filling the form from the wrong plant.
    setCandidates(null);
  };

  const handleIdentify = async () => {
    if (!photo) return;
    setIdentifying(true);
    setError(null);
    try {
      // Pl@ntNet takes JPEG or PNG only, so the picked file goes through the
      // canvas re-encode rather than straight up — that also covers webp and
      // whatever a phone hands us.
      const found = await identifyPlant(await downscaleImage(photo, 1280));
      setCandidates(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Identification impossible');
    } finally {
      setIdentifying(false);
    }
  };

  /**
   * Picking a candidate settles the identity, then asks the model for the care
   * fields. Empty ones only: a value already typed is the gardener's own
   * observation of their plot, which beats a general answer.
   */
  const handleApplyCandidate = (candidate: PlantCandidate) => async () => {
    setForm((previous) => ({
      ...previous,
      name: candidate.name,
      latinName: candidate.latin_name,
      family: candidate.family,
    }));
    setCandidates(null);

    setEnriching(true);
    try {
      const care = await enrichPlant(candidate.name, candidate.latin_name);
      setForm((previous) => ({
        ...previous,
        sun: previous.sun || care.sun,
        water: previous.water || care.water,
        spacingCm: previous.spacingCm || (care.spacing_cm != null ? String(care.spacing_cm) : ''),
        description: previous.description || care.description,
      }));
      setEnriched(true);
    } catch {
      // The identity is in and saveable; failing to guess the watering is not
      // worth an error banner over the form.
      setEnriched(false);
    } finally {
      setEnriching(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Le nom est obligatoire');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const spacing = form.spacingCm.trim() === '' ? null : Number(form.spacingCm);
      const input: SavePlantInput = {
        name: form.name.trim(),
        latin_name: form.latinName.trim(),
        family: form.family.trim(),
        description: form.description.trim(),
        sun: form.sun.trim(),
        water: form.water.trim(),
        spacing_cm: spacing != null && Number.isFinite(spacing) ? spacing : null,
      };

      const saved = plant ? await updatePlant(plant.id, input) : await createPlant(input);

      // The photo is a second request by design: it keeps plant metadata out of
      // multipart encoding, and a failed upload does not lose the typed fields.
      if (photo) {
        await uploadPlantPhoto(saved.id, await downscaleImage(photo));
      }

      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-2 border-cpc-green-500 p-4">
      <h2 className="text-sm text-cpc-yellow-500">
        {plant ? `MODIFIER ${plant.name.toUpperCase()}` : 'NOUVELLE PLANTE'}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Nom" value={form.name} onChange={update('name')} placeholder="Tomate cœur de bœuf" />
        <TextField
          label="Nom latin"
          value={form.latinName}
          onChange={update('latinName')}
          placeholder="Solanum lycopersicum"
        />
        <TextField label="Famille" value={form.family} onChange={update('family')} placeholder="Solanacées" />
        <TextField label="Exposition" value={form.sun} onChange={update('sun')} placeholder="Plein soleil" />
        <TextField label="Arrosage" value={form.water} onChange={update('water')} placeholder="Régulier" />
        <NumberField label="Espacement (cm)" value={form.spacingCm} onChange={update('spacingCm')} min={0} />
      </div>

      {enriching && <p className="text-xs text-cpc-cyan-500">RECHERCHE DES CONSEILS DE CULTURE...</p>}
      {enriched && !enriching && (
        <p className="text-xs text-cpc-yellow-500">
          EXPOSITION, ARROSAGE, ESPACEMENT ET DESCRIPTIF PROPOSES PAR IA — A VERIFIER
        </p>
      )}

      <TextAreaField label="Descriptif" value={form.description} onChange={update('description')} />

      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        <CpcButton type="button" variant="outlined" color="cyan" size="xs" onClick={handlePickPhoto}>
          {plant?.has_photo ? 'REMPLACER LA PHOTO' : 'AJOUTER UNE PHOTO'}
        </CpcButton>
        {photo && (
          <CpcButton
            type="button"
            variant="outlined"
            color="yellow"
            size="xs"
            disabled={identifying}
            onClick={handleIdentify}
          >
            {identifying ? 'IDENTIFICATION...' : 'IDENTIFIER'}
          </CpcButton>
        )}
        <span className="text-xs text-cpc-green-900">
          {photo ? photo.name : plant?.has_photo ? 'photo enregistrée' : 'aucune photo'}
        </span>
      </div>

      {candidates?.length === 0 && (
        <p className="text-xs text-cpc-green-900">AUCUNE ESPECE RECONNUE SUR CETTE PHOTO</p>
      )}

      {candidates && candidates.length > 0 && (
        <ul className="flex flex-col gap-1 border-2 border-cpc-yellow-500 p-2">
          <li className="text-xs text-cpc-yellow-500">PROPOSITIONS PL@NTNET</li>
          {candidates.map((candidate) => (
            <li key={candidate.latin_name}>
              <button
                type="button"
                onClick={handleApplyCandidate(candidate)}
                className="flex w-full flex-col gap-1 border border-transparent px-1 py-1 text-left text-xs text-cpc-green-500 hover:border-cpc-green-500"
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span>{candidate.name}</span>
                  <span className="italic text-cpc-green-900">{candidate.latin_name}</span>
                  <span className="ml-auto text-cpc-cyan-500">
                    {Math.round(candidate.score * 100)}%
                  </span>
                </span>
                {candidate.images.length > 0 && (
                  <span className="flex gap-1">
                    {candidate.images.map((image) => (
                      <img
                        key={image.thumb}
                        src={image.thumb}
                        // Credit is a licence condition on these, not a nicety.
                        alt={`${candidate.name} — ${image.organ} — ${image.citation}`}
                        title={image.citation}
                        loading="lazy"
                        className="h-16 w-16 border border-cpc-green-900 object-cover"
                      />
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
          <li className="text-xs text-cpc-green-900">PHOTOS PL@NTNET, CC-BY-SA</li>
        </ul>
      )}

      {error && <p className="text-xs text-cpc-red-500">{error}</p>}

      <div className="flex gap-2">
        <CpcButton type="submit" variant="filled" color="green" size="sm" disabled={saving}>
          {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
        </CpcButton>
        <CpcButton type="button" variant="text" color="red" size="sm" onClick={onCancel}>
          ANNULER
        </CpcButton>
      </div>
    </form>
  );
}
