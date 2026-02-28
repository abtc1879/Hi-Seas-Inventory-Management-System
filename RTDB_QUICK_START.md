# Quick Start: Firebase RTDB Setup (5 minutes)

Follow these steps to get your Realtime Database up and running:

## 1️⃣ Get Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project **`inventory-management-sys-47b6f`**
3. Click ⚙️ **Project Settings** (top-left)
4. Scroll to **Your apps** section and click your Web app
5. Copy the config object (the entire JavaScript object)

## 2️⃣ Update `firebase-config.js`

Open `firebase-config.js` and uncomment the RTDB example, replacing the values:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "inventory-management-sys-47b6f.firebaseapp.com",
  projectId: "inventory-management-sys-47b6f",
  storageBucket: "inventory-management-sys-47b6f.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://inventory-management-sys-47b6f-default-rtdb.firebaseio.com"
};

window.FIREBASE_CONFIG_VERBOSE = false;
```

## 3️⃣ Deploy Security Rules

Run this in your project folder:

```bash
firebase deploy --only database
```

This deploys the rules from `database.rules.json` (already created).

## 4️⃣ Enable Firebase Auth

1. Go to **Authentication** in Firebase console
2. Click **Sign-in method**
3. Enable **Email/Password**
4. Optionally enable **Anonymous** for guest access

## 5️⃣ Initialize Database (Optional)

If you want to pre-populate sample materials:

```bash
npm install firebase-admin
node init-rtdb.js
```

(First download service account key: Firebase Console → Project Settings → Service Accounts → Generate New Private Key → save as `serviceAccountKey.json`)

## 6️⃣ Test It!

1. Open the web app in your browser
2. Create a super admin account
3. Try adding a material
4. Check Firebase Console → **Realtime Database** → **Data** tab
   - You should see your data syncing in real-time! 🎉

---

## 📁 Files Created

- ✅ `database.rules.json` – Security rules (for `firebase deploy`)
- ✅ `init-rtdb.js` – Optional script to populate sample data
- ✅ `RTDB_SETUP.md` – Full detailed guide

## ❓ Issues?

| Problem | Fix |
|---------|-----|
| "Permission denied" | Run `firebase deploy --only database` |
| "Quota exceeded" | Check Firebase Console → Quotas tab |
| Data not appearing | Verify `window.REMOTE_DB.enabled === true` in browser console |
| Can't sign up | Enable Email/Password auth in Firebase console |

---

For more details, see `RTDB_SETUP.md`
