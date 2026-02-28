# Firebase Realtime Database Setup Guide

This guide helps you configure and initialize the Realtime Database for your inventory management system.

## Step 1: Get Your Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `inventory-management-sys-47b6f`
3. Click ⚙️ **Project Settings** (top-left)
4. Find your Web App config and copy the entire config object
5. Paste it into `firebase-config.js` replacing the placeholder

Example with RTDB (your case):
```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA...",                 // from project settings
  authDomain: "inventory-management-sys-47b6f.firebaseapp.com",
  projectId: "inventory-management-sys-47b6f",
  storageBucket: "inventory-management-sys-47b6f.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123...",
  databaseURL: "https://inventory-management-sys-47b6f-default-rtdb.firebaseio.com"
};

window.FIREBASE_CONFIG_VERBOSE = false;  // set to true for debugging
```

## Step 2: Deploy Security Rules

The RTDB must be locked down so only authenticated users can read/write their data.

### Option A: Using Firebase CLI (Recommended)

1. In your project folder, create `database.rules.json`:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null && auth.uid === data.child('firebaseUid').val()"
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

2. Deploy rules from the terminal:
```bash
firebase deploy --only database
```

### Option B: Using Firebase Console

Go to your project → **Realtime Database** → **Rules** tab and paste the JSON above directly.

## Step 3: Initialize the Database Structure

The app expects this structure in RTDB:

```
├── users
│   ├── user_id_1
│   │   ├── id
│   │   ├── username
│   │   ├── passwordHash
│   │   ├── passwordSalt
│   │   ├── passwordPlain
│   │   ├── role (super_admin, admin, guest)
│   │   ├── firebaseUid (optional, maps to auth.uid)
│   │   ├── createdAt
│   │   └── updatedAt
│   └── user_id_2
│       └── ...
│
├── materials
│   ├── material_id_1
│   │   ├── id
│   │   ├── code (e.g., "BBP001")
│   │   ├── name
│   │   ├── specification
│   │   ├── category
│   │   ├── unit
│   │   ├── quantity
│   │   ├── photoDataUrl (optional, base64 image)
│   │   ├── createdAt
│   │   └── updatedAt
│   └── material_id_2
│       └── ...
│
├── transactions
│   ├── tx_id_1
│   │   ├── id
│   │   ├── materialId
│   │   ├── materialCode
│   │   ├── materialName
│   │   ├── type (inbound|outbound)
│   │   ├── quantity
│   │   ├── unit
│   │   ├── stockAfter
│   │   ├── note
│   │   ├── createdBy
│   │   ├── materialPhotoDataUrl (optional)
│   │   ├── occurredAt
│   │   └── createdAt
│   └── tx_id_2
│       └── ...
│
└── returns
    ├── return_id_1
    │   ├── id
    │   ├── materialId
    │   ├── materialCode
    │   ├── materialName
    │   ├── materialSpecification
    │   ├── condition (broken|good|repaired)
    │   ├── quantity
    │   ├── unit
    │   ├── note
    │   ├── createdBy
    │   ├── materialPhotoDataUrl (optional)
    │   ├── occurredAt
    │   └── createdAt
    └── return_id_2
        └── ...
```

### Method 1: Manual Setup in Firebase Console (Quick Start)

1. Go to **Realtime Database** in your Firebase console
2. Click the **+** icon next to your database root
3. Add these top-level nodes (empty for now):
   - `users`
   - `materials`
   - `transactions`
   - `returns`

The app will create records automatically as you add materials, transactions, and users.

### Method 2: Initialize with Node.js Script (Recommended for Multiple Users)

Create `init-rtdb.js` in your project folder:

```javascript
const admin = require('firebase-admin');

// Download your service account key from Firebase Console:
// Project Settings → Service Accounts → Generate Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://inventory-management-sys-47b6f-default-rtdb.firebaseio.com'
});

const db = admin.database();

// Optional: seed initial data
async function initializeDatabase() {
  try {
    // Create empty top-level nodes
    await db.ref('users').set({});
    await db.ref('materials').set({});
    await db.ref('transactions').set({});
    await db.ref('returns').set({});
    
    console.log('✅ Database structure initialized');
    
    // Optional: add a sample material
    const sampleMaterial = {
      id: 1,
      code: 'BBP001',
      name: 'Sample Material',
      specification: '10x10x10 cm',
      category: 'Metals',
      unit: 'pcs',
      quantity: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.ref('materials/1').set(sampleMaterial);
    console.log('✅ Sample material added');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
```

Then run:
```bash
npm install firebase-admin
node init-rtdb.js
```

## Step 4: Enable Firebase Auth (Email/Password)

1. Go to **Authentication** in Firebase console
2. Click **Sign-in method**
3. Enable **Email/Password**
4. Optionally enable **Anonymous** for guest access

## Step 5: Test the Connection

1. Update `firebase-config.js` with your config
2. Open the web app in your browser
3. Try creating a super admin account
4. Check **Realtime Database** → **Data** tab to see the records appear in real-time

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" errors | Deploy the `database.rules.json` and enable Firebase Auth |
| Data not syncing | Check `window.REMOTE_DB.enabled` in browser console; verify RTDB URL in config |
| Auth signup fails | Make sure Email/Password is enabled in Firebase → Authentication |
| Slow initial load | Large photos as base64 can slow sync; consider moving photos to Cloud Storage |

## Security Considerations

- **Never commit `.env` or service account keys** to version control
- The rules above allow any authenticated user to write materials/transactions/returns
- For production, add more granular rules (e.g., role-based access):
  ```json
  "materials": {
    ".read": "auth != null",
    ".write": "root.child('users').child(auth.uid).child('role').val() === 'super_admin' || 
              root.child('users').child(auth.uid).child('role').val() === 'admin'"
  }
  ```

## Next Steps

- Create admin accounts via the web app UI
- Import existing materials if any
- Set up backups: Firebase Console → **Backups**
- Monitor usage: Firebase Console → **Usage**

Questions? Check the console logs (`F12` → **Console** tab) for detailed error messages.
