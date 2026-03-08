import { useEffect, useState, useMemo } from 'react';
import { useUIStore, useAuthStore } from '../store';
import { adminUsersAPI, adminDevicesAPI, adminDashboardAPI, adminVpnAPI } from '../lib/api';
import { Tabs, DataTable, StatusBadge } from './admin';
import AdminVPN from './AdminVPN';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'devices', label: 'Devices' },
  { id: 'vpn', label: 'VPN' },
];

const STAT_CONFIG = [
  { key: 'total_users', label: 'Total Users', color: 'text-primary', bg: 'bg-blue-50' },
  { key: 'vpn_enabled_users', label: 'VPN Enabled', color: 'text-success', bg: 'bg-green-50' },
  { key: 'vpn_disabled_users', label: 'VPN Disabled', color: 'text-gray-400', bg: 'bg-gray-50' },
  { key: 'active_devices', label: 'Active Devices', color: 'text-amber-500', bg: 'bg-amber-50' },
];

const BREAKDOWN_CONFIG = [
  { key: 'admin', label: 'Admin Users', color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'user', label: 'Regular Users', color: 'text-blue-600', bg: 'bg-blue-50' },
];

const VPN_STATUS_CONFIG = [
  { key: 'enabled', label: 'VPN Enabled', color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'disabled', label: 'VPN Disabled', color: 'text-red-600', bg: 'bg-red-50' },
];

const BILLING_CONFIG = [
  { key: 'total_revenue', label: 'Total Revenue', color: 'text-green-600', bg: 'bg-green-50', format: 'currency' },
  { key: 'this_month_revenue', label: 'This Month', color: 'text-blue-600', bg: 'bg-blue-50', format: 'currency' },
  { key: 'last_month_revenue', label: 'Last Month', color: 'text-purple-600', bg: 'bg-purple-50', format: 'currency' },
  { key: 'average_payment', label: 'Avg Payment', color: 'text-amber-600', bg: 'bg-amber-50', format: 'currency' },
];

const ORDER_STATUS_CONFIG = [
  { key: 'total_orders', label: 'Total Orders', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'approved_orders', label: 'Approved', color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'pending_orders', label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'rejected_orders', label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'blocked_orders', label: 'Blocked', color: 'text-gray-600', bg: 'bg-gray-50' },
];

export default function AdminDashboard({ token, userData }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, usersData, devicesData] = await Promise.all([
        adminDashboardAPI.getStats(),
        adminUsersAPI.getUsers(), // Get all users (no filter)
        adminDevicesAPI.getDevices(),
      ]);
      setStats(statsData);
      
      // Filter: exclude admins and current logged-in user
      const allUsers = usersData.users || [];
      const filteredUsers = allUsers.filter(u => 
        u.role !== 'admin' && // Exclude admin users
        u.id !== user?.uid && // Exclude current user
        u.email !== user?.email // Backup filter by email
      );
      
      setUsers(filteredUsers);
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

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`Delete user ${userEmail}? This will also delete all their devices.`)) return;
    try {
      await adminUsersAPI.deleteUser(userId);
      showNotification('User deleted successfully');
      fetchData();
    } catch (error) {
      showNotification('Failed to delete user: ' + error.message, 'error');
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
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && <Overview stats={stats} />}
      {activeTab === 'users' && <UsersTable users={users} onToggle={toggleVpnAccess} onDelete={deleteUser} />}
      {activeTab === 'devices' && <DevicesTable devices={devices} onRevoke={revokeDevice} />}
      {activeTab === 'vpn' && <AdminVPN token={token} />}
    </div>
  );
}

