/**
 * Firestore to MySQL Data Migration
 * Migrates existing data from Firestore to MySQL
 * Run with: node scripts/migrate-firestore-to-mysql.js
 */

import { db } from '../config/firebase.js';
import { User, Device, Department, FirewallRule, AccessLog, Payment, CreditTransaction } from '../models/index.js';
import { sequelize } from '../config/sequelize.js';

async function migrateUsers() {
  console.log('📝 Migrating users...');
  
  const snapshot = await db.collection('users').get();
  let count = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      await User.findOrCreate({
        where: { id: doc.id },
        defaults: {
          email: data.email || `${doc.id}@unknown.local`,
          name: data.name || null,
          role: data.role || 'user',
          vpn_enabled: data.vpn_enabled || false,
          subscription_status: data.subscription_status || 'trialing',
          subscription_canceled_at: data.subscription_canceled_at || null,
          subscription_cancel_reason: data.subscription_cancel_reason || null,
          created_at: data.created_at || new Date(),
          updated_at: data.updated_at || new Date()
        }
      });
      count++;
    } catch (error) {
      console.error(`Error migrating user ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`✅ Migrated ${count} users (${errors} errors)`);
  return { count, errors };
}

async function migrateDevices() {
  console.log('📱 Migrating devices...');
  
  const snapshot = await db.collection('devices').get();
  let count = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      await Device.findOrCreate({
        where: { id: doc.id },
        defaults: {
          user_id: data.user_id,
          device_name: data.device_name,
          ip_address: data.ip_address,
          public_key: data.public_key,
          private_key: data.private_key || null,
          status: data.status || 'pending',
          activated_at: data.activated_at || null,
          lease_expires: data.lease_expires || null,
          created_at: data.created_at || new Date(),
          updated_at: data.updated_at || new Date()
        }
      });
      count++;
    } catch (error) {
      console.error(`Error migrating device ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`✅ Migrated ${count} devices (${errors} errors)`);
  return { count, errors };
}

async function migrateDepartments() {
  console.log('🏢 Migrating departments...');
  
  const snapshot = await db.collection('departments').get();
  let count = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const [department, created] = await Department.findOrCreate({
        where: { name: data.name },
        defaults: {
          description: data.description || null,
          enabled: data.enabled !== undefined ? data.enabled : true,
          created_at: data.created_at || new Date(),
          updated_at: data.updated_at || new Date()
        }
      });
      
      // Migrate department devices
      if (data.devices && data.devices.length > 0) {
        for (const deviceId of data.devices) {
          try {
            const device = await Device.findByPk(deviceId);
            if (device) {
              await department.addDevice(device);
            }
          } catch (err) {
            // Ignore device association errors
          }
        }
      }
      
      count++;
    } catch (error) {
      console.error(`Error migrating department ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`✅ Migrated ${count} departments (${errors} errors)`);
  return { count, errors };
}

async function migrateFirewallRules() {
  console.log('🛡️ Migrating firewall rules...');
  
  const snapshot = await db.collection('firewall_rules').get();
  let count = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      await FirewallRule.findOrCreate({
        where: { 
          name: data.name,
          port: data.port
        },
        defaults: {
          description: data.description || null,
          enabled: data.enabled !== undefined ? data.enabled : true,
          action: data.action || 'allow',
          protocol: data.protocol || 'tcp',
          ip_type: data.ip_type || 'range',
          ip_range: data.ip_range || null,
          ip_count: data.ip_count || 0,
          ips: data.ips ? JSON.stringify(data.ips) : null,
          priority: data.priority || 100,
          created_at: data.created_at || new Date(),
          updated_at: data.updated_at || new Date()
        }
      });
      count++;
    } catch (error) {
      console.error(`Error migrating firewall rule ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`✅ Migrated ${count} firewall rules (${errors} errors)`);
  return { count, errors };
}

async function migrateAccessLogs() {
  console.log('📋 Migrating access logs (last 5000)...');
  
  const snapshot = await db.collection('access_logs')
    .orderBy('timestamp', 'desc')
    .limit(5000)
    .get();
  
  let count = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      await AccessLog.create({
        timestamp: data.timestamp || new Date(),
        source_ip: data.source_ip,
        destination_ip: data.destination_ip || null,
        port: data.port || null,
        protocol: data.protocol || 'tcp',
        action: data.action || 'allowed',
        rule_id: data.rule_id || null,
        country: data.country || null,
        user_agent: data.user_agent || null,
        endpoint: data.endpoint || null,
        status: data.status || 'success',
        reason: data.reason || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        created_at: data.created_at || new Date()
      });
      count++;
    } catch (error) {
      // Ignore duplicate errors for logs
      errors++;
    }
  }
  
  console.log(`✅ Migrated ${count} access logs (${errors} duplicates/errors)`);
  return { count, errors };
}

async function migratePayments() {
  console.log('💰 Migrating payments...');
  
  const snapshot = await db.collection('payments').get();
  let count = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      await Payment.findOrCreate({
        where: { id: doc.id },
        defaults: {
          user_id: data.user_id,
          amount: data.amount || 0,
          status: data.status || 'pending',
          payment_method: data.payment_method || null,
          bank: data.bank || null,
          plan: data.plan || null,
          period_start: data.period_start || null,
          period_end: data.period_end || null,
          created_at: data.created_at || new Date(),
          updated_at: data.updated_at || new Date()
        }
      });
      count++;
    } catch (error) {
      console.error(`Error migrating payment ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`✅ Migrated ${count} payments (${errors} errors)`);
  return { count, errors };
}

async function runMigration() {
  console.log('🚀 Starting Firestore to MySQL migration...\n');
  console.log('⚠️  WARNING: This will copy data from Firestore to MySQL\n');
  
  const confirm = await new Promise(resolve => {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Continue with migration? (yes/no): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
  
  if (!confirm) {
    console.log('❌ Migration cancelled');
    process.exit(0);
  }
  
  try {
    // Test MySQL connection
    await sequelize.authenticate();
    console.log('✅ MySQL connection established\n');
    
    // Run migrations
    const results = {
      users: await migrateUsers(),
      devices: await migrateDevices(),
      departments: await migrateDepartments(),
      firewall_rules: await migrateFirewallRules(),
      access_logs: await migrateAccessLogs(),
      payments: await migratePayments()
    };
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log('═'.repeat(50));
    console.log(`Users:            ${results.users.count} migrated, ${results.users.errors} errors`);
    console.log(`Devices:          ${results.devices.count} migrated, ${results.devices.errors} errors`);
    console.log(`Departments:      ${results.departments.count} migrated, ${results.departments.errors} errors`);
    console.log(`Firewall Rules:   ${results.firewall_rules.count} migrated, ${results.firewall_rules.errors} errors`);
    console.log(`Access Logs:      ${results.access_logs.count} migrated, ${results.access_logs.errors} errors/duplicates`);
    console.log(`Payments:         ${results.payments.count} migrated, ${results.payments.errors} errors`);
    console.log('═'.repeat(50));
    
    const totalMigrated = Object.values(results).reduce((sum, r) => sum + r.count, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
    
    console.log(`\n✅ Migration completed!`);
    console.log(`   Total migrated: ${totalMigrated} records`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Verify data in phpMyAdmin (http://localhost:9080)');
    console.log('   2. Set DB_ENABLED=true in .env');
    console.log('   3. Restart backend: pm2 restart backdev');
    console.log('   4. Test the application');
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
