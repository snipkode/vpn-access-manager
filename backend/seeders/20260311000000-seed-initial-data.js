/**
 * Database Seeder - Create test data for development
 * Run with: npm run db:seed
 */

import { User, Device, Department, FirewallRule, AccessLog, Payment } from '../models/index.js';
import { sequelize } from '../config/sequelize.js';

async function seedUsers() {
  console.log('📝 Seeding users...');
  
  const users = await User.bulkCreate([
    {
      id: 'admin-001',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      vpn_enabled: true,
      subscription_status: 'active'
    },
    {
      id: 'user-001',
      email: 'john@example.com',
      name: 'John Doe',
      role: 'user',
      vpn_enabled: true,
      subscription_status: 'active'
    },
    {
      id: 'user-002',
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'user',
      vpn_enabled: true,
      subscription_status: 'trialing'
    },
    {
      id: 'user-003',
      email: 'bob@example.com',
      name: 'Bob Wilson',
      role: 'user',
      vpn_enabled: false,
      subscription_status: 'expired'
    },
    {
      id: 'user-004',
      email: 'alice@example.com',
      name: 'Alice Brown',
      role: 'user',
      vpn_enabled: true,
      subscription_status: 'active'
    }
  ], { ignoreDuplicates: true });
  
  console.log(`✅ Seeded ${users.length} users`);
  return users;
}

async function seedDevices() {
  console.log('📱 Seeding devices...');
  
  const devices = await Device.bulkCreate([
    {
      id: 'device-001',
      user_id: 'user-001',
      device_name: 'John iPhone',
      ip_address: '10.0.0.2',
      public_key: 'pubkey_john_iphone_abc123',
      private_key: 'privkey_john_iphone_xyz789',
      status: 'active',
      activated_at: new Date()
    },
    {
      id: 'device-002',
      user_id: 'user-001',
      device_name: 'John Laptop',
      ip_address: '10.0.0.3',
      public_key: 'pubkey_john_laptop_def456',
      private_key: 'privkey_john_laptop_uvw123',
      status: 'active',
      activated_at: new Date()
    },
    {
      id: 'device-003',
      user_id: 'user-002',
      device_name: 'Jane Android',
      ip_address: '10.0.0.4',
      public_key: 'pubkey_jane_android_ghi789',
      private_key: 'privkey_jane_android_rst456',
      status: 'active',
      activated_at: new Date()
    },
    {
      id: 'device-004',
      user_id: 'user-003',
      device_name: 'Bob iPad',
      ip_address: '10.0.0.5',
      public_key: 'pubkey_bob_ipad_jkl012',
      private_key: 'privkey_bob_ipad_opq789',
      status: 'inactive',
      activated_at: new Date()
    },
    {
      id: 'device-005',
      user_id: 'user-004',
      device_name: 'Alice Desktop',
      ip_address: '10.0.0.6',
      public_key: 'pubkey_alice_desktop_mno345',
      private_key: 'privkey_alice_desktop_nop012',
      status: 'pending'
    }
  ], { ignoreDuplicates: true });
  
  console.log(`✅ Seeded ${devices.length} devices`);
  return devices;
}

async function seedDepartments() {
  console.log('🏢 Seeding departments...');
  
  const departments = await Department.bulkCreate([
    { name: 'IT Department', description: 'Information Technology', enabled: true },
    { name: 'Finance', description: 'Finance and Accounting', enabled: true },
    { name: 'HR', description: 'Human Resources', enabled: true },
    { name: 'Marketing', description: 'Marketing and Sales', enabled: true }
  ], { ignoreDuplicates: true });
  
  console.log(`✅ Seeded ${departments.length} departments`);
  return departments;
}

async function seedFirewallRules() {
  console.log('🛡️ Seeding firewall rules...');
  
  const rules = await FirewallRule.bulkCreate([
    {
      name: 'Allow HTTPS',
      description: 'Allow HTTPS traffic for all users',
      enabled: true,
      action: 'allow',
      protocol: 'tcp',
      port: 443,
      ip_type: 'range',
      ip_range: '0.0.0.0/0',
      ip_count: 100
    },
    {
      name: 'Block SSH External',
      description: 'Block external SSH access',
      enabled: true,
      action: 'deny',
      protocol: 'tcp',
      port: 22,
      ip_type: 'range',
      ip_range: '0.0.0.0/0',
      ip_count: 0
    },
    {
      name: 'Allow Internal API',
      description: 'Allow internal API access',
      enabled: true,
      action: 'allow',
      protocol: 'tcp',
      port: 5000,
      ip_type: 'range',
      ip_range: '192.168.1.0/24',
      ip_count: 50
    },
    {
      name: 'Block Torrent',
      description: 'Block BitTorrent traffic',
      enabled: true,
      action: 'deny',
      protocol: 'tcp',
      port: 6881,
      ip_type: 'range',
      ip_range: '0.0.0.0/0',
      ip_count: 0
    }
  ], { ignoreDuplicates: true });
  
  console.log(`✅ Seeded ${rules.length} firewall rules`);
  return rules;
}