function Overview({ stats }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CONFIG.map((config) => (
          <div key={config.key} className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100">
            <div className={`${config.bg} w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2 sm:mb-3`}>
              <div className={`text-lg sm:text-xl font-bold ${config.color}`}>#</div>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${config.color} mb-1`}>{stats?.[config.key] || 0}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">{config.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {BILLING_CONFIG.map((config) => {
            const value = stats?.billing?.[config.key] || 0;
            const displayValue = config.format === 'currency' ? formatCurrency(value) : value;
            return (
              <div key={config.key} className={`${config.bg} rounded-lg p-2 sm:p-4`}>
                <div className="flex items-center gap-2">
                  <div className={`text-lg sm:text-xl font-bold ${config.color} flex-shrink-0`}>
                    {config.key === 'total_revenue' ? 'Rp' : config.key === 'average_payment' ? 'Avg' : '📊'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-base sm:text-lg font-bold ${config.color} truncate`}>{displayValue}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{config.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Status */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Status Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          {ORDER_STATUS_CONFIG.map((config) => {
            const value = stats?.billing?.[config.key] || 0;
            return (
              <div key={config.key} className={`${config.bg} rounded-lg p-2 sm:p-4`}>
                <div className="flex items-center gap-2">
                  <div className={`text-lg sm:text-2xl font-bold ${config.color} flex-shrink-0`}>
                    {config.key.includes('approved') ? '✓' : config.key.includes('pending') ? '⏳' : config.key.includes('rejected') ? '✗' : config.key.includes('blocked') ? '🚫' : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-lg sm:text-2xl font-bold ${config.color} truncate`}>{value}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{config.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment by Plan */}
      {stats?.billing?.payment_by_plan && Object.keys(stats.billing.payment_by_plan).length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment by Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {Object.entries(stats.billing.payment_by_plan).map(([plan, data]) => (
              <div key={plan} className="bg-blue-50 rounded-lg p-2 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="text-lg sm:text-xl font-bold text-blue-600 flex-shrink-0">📋</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 capitalize truncate">{plan}</div>
                    <div className="text-sm sm:text-lg font-bold text-blue-600 truncate">{data.count} orders</div>
                    <div className="text-xs sm:text-sm text-blue-500 truncate">{formatCurrency(data.total)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment by Bank */}
      {stats?.billing?.payment_by_bank && Object.keys(stats.billing.payment_by_bank).length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment by Bank</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {Object.entries(stats.billing.payment_by_bank).map(([bank, data]) => (
              <div key={bank} className="bg-purple-50 rounded-lg p-2 sm:p-4">
                <div className="flex items-center gap-2">
                  <div className="text-lg sm:text-xl font-bold text-purple-600 flex-shrink-0">🏦</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 capitalize truncate">{bank}</div>
                    <div className="text-sm sm:text-lg font-bold text-purple-600 truncate">{data.count} orders</div>
                    <div className="text-xs sm:text-sm text-purple-500 truncate">{formatCurrency(data.total)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users by Role */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Users by Role</h3>
          <div className="space-y-2 sm:space-y-3">
            {BREAKDOWN_CONFIG.map((config) => {
              const value = stats?.users_by_role?.[config.key] || 0;
              return (
                <div key={config.key} className={`${config.bg} rounded-lg p-2 sm:p-4`}>
                  <div className="flex items-center gap-2">
                    <div className={`text-lg sm:text-2xl font-bold ${config.color} flex-shrink-0`}>
                      {config.key === 'admin' ? '👤' : '👥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg sm:text-2xl font-bold ${config.color} truncate`}>{value}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{config.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Users by VPN Status */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Users by VPN Status</h3>
          <div className="space-y-2 sm:space-y-3">
            {VPN_STATUS_CONFIG.map((config) => {
              const value = stats?.users_by_vpn_status?.[config.key] || 0;
              return (
                <div key={config.key} className={`${config.bg} rounded-lg p-2 sm:p-4`}>
                  <div className="flex items-center gap-2">
                    <div className={`text-lg sm:text-2xl font-bold ${config.color} flex-shrink-0`}>
                      {config.key === 'enabled' ? '✅' : '❌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg sm:text-2xl font-bold ${config.color} truncate`}>{value}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{config.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTable({ users, onToggle, onDelete }) {
  const columns = useMemo(() => [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-dark font-medium">{user.email}</span>
      ),
    },
    {
      key: 'vpn_enabled',
      label: 'VPN Access',
      sortable: true,
      render: (user) => (
        <StatusBadge
          status={user.vpn_enabled ? 'active' : 'disabled'}
          customStyles={{
            active: 'bg-green-50 text-success',
            disabled: 'bg-gray-50 text-gray-400',
          }}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (user) => (
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(user.id, user.vpn_enabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              user.vpn_enabled
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-green-50 text-success hover:bg-green-100'
            }`}
          >
            {user.vpn_enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => onDelete(user.id, user.email)}
            className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
          >
            Delete
          </button>
        </div>
      ),
    },
  ], [onToggle, onDelete]);

  const headerContent = (
    <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <span className="text-lg">ℹ️</span>
        <span>
          Showing <strong>{users.length}</strong> regular user(s). Admin users are hidden from this list.
        </span>
      </div>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={users}
      itemsPerPage={10}
      emptyMessage="No regular users found"
      headerContent={headerContent}
      searchable={true}
      searchKeys={['email']}
      sortable={true}
      mobileCardView={true}
      renderCard={(user) => (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-medium text-dark">{user.email}</div>
              <div className="text-xs text-gray-400">User ID: {user.id}</div>
            </div>
            <StatusBadge
              status={user.vpn_enabled ? 'active' : 'disabled'}
              customStyles={{
                active: 'bg-green-50 text-success',
                disabled: 'bg-gray-50 text-gray-400',
              }}
            />
          </div>
          <button
            onClick={() => onToggle(user.id, user.vpn_enabled)}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              user.vpn_enabled
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-green-50 text-success hover:bg-green-100'
            }`}
          >
            {user.vpn_enabled ? 'Disable VPN Access' : 'Enable VPN Access'}
          </button>
        </div>
      )}
    />
  );
}

function DevicesTable({ devices, onRevoke }) {
  const columns = useMemo(() => [
    {
      key: 'device_name',
      label: 'Device',
      sortable: true,
      render: (device) => (
        <span className="text-sm text-dark font-medium">{device.device_name}</span>
      ),
    },
    {
      key: 'user_id',
      label: 'User',
      sortable: true,
      render: (device) => (
        <span className="text-sm text-gray-500">{device.user_id}</span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP Address',
      sortable: true,
      render: (device) => (
        <span className="text-sm font-mono text-gray-400">{device.ip_address}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (device) => (
        <StatusBadge
          status={device.status}
          customStyles={{
            active: 'bg-green-50 text-success',
            disabled: 'bg-gray-50 text-gray-400',
            revoked: 'bg-red-50 text-red-500',
          }}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (device) => (
        <button
          onClick={() => onRevoke(device.id)}
          className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
        >
          Revoke
        </button>
      ),
    },
  ], [onRevoke]);

  return (
    <DataTable
      columns={columns}
      data={devices}
      itemsPerPage={10}
      emptyMessage="No devices found"
      searchable={true}
      searchKeys={['device_name', 'ip_address', 'user_id']}
      sortable={true}
      mobileCardView={true}
      renderCard={(device) => (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-dark">{device.device_name}</div>
              <div className="text-xs text-gray-400 font-mono">{device.ip_address}</div>
              <div className="text-xs text-gray-500 mt-1">User: {device.user_id}</div>
            </div>
            <StatusBadge
              status={device.status}
              customStyles={{
                active: 'bg-green-50 text-success',
                disabled: 'bg-gray-50 text-gray-400',
                revoked: 'bg-red-50 text-red-500',
              }}
            />
          </div>
          <button
            onClick={() => onRevoke(device.id)}
            className="w-full px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
          >
            Revoke Device
          </button>
        </div>
      )}
    />
  );
}
