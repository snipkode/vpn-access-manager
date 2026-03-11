/**
 * CreditTransaction Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const CreditTransaction = sequelize.define('credit_transaction', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_id'
  },
  from_user_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'from_user_id'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'credit_transactions',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['from_user_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

export default CreditTransaction;
