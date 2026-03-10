// Firestore Indexes Configuration
// Based on actual queries used in the application
// Last updated: March 10, 2026

export const firestoreIndexes = [
  // ==================== USERS COLLECTION ====================
  {
    collectionGroup: 'users',
    indexes: [
      // Admin: Get users by role (admin.js:98)
      {
        fields: [
          { fieldPath: 'role', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get users by VPN status (admin.js:104)
      {
        fields: [
          { fieldPath: 'vpn_enabled', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== DEVICES COLLECTION ====================
  {
    collectionGroup: 'devices',
    indexes: [
      // User: Get own devices (vpn.js:179, 378)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Get active devices (user.js:258)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' }
        ]
      },
      // Admin: Get all devices by status (admin.js:416)
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== PAYMENTS COLLECTION ====================
  {
    collectionGroup: 'payments',
    indexes: [
      // User: Get own payments (billing.js:381, 491)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Get pending payments (billing.js:381)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get payments by status (admin-billing.js:41)
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get pending for approval (admin-billing.js:523)
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== CREDIT_TRANSACTIONS COLLECTION ====================
  {
    collectionGroup: 'credit_transactions',
    indexes: [
      // User: Get own transactions (credit.js:60)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Get sent transfers (credit.js:263)
      {
        fields: [
          { fieldPath: 'from_user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Get transfers by type (credit.js:263)
      {
        fields: [
          { fieldPath: 'from_user_id', order: 'ASCENDING' },
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get by type (admin-credit.js:47)
      {
        fields: [
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get by type and status (admin-credit.js:47)
      {
        fields: [
          { fieldPath: 'type', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Check approved payments (credit.js:340)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== REFERRALS COLLECTION ====================
  {
    collectionGroup: 'referrals',
    indexes: [
      // User: Get own referral (referral.js:84)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Find by referral code (referral.js:84)
      {
        fields: [
          { fieldPath: 'referral_code', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== REFERRAL_EVENTS COLLECTION ====================
  {
    collectionGroup: 'referral_events',
    indexes: [
      // Admin: Get by referrer (admin-referral.js:132)
      {
        fields: [
          { fieldPath: 'referrer_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // User: Check if already referred (referral.js:97)
      {
        fields: [
          { fieldPath: 'referee_id', order: 'ASCENDING' }
        ]
      },
      // Admin: Get by status (admin-referral.js:179)
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get flagged for review (admin-referral.js:278)
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== FRAUD_ALERTS COLLECTION ====================
  {
    collectionGroup: 'fraud_alerts',
    indexes: [
      // Admin: Get by status (admin-credit.js:125)
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== BANK_ACCOUNTS COLLECTION ====================
  {
    collectionGroup: 'bank_accounts',
    indexes: [
      // User: Get active accounts (payment-settings.js:157)
      {
        fields: [
          { fieldPath: 'active', order: 'ASCENDING' },
          { fieldPath: 'order', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== SUBSCRIPTION_PLANS COLLECTION ====================
  {
    collectionGroup: 'subscription_plans',
    indexes: [
      // User: Get plans by order (payment-settings.js:435)
      {
        fields: [
          { fieldPath: 'order', order: 'ASCENDING' }
        ]
      }
    ]
  },

  // ==================== NOTIFICATIONS COLLECTION ====================
  {
    collectionGroup: 'notifications',
    indexes: [
      // User: Get own notifications
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== AUDIT_LOGS COLLECTION ====================
  {
    collectionGroup: 'audit_logs',
    indexes: [
      // Admin: Get by user
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== BACKUPS COLLECTION ====================
  {
    collectionGroup: 'backups',
    indexes: [
      // Admin: Get by type
      {
        fields: [
          { fieldPath: 'backup_type', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Admin: Get by status
      {
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },

  // ==================== BACKUP_LOGS & RESTORE_LOGS ====================
  {
    collectionGroup: 'backup_logs',
    indexes: [
      // Admin: Get recent logs
      {
        fields: [
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  },
  {
    collectionGroup: 'restore_logs',
    indexes: [
      // Admin: Get recent logs
      {
        fields: [
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ]
  }
];

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
      },
      // Get transactions by user_id (for user's own transactions)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by user_id and status (filter by status)
      {
        fields: [
          { fieldPath: 'user_id', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get transactions by to_user_id (received transactions)
      {
        fields: [
          { fieldPath: 'to_user_id', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      },
      // Get blocked/fraud transactions for admin review
      {
        fields: [
          { fieldPath: 'blocked_reason', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
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
