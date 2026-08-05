import type {
  Bed,
  Garden,
  Occupation,
  Plant,
  SaveBedInput,
  SaveOccupationInput,
  SavePlantInput,
} from '@/types/garden';
import { fetchBlobUrl, putBinary, request, requestVoid } from './client';

/** One read for the whole garden — the timeline needs all three lists anyway. */
export function getGarden(): Promise<Garden> {
  return request<Garden>('/api/garden');
}

/**
 * The same payload for a visitor with no session. Knowing the user id is the only
 * thing gating this, so treat a garden link as public once shared.
 */
export function getPublicGarden(userId: string): Promise<Garden> {
  return request<Garden>(`/public/garden/${userId}`);
}

// --- Beds

export function createBed(input: SaveBedInput): Promise<Bed> {
  return request<Bed>('/api/garden/beds', { method: 'POST', body: JSON.stringify(input) });
}

export function updateBed(id: string, input: SaveBedInput): Promise<Bed> {
  return request<Bed>(`/api/garden/beds/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteBed(id: string): Promise<void> {
  return requestVoid(`/api/garden/beds/${id}`, { method: 'DELETE' });
}

// --- Plants

export function createPlant(input: SavePlantInput): Promise<Plant> {
  return request<Plant>('/api/garden/plants', { method: 'POST', body: JSON.stringify(input) });
}

export function updatePlant(id: string, input: SavePlantInput): Promise<Plant> {
  return request<Plant>(`/api/garden/plants/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deletePlant(id: string): Promise<void> {
  return requestVoid(`/api/garden/plants/${id}`, { method: 'DELETE' });
}

export function uploadPlantPhoto(id: string, blob: Blob): Promise<void> {
  return putBinary(`/api/garden/plants/${id}/photo`, blob);
}

/** Caller owns the returned blob URL and must revoke it. */
export function fetchPlantPhotoUrl(id: string): Promise<string> {
  return fetchBlobUrl(`/api/garden/plants/${id}/photo`);
}

/** Same, for a visitor with no session. Caller owns and must revoke the URL. */
export function fetchPublicPlantPhotoUrl(userId: string, id: string): Promise<string> {
  return fetchBlobUrl(`/public/garden/${userId}/plants/${id}/photo`);
}

// --- Occupations

export function createOccupation(input: SaveOccupationInput): Promise<Occupation> {
  return request<Occupation>('/api/garden/occupations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateOccupation(id: string, input: SaveOccupationInput): Promise<Occupation> {
  return request<Occupation>(`/api/garden/occupations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteOccupation(id: string): Promise<void> {
  return requestVoid(`/api/garden/occupations/${id}`, { method: 'DELETE' });
}
