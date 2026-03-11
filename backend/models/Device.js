/**
 * Device Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Device = sequelize.define('device', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  device_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'device_name'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: false,
    field: 'ip_address'
  },
  public_key: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'public_key'
  },
  private_key: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'private_key'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    defaultValue: 'pending'
  },
  activated_at: {
    type: DataTypes.DATE,
    field: 'activated_at'
  },
  lease_expires: {
    type: DataTypes.DATE,
    field: 'lease_expires'
  }
}, {
  tableName: 'devices',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['ip_address'] }
  ]
});

export default Device;
