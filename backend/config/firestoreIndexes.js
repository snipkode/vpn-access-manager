// Firestore Indexes Configuration
// Run these commands in Firebase Console or via Firebase CLI

// To create indexes via Firebase CLI:
// firebase firestore:indexes --create indexes.json

export const firestoreIndexes = [
  {
    collectionGroup: 'credit_transactions',
    indexes: [
      {
        fields: [
          { fieldPath: 'from_user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'to_user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },
  {
    collectionGroup: 'fraud_alerts',
    indexes: [
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'reviewed', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },
  {
    collectionGroup: 'payments',
    indexes: [
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },
  {
    collectionGroup: 'users',
    indexes: [
      {
        fields: [
          { fieldPath: 'vpn_enabled', order: 'ASCENDING' },
          { fieldPath: 'subscription_end', order: 'ASCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'role', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },
  {
    collectionGroup: 'devices',
    indexes: [
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' }
        ]
      },
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  }
];

// Generate indexes.json for Firebase CLI
export function generateIndexesJSON() {
  return {
    indexes: firestoreIndexes.flatMap(collection => 
      collection.indexes.map(index => ({
        collectionGroup: collection.collectionGroup,
        queryScope: 'COLLECTION',
        fields: index.fields
      }))
    ),
    fieldOverrides: []
  };
}

// Print instructions for creating indexes
export function printIndexInstructions() {
  console.log('\n📋 Firestore Indexes Setup Instructions\n');
  console.log('Option 1: Firebase Console');
  console.log('  1. Go to Firebase Console → Firestore → Indexes');
  console.log('  2. Click "Add Index" for each composite index below\n');
  
  console.log('Option 2: Firebase CLI');
  console.log('  1. Save indexes to firestore.indexes.json');
  console.log('  2. Run: firebase deploy --only firestore:indexes\n');
  
  console.log('Required Indexes:');
  console.log('─────────────────────────────────────────────────────');
  
  firestoreIndexes.forEach(collection => {
    collection.indexes.forEach(index => {
      const fields = index.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ');
      console.log(`  Collection: ${collection.collectionGroup}`);
      console.log(`    Fields: ${fields}`);
      console.log('');
    });
  });
}

export default firestoreIndexes;
