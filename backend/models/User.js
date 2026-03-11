/**
 * User Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const User = sequelize.define('user', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true  // Null for users created via OAuth
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  vpn_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'vpn_enabled'
  },
  subscription_status: {
    type: DataTypes.ENUM('active', 'trialing', 'canceled', 'expired'),
    defaultValue: 'trialing',
    field: 'subscription_status'
  },
  subscription_canceled_at: {
    type: DataTypes.DATE,
    field: 'subscription_canceled_at'
  },
  subscription_cancel_reason: {
    type: DataTypes.TEXT,
    field: 'subscription_cancel_reason'
  },
  last_login: {
    type: DataTypes.DATE,
    field: 'last_login'
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['vpn_enabled'] },
    { fields: ['subscription_status'] }
  ]
});

export default User;
