#!/usr/bin/env node
/**
 * init-rtdb.js
 * Initialize Realtime Database structure for Inventory Management System
 * 
 * SETUP:
 * 1. Download service account key from Firebase Console:
 *    Project Settings → Service Accounts → Generate New Private Key
 *    Save as serviceAccountKey.json in this folder
 * 
 * 2. Run: node init-rtdb.js
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
  databaseURL: 'https://inventory-management-sys-47b6f-default-rtdb.firebaseio.com'
});

const db = admin.database();

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing Realtime Database...\n');

    // Create empty top-level collections
    console.log('📝 Creating collection structure...');
    await db.ref('users').set({});
    await db.ref('materials').set({});
    await db.ref('transactions').set({});
    await db.ref('returns').set({});
    console.log('✅ Collections created: users, materials, transactions, returns\n');

    // Optional: add sample material
    console.log('📦 Adding sample material...');
    const sampleMaterial = {
      id: 1,
      code: 'BBP001',
      name: 'Stainless Steel Bar',
      specification: '10mm x 50mm x 100cm',
      category: 'Metals',
      unit: 'pcs',
      quantity: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.ref('materials/1').set(sampleMaterial);
    console.log('✅ Sample material added\n');

    // Optional: add second sample
    console.log('📦 Adding second sample material...');
    const sampleMaterial2 = {
      id: 2,
      code: 'BBP002',
      name: 'Copper Wire',
      specification: '2mm diameter, annealed',
      category: 'Electrical',
      unit: 'kg',
      quantity: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.ref('materials/2').set(sampleMaterial2);
    console.log('✅ Second sample material added\n');

    console.log('✅ Database initialization complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Deploy security rules: firebase deploy --only database');
    console.log('   2. Update firebase-config.js with your config');
    console.log('   3. Open the web app and create a super admin account');
    console.log('   4. Start adding materials and transactions!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
