/**
 * Department Model
 */
import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Department = sequelize.define('department', {
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
  }
}, {
  tableName: 'departments',
  indexes: [
    { fields: ['enabled'] }
  ]
});

export default Department;
