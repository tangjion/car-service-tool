// IndexedDB wrapper for captured network records.
// DB: car-service-tool-net, store: requests, key: id (string).
// Records are pruned by LRU (oldest startedDateTime first) when count or bytes exceed caps.

const DB_NAME = 'car-service-tool-net';
const DB_VERSION = 1;
const STORE = 'requests';
const MAX_RECORDS = 2000;
const MAX_BYTES = 200 * 1024 * 1024; // 200MB

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('startedDateTime', 'startedDateTime');
        os.createIndex('tabId', 'tabId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function put(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('startedDateTime').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Evict oldest records until count <= MAX_RECORDS and totalBytes <= MAX_BYTES.
// Returns number of records evicted.
export async function pruneByLRU() {
  const db = await openDB();
  const all = await getAll();
  let totalBytes = 0;
  for (const r of all) totalBytes += r.size || 0;

  let toEvict = 0;
  let bytesAccum = totalBytes;
  if (all.length > MAX_RECORDS) toEvict = all.length - MAX_RECORDS;
  for (let i = toEvict; i < all.length && bytesAccum > MAX_BYTES; i++) {
    bytesAccum -= all[i].size || 0;
    toEvict = i + 1;
  }
  if (toEvict === 0) return 0;

  const evictIds = all.slice(0, toEvict).map(r => r.id);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const os = tx.objectStore(STORE);
    for (const id of evictIds) os.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return evictIds.length;
}

export const __caps = { MAX_RECORDS, MAX_BYTES };
