import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { adminUsersAPI, adminDevicesAPI, adminDashboardAPI } from '../lib/api';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'devices', label: 'Devices' },
];

export default function AdminDashboard({ token, userData }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useUIStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, usersData, devicesData] = await Promise.all([
        adminDashboardAPI.getStats(),
        adminUsersAPI.getUsers(),
        adminDevicesAPI.getDevices(),
      ]);
      setStats(statsData);
      // Filter out admin users - only show regular users
      const allUsers = usersData.users || [];
      const regularUsers = allUsers.filter(user => user.role !== 'admin');
      setUsers(regularUsers);
      setDevices(devicesData.devices || []);
    } catch (error) {
      showNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleVpnAccess = async (userId, currentStatus) => {
    try {
      await adminUsersAPI.updateUser(userId, { vpn_enabled: !currentStatus });
      showNotification('User access updated');
      fetchData();
    } catch (error) {
      showNotification('Failed to update user', 'error');
    }
  };

  const revokeDevice = async (deviceId) => {
    if (!confirm('Revoke this device?')) return;
    try {
      await adminDevicesAPI.deleteDevice(deviceId);
      showNotification('Device revoked');
      fetchData();
    } catch (error) {
      showNotification('Failed to revoke device', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-white dark:bg-primary-600 shadow-md' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && <Overview stats={stats} />}
      {activeTab === 'users' && <UsersTable users={users} onToggle={toggleVpnAccess} />}
      {activeTab === 'devices' && <DevicesTable devices={devices} onRevoke={revokeDevice} />}
    </div>
  );
}

function Overview({ stats }) {
  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, color: 'text-primary', bg: 'bg-blue-50' },
    { label: 'VPN Enabled', value: stats?.vpn_enabled_users || 0, color: 'text-success', bg: 'bg-green-50' },
    { label: 'VPN Disabled', value: stats?.vpn_disabled_users || 0, color: 'text-gray-400', bg: 'bg-gray-50' },
    { label: 'Active Devices', value: stats?.active_devices || 0, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className={`${stat.bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
            <div className={`text-xl font-bold ${stat.color}`}>#</div>
          </div>
          <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
          <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTable({ users, onToggle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Info Box */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <span className="text-lg">ℹ️</span>
          <span>Showing <strong>{users.length}</strong> regular user(s). Admin users are hidden from this list.</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">VPN Access</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center">
                  <div className="text-gray-400">
                    <span className="text-4xl mb-2 block">📭</span>
                    <div className="text-sm font-medium">No regular users found</div>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 text-sm text-dark font-medium">{user.email}</td>
                  <td className="py-4 px-4">
                    <span className={`text-sm font-medium ${user.vpn_enabled ? 'text-success' : 'text-gray-400'}`}>
                      {user.vpn_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => onToggle(user.id, user.vpn_enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        user.vpn_enabled
                          ? 'bg-red-50 text-red-500 hover:bg-red-100'
                          : 'bg-green-50 text-success hover:bg-green-100'
                      }`}
                    >
                      {user.vpn_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevicesTable({ devices, onRevoke }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Device</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">IP</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-sm text-dark font-medium">{device.device_name}</td>
                <td className="py-4 px-4 text-sm text-gray-500">{device.user_id}</td>
                <td className="py-4 px-4 text-sm font-mono text-gray-400">{device.ip_address}</td>
                <td className="py-4 px-4">
                  <span className={`text-sm font-medium ${device.status === 'active' ? 'text-success' : 'text-gray-400'}`}>
                    {device.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <button 
                    onClick={() => onRevoke(device.id)} 
                    className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
