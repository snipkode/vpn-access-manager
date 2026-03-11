/**
 * Payment Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Payment = sequelize.define('payment', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_id'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'blocked'),
    defaultValue: 'pending'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    field: 'payment_method'
  },
  bank: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  plan: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  period_start: {
    type: DataTypes.DATE,
    field: 'period_start'
  },
  period_end: {
    type: DataTypes.DATE,
    field: 'period_end'
  }
}, {
  tableName: 'payments',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

export default Payment;
