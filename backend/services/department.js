import { db } from '../config/firebase.js';

/**
 * Department/Division Management Service
 * Manages user groups for firewall rules
 */

const DEPARTMENTS_COLLECTION = 'departments';
const DEVICES_COLLECTION = 'devices';
const USERS_COLLECTION = 'users';

/**
 * Get all departments
 * @returns {Promise<Array>} Array of departments
 */
export async function getAllDepartments() {
  try {
    const snapshot = await db.collection(DEPARTMENTS_COLLECTION)
      .orderBy('created_at', 'desc')
      .get();
    
    const departments = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      departments.push({
        id: doc.id,
        ...data,
        device_count: data.devices?.length || 0
      });
    }
    
    return departments;
  } catch (error) {
    console.error('Error getting departments:', error.message);
    throw new Error('Failed to get departments');
  }
}

/**
 * Get department by ID
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Department with devices
 */
export async function getDepartmentById(departmentId) {
  try {
    const doc = await db.collection(DEPARTMENTS_COLLECTION).doc(departmentId).get();
    
    if (!doc.exists) {
      throw new Error('Department not found');
    }
    
    const department = { id: doc.id, ...doc.data() };
    
    // Get device details
    if (department.devices && department.devices.length > 0) {
      const devicesSnapshot = await db.collection(DEVICES_COLLECTION)
        .where('__name__', 'in', department.devices)
        .get();
      
      department.device_details = devicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      department.device_details = [];
    }
    
    return department;
  } catch (error) {
    console.error('Error getting department:', error.message);
    throw error;
  }
}

/**
 * Create new department
 * @param {Object} departmentData - Department data
 * @param {string} departmentData.name - Department name
 * @param {string} departmentData.description - Description
 * @param {string[]} departmentData.devices - Array of device IDs
 * @returns {Promise<Object>} Created department
 */
export async function createDepartment(departmentData) {
  try {
    const { name, description, devices = [] } = departmentData;
    
    if (!name || name.trim() === '') {
      throw new Error('Department name is required');
    }
    
    // Validate device IDs
    const validDevices = [];
    if (devices.length > 0) {
      const devicesSnapshot = await db.collection(DEVICES_COLLECTION)
        .where('__name__', 'in', devices)
        .get();
      
      devicesSnapshot.forEach(doc => {
        validDevices.push(doc.id);
      });
    }
    
    const departmentRef = await db.collection(DEPARTMENTS_COLLECTION).add({
      name: name.trim(),
      description: description || '',
      devices: validDevices,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'admin'
    });
    
    return {
      id: departmentRef.id,
      name: name.trim(),
      description,
      devices: validDevices,
      enabled: true
    };
  } catch (error) {
    console.error('Error creating department:', error.message);
    throw error;
  }
}

/**
 * Update department
 * @param {string} departmentId - Department ID
 * @param {Object} departmentData - Updated department data
 * @returns {Promise<Object>} Updated department
 */
export async function updateDepartment(departmentId, departmentData) {
  try {
    const existingDept = await getDepartmentById(departmentId);
    
    const { name, description, devices, enabled } = {
      ...existingDept,
      ...departmentData
    };
    
    if (!name || name.trim() === '') {
      throw new Error('Department name is required');
    }
    
    // Validate device IDs
    let validDevices = [];
    if (devices && devices.length > 0) {
      const devicesSnapshot = await db.collection(DEVICES_COLLECTION)
        .where('__name__', 'in', devices)
        .get();
      
      devicesSnapshot.forEach(doc => {
        validDevices.push(doc.id);
      });
    }
    
    await db.collection(DEPARTMENTS_COLLECTION).doc(departmentId).update({
      name: name.trim(),
      description,
      devices: validDevices,
      enabled,
      updated_at: new Date().toISOString()
    });
    
    return {
      id: departmentId,
      name: name.trim(),
      description,
      devices: validDevices,
      enabled
    };
  } catch (error) {
    console.error('Error updating department:', error.message);
    throw error;
  }
}

/**
 * Delete department
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteDepartment(departmentId) {
  try {
    const department = await getDepartmentById(departmentId);
    
    // Check if department is used in any firewall rules
    const rulesSnapshot = await db.collection('firewall_rules')
      .where('ip_type', '==', 'department')
      .where('department_id', '==', departmentId)
      .get();
    
    if (!rulesSnapshot.empty) {
      throw new Error(`Cannot delete department: ${rulesSnapshot.size} firewall rule(s) are using this department`);
    }
    
    await db.collection(DEPARTMENTS_COLLECTION).doc(departmentId).delete();
    
    return {
      message: 'Department deleted successfully',
      department_id: departmentId,
      department_name: department.name
    };
  } catch (error) {
    console.error('Error deleting department:', error.message);
    throw error;
  }
}

/**
 * Add device to department
 * @param {string} departmentId - Department ID
 * @param {string} deviceId - Device ID to add
 * @returns {Promise<Object>} Updated department
 */
