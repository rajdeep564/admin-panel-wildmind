// Script to find uncategorized generation types
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString());

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const db = admin.firestore();

const IMAGE_TYPES = ['text-to-image', 'image-to-image', 'image-edit', 'reimagine', 'fill-mode', 'image'];
const VIDEO_TYPES = ['text-to-video', 'image-to-video', 'video-to-video', 'video', 'animate'];
const CONTENT_TYPES = ['text-to-audio', 'text-to-music', 'music-generation', 'audio', 'music'];

async function findUncategorized() {
  console.log('Fetching all generations...');
  
  const allTypes = [...IMAGE_TYPES, ...VIDEO_TYPES, ...CONTENT_TYPES];
  
  // Get all unique generation types
  const snapshot = await db.collection('generations').select('generationType').get();
  
  const typeCounts = {};
  let total = 0;
  let categorized = 0;
  let uncategorized = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const type = data.generationType || 'NULL';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    total++;
    
    if (allTypes.includes(type)) {
      categorized++;
    } else {
      uncategorized++;
    }
  });
  
  console.log('\n=== GENERATION TYPE ANALYSIS ===\n');
  console.log(` Total Generations: ${total}`);
  console.log(`Categorized: ${categorized}`);
  console.log(`Uncategorized: ${uncategorized}\n`);
  
  console.log('All types and their counts:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const category = IMAGE_TYPES.includes(type) ? '[IMAGE]' :
                       VIDEO_TYPES.includes(type) ? '[VIDEO]' :
                       CONTENT_TYPES.includes(type) ? '[MUSIC]' : '[UNCATEGORIZED]';
      console.log(`  ${category} ${type}: ${count}`);
    });
  
  process.exit(0);
}

findUncategorized().catch(console.error);
