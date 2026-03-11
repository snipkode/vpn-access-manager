import { useState, useEffect } from 'react';
import { adminDepartmentsAPI, adminFirewallAPI } from '../lib/api';
import { useUIStore } from '../store';
import { StatusBadge } from './admin';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [groupedDevices, setGroupedDevices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);
  const { showNotification } = useUIStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    devices: [],
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [deptsData, groupedData] = await Promise.all([
        adminDepartmentsAPI.getDepartments(),
        adminDepartmentsAPI.getGroupedDevices()
      ]);
      setDepartments(deptsData.departments || []);
      setGroupedDevices(groupedData);
    } catch (error) {
      showNotification('Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeviceToggle = (deviceId) => {
    setFormData(prev => ({
      ...prev,
      devices: prev.devices.includes(deviceId)
        ? prev.devices.filter(id => id !== deviceId)
        : [...prev.devices, deviceId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showNotification('Department name is required', 'error');
      return;
    }

    try {
      if (editingDept) {
        await adminDepartmentsAPI.updateDepartment(editingDept.id, formData);
        showNotification('Department updated successfully');
      } else {
        await adminDepartmentsAPI.createDepartment(formData);
        showNotification('Department created successfully');
      }
      
      resetForm();
      fetchAllData();
    } catch (error) {
      showNotification(error.message || 'Failed to save department', 'error');
    }
  };

  const handleEdit = (dept) => {
    setFormData({
      name: dept.name,
      description: dept.description || '',
      devices: dept.devices || [],
    });
    setEditingDept(dept);
    setShowForm(true);
  };

  const handleDelete = async (deptId) => {
    if (!confirm('Delete this department? This will not delete the devices.')) return;
    
    try {
      await adminDepartmentsAPI.deleteDepartment(deptId);
      showNotification('Department deleted successfully');
      fetchAllData();
    } catch (error) {
      showNotification(error.message || 'Failed to delete department', 'error');
    }
  };

  const handleAddDevice = async (deptId, deviceId) => {
    try {
      await adminDepartmentsAPI.addDevice(deptId, deviceId);
      showNotification('Device added to department');
      fetchAllData();
    } catch (error) {
      showNotification(error.message || 'Failed to add device', 'error');
    }
  };

  const handleRemoveDevice = async (deptId, deviceId) => {
    try {
      await adminDepartmentsAPI.removeDevice(deptId, deviceId);
      showNotification('Device removed from department');
      fetchAllData();
    } catch (error) {
      showNotification(error.message || 'Failed to remove device', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      devices: [],
    });
    setEditingDept(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark">Department Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Group devices by department for easier firewall management
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? '❌ Cancel' : '➕ Add Department'}
        </button>
      </div>

      {/* Stats */}
      {groupedDevices && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-blue-600">{groupedDevices.departments?.length || 0}</div>
            <div className="text-sm text-gray-500">Departments</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-600">{groupedDevices.total_assigned || 0}</div>
            <div className="text-sm text-gray-500">Devices Assigned</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-amber-600">{groupedDevices.total_unassigned || 0}</div>
            <div className="text-sm text-gray-500">Unassigned Devices</div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-dark mb-4">
            {editingDept ? 'Edit Department' : 'Add New Department'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., IT Department, Finance, HR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Device Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Devices ({formData.devices.length} selected)
              </label>
              <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                {groupedDevices?.unassigned_devices?.length === 0 && groupedDevices?.departments?.every(d => d.devices.length === 0) ? (
                  <p className="text-sm text-gray-500 text-center py-4">No devices available</p>
                ) : (
                  <div className="space-y-2">
                    {[
                      ...(groupedDevices?.unassigned_devices || []),
                      ...(groupedDevices?.departments?.flatMap(d => d.devices) || [])
                    ].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
                      .map((device) => {
                        const deptAssignment = groupedDevices?.departments?.find(d => d.devices.some(dev => dev.id === device.id));
                        const isChecked = formData.devices.includes(device.id);
                        const isAssignedToOther = deptAssignment && deptAssignment.department.id !== editingDept?.id;
                        
                        return (
                          <label
                            key={device.id}
                            className={`flex items-center gap-3 p-2 rounded transition-colors ${
                              isAssignedToOther && !isChecked
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked || false}
                              onChange={() => !isAssignedToOther && handleDeviceToggle(device.id)}
                              disabled={isAssignedToOther && !isChecked}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-dark">{device.ip_address}</span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-sm text-gray-700">{device.device_name}</span>
                                {isAssignedToOther && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">
                                    In {deptAssignment.department.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">{device.user_email}</div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                {editingDept ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors cursor-pointer ${
              selectedDept?.id === dept.id ? 'border-primary bg-blue-50' : 'border-gray-100 hover:border-gray-200'
            }`}
            onClick={() => setSelectedDept(dept)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-lg">🏢</span>
                </div>
                <div>
                  <h3 className="font-semibold text-dark">{dept.name}</h3>
                  <p className="text-xs text-gray-500">{dept.description || 'No description'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(dept); }}
                  className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(dept.id); }}
                  className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <StatusBadge status={dept.enabled ? 'active' : 'disabled'} />
                <span className="text-gray-500">{dept.device_count} devices</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(dept.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          <div className="text-4xl mb-2">🏢</div>
          <p>No departments created yet</p>
          <p className="text-sm mt-1">Click "Add Department" to create your first department</p>
        </div>
      )}

      {/* Selected Department Details */}
      {selectedDept && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark">
              📋 {selectedDept.name} - Devices
            </h3>
            <button
              onClick={() => setSelectedDept(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>
          
          {selectedDept.device_details && selectedDept.device_details.length > 0 ? (
            <div className="space-y-2">
              {selectedDept.device_details.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-dark">{device.ip_address}</div>
                    <span className="text-xs text-gray-500">•</span>
                    <div className="text-sm text-gray-700">{device.device_name}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveDevice(selectedDept.id, device.id)}
                    className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No devices in this department</p>
          )}
        </div>
      )}
    </div>
  );
}
