Firebase remote database setup
=============================

This project includes optional Firebase scaffolding to enable a global/shared
database so everyone using the app link manages the same system.

Quick steps to enable remote sync (Firestore or Realtime Database):

1. Create a Firebase project at https://console.firebase.google.com
2. Add a Web App in Project Settings → Your apps. Copy the config object.
3. In this repository, open `firebase-config.js` and replace the placeholder
   `window.FIREBASE_CONFIG = null;` with the object you copied. Example:

   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-project-id",        # required for Firestore mode only
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "...",
     appId: "...",
     databaseURL: "https://inventory-management-sys-47b6f-default-rtdb.firebaseio.com/"  # required for RTDB mode
   };

4. (Optional) Enable Firestore in the Firebase console and create the following
   collections if you want to pre-seed data: `users`, `materials`, `transactions`, `returns`.

5. Important: Firestore security rules
   - For simple testing you can allow open read/write rules, but DO NOT use
     open rules in production. See Firebase documentation to configure
     authentication and rules appropriate for your use-case.

6. Reload the web app. The `remote-db.js` script will:
   - Initialize Firebase if `window.FIREBASE_CONFIG` is set.
   - Wait for the app's local IndexedDB to be ready.
   - If you configured Firestore it will pull collections; if you provided
     `databaseURL` it will instead read from the Realtime Database paths.
   - Subscribe to realtime changes to keep local stores updated.

Notes and limitations
---------------------
- This scaffolding does NOT yet modify the app's save/update/delete logic to
  automatically push local changes to Firestore. It will keep clients in sync
  when remote writes occur (for example, if you add documents directly in the
  console or from another client that writes remote). If you want full
  two-way sync, I can update `script.js` so all CRUD operations also write to
  Firestore (recommended for a true shared system).
- The initial merge strategy is simple: if remote collections contain documents,
  the local IndexedDB store will be replaced with those remote documents. If
  remote collections are empty, local data is preserved.

Authentication & security rules
--------------------------------
Once you have the database running you should lock it down.

* **Realtime Database rules** (example allows only authenticated users):

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null && auth.uid === data.child('createdBy').val()"
    },
    "materials": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "transactions": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "returns": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

* **Firestore rules** follow a similar pattern, see the Firebase docs.

* **Firebase Auth** can be enabled in the console (email/password, Google, etc.).
  After enabling, the web SDK is available through `window.REMOTE_AUTH` and the
  helpers `signIn`, `createUser`, `signOut`, and `onAuthStateChanged`.

  Example usage in `script.js` (the code has since been updated to
work with the existing username/password forms):

  ```js
  // the remote helpers automatically convert the "username" field into a
  // fake email address so you don't need to ask users for an actual email.
  // If the username already contains an '@' it's used verbatim.

  async function handleLoginSubmit(e) {
    e.preventDefault();
    try {
      const username = el.loginUsername.value;
      const pass = el.loginPassword.value;
      await window.REMOTE_DB.signInWithUsername(username, pass);
      // local IndexedDB still performs the real credential check so the app
      // works offline; the remote call is just for session/cookie tracking.
    } catch (err) {
      // remote auth failures are non‑fatal (network issues are queued below)
      console.warn('remote auth failed', err);
    }
  }

  // call when the user logs out
  async function handleLogout() {
    if (window.REMOTE_DB && window.REMOTE_DB.signOut) {
      try {
        await window.REMOTE_DB.signOut();
      } catch (e) {
        console.warn('remote sign-out failed', e);
      }
    }
    // ...clear local session as usual
  }

  // sign up during initial setup or when creating additional admin users
  async function handleSetupSubmit(e) {
    e.preventDefault();
    const username = el.setupUsername.value;
    const pass = el.setupPassword.value;
    // write local record as before, then…
    try {
      await window.REMOTE_DB.signUpWithUsername(username, pass);
    } catch (err) {
      // if we're offline, the operation is enqueued automatically
      console.warn('queued remote signup', err);
    }
  }

  // listen for auth state changes if you need to react
  window.REMOTE_DB.onAuthStateChanged((user) => {
    if (user) {
      state.currentUser = { username: user.email, uid: user.uid };
      // fetch any additional profile data as needed
    } else {
      state.currentUser = null;
    }
  });
  ```

The updated scripts also maintain an `authQueue` in `localStorage`, so if
Firebase is unreachable the sign‑up or password‑change operations are stored and
re‑sent automatically when the device comes back online.  The queue is
processed automatically on page load and when the browser fires the `online`
event.

If you'd like me to make further modifications to the login flow or to wire
rules against the Firebase `auth.uid`, just say the word.

Next steps I can take for you
----------------------------
- Implement full two-way sync by editing `script.js` so all operations push to
  the chosen remote database and handle merge conflicts.
- Help integrate Firebase Auth into the login forms and enforce rules in code.

If you'd like, tell me to proceed with full integration and I will update the
app's save/load handlers accordingly.
