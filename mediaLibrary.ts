import type { MediaAsset } from '@/types';

const DB_NAME = 'vn-editor-library';
const DB_VERSION = 1;
const META_STORE = 'library';
const BLOB_STORE = 'blobs';

interface StoredAsset extends MediaAsset {
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open media library'));
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, action: (target: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = action(tx.objectStore(store));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? new Error('Media library request failed'));
        tx.onabort = () => reject(tx.error ?? new Error('Media library request aborted'));
      }),
  );
}

export async function saveMedia(asset: MediaAsset, blob: Blob): Promise<void> {
  const record: StoredAsset = { ...asset, createdAt: Date.now() };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).put(record);
    tx.objectStore(BLOB_STORE).put(blob, asset.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save media'));
    tx.onabort = () => reject(tx.error ?? new Error('Could not save media'));
  });
}

export async function listLibrary(): Promise<MediaAsset[]> {
  const records = await run<StoredAsset[]>(META_STORE, 'readonly', (store) => store.getAll());
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  const blob = await run<Blob | undefined>(BLOB_STORE, 'readonly', (store) => store.get(id));
  return blob ?? null;
}

export async function getMediaUrl(id: string): Promise<string | null> {
  const blob = await getMediaBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}
