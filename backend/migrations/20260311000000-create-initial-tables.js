/**
 * Sequelize Migration - Create initial tables
 * Run with: npx sequelize-cli db:migrate
 */

import { DataTypes } from 'sequelize';

export async function up(queryInterface) {
  // Users table
  await queryInterface.createTable('users', {
    id: { type: DataTypes.STRING(255), primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: true },
    role: { type: DataTypes.ENUM('admin', 'user'), defaultValue: 'user' },
    vpn_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    subscription_status: { 
      type: DataTypes.ENUM('active', 'trialing', 'canceled', 'expired'), 
      defaultValue: 'trialing' 
    },
    subscription_canceled_at: { type: DataTypes.DATE, allowNull: true },
    subscription_cancel_reason: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Devices table
  await queryInterface.createTable('devices', {
    id: { type: DataTypes.STRING(255), primaryKey: true },
    user_id: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
      references: { model: 'users', key: 'id' } 
    },
    device_name: { type: DataTypes.STRING(255), allowNull: false },
    ip_address: { type: DataTypes.STRING(45), allowNull: false },
    public_key: { type: DataTypes.TEXT, allowNull: false },
    private_key: { type: DataTypes.TEXT, allowNull: true },
    status: { 
      type: DataTypes.ENUM('active', 'inactive', 'pending'), 
      defaultValue: 'pending' 
    },
    activated_at: { type: DataTypes.DATE, allowNull: true },
    lease_expires: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Departments table
  await queryInterface.createTable('departments', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Department devices (many-to-many)
  await queryInterface.createTable('department_devices', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    department_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      references: { model: 'departments', key: 'id' } 
    },
    device_id: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
      references: { model: 'devices', key: 'id' } 
    },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Add unique constraint
  await queryInterface.addConstraint('department_devices', {
    fields: ['department_id', 'device_id'],
    type: 'unique',
    name: 'unique_department_device'
  });

  // Firewall rules table
  await queryInterface.createTable('firewall_rules', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    action: { type: DataTypes.ENUM('allow', 'deny'), allowNull: false },
    protocol: { 
      type: DataTypes.ENUM('tcp', 'udp', 'icmp'), 
      defaultValue: 'tcp' 
    },
    port: { type: DataTypes.INTEGER, allowNull: false },
    ip_type: { 
      type: DataTypes.ENUM('range', 'individual', 'department'), 
      defaultValue: 'range' 
    },
    ip_range: { type: DataTypes.STRING(255), allowNull: true },
    ip_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    ips: { type: DataTypes.JSON, allowNull: true },
    department_id: { 
      type: DataTypes.INTEGER, 
      allowNull: true, 
      references: { model: 'departments', key: 'id' } 
    },
    priority: { type: DataTypes.INTEGER, defaultValue: 100 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Access logs table
  await queryInterface.createTable('access_logs', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    timestamp: { type: DataTypes.DATE, allowNull: false },
    source_ip: { type: DataTypes.STRING(45), allowNull: false },
    destination_ip: { type: DataTypes.STRING(45), allowNull: true },
    port: { type: DataTypes.INTEGER, allowNull: true },
    protocol: { type: DataTypes.STRING(10), defaultValue: 'tcp' },
    action: { 
      type: DataTypes.ENUM('blocked', 'allowed'), 
      allowNull: false 
    },
    rule_id: { type: DataTypes.INTEGER, allowNull: true },
    country: { type: DataTypes.STRING(2), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    endpoint: { type: DataTypes.STRING(500), allowNull: true },
    status: { 
      type: DataTypes.ENUM('success', 'failed', 'blocked'), 
      defaultValue: 'success' 
    },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Payments table
  await queryInterface.createTable('payments', {
    id: { type: DataTypes.STRING(255), primaryKey: true },
    user_id: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
      references: { model: 'users', key: 'id' } 
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    status: { 
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'blocked'), 
      defaultValue: 'pending' 
    },
    payment_method: { type: DataTypes.STRING(50), allowNull: true },
    bank: { type: DataTypes.STRING(50), allowNull: true },
    plan: { type: DataTypes.STRING(50), allowNull: true },
    period_start: { type: DataTypes.DATE, allowNull: true },
    period_end: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Credit transactions table
  await queryInterface.createTable('credit_transactions', {
    id: { type: DataTypes.STRING(255), primaryKey: true },
    user_id: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
      references: { model: 'users', key: 'id' } 
    },
    from_user_id: { 
      type: DataTypes.STRING(255), 
      allowNull: true, 
      references: { model: 'users', key: 'id' } 
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    status: { 
      type: DataTypes.ENUM('pending', 'completed', 'failed'), 
      defaultValue: 'pending' 
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Audit logs table
  await queryInterface.createTable('audit_logs', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    user_id: { type: DataTypes.STRING(255), allowNull: true },
    user_email: { type: DataTypes.STRING(255), allowNull: true },
    admin_id: { type: DataTypes.STRING(255), allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  });

  // Add indexes
  await queryInterface.addIndex('users', ['email']);
  await queryInterface.addIndex('users', ['role']);
  await queryInterface.addIndex('users', ['vpn_enabled']);
  await queryInterface.addIndex('users', ['subscription_status']);

  await queryInterface.addIndex('devices', ['user_id']);
  await queryInterface.addIndex('devices', ['status']);
  await queryInterface.addIndex('devices', ['ip_address']);

  await queryInterface.addIndex('departments', ['enabled']);

  await queryInterface.addIndex('firewall_rules', ['enabled']);
  await queryInterface.addIndex('firewall_rules', ['action']);
  await queryInterface.addIndex('firewall_rules', ['port']);
  await queryInterface.addIndex('firewall_rules', ['ip_type']);
  await queryInterface.addIndex('firewall_rules', ['created_at']);

  await queryInterface.addIndex('access_logs', ['timestamp']);
  await queryInterface.addIndex('access_logs', ['source_ip']);
  await queryInterface.addIndex('access_logs', ['action']);
  await queryInterface.addIndex('access_logs', ['status']);

  await queryInterface.addIndex('payments', ['user_id']);
  await queryInterface.addIndex('payments', ['status']);
  await queryInterface.addIndex('payments', ['created_at']);

  await queryInterface.addIndex('credit_transactions', ['user_id']);
  await queryInterface.addIndex('credit_transactions', ['from_user_id']);
  await queryInterface.addIndex('credit_transactions', ['type']);
  await queryInterface.addIndex('credit_transactions', ['status']);

  await queryInterface.addIndex('audit_logs', ['action']);
  await queryInterface.addIndex('audit_logs', ['user_id']);
  await queryInterface.addIndex('audit_logs', ['timestamp']);
}

export async function down(queryInterface) {
  // Drop tables in reverse order (due to foreign keys)
  await queryInterface.dropTable('audit_logs');
  await queryInterface.dropTable('credit_transactions');
  await queryInterface.dropTable('payments');
  await queryInterface.dropTable('access_logs');
  await queryInterface.dropTable('firewall_rules');
  await queryInterface.dropTable('department_devices');
  await queryInterface.dropTable('departments');
  await queryInterface.dropTable('devices');
  await queryInterface.dropTable('users');
}
