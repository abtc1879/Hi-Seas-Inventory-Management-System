import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// Remote DB helper: initializes Firebase (when configured) and keeps local IndexedDB
// in sync by pulling remote collections and applying them locally. This file is
// intentionally conservative: it will do nothing when `window.FIREBASE_CONFIG` is null.

const VERBOSE = Boolean(window.FIREBASE_CONFIG_VERBOSE);

function log(...args) {
  if (VERBOSE) console.log("[remote-db]", ...args);
}

async function waitFor(conditionFn, interval = 300, timeout = 60000) {
  const start = Date.now();
  while (!conditionFn()) {
    if (Date.now() - start > timeout) throw new Error("waitFor timeout");
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, interval));
  }
}

function openIndexedDB(dbName, version) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function replaceLocalStore(db, storeName, rows) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const clearReq = store.clear();
    clearReq.onerror = () => reject(clearReq.error);
    clearReq.onsuccess = () => {
      try {
        rows.forEach((r) => {
          const clone = { ...r };
          // Keep `_remoteId` so local records map to remote documents.
          store.put(clone);
        });
      } catch (err) {
        reject(err);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Transaction failed"));
  });
}

async function fetchCollection(firestore, name) {
  const colRef = collection(firestore, name);
  const snap = await getDocs(colRef);
  const rows = [];
  snap.forEach((d) => {
    rows.push({ ...d.data(), _remoteId: d.id });
  });
  return rows;
}

async function initRemoteSync() {
  try {
    if (!window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.projectId) {
      log("No Firebase configuration found; remote sync disabled.");
      window.REMOTE_DB = { enabled: false };
      return;
    }

    const app = initializeApp(window.FIREBASE_CONFIG);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    log("Firebase initialized for project", window.FIREBASE_CONFIG.projectId);

    // Wait for the main app to open its IndexedDB databases.
    await waitFor(() => window.state && window.state.db, 300, 120000);
    const localDb = window.state.db;
    log("Local IndexedDB ready; starting initial remote pull");

    // Collections mapping: firestore collection -> local objectStore
    const mapping = [
      ["users", "users"],
      ["materials", "materials"],
      ["transactions", "transactions"],
      ["returns", "returns"]
    ];

    // Initial pull: replace local stores with remote snapshots (if any)
    for (const [remoteName, localStore] of mapping) {
      try {
        const rows = await fetchCollection(firestore, remoteName);
        if (rows.length > 0) {
          await replaceLocalStore(localDb, localStore, rows);
          log(`Replaced local store ${localStore} with ${rows.length} remote rows`);
        } else {
          log(`Remote ${remoteName} empty; leaving local ${localStore} as-is`);
        }
      } catch (err) {
        console.warn("Failed to pull remote collection", remoteName, err);
      }
    }

    // Set up realtime listeners to keep local store updated when remote changes.
    mapping.forEach(([remoteName, localStore]) => {
      try {
        const colRef = collection(firestore, remoteName);
        onSnapshot(colRef, async () => {
          try {
            const rows = await fetchCollection(firestore, remoteName);
            await replaceLocalStore(localDb, localStore, rows);
            log(`Realtime: updated local ${localStore} from remote ${remoteName}`);
          } catch (err) {
            console.warn("Realtime update failed for", remoteName, err);
          }
        });
      } catch (err) {
        console.warn("Failed to subscribe to", remoteName, err);
      }
    });

    // Expose minimal helpers for future manual push operations.
    window.REMOTE_DB = {
      enabled: true,
      firestore,
      storage,
      async pushCollection(name, docs) {
        const colRef = collection(firestore, name);
        const promises = docs.map(async (d) => {
          const payload = { ...d };
          const remoteId = payload._remoteId;
          delete payload._remoteId;
          if (remoteId) {
            const docRef = doc(colRef, remoteId);
            await setDoc(docRef, payload);
            return remoteId;
          }
          const newRef = await addDoc(colRef, payload);
          return newRef.id;
        });
        return Promise.all(promises);
      },
      async upsertDoc(name, payload, remoteId) {
        try {
          const colRef = collection(firestore, name);
          const data = { ...payload };
          delete data.id; // local numeric id should not be pushed
          delete data._remoteId;
          if (remoteId) {
            const docRef = doc(colRef, remoteId);
            await setDoc(docRef, data);
            return remoteId;
          }
          const newRef = await addDoc(colRef, data);
          return newRef.id;
        } catch (err) {
          throw err;
        }
      },
      async deleteDocById(name, remoteId) {
        try {
          if (!remoteId) return;
          const docRef = doc(collection(firestore, name), remoteId);
          await deleteDoc(docRef);
        } catch (err) {
          throw err;
        }
      }
    };

    log("Remote sync initialized");
  } catch (err) {
    console.error("remote-db initialization error", err);
    window.REMOTE_DB = { enabled: false };
  }
}

// Kick off initialization asynchronously (don't block page load).
(async () => {
  try {
    await initRemoteSync();
  } catch (err) {
    console.warn("remote-db failed to initialize:", err);
  }
})();
