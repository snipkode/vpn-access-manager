import { useState, useEffect, useMemo } from 'react';
import { adminDevicesAPI } from '../lib/api';
import { useUIStore } from '../store';
import { StatusBadge } from './admin';
import { Pagination, SearchInput, SortableHeader, EmptyState } from './Pagination';

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const { showNotification } = useUIStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [filterUser, setFilterUser] = useState('all');
  
  // Get unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map();
    devices.forEach(device => {
      if (device.user_id && !usersMap.has(device.user_id)) {
        usersMap.set(device.user_id, {
          id: device.user_id,
          name: device.user_name,
          email: device.user_email
        });
      }
    });
    return Array.from(usersMap.values()).sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
  }, [devices]);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await adminDevicesAPI.getDevices();
      setDevices(data.devices || []);
    } catch (error) {
      showNotification('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted devices
  const filteredDevices = useMemo(() => {
    let result = [...devices];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(device =>
        device.device_name?.toLowerCase().includes(query) ||
        device.ip_address?.toLowerCase().includes(query) ||
        device.user_email?.toLowerCase().includes(query) ||
        device.user_name?.toLowerCase().includes(query)
      );
    }

    // User filter (by user_id)
    if (filterUser !== 'all') {
      result = result.filter(device => device.user_id === filterUser);
    }

    // Status filter
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      result = result.filter(device => device.status === (isActive ? 'active' : 'inactive'));
    }

    // Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'device_name' || sortConfig.key === 'user_name' || sortConfig.key === 'user_email') {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        } else if (sortConfig.key === 'created_at') {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [devices, searchQuery, filterStatus, filterUser, sortConfig]);

  // Paginated devices
  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDevices.slice(startIndex, endIndex);
  }, [filteredDevices, currentPage, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterUser, itemsPerPage]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = async (deviceId) => {
    if (!confirm('Delete this device? This will revoke access.')) return;

    try {
      await adminDevicesAPI.deleteDevice(deviceId);
      showNotification('Device deleted successfully');
      fetchDevices();
    } catch (error) {
      showNotification(error.message || 'Failed to delete device', 'error');
    }
  };

  const handleToggleStatus = async (deviceId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await adminDevicesAPI.updateDevice(deviceId, { status: newStatus });
      showNotification(`Device ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchDevices();
    } catch (error) {
      showNotification(error.message || 'Failed to update device status', 'error');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark">Device Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all registered devices and their access
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600">{devices.length}</div>
          <div className="text-sm text-gray-500">Total Devices</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-green-600">
            {devices.filter(d => d.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">Active Devices</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-red-600">
            {devices.filter(d => d.status === 'inactive').length}
          </div>
          <div className="text-sm text-gray-500">Inactive Devices</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-amber-600">
            {new Set(devices.map(d => d.user_id)).size}
          </div>
          <div className="text-sm text-gray-500">Unique Users</div>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header with search and filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-dark">Devices List</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Search */}
              <div className="w-full sm:w-64">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search devices..."
                  size="sm"
                />
              </div>

              {/* User Filter */}
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-48"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Results summary */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {paginatedDevices.length} of {filteredDevices.length} devices
            {searchQuery && ` (filtered from ${devices.length} total)`}
          </div>
        </div>

        {/* Devices Table */}
        <DevicesTable
          devices={paginatedDevices}
          selectedDevice={selectedDevice}
          onSelect={setSelectedDevice}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          sortConfig={sortConfig}
          onSort={handleSort}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredDevices.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Selected Device Details */}
      {selectedDevice && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark">
              📱 Device Details
            </h3>
            <button
              onClick={() => setSelectedDevice(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Device Name</label>
              <p className="font-medium text-dark">{selectedDevice.device_name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">IP Address</label>
              <p className="font-mono text-dark">{selectedDevice.ip_address}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Owner</label>
              <p className="font-medium text-dark">{selectedDevice.user_name}</p>
              <p className="text-sm text-gray-500">{selectedDevice.user_email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Status</label>
              <div className="mt-1">
                <StatusBadge status={selectedDevice.status === 'active' ? 'active' : 'inactive'} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Created</label>
              <p className="text-dark">{new Date(selectedDevice.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Last Updated</label>
              <p className="text-dark">{new Date(selectedDevice.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DevicesTable({ devices, selectedDevice, onSelect, onDelete, onToggleStatus, sortConfig, onSort }) {
  const columns = [
    {
      key: 'device_name',
      label: 'Device',
      sortable: true,
      render: (device) => (
        <div>
          <div className="font-medium text-dark">{device.device_name}</div>
          <div className="font-mono text-xs text-gray-500">{device.ip_address}</div>
        </div>
      ),
    },
    {
      key: 'user_name',
      label: 'Owner',
      sortable: true,
      render: (device) => (
        <div>
          <div className="font-medium text-dark">{device.user_name}</div>
          <div className="text-xs text-gray-500">{device.user_email}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (device) => (
        <StatusBadge status={device.status === 'active' ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (device) => (
        <div className="text-sm text-gray-500">
          {new Date(device.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (device) => (
        <div className="flex gap-1.5 whitespace-nowrap">
          <button
            onClick={() => onSelect(device)}
            className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100"
          >
            View
          </button>
          <button
            onClick={() => onToggleStatus(device.id, device.status)}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              device.status === 'active'
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {device.status === 'active' ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(device.id); }}
            className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (devices.length === 0) {
    return (
      <EmptyState
        icon="📱"
        message="No devices found"
        description="Devices will appear here when users register"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <SortableHeader
                key={col.key}
                column={col}
                sortConfig={sortConfig}
                onSort={onSort}
                className={
                  col.key === 'device_name' ? 'w-[25%]' :
                  col.key === 'user_name' ? 'w-[25%]' :
                  col.key === 'status' ? 'w-24' :
                  col.key === 'created_at' ? 'w-32' :
                  col.key === 'actions' ? 'w-48' : ''
                }
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {devices.map((device) => (
            <tr
              key={device.id}
              className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                selectedDevice?.id === device.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''
              }`}
              onClick={() => onSelect(device)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 align-top">
                  {col.render(device)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
