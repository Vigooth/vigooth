const DB_NAME = 'dnd-assets';
const DB_VERSION = 1;
const STORE = 'blobs';

export interface StoredAsset {
  id: string;          // sha256 hex
  blob: Blob;
  mime: string;
  size: number;
  name: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function putAsset(file: File): Promise<StoredAsset> {
  const buffer = await file.arrayBuffer();
  const id = await sha256(buffer);
  const db = await openDb();
  const existing = await getAsset(id);
  if (existing) return existing;
  const blob = new Blob([buffer], { type: file.type });
  const asset: StoredAsset = {
    id,
    blob,
    mime: file.type,
    size: file.size,
    name: file.name,
    createdAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(asset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return asset;
}

export async function getAsset(id: string): Promise<StoredAsset | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as StoredAsset | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

const objectUrlCache = new Map<string, string>();

export async function getAssetObjectUrl(id: string): Promise<string | null> {
  const cached = objectUrlCache.get(id);
  if (cached) return cached;
  const asset = await getAsset(id);
  if (!asset) return null;
  const url = URL.createObjectURL(asset.blob);
  objectUrlCache.set(id, url);
  return url;
}

export async function deleteAsset(id: string): Promise<void> {
  const cached = objectUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(id);
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listAssets(): Promise<StoredAsset[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredAsset[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

/** Walk all campaigns in localStorage to find referenced assetIds. Unreferenced ones can be deleted. */
export async function pruneUnreferencedAssets(referencedIds: Set<string>): Promise<number> {
  const all = await listAssets();
  let pruned = 0;
  for (const asset of all) {
    if (!referencedIds.has(asset.id)) {
      await deleteAsset(asset.id);
      pruned++;
    }
  }
  return pruned;
}
