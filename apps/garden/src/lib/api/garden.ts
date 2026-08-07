import type {
  Bed,
  Garden,
  Occupation,
  Plant,
  PlantCandidate,
  PlantCare,
  SaveBedInput,
  SaveOccupationInput,
  SavePlantInput,
  SaveViewpointInput,
  Viewpoint,
} from '@/types/garden';
import { fetchBlobUrl, postBinary, putBinary, request, requestVoid } from './client';

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

/**
 * Ask Pl@ntNet what this photo is. The blob must be JPEG or PNG — the upstream
 * refuses anything else, webp included, which is why callers hand it the output
 * of `downscaleImage` rather than the picked file.
 *
 * An empty list means "recognised nothing", not a failure.
 */
export async function identifyPlant(blob: Blob): Promise<PlantCandidate[]> {
  const { candidates } = await postBinary<{ candidates: PlantCandidate[] }>(
    '/api/garden/plants/identify',
    blob,
  );
  return candidates;
}

/**
 * Ask the LLM for the growing advice Pl@ntNet does not carry: exposure, water,
 * spacing and a short note. Suggestions, not facts — the form stays editable.
 */
export function enrichPlant(name: string, latinName: string): Promise<PlantCare> {
  return request<PlantCare>('/api/garden/plants/enrich', {
    method: 'POST',
    body: JSON.stringify({ name, latin_name: latinName }),
  });
}

/** Caller owns the returned blob URL and must revoke it. */
export function fetchPlantPhotoUrl(id: string): Promise<string> {
  return fetchBlobUrl(`/api/garden/plants/${id}/photo`);
}

/** Same, for a visitor with no session. Caller owns and must revoke the URL. */
export function fetchPublicPlantPhotoUrl(userId: string, id: string): Promise<string> {
  return fetchBlobUrl(`/public/garden/${userId}/plants/${id}/photo`);
}

// --- Plan photo: one backdrop per garden

export function uploadPlanPhoto(blob: Blob): Promise<void> {
  return putBinary('/api/garden/plan/photo', blob);
}

export function deletePlanPhoto(): Promise<void> {
  return requestVoid('/api/garden/plan/photo', { method: 'DELETE' });
}

/** Caller owns the returned blob URL and must revoke it. */
export function fetchPlanPhotoUrl(): Promise<string> {
  return fetchBlobUrl('/api/garden/plan/photo');
}

/** Same, for a visitor with no session. Caller owns and must revoke the URL. */
export function fetchPublicPlanPhotoUrl(userId: string): Promise<string> {
  return fetchBlobUrl(`/public/garden/${userId}/plan/photo`);
}

// --- Viewpoints: the 360° tour

export function createViewpoint(input: SaveViewpointInput): Promise<Viewpoint> {
  return request<Viewpoint>('/api/garden/viewpoints', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateViewpoint(id: string, input: SaveViewpointInput): Promise<Viewpoint> {
  return request<Viewpoint>(`/api/garden/viewpoints/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteViewpoint(id: string): Promise<void> {
  return requestVoid(`/api/garden/viewpoints/${id}`, { method: 'DELETE' });
}

export function uploadViewpointPanorama(id: string, blob: Blob): Promise<void> {
  return putBinary(`/api/garden/viewpoints/${id}/panorama`, blob);
}

/** Caller owns the returned blob URL and must revoke it. */
export function fetchViewpointPanoramaUrl(id: string): Promise<string> {
  return fetchBlobUrl(`/api/garden/viewpoints/${id}/panorama`);
}

/** Same, for a visitor with no session. Caller owns and must revoke the URL. */
export function fetchPublicViewpointPanoramaUrl(userId: string, id: string): Promise<string> {
  return fetchBlobUrl(`/public/garden/${userId}/viewpoints/${id}/panorama`);
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