async function seedAccessLogs() {
  console.log('📋 Seeding access logs...');
  
  const now = new Date();
  const logs = [];
  
  // Generate 100 access logs
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    const actions = ['allowed', 'allowed', 'allowed', 'blocked'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    logs.push({
      timestamp,
      source_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      destination_ip: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
      port: [80, 443, 22, 3306, 5432][Math.floor(Math.random() * 5)],
      protocol: ['tcp', 'tcp', 'tcp', 'udp'][Math.floor(Math.random() * 4)],
      action,
      status: action === 'blocked' ? 'blocked' : 'success',
      reason: action === 'blocked' ? 'Firewall rule matched' : null,
      endpoint: ['/api/auth/login', '/api/vpn/connect', '/api/billing/status'][Math.floor(Math.random() * 3)]
    });
  }
  
  // Add some suspicious activity (multiple blocked attempts from same IP)
  const suspiciousIP = '203.0.113.50';
  for (let i = 0; i < 15; i++) {
    logs.push({
      timestamp: new Date(now.getTime() - Math.random() * 60 * 60 * 1000),
      source_ip: suspiciousIP,
      destination_ip: '10.0.0.1',
      port: 443,
      protocol: 'tcp',
      action: 'blocked',
      status: 'blocked',
      reason: 'Rate limit exceeded',
      endpoint: '/api/auth/login'
    });
  }
  
  const created = await AccessLog.bulkCreate(logs, { 
    ignoreDuplicates: true,
    fields: ['timestamp', 'source_ip', 'destination_ip', 'port', 'protocol', 'action', 'endpoint', 'status', 'reason']
  });
  console.log(`✅ Seeded ${created.length} access logs`);
  return created;
}

async function seedPayments() {
  console.log('💰 Seeding payments...');
  
  const payments = await Payment.bulkCreate([
    {
      id: 'payment-001',
      user_id: 'user-001',
      amount: 150000,
      status: 'approved',
      payment_method: 'bank_transfer',
      bank: 'bca',
      plan: 'monthly',
      period_start: new Date(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'payment-002',
      user_id: 'user-002',
      amount: 450000,
      status: 'approved',
      payment_method: 'bank_transfer',
      bank: 'mandiri',
      plan: 'quarterly',
      period_start: new Date(),
      period_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'payment-003',
      user_id: 'user-004',
      amount: 1500000,
      status: 'approved',
      payment_method: 'bank_transfer',
      bank: 'bni',
      plan: 'yearly',
      period_start: new Date(),
      period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'payment-004',
      user_id: 'user-003',
      amount: 150000,
      status: 'pending',
      payment_method: 'gopay',
      plan: 'monthly'
    },
    {
      id: 'payment-005',
      user_id: 'user-001',
      amount: 150000,
      status: 'approved',
      payment_method: 'ovo',
      plan: 'monthly',
      period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period_end: new Date()
    }
  ], { ignoreDuplicates: true });
  
  console.log(`✅ Seeded ${payments.length} payments`);
  return payments;
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Run seeds
    await seedUsers();
    await seedDevices();
    await seedDepartments();
    await seedFirewallRules();
    await seedAccessLogs();
    await seedPayments();
    
    console.log('\n✅ Database seeding completed successfully!\n');
    
    // Show summary
    const userCount = await User.count();
    const deviceCount = await Device.count();
    const deptCount = await Department.count();
    const ruleCount = await FirewallRule.count();
    const logCount = await AccessLog.count();
    const paymentCount = await Payment.count();
    
    console.log('📊 Database Summary:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Devices: ${deviceCount}`);
    console.log(`   Departments: ${deptCount}`);
    console.log(`   Firewall Rules: ${ruleCount}`);
    console.log(`   Access Logs: ${logCount}`);
    console.log(`   Payments: ${paymentCount}`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run seeder
seedDatabase();
