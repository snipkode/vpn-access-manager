#!/usr/bin/env node

/**
 * Script to generate and deploy Firestore indexes
 * Usage: node scripts/generate-indexes.js
 */

import { generateIndexesJSON, countTotalIndexes } from '../config/firestoreIndexes.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 Generating Firestore Indexes...\n');

try {
  // Generate indexes
  const indexes = generateIndexesJSON();
  const totalIndexes = countTotalIndexes();
  
  // Save to file
  const outputPath = join(process.cwd(), 'firestore.indexes.json');
  writeFileSync(outputPath, JSON.stringify(indexes, null, 2));
  
  console.log(`✅ Generated ${totalIndexes} indexes`);
  console.log(`📄 Saved to: ${outputPath}\n`);
  
  console.log('📋 Next Steps:\n');
  console.log('Option 1: Deploy via Firebase CLI');
  console.log('   firebase deploy --only firestore:indexes\n');
  
  console.log('Option 2: Manual via Firebase Console');
  console.log('   1. Go to: https://console.firebase.google.com/');
  console.log('   2. Select your project');
  console.log('   3. Firestore Database → Indexes');
  console.log('   4. Click "Add Index" for each index\n');
  
  console.log('⏱️  Note: Index creation may take a few minutes\n');
  
} catch (error) {
  console.error('❌ Error generating indexes:', error.message);
  process.exit(1);
}
