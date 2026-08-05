import { useMemo, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { deletePlant } from '@/lib/api/garden';
import { useGarden } from '@/stores/GardenStore';
import type { Occupation, Plant } from '@/types/garden';
import { PlantCard } from './PlantCard';
import { PlantForm } from './PlantForm';

type Editing = { mode: 'none' } | { mode: 'create' } | { mode: 'edit'; plant: Plant };

export function PlantsView() {
  const { plants, occupations, loading, error, reload, bedName, readOnly } = useGarden();
  const [editing, setEditing] = useState<Editing>({ mode: 'none' });
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return plants;
    return plants.filter((plant) =>
      [plant.name, plant.latin_name, plant.family].some((field) =>
        field?.toLowerCase().includes(needle),
      ),
    );
  }, [plants, search]);

  const placementsByPlant = useMemo(() => {
    const map = new Map<string, { occupation: Occupation; bedName: string }[]>();
    for (const occupation of occupations) {
      const list = map.get(occupation.plant_id) ?? [];
      list.push({ occupation, bedName: bedName(occupation.bed_id) });
      map.set(occupation.plant_id, list);
    }
    return map;
  }, [occupations, bedName]);

  const handleCreate = () => {
    setEditing({ mode: 'create' });
  };

  const handleEdit = (plant: Plant) => {
    setEditing({ mode: 'edit', plant });
  };

  const handleCancel = () => {
    setEditing({ mode: 'none' });
  };

  const handleSaved = async () => {
    setEditing({ mode: 'none' });
    await reload();
  };

  const handleDelete = async (plant: Plant) => {
    // Deleting a plant cascades to its occupations, so say so before doing it.
    const placements = placementsByPlant.get(plant.id)?.length ?? 0;
    const warning = placements > 0 ? ` et ${placements} occupation(s) associée(s)` : '';
    if (!window.confirm(`Supprimer ${plant.name}${warning} ?`)) return;

    try {
      await deletePlant(plant.id);
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Suppression impossible');
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm text-cpc-green-500">
          MES PLANTES <span className="text-cpc-green-900">({plants.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="RECHERCHER"
            className="border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 outline-none focus:border-cpc-green-500"
          />
          {!readOnly && (
            <CpcButton variant="filled" color="green" size="xs" onClick={handleCreate}>
              + PLANTE
            </CpcButton>
          )}
        </div>
      </header>

      {editing.mode !== 'none' && !readOnly && (
        <PlantForm
          plant={editing.mode === 'edit' ? editing.plant : undefined}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      )}

      {actionError && <p className="text-xs text-cpc-red-500">{actionError}</p>}
      {error && <p className="text-xs text-cpc-red-500">{error}</p>}
      {loading && <p className="text-xs text-cpc-green-900">CHARGEMENT...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-xs text-cpc-green-900">
          {plants.length === 0 ? 'AUCUNE PLANTE ENREGISTREE' : 'AUCUN RESULTAT'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plant) => (
          <PlantCard
            key={plant.id}
            plant={plant}
            placements={placementsByPlant.get(plant.id) ?? []}
            onEdit={readOnly ? undefined : handleEdit}
            onDelete={readOnly ? undefined : handleDelete}
          />
        ))}
      </div>
    </section>
  );
}
