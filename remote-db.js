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
import {
  getDatabase,
  ref as rtdbRef,
  get as rtdbGet,
  onValue,
  set as rtdbSet,
  push as rtdbPush,
  remove as rtdbRemove
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword as firebaseUpdatePassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

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

// helper for RTDB
async function fetchPath(db, path) {
  const snap = await rtdbGet(rtdbRef(db, path));
  const val = snap.val();
  if (!val || typeof val !== "object") {
    return [];
  }
  return Object.entries(val).map(([key, data]) => ({ ...data, _remoteId: key }));
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

// convert a simple username into a valid email for Firebase Auth.  If the
default login field already contains an '@' we assume the user entered a real
email address; otherwise we append a dummy domain so the value satisfies the
email requirement.  This allows the existing forms to continue using "username"
without forcing the user to type an address.
function usernameToEmail(username) {
  if (!username) return "";
  username = String(username).trim();
  if (username.includes("@")) {
    return username;
  }
  // domain can be anything controlled by your project; use example.com to
  // avoid accidental delivery of real messages.
  return `${username}@example.com`;
}

async function initRemoteSync() {
  try {
    const config = window.FIREBASE_CONFIG;
    if (!config || (!config.projectId && !config.databaseURL)) {
      log("No Firebase configuration found; remote sync disabled.");
      window.REMOTE_DB = { enabled: false };
      return;
    }

    const app = initializeApp(config);
    const storage = getStorage(app);
    const auth = getAuth(app);
    window.REMOTE_AUTH = auth;
    const useRTDB = Boolean(config.databaseURL);

    await waitFor(() => window.state && window.state.db, 300, 120000);
    const localDb = window.state.db;
    log("Local IndexedDB ready; starting initial remote pull");

    const mapping = [
      ["users", "users"],
      ["materials", "materials"],
      ["transactions", "transactions"],
      ["returns", "returns"]
    ];

    if (useRTDB) {
      log("Using Realtime Database at", config.databaseURL);
      const db = getDatabase(app);
      // initial pull
      for (const [pathName, storeName] of mapping) {
        try {
          const rows = await fetchPath(db, pathName);
          if (rows.length > 0) {
            await replaceLocalStore(localDb, storeName, rows);
            log(`Pulled ${rows.length} rows for ${pathName}`);
          }
        } catch (err) {
          console.warn("Failed to fetch path", pathName, err);
        }
      }
      // realtime listeners
      mapping.forEach(([pathName, storeName]) => {
        onValue(rtdbRef(db, pathName), async (snapshot) => {
          try {
            const val = snapshot.val();
            const rows = [];
            if (val && typeof val === "object") {
              Object.entries(val).forEach(([k, d]) => rows.push({ ...d, _remoteId: k }));
            }
            await replaceLocalStore(localDb, storeName, rows);
            log(`RTDB update sync ${storeName}`);
          } catch (err) {
            console.warn("Realtime listener error", pathName, err);
          }
        });
      });
      window.REMOTE_DB = {
        enabled: true,
        db: getDatabase(app),
        storage,
        auth,
        signIn: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
        createUser: (email, pass) => createUserWithEmailAndPassword(auth, email, pass),
        signOut: () => firebaseSignOut(auth),
        onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
        // helpers that operate with the existing username field
        signUpWithUsername: (username, pass) => {
          const email = usernameToEmail(username);
          return window.REMOTE_DB.createUser(email, pass);
        },
        signInWithUsername: (username, pass) => {
          const email = usernameToEmail(username);
          return window.REMOTE_DB.signIn(email, pass);
        },
        async changePassword(newPassword) {
          if (!window.REMOTE_DB.auth || !window.REMOTE_DB.auth.currentUser) {
            throw new Error("no authenticated user");
          }
          return firebaseUpdatePassword(window.REMOTE_DB.auth.currentUser, newPassword);
        },
        async pushRecord(pathName, record) {
          if (!record) return;
          const data = { ...record };
          delete data.id;
          const remoteId = data._remoteId;
          delete data._remoteId;
          if (remoteId) {
            await rtdbSet(rtdbRef(db, `${pathName}/${remoteId}`), data);
            return remoteId;
          }
          const newRef = await rtdbPush(rtdbRef(db, pathName), data);
          return newRef.key;
        },
        async deleteRecord(pathName, remoteId) {
          if (!remoteId) return;
          await rtdbRemove(rtdbRef(db, `${pathName}/${remoteId}`));
        }
      };
    } else {
      log("Using Firestore project", config.projectId);
      const firestore = getFirestore(app);
      for (const [remoteName, localStore] of mapping) {
        try {
          const rows = await fetchCollection(firestore, remoteName);
          if (rows.length > 0) {
            await replaceLocalStore(localDb, localStore, rows);
            log(`Replaced local store ${localStore} with ${rows.length} remote rows`);
          }
        } catch (err) {
          console.warn("Failed to pull remote collection", remoteName, err);
        }
      }
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
      window.REMOTE_DB = {
        enabled: true,
        firestore,
        storage,
        auth,
        signIn: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
        createUser: (email, pass) => createUserWithEmailAndPassword(auth, email, pass),
        signOut: () => firebaseSignOut(auth),
        onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
        // provide auth helpers if auth object is initialized earlier
        signUpWithUsername: (username, pass) => {
          const email = usernameToEmail(username);
          return window.REMOTE_DB.createUser(email, pass);
        },
        signInWithUsername: (username, pass) => {
          const email = usernameToEmail(username);
          return window.REMOTE_DB.signIn(email, pass);
        },
        async changePassword(newPassword) {
          if (!window.REMOTE_DB.auth || !window.REMOTE_DB.auth.currentUser) {
            throw new Error("no authenticated user");
          }
          return firebaseUpdatePassword(window.REMOTE_DB.auth.currentUser, newPassword);
        },
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
            delete data.id;
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
    }

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
