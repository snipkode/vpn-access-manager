/**
 * FirewallRule Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const FirewallRule = sequelize.define('firewall_rule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  action: {
    type: DataTypes.ENUM('allow', 'deny'),
    allowNull: false,
    defaultValue: 'allow'
  },
  protocol: {
    type: DataTypes.ENUM('tcp', 'udp', 'icmp'),
    defaultValue: 'tcp'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ip_type: {
    type: DataTypes.ENUM('range', 'individual', 'department'),
    field: 'ip_type',
    defaultValue: 'range'
  },
  ip_range: {
    type: DataTypes.STRING(255),
    field: 'ip_range'
  },
  ip_count: {
    type: DataTypes.INTEGER,
    field: 'ip_count',
    defaultValue: 0
  },
  ips: {
    type: DataTypes.JSON,
    allowNull: true
  },
  department_id: {
    type: DataTypes.INTEGER,
    field: 'department_id',
    allowNull: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  }
}, {
  tableName: 'firewall_rules',
  indexes: [
    { fields: ['enabled'] },
    { fields: ['action'] },
    { fields: ['port'] },
    { fields: ['ip_type'] },
    { fields: ['created_at'] }
  ]
});

export default FirewallRule;
