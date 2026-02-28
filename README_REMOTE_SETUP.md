Firebase remote database setup
=============================

This project includes optional Firebase scaffolding to enable a global/shared
database so everyone using the app link manages the same system.

Quick steps to enable remote sync (Firestore + Storage):

1. Create a Firebase project at https://console.firebase.google.com
2. Add a Web App in Project Settings → Your apps. Copy the config object.
3. In this repository, open `firebase-config.js` and replace the placeholder
   `window.FIREBASE_CONFIG = null;` with the object you copied. Example:

   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "...",
     appId: "..."
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
   - Pull remote collections and replace local stores when remote data exists.
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

Next steps I can take for you
----------------------------
- Implement full two-way sync by editing `script.js` so all operations push to
  Firestore and conflict handling is added.
- Add authentication (Firebase Auth) so you can restrict who can write.

If you'd like, tell me to proceed with full integration and I will update the
app's save/load handlers accordingly.
