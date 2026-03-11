import { useState, useEffect } from 'react';
import { adminFirewallAPI } from '../../lib/api';
import { useUIStore } from '../../store';
import { StatusBadge } from '../admin';

export default function AdminBlockedPorts() {
  const [blockedPorts, setBlockedPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const { showNotification } = useUIStore();

  const [formData, setFormData] = useState({
    port: '',
    reason: '',
    level: 'warning',
  });

  useEffect(() => {
    fetchBlockedPorts();
  }, []);

  const fetchBlockedPorts = async () => {
    setLoading(true);
    try {
      const data = await adminFirewallAPI.getBlockedPorts();
      setBlockedPorts(data.blocked_ports || []);
    } catch (error) {
      showNotification('Failed to load blocked ports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const portNum = parseInt(formData.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      showNotification('Port must be between 1 and 65535', 'error');
      return;
    }

    try {
      if (editingPort) {
        await adminFirewallAPI.updateBlockedPort(editingPort.id, formData);
        showNotification('Blocked port updated successfully');
      } else {
        await adminFirewallAPI.addBlockedPort(formData);
        showNotification('Blocked port added successfully');
      }
      
      resetForm();
      fetchBlockedPorts();
    } catch (error) {
      showNotification(error.message || 'Failed to save blocked port', 'error');
    }
  };

  const handleEdit = (port) => {
    setFormData({
      port: port.port.toString(),
      reason: port.reason,
      level: port.level,
    });
    setEditingPort(port);
    setShowForm(true);
  };

  const handleDelete = async (portId) => {
    if (!confirm('Delete this blocked port? This will allow the port to be used in firewall rules.')) return;
    
    try {
      await adminFirewallAPI.deleteBlockedPort(portId);
      showNotification('Blocked port deleted successfully');
      fetchBlockedPorts();
    } catch (error) {
      showNotification(error.message || 'Failed to delete blocked port', 'error');
    }
  };

  const handleToggle = async (portId, currentEnabled) => {
    try {
      await adminFirewallAPI.toggleBlockedPort(portId);
      showNotification(`Blocked port ${currentEnabled ? 'disabled' : 'enabled'}`);
      fetchBlockedPorts();
    } catch (error) {
      showNotification('Failed to toggle blocked port', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      port: '',
      reason: '',
      level: 'warning',
    });
    setEditingPort(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark">Blocked Ports Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure which ports are protected and cannot be used in firewall rules
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? '❌ Cancel' : '➕ Add Blocked Port'}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About Blocked Ports</p>
            <p>
              Blocked ports are protected system ports that cannot be used in firewall rules. 
              This prevents accidental exposure of critical services like WireGuard (51820), 
              HTTPS (443), HTTP (80), and SSH (22).
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-dark mb-4">
            {editingPort ? 'Edit Blocked Port' : 'Add New Blocked Port'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="port"
                  value={formData.port}
                  onChange={handleInputChange}
                  placeholder="e.g., 3306"
                  min="1"
                  max="65535"
                  disabled={editingPort?.is_default}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-100"
                  required
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Level
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="danger">🚨 Danger (Critical)</option>
                  <option value="warning">⚠️ Warning</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="e.g., MySQL Database"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                />
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
                {editingPort ? 'Update Port' : 'Add Port'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Blocked Ports List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-dark">Configured Blocked Ports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blockedPorts.map((port) => (
                <tr key={port.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-lg font-bold text-dark">{port.port}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      port.level === 'danger' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {port.level === 'danger' ? '🚨 Danger' : '⚠️ Warning'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{port.reason}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(port.id, port.enabled)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        port.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {port.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {port.is_default ? (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        🛡️ Default
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        👤 Custom
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(port)}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      {!port.is_default && (
                        <button
                          onClick={() => handleDelete(port.id)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {blockedPorts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔒</div>
            <p>No blocked ports configured</p>
            <p className="text-sm mt-1">Default ports will be automatically added</p>
          </div>
        )}
      </div>
    </div>
  );
}
