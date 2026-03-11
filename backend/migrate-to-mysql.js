/**
 * Database Migration Script - Firestore to MySQL
 * Run this once to migrate existing data
 */

import { initializeDatabase } from './config/database.js';
import { db } from './config/firebase.js';

async function migrateUsers() {
  console.log('📝 Migrating users...');
  const { pool } = await import('./config/database.js');
  
  const usersSnapshot = await db.collection('users').get();
  let count = 0;
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    try {
      await pool.query(`
        INSERT INTO users (id, email, name, role, vpn_enabled, subscription_status, 
                          subscription_canceled_at, subscription_cancel_reason, 
                          created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          email = VALUES(email),
          vpn_enabled = VALUES(vpn_enabled),
          updated_at = CURRENT_TIMESTAMP
      `, [
        doc.id,
        data.email,
        data.name || null,
        data.role || 'user',
        data.vpn_enabled || false,
        data.subscription_status || 'trialing',
        data.subscription_canceled_at || null,
        data.subscription_cancel_reason || null,
        data.created_at || new Date(),
        data.updated_at || new Date()
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating user ${doc.id}:`, error.message);
    }
  }
  
  console.log(`✅ Migrated ${count} users`);
}

async function migrateDevices() {
  console.log('📱 Migrating devices...');
  const { pool } = await import('./config/database.js');
  
  const devicesSnapshot = await db.collection('devices').get();
  let count = 0;
  
  for (const doc of devicesSnapshot.docs) {
    const data = doc.data();
    try {
      await pool.query(`
        INSERT INTO devices (id, user_id, device_name, ip_address, public_key, 
                            private_key, status, activated_at, lease_expires, 
                            created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `, [
        doc.id,
        data.user_id,
        data.device_name,
        data.ip_address,
        data.public_key,
        data.private_key || null,
        data.status || 'pending',
        data.activated_at || null,
        data.lease_expires || null,
        data.created_at || new Date(),
        data.updated_at || new Date()
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating device ${doc.id}:`, error.message);
    }
  }
  
  console.log(`✅ Migrated ${count} devices`);
}

async function migrateDepartments() {
  console.log('🏢 Migrating departments...');
  const { pool } = await import('./config/database.js');
  
  const deptsSnapshot = await db.collection('departments').get();
  let count = 0;
  
  for (const doc of deptsSnapshot.docs) {
    const data = doc.data();
    try {
      const [result] = await pool.query(`
        INSERT INTO departments (name, description, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        data.name,
        data.description || null,
        data.enabled !== undefined ? data.enabled : true,
        data.created_at || new Date(),
        data.updated_at || new Date()
      ]);
      
      // Migrate department devices
      if (data.devices && data.devices.length > 0) {
        const departmentId = result.insertId;
        for (const deviceId of data.devices) {
          await pool.query(`
            INSERT INTO department_devices (department_id, device_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE department_id = VALUES(department_id)
          `, [departmentId, deviceId]);
        }
      }
      
      count++;
    } catch (error) {
      console.error(`Error migrating department ${doc.id}:`, error.message);
    }
  }
  
  console.log(`✅ Migrated ${count} departments`);
}

async function migrateFirewallRules() {
  console.log('🛡️ Migrating firewall rules...');
  const { pool } = await import('./config/database.js');
  
  const rulesSnapshot = await db.collection('firewall_rules').get();
  let count = 0;
  
  for (const doc of rulesSnapshot.docs) {
    const data = doc.data();
    try {
      await pool.query(`
        INSERT INTO firewall_rules (name, description, enabled, action, protocol, 
                                   port, ip_type, ip_range, ip_count, ips, 
                                   department_id, priority, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.name,
        data.description || null,
        data.enabled !== undefined ? data.enabled : true,
        data.action || 'allow',
        data.protocol || 'tcp',
        data.port,
        data.ip_type || 'range',
        data.ip_range || null,
        data.ip_count || 0,
        data.ips ? JSON.stringify(data.ips) : null,
        data.department_id || null,
        data.priority || 100,
        data.created_at || new Date(),
        data.updated_at || new Date()
      ]);
      count++;
    } catch (error) {
      console.error(`Error migrating firewall rule ${doc.id}:`, error.message);
    }
  }
  
  console.log(`✅ Migrated ${count} firewall rules`);
}

async function migrateAccessLogs() {
  console.log('📋 Migrating access logs (last 10000)...');
  const { pool } = await import('./config/database.js');
  
  const logsSnapshot = await db.collection('access_logs')
    .orderBy('timestamp', 'desc')
    .limit(10000)
    .get();
  
  let count = 0;
  
  for (const doc of logsSnapshot.docs) {
    const data = doc.data();
    try {
      await pool.query(`
        INSERT INTO access_logs (timestamp, source_ip, destination_ip, port, 
                                protocol, action, rule_id, country, user_agent, 
                                endpoint, status, reason, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.timestamp,
        data.source_ip,
        data.destination_ip || null,
        data.port || null,
        data.protocol || 'tcp',
        data.action || 'allowed',
        data.rule_id || null,
        data.country || null,
        data.user_agent || null,
        data.endpoint || null,
        data.status || 'success',
        data.reason || null,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]);
      count++;
    } catch (error) {
      // Ignore duplicate errors for logs
    }
  }
  
  console.log(`✅ Migrated ${count} access logs`);
}

async function runMigration() {
  console.log('🚀 Starting Firestore to MySQL migration...\n');
  
  try {
    // Initialize database tables
    console.log('1️⃣ Initializing database tables...');
    await initializeDatabase();
    
    // Run migrations
    console.log('\n2️⃣ Running data migrations...');
    await migrateUsers();
    await migrateDevices();
    await migrateDepartments();
    await migrateFirewallRules();
    await migrateAccessLogs();
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Update .env with MySQL credentials');
    console.log('   2. Set DB_ENABLED=true');
    console.log('   3. Restart the backend');
    console.log('   4. Verify data in MySQL');
    console.log('   5. Optionally disable Firestore after verification');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
runMigration();
