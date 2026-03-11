/**
 * Models Index - Import and associate all models
 */
import sequelize from '../config/sequelize.js';
import User from './User.js';
import Device from './Device.js';
import Department from './Department.js';
import FirewallRule from './FirewallRule.js';
import AccessLog from './AccessLog.js';

// Define associations
User.hasMany(Device, { foreignKey: 'user_id', as: 'devices' });
Device.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Department.belongsToMany(Device, { 
  through: 'department_devices', 
  foreignKey: 'department_id', 
  as: 'devices' 
});
Device.belongsToMany(Department, { 
  through: 'department_devices', 
  foreignKey: 'device_id', 
  as: 'departments' 
});

FirewallRule.belongsTo(Department, { 
  foreignKey: 'department_id', 
  as: 'department' 
});
Department.hasMany(FirewallRule, { 
  foreignKey: 'department_id', 
  as: 'firewall_rules' 
});

// Export all models
export {
  sequelize,
  User,
  Device,
  Department,
  FirewallRule,
  AccessLog
};

export default {
  sequelize,
  User,
  Device,
  Department,
  FirewallRule,
  AccessLog
};
