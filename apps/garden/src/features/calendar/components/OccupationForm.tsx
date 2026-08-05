import { useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { DateField, SelectField, TextAreaField } from '@/components/Field';
import { createOccupation, updateOccupation } from '@/lib/api/garden';
import type { Bed, Occupation, PhaseInput, Plant } from '@/types/garden';
import { PHASE_KINDS, PHASE_LABELS } from '@/types/garden';

interface OccupationFormProps {
  beds: Bed[];
  plants: Plant[];
  /** Absent for a new occupation. */
  occupation?: Occupation;
  onSaved: () => void;
  onCancel: () => void;
}

interface PhaseRow extends PhaseInput {
  /** Local row key — phase ids are assigned server-side on save. */
  key: string;
}

let phaseKeySeed = 0;
const nextPhaseKey = () => `phase-${(phaseKeySeed += 1)}`;

export function OccupationForm({
  beds,
  plants,
  occupation,
  onSaved,
  onCancel,
}: OccupationFormProps) {
  const [plantId, setPlantId] = useState(occupation?.plant_id ?? '');
  const [bedId, setBedId] = useState(occupation?.bed_id ?? '');
  const [startsOn, setStartsOn] = useState(occupation?.starts_on ?? '');
  const [endsOn, setEndsOn] = useState(occupation?.ends_on ?? '');
  const [notes, setNotes] = useState(occupation?.notes ?? '');
  const [phases, setPhases] = useState<PhaseRow[]>(
    () =>
      occupation?.phases.map((phase) => ({
        key: nextPhaseKey(),
        kind: phase.kind,
        starts_on: phase.starts_on,
        ends_on: phase.ends_on,
      })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPhase = () => {
    setPhases((previous) => [
      ...previous,
      { key: nextPhaseKey(), kind: 'sowing', starts_on: startsOn, ends_on: startsOn },
    ]);
  };

  const updatePhase = (key: string, patch: Partial<PhaseInput>) => {
    setPhases((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const removePhase = (key: string) => {
    setPhases((previous) => previous.filter((row) => row.key !== key));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!plantId || !bedId || !startsOn || !endsOn) {
      setError('Plante, emplacement et dates sont obligatoires');
      return;
    }
    if (endsOn < startsOn) {
      setError('La date de fin précède la date de début');
      return;
    }
    if (phases.some((phase) => !phase.starts_on || !phase.ends_on)) {
      setError('Chaque phase doit avoir ses deux dates');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = {
        plant_id: plantId,
        bed_id: bedId,
        starts_on: startsOn,
        ends_on: endsOn,
        notes: notes.trim(),
        phases: phases.map(({ kind, starts_on, ends_on }) => ({ kind, starts_on, ends_on })),
      };
      if (occupation) {
        await updateOccupation(occupation.id, input);
      } else {
        await createOccupation(input);
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-2 border-cpc-yellow-500 p-4">
      <h2 className="text-sm text-cpc-yellow-500">
        {occupation ? 'MODIFIER L’OCCUPATION' : 'NOUVELLE OCCUPATION'}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Plante"
          value={plantId}
          onChange={setPlantId}
          placeholder="-- choisir --"
          options={plants.map((plant) => ({ value: plant.id, label: plant.name }))}
        />
        <SelectField
          label="Emplacement"
          value={bedId}
          onChange={setBedId}
          placeholder="-- choisir --"
          options={beds.map((bed) => ({ value: bed.id, label: bed.name }))}
        />
        <DateField label="Début d'occupation" value={startsOn} onChange={setStartsOn} />
        <DateField label="Fin d'occupation" value={endsOn} onChange={setEndsOn} />
      </div>

      <TextAreaField label="Notes" value={notes} onChange={setNotes} rows={2} />

      <div className="flex flex-col gap-2 border-t border-cpc-green-900 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-cpc-green-900">
            PHASES <span className="text-cpc-green-700">({phases.length})</span>
          </span>
          <CpcButton type="button" variant="outlined" color="cyan" size="xs" onClick={handleAddPhase}>
            + PHASE
          </CpcButton>
        </div>
        {/* Phases may sit outside the occupation window on purpose — sowing often
            starts indoors weeks before the bed is taken. The server allows it. */}
        {phases.map((phase) => (
          <div key={phase.key} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <SelectField
              label="Type"
              value={phase.kind}
              onChange={(kind) => updatePhase(phase.key, { kind })}
              options={PHASE_KINDS.map((kind) => ({ value: kind, label: PHASE_LABELS[kind] }))}
            />
            <DateField
              label="Début"
              value={phase.starts_on}
              onChange={(starts_on) => updatePhase(phase.key, { starts_on })}
            />
            <DateField
              label="Fin"
              value={phase.ends_on}
              onChange={(ends_on) => updatePhase(phase.key, { ends_on })}
            />
            <CpcButton
              type="button"
              variant="text"
              color="red"
              size="xs"
              onClick={() => removePhase(phase.key)}
            >
              RETIRER
            </CpcButton>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-cpc-red-500">{error}</p>}

      <div className="flex gap-2">
        <CpcButton type="submit" variant="filled" color="yellow" size="sm" disabled={saving}>
          {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
        </CpcButton>
        <CpcButton type="button" variant="text" color="red" size="sm" onClick={onCancel}>
          ANNULER
        </CpcButton>
      </div>
    </form>
  );
}
