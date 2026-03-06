// Firestore Indexes Configuration
// Complete list of all required indexes for VPN Access application

export const firestoreIndexes = [
  // ==================== USERS COLLECTION ====================
  {
    collectionGroup: 'users',
    indexes: [
      // Get users by role (for admin panel)
      {
        fields: [
          { fieldPath: 'role', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get users by VPN status
      {
        fields: [
          { fieldPath: 'vpn_enabled', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get users by subscription status
      {
        fields: [
          { fieldPath: 'vpn_enabled', order: 'ASCENDING' },
          { fieldPath: 'subscription_end', order: 'ASCENDING' }
        ]
      },
      // Get users by email (for lookup)
      {
        fields: [
          { fieldPath: 'email', order: 'ASCENDING' }
        ]
      },
      // Get users by subscription plan
      {
        fields: [
          { fieldPath: 'subscription_plan', order: 'ASCENDING' },
          { fieldPath: 'subscription_end', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== DEVICES COLLECTION ====================
  {
    collectionGroup: 'devices',
    indexes: [
      // Get devices by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get devices by user and status
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' }
        ]
      },
      // Get active devices
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get devices by IP address
      {
        fields: [
          { fieldPath: 'ip_address', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== PAYMENTS COLLECTION ====================
  {
    collectionGroup: 'payments',
    indexes: [
      // Get payments by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get payments by status
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get pending payments
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'amount', order: 'DESCENDING' }
        ]
      },
      // Get payments by user and status
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get payments by plan
      {
        fields: [
          { fieldPath: 'plan', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get payments by transfer date
      {
        fields: [
          { fieldPath: 'transfer_date', order: 'DESCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== CREDIT_TRANSACTIONS COLLECTION ====================
  {
    collectionGroup: 'credit_transactions',
    indexes: [
      // Get transactions by sender
      {
        fields: [
          { fieldPath: 'from_user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by receiver
      {
        fields: [
          { fieldPath: 'to_user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by type
      {
        fields: [
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by status
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by user and type
      {
        fields: [
          { fieldPath: 'from_user_id', order: 'ASCENDING' },
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by user and status
      {
        fields: [
          { fieldPath: 'from_user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by type and status (for admin filtering)
      {
        fields: [
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by user_id and type and status
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get pending review transactions
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'requires_review', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== REFERRALS COLLECTION ====================
  {
    collectionGroup: 'referrals',
    indexes: [
      // Get referral by code
      {
        fields: [
          { fieldPath: 'referral_code', order: 'ASCENDING' }
        ]
      },
      // Get referral by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get referrals by tier
      {
        fields: [
          { fieldPath: 'tier', order: 'ASCENDING' },
          { fieldPath: 'total_referrals', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== REFERRAL_EVENTS COLLECTION ====================
  {
    collectionGroup: 'referral_events',
    indexes: [
      // Get events by referrer
      {
        fields: [
          { fieldPath: 'referrer_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get events by referee
      {
        fields: [
          { fieldPath: 'referee_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get events by status
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== FRAUD_ALERTS COLLECTION ====================
  {
    collectionGroup: 'fraud_alerts',
    indexes: [
      // Get alerts by status
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get alerts by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get unreviewed alerts
      {
        fields: [
          { fieldPath: 'reviewed', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get alerts by risk level
      {
        fields: [
          { fieldPath: 'risk_level', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== BANK_ACCOUNTS COLLECTION ====================
  {
    collectionGroup: 'bank_accounts',
    indexes: [
      // Get active banks by order
      {
        fields: [
          { fieldPath: 'active', order: 'ASCENDING' },
          { fieldPath: 'order', order: 'ASCENDING' }
        ]
      },
      // Get banks by order
      {
        fields: [
          { fieldPath: 'order', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== USER_PREFERENCES COLLECTION ====================
  {
    collectionGroup: 'user_preferences',
    indexes: [
      // Get preferences by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== AUDIT_LOGS COLLECTION ====================
  {
    collectionGroup: 'audit_logs',
    indexes: [
      // Get logs by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      },
      // Get logs by action
      {
        fields: [
          { fieldPath: 'action', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      },
      // Get logs by resource
      {
        fields: [
          { fieldPath: 'resource', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      },
      // Get logs by timestamp
      {
        fields: [
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== NOTIFICATIONS COLLECTION ====================
  {
    collectionGroup: 'notifications',
    indexes: [
      // Get notifications by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get unread notifications
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'read', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get notifications by type
      {
        fields: [
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== BACKUPS COLLECTION ====================
  {
    collectionGroup: 'backups',
    indexes: [
      // Get backups by status
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get backups by type
      {
        fields: [
          { fieldPath: 'backup_type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get latest backups
      {
        fields: [
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

// Save indexes to file
export function saveIndexesToFile(filename = 'firestore.indexes.json') {
  import('fs').then((fs) => {
    import('path').then((path) => {
      const indexes = generateIndexesJSON();
      const filePath = path.join(process.cwd(), filename);
      
      fs.writeFileSync(filePath, JSON.stringify(indexes, null, 2));
      console.log(`✅ Indexes saved to ${filename}`);
    });
  });
}

// Print instructions for creating indexes
export function printIndexInstructions() {
  console.log('\n📋 Firestore Indexes Setup Instructions\n');
  console.log('═'.repeat(60));
  console.log('\nOption 1: Firebase Console (Manual)');
  console.log('  1. Go to Firebase Console → Firestore → Indexes');
  console.log('  2. Click "Add Index" for each composite index below\n');

  console.log('Option 2: Firebase CLI (Recommended)');
  console.log('  1. Generate indexes.json:');
  console.log('     node scripts/generate-indexes.js');
  console.log('  2. Deploy indexes:');
  console.log('     firebase deploy --only firestore:indexes\n');

  console.log('Option 3: gcloud CLI');
  console.log('  gcloud alpha firestore indexes create --collection=<collection> \\');
  console.log('    --field=<field1>,<field2> --order=<order1>,<order2>\n');

  console.log('═'.repeat(60));
  console.log('\nRequired Indexes by Collection:\n');
  console.log('─'.repeat(60));

  let totalIndexes = 0;
  firestoreIndexes.forEach(collection => {
    console.log(`\n📁 ${collection.collectionGroup.toUpperCase()} (${collection.indexes.length} indexes)`);
    console.log('─'.repeat(60));
    
    collection.indexes.forEach((index, idx) => {
      const fields = index.fields.map(f => `  - ${f.fieldPath} (${f.order})`).join('\n');
      console.log(`  ${idx + 1}. ${fields}`);
      totalIndexes++;
    });
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Total Indexes: ${totalIndexes}`);
  console.log('\n💡 Tip: Use Firebase CLI for easiest deployment');
  console.log('   npm install -g firebase-tools');
  console.log('   firebase login');
  console.log('   firebase deploy --only firestore:indexes\n');
}

// Get indexes for specific collection
export function getIndexesForCollection(collectionName) {
  return firestoreIndexes.find(c => c.collectionGroup === collectionName);
}

// Count total indexes
export function countTotalIndexes() {
  return firestoreIndexes.reduce((total, collection) => 
    total + collection.indexes.length, 0);
}

export default firestoreIndexes;
