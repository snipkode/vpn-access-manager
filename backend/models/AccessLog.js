/**
 * AccessLog Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const AccessLog = sequelize.define('access_log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  source_ip: {
    type: DataTypes.STRING(45),
    allowNull: false,
    field: 'source_ip'
  },
  destination_ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'destination_ip'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  protocol: {
    type: DataTypes.STRING(10),
    defaultValue: 'tcp'
  },
  action: {
    type: DataTypes.ENUM('blocked', 'allowed'),
    allowNull: false,
    defaultValue: 'allowed'
  },
  rule_id: {
    type: DataTypes.INTEGER,
    field: 'rule_id',
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'blocked'),
    defaultValue: 'success'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'access_logs',
  indexes: [
    { fields: ['timestamp'] },
    { fields: ['source_ip'] },
    { fields: ['action'] },
    { fields: ['status'] }
  ]
});

export default AccessLog;
