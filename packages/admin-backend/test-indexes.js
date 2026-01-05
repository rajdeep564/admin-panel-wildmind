// Load environment first
require('dotenv').config();

const admin = require('firebase-admin');

function getServiceAccountFromEnv() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {}
  }
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {}
  }
  return null;
}

const svc = getServiceAccountFromEnv();
if (!admin.apps.length) {
  if (svc) {
    console.log('✓ Initializing Firebase with service account from env...');
    admin.initializeApp({ credential: admin.credential.cert(svc) });
  } else {
    console.log('✗ No service account found in environment variables');
    console.log('  Looking for FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_B64');
    process.exit(1);
  }
}

const db = admin.firestore();

const IMAGE_TYPES = [
  'text-to-image', 
  'image-to-image', 
  'image-edit', 
  'reimagine', 
  'fill-mode',
  'image'
];

async function testQueries() {
  console.log('\n🔍 Testing Collection Group Queries...\n');
  
  // Test 1: Simple collection group query (should work with exemptions)
  console.log('Test 1: Simple collection group query (no filters)');
  try {
    const snapshot = await db.collectionGroup('items').limit(1).get();
    console.log('✅ SUCCESS - Simple query works');
    console.log(`   Found ${snapshot.size} document(s)`);
  } catch (error) {
    console.log('❌ FAILED - Simple query failed');
    console.error('   Error:', error.message);
    if (error.details) console.log('   Details:', error.details);
  }
  
  // Test 2: Collection group with where + in (needs composite index)
  console.log('\nTest 2: Collection group with where + in clause');
  try {
    const snapshot = await db.collectionGroup('items')
      .where('generationType', 'in', IMAGE_TYPES)
      .limit(1)
      .get();
    console.log('✅ SUCCESS - Where + in query works');
    console.log(`   Found ${snapshot.size} document(s)`);
  } catch (error) {
    console.log('❌ FAILED - Where + in query failed');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.log('\n📋 REQUIRED INDEX:');
    console.log('   Collection ID: items');
    console.log('   Query scope: Collection group');
    console.log('   Fields indexed:');
    console.log('     - generationType (Ascending)');
    console.log('     - __name__ (Ascending)');
    console.log('\n   This should match what you created. If it still fails:');
    console.log('   1. Wait 5-10 more minutes for index to fully propagate');
    console.log('   2. Delete and recreate the index');
    console.log('   3. Check if you have multiple Firebase projects');
  }
  
  // Test 3: Collection group with count + where
  console.log('\nTest 3: Collection group count with where + in');
  try {
    const snapshot = await db.collectionGroup('items')
      .where('generationType', 'in', IMAGE_TYPES)
      .count()
      .get();
    console.log('✅ SUCCESS - Count with where query works');
    console.log(`   Count: ${snapshot.data().count}`);
  } catch (error) {
    console.log('❌ FAILED - Count with where query failed');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    // Try to extract any URL from error object
    const errorStr = JSON.stringify(error, null, 2);
    const urlMatch = errorStr.match(/https?:\/\/[^\s"]+/);
    if (urlMatch) {
      console.log('\n🔗 INDEX CREATION LINK FOUND:');
      console.log('   ', urlMatch[0]);
    } else {
      console.log('\n⚠️  No index creation link in error (expected for Node.js SDK)');
    }
  }
  
  // Test 4: Check if regular collection query works
  console.log('\nTest 4: Regular collection (not group) with same query');
  try {
    const snapshot = await db.collection('generations')
      .where('generationType', 'in', IMAGE_TYPES)
      .count()
      .get();
    console.log('✅ SUCCESS - Regular collection query works');
    console.log(`   Count: ${snapshot.data().count}`);
  } catch (error) {
    console.log('❌ FAILED - Even regular collection failed');
    console.error('   Error:', error.message);
  }
  
  console.log('\n✅ Diagnostic complete!\n');
  process.exit(0);
}

testQueries().catch(console.error);
