import type { CanvasState } from '../types';
import { collectImagesForExport, restoreImagesFromExport } from './imageStore';

const DB_NAME = 'medien-sammel-db';
const DB_VERSION = 2;

/**
 * Exported so the image store can share one database and one version number —
 * two modules opening the same name with different versions would deadlock.
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('canvas')) db.createObjectStore('canvas');
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      // Uploaded photos, keyed by content hash. Kept out of the `canvas` record
      // so the synced document stays small — see services/imageStore.ts.
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(storeName: string, key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function getRecord<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveCanvas(state: CanvasState): Promise<void> {
  await putRecord('canvas', 'primary', {
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
    version: 1,
    lastModified: new Date().toISOString(),
  });
}

export async function loadCanvas(): Promise<any> {
  return getRecord('canvas', 'primary');
}

export async function saveSettings(settings: any): Promise<void> {
  await putRecord('settings', 'primary', settings);
}

export async function loadSettings(): Promise<any> {
  return getRecord('settings', 'primary');
}

export async function exportCanvasAsJSON(): Promise<void> {
  const canvas = await loadCanvas();
  const settings = await loadSettings();
  // Nodes reference device photos by key, so the blobs have to travel with the
  // backup — otherwise restoring on another device silently loses every upload.
  const images = await collectImagesForExport(
    (canvas?.nodes || []).map((n: any) => n.imageUrl || '')
  );
  const blob = new Blob(
    [
      JSON.stringify(
        { canvas, settings, images, exportedAt: new Date().toISOString() },
        null,
        2
      ),
    ],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medien-sammel-backup-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importCanvasFromJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return reject(new Error('Failed to read file'));
        const data = JSON.parse(text);
        // Photos first: the canvas is only valid once its references resolve.
        if (data.images) await restoreImagesFromExport(data.images);
        if (data.canvas) await saveCanvas(data.canvas);
        if (data.settings) await saveSettings(data.settings);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
