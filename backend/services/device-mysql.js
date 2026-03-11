/**
 * Device Service - MySQL Implementation
 */
import { Device, User, Department } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Get all devices
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Devices list
 */
export async function getDevices(params = {}) {
  try {
    const { user_id, status, limit = 100, offset = 0 } = params;
    
    const where = {};
    if (user_id) where.user_id = user_id;
    if (status) where.status = status;

    const { count, rows } = await Device.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name']
        },
        {
          model: Department,
          as: 'departments',
          required: false,
          through: { attributes: [] }
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      devices: rows.map(device => device.toJSON()),
      total: count
    };
  } catch (error) {
    console.error('Error getting devices:', error.message);
    throw new Error('Failed to get devices');
  }
}

/**
 * Get device by ID
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Device data
 */
export async function getDeviceById(deviceId) {
  try {
    const device = await Device.findByPk(deviceId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name']
        },
        {
          model: Department,
          as: 'departments',
          required: false,
          through: { attributes: [] }
        }
      ]
    });

    if (!device) {
      throw new Error('Device not found');
    }

    return { device: device.toJSON() };
  } catch (error) {
    console.error('Error getting device:', error.message);
    throw new Error('Failed to get device');
  }
}

/**
 * Create new device
 * @param {Object} deviceData - Device data
 * @returns {Promise<Object>} Created device
 */
export async function createDevice(deviceData) {
  try {
    const device = await Device.create(deviceData);
    return { device: device.toJSON(), message: 'Device created successfully' };
  } catch (error) {
    console.error('Error creating device:', error.message);
    throw new Error('Failed to create device');
  }
}

/**
 * Update device
 * @param {string} deviceId - Device ID
 * @param {Object} deviceData - Device data
 * @returns {Promise<Object>} Updated device
 */
export async function updateDevice(deviceId, deviceData) {
  try {
    const [updated] = await Device.update(deviceData, {
      where: { id: deviceId }
    });

    if (!updated) {
      throw new Error('Device not found');
    }

    const device = await Device.findByPk(deviceId);
    return { device: device.toJSON(), message: 'Device updated successfully' };
  } catch (error) {
    console.error('Error updating device:', error.message);
    throw new Error('Failed to update device');
  }
}

/**
 * Delete device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Success message
 */
export async function deleteDevice(deviceId) {
  try {
    const deleted = await Device.destroy({
      where: { id: deviceId }
    });

    if (!deleted) {
      throw new Error('Device not found');
    }

    return { message: 'Device deleted successfully' };
  } catch (error) {
    console.error('Error deleting device:', error.message);
    throw new Error('Failed to delete device');
  }
}

/**
 * Get devices by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Devices list
 */
export async function getDevicesByUserId(userId) {
  try {
    const devices = await Device.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    return {
      devices: devices.map(device => device.toJSON())
    };
  } catch (error) {
    console.error('Error getting devices by user:', error.message);
    return { devices: [] };
  }
}

/**
 * Get device by IP address
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Device data
 */
export async function getDeviceByIp(ipAddress) {
  try {
    const device = await Device.findOne({
      where: { ip_address: ipAddress },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name']
        }
      ]
    });

    if (!device) {
      throw new Error('Device not found');
    }

    return { device: device.toJSON() };
  } catch (error) {
    console.error('Error getting device by IP:', error.message);
    throw new Error('Failed to get device');
  }
}

/**
 * Get device by public key
 * @param {string} publicKey - Public key
 * @returns {Promise<Object>} Device data
 */
export async function getDeviceByPublicKey(publicKey) {
  try {
    const device = await Device.findOne({
      where: { public_key: publicKey },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'vpn_enabled']
        }
      ]
    });

    if (!device) {
      throw new Error('Device not found');
    }

    return { device: device.toJSON() };
  } catch (error) {
    console.error('Error getting device by public key:', error.message);
    throw new Error('Failed to get device');
  }
}

/**
 * Update device status
 * @param {string} deviceId - Device ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated device
 */
export async function updateDeviceStatus(deviceId, status) {
  try {
    const [updated] = await Device.update(
      { status },
      { where: { id: deviceId } }
    );

    if (!updated) {
      throw new Error('Device not found');
    }

    const device = await Device.findByPk(deviceId);
    return { device: device.toJSON(), message: 'Device status updated successfully' };
  } catch (error) {
    console.error('Error updating device status:', error.message);
    throw new Error('Failed to update device status');
  }
}

/**
 * Activate device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Updated device
 */
export async function activateDevice(deviceId) {
  try {
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    device.status = 'active';
    device.activated_at = new Date();
    await device.save();

    return { device: device.toJSON(), message: 'Device activated successfully' };
  } catch (error) {
    console.error('Error activating device:', error.message);
    throw new Error('Failed to activate device');
  }
}

/**
 * Get device statistics
 * @returns {Promise<Object>} Device statistics
 */
export async function getDeviceStats() {
  try {
    const totalDevices = await Device.count();
    const activeDevices = await Device.count({ where: { status: 'active' } });
    const inactiveDevices = await Device.count({ where: { status: 'inactive' } });
    const pendingDevices = await Device.count({ where: { status: 'pending' } });

    const uniqueUsers = await Device.count({ 
      distinct: true, 
      col: 'user_id' 
    });

    return {
      stats: {
        total_devices: totalDevices,
        active_devices: activeDevices,
        inactive_devices: inactiveDevices,
        pending_devices: pendingDevices,
        unique_users: uniqueUsers
      }
    };
  } catch (error) {
    console.error('Error getting device stats:', error.message);
    return { stats: {} };
  }
}