export async function addDeviceToDepartment(departmentId, deviceId) {
  try {
    const department = await getDepartmentById(departmentId);
    
    // Validate device exists
    const deviceDoc = await db.collection(DEVICES_COLLECTION).doc(deviceId).get();
    if (!deviceDoc.exists) {
      throw new Error('Device not found');
    }
    
    // Check if device already in department
    if (department.devices.includes(deviceId)) {
      throw new Error('Device already in department');
    }
    
    // Check if device is in another department
    const existingDept = await db.collection(DEPARTMENTS_COLLECTION)
      .where('devices', 'array-contains', deviceId)
      .get();
    
    if (!existingDept.empty) {
      const existingDeptData = existingDept.docs[0].data();
      throw new Error(`Device already belongs to department: ${existingDeptData.name}`);
    }
    
    await db.collection(DEPARTMENTS_COLLECTION).doc(departmentId).update({
      devices: [...department.devices, deviceId],
      updated_at: new Date().toISOString()
    });
    
    return {
      id: departmentId,
      devices: [...department.devices, deviceId]
    };
  } catch (error) {
    console.error('Error adding device to department:', error.message);
    throw error;
  }
}

/**
 * Remove device from department
 * @param {string} departmentId - Department ID
 * @param {string} deviceId - Device ID to remove
 * @returns {Promise<Object>} Updated department
 */
export async function removeDeviceFromDepartment(departmentId, deviceId) {
  try {
    const department = await getDepartmentById(departmentId);
    
    const updatedDevices = department.devices.filter(id => id !== deviceId);
    
    await db.collection(DEPARTMENTS_COLLECTION).doc(departmentId).update({
      devices: updatedDevices,
      updated_at: new Date().toISOString()
    });
    
    return {
      id: departmentId,
      devices: updatedDevices
    };
  } catch (error) {
    console.error('Error removing device from department:', error.message);
    throw error;
  }
}

/**
 * Get all devices grouped by department
 * @returns {Promise<Object>} Devices grouped by department
 */
export async function getDevicesByDepartment() {
  try {
    const departments = await getAllDepartments();
    const allDevices = await db.collection(DEVICES_COLLECTION)
      .where('status', '==', 'active')
      .get();
    
    const deviceMap = new Map();
    const unassignedDevices = [];
    
    // Initialize department map
    departments.forEach(dept => {
      deviceMap.set(dept.id, {
        department: dept,
        devices: []
      });
    });
    
    // Get all device details
    for (const doc of allDevices.docs) {
      const device = { id: doc.id, ...doc.data() };
      let assigned = false;
      
      // Check which department this device belongs to
      for (const dept of departments) {
        if (dept.devices.includes(doc.id)) {
          deviceMap.get(dept.id).devices.push(device);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        unassignedDevices.push(device);
      }
    }
    
    return {
      departments: Array.from(deviceMap.values()),
      unassigned_devices: unassignedDevices,
      total_assigned: allDevices.size - unassignedDevices.length,
      total_unassigned: unassignedDevices.length
    };
  } catch (error) {
    console.error('Error getting devices by department:', error.message);
    throw new Error('Failed to get devices by department');
  }
}

/**
 * Get all IPs from a department
 * @param {string} departmentId - Department ID
 * @returns {Promise<string[]>} Array of IP addresses
 */
export async function getDepartmentIPs(departmentId) {
  try {
    const department = await getDepartmentById(departmentId);
    
    if (!department.devices || department.devices.length === 0) {
      return [];
    }
    
    const devicesSnapshot = await db.collection(DEVICES_COLLECTION)
      .where('__name__', 'in', department.devices)
      .where('status', '==', 'active')
      .get();
    
    const ips = [];
    devicesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.ip_address) {
        ips.push(data.ip_address);
      }
    });
    
    return ips;
  } catch (error) {
    console.error('Error getting department IPs:', error.message);
    return [];
  }
}

/**
 * Check if device is assigned to any department
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object>} Department assignment info
 */
export async function getDeviceDepartment(deviceId) {
  try {
    const snapshot = await db.collection(DEPARTMENTS_COLLECTION)
      .where('devices', 'array-contains', deviceId)
      .get();
    
    if (snapshot.empty) {
      return {
        assigned: false,
        department: null
      };
    }
    
    const doc = snapshot.docs[0];
    return {
      assigned: true,
      department: {
        id: doc.id,
        name: doc.data().name
      }
    };
  } catch (error) {
    console.error('Error getting device department:', error.message);
    return {
      assigned: false,
      department: null
    };
  }
}
