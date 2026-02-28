# Firestore Setup Guide

If you want to use **Firestore** instead of Realtime Database, follow these steps.

> **Note:** Your current config uses RTDB (`databaseURL`). To switch to Firestore, you'll need to update `firebase-config.js` and use `projectId` instead.

## Step 1: Update firebase-config.js for Firestore

Replace your current config with this (remove `databaseURL`):

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDyC8tqs-zdvle5-keNHWBQ-ajFdpjjO3w",
  authDomain: "inventory-management-sys-47b6f.firebaseapp.com",
  projectId: "inventory-management-sys-47b6f",
  storageBucket: "inventory-management-sys-47b6f.firebasestorage.app",
  messagingSenderId: "770005255991",
  appId: "1:770005255991:web:7cbc30a054d6dffee23cb2",
  measurementId: "G-NEET99X2T6"
};

window.FIREBASE_CONFIG_VERBOSE = false;
```

## Step 2: Deploy Firestore Security Rules

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      (request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin');
    }
    
    match /materials/{materialId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin']);
    }
    
    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin']);
    }
    
    match /returns/{returnId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin']);
    }
  }
}
```

Deploy:
```bash
firebase deploy --only firestore:rules
```

## Step 3: Initialize Collections (Optional)

Run this Node.js script to create the collection structure:

```bash
npm install firebase-admin
node init-firestore.js
```

See `init-firestore.js` in your project folder.

## Step 4: Compare RTDB vs Firestore

| Feature | RTDB | Firestore |
|---------|------|-----------|
| **Structure** | JSON tree | Collections & documents |
| **Queries** | Limited (by path) | Powerful (filter, sort, limit) |
| **Pricing** | Per GB stored | Per read/write/delete |
| **Real-time** | ✅ Yes | ✅ Yes |
| **Offline** | ✅ Works offline | ✅ Works offline |

**For this app:** Both work equally well. RTDB is simpler; Firestore is more flexible for complex queries.
