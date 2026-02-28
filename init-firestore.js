#!/usr/bin/env node
/**
 * init-firestore.js
 * Initialize Firestore collections for Inventory Management System
 * 
 * SETUP:
 * 1. Download service account key from Firebase Console:
 *    Project Settings → Service Accounts → Generate New Private Key
 *    Save as serviceAccountKey.json in this folder
 * 
 * 2. Ensure firestore.rules is deployed:
 *    firebase deploy --only firestore:rules
 * 
 * 3. Run: node init-firestore.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Load service account key
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (err) {
  console.error('❌ Error: serviceAccountKey.json not found');
  console.error('   Download it from: Firebase Console → Project Settings → Service Accounts → Generate Private Key');
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'inventory-management-sys-47b6f'
});

const db = admin.firestore();

async function initializeFirestore() {
  try {
    console.log('🔄 Initializing Firestore...\n');

    // Create sample material documents
    console.log('📦 Adding sample materials...');
    
    const material1 = {
      id: 1,
      code: 'BBP001',
      name: 'Stainless Steel Bar',
      specification: '10mm x 50mm x 100cm',
      category: 'Metals',
      unit: 'pcs',
      quantity: 50,
      photoDataUrl: '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await db.collection('materials').doc('1').set(material1);
    console.log('✅ Material 1 (Stainless Steel Bar) added');

    const material2 = {
      id: 2,
      code: 'BBP002',
      name: 'Copper Wire',
      specification: '2mm diameter, annealed',
      category: 'Electrical',
      unit: 'kg',
      quantity: 100,
      photoDataUrl: '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await db.collection('materials').doc('2').set(material2);
    console.log('✅ Material 2 (Copper Wire) added\n');

    // Create empty subcollections/documents for transactions and returns
    console.log('📋 Creating transaction history...');
    const transaction1 = {
      id: 1,
      materialId: 1,
      materialCode: 'BBP001',
      materialName: 'Stainless Steel Bar',
      type: 'inbound',
      quantity: 50,
      unit: 'pcs',
      stockAfter: 50,
      note: 'Initial stock',
      createdBy: 'system',
      materialPhotoDataUrl: '',
      occurredAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now()
    };

    await db.collection('transactions').doc('1').set(transaction1);
    console.log('✅ Sample transaction added\n');

    console.log('📄 Creating user template...');
    const adminUser = {
      id: 1,
      username: 'admin',
      passwordHash: 'placeholder',
      passwordSalt: 'placeholder',
      passwordPlain: 'placeholder',
      role: 'super_admin',
      firebaseUid: '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Only add if doesn't exist (so we don't overwrite existing data)
    const userRef = db.collection('users').doc('1');
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set(adminUser);
      console.log('✅ Template user added (create account in app to replace)\n');
    } else {
      console.log('⚠️  User already exists, skipping\n');
    }

    console.log('✅ Firestore initialization complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update firebase-config.js to use Firestore (remove databaseURL)');
    console.log('   2. Deploy security rules: firebase deploy --only firestore:rules');
    console.log('   3. Enable Email/Password auth in Firebase Console');
    console.log('   4. Reload the web app and create your admin account\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

initializeFirestore();
