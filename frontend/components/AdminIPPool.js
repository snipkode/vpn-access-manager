import { useState, useEffect } from 'react';
import { adminFirewallAPI } from '../lib/api';
import { useUIStore } from '../store';
import { StatusBadge } from './admin';

export default function AdminIPPool() {
  const [ipPool, setIPPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { showNotification } = useUIStore();

  useEffect(() => {
    fetchIPPool();
  }, []);

  const fetchIPPool = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFirewallAPI.getIPPool();
      setIPPool(data);
    } catch (err) {
      console.error('Failed to load IP pool:', err);
      setError(err.message || 'Failed to load IP pool data');
      showNotification('Failed to load IP pool data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'assigned', label: '📱 Assigned' },
    { id: 'available', label: '✅ Available' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading IP Pool data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[500px]">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-600 font-medium mb-2">Failed to load IP Pool</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={fetchIPPool}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!ipPool) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[500px]">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-gray-500">No IP pool data available</p>
        <button
          onClick={fetchIPPool}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          🔄 Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark">IP Pool Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage WireGuard IP address allocation
          </p>
        </div>
        <button
          onClick={fetchIPPool}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Usage Summary */}
      {ipPool && (
        <>
          {/* Progress Bar */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-dark">IP Address Usage</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Subnet: <span className="font-mono">{ipPool.subnet}</span>
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                ipPool.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                ipPool.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {ipPool.risk_level === 'high' ? '🚨 High Usage' :
                 ipPool.risk_level === 'medium' ? '⚠️ Medium Usage' :
                 '✅ Healthy'}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                  ipPool.usage_percent > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  ipPool.usage_percent > 60 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                  'bg-gradient-to-r from-green-500 to-green-600'
                }`}
                style={{ width: `${ipPool.usage_percent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                {ipPool.usage_percent}% Used
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{ipPool.total_ips}</div>
                <div className="text-xs text-gray-500 mt-1">Total IPs</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{ipPool.used_ips}</div>
                <div className="text-xs text-gray-500 mt-1">Used IPs</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{ipPool.available_ips}</div>
                <div className="text-xs text-gray-500 mt-1">Available</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {ipPool.total_ips - ipPool.used_ips}
                </div>
                <div className="text-xs text-gray-500 mt-1">Remaining</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Assignments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-dark">Recent Assignments</h3>
                </div>
                <div className="p-4">
                  {ipPool.device_assignments && ipPool.device_assignments.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {ipPool.device_assignments.slice(0, 10).map((device, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm">📱</span>
                            </div>
                            <div>
                              <div className="font-medium text-dark text-sm">{device.device_name}</div>
                              <div className="text-xs text-gray-500">{device.user_email}</div>
                            </div>
                          </div>
                          <div className="font-mono text-sm text-gray-600">{device.ip}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No device assignments</p>
                  )}
                </div>
              </div>

              {/* Usage by User */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-dark">Usage by User</h3>
                </div>
                <div className="p-4">
                  {ipPool.device_assignments && ipPool.device_assignments.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {Object.entries(
                        ipPool.device_assignments.reduce((acc, device) => {
                          if (!acc[device.user_id]) {
                            acc[device.user_id] = { email: device.user_email, count: 0, ips: [] };
                          }
                          acc[device.user_id].count++;
                          acc[device.user_id].ips.push(device.ip);
                          return acc;
                        }, {})
                      ).map(([userId, data], idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-dark text-sm">{data.email}</div>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {data.count} device{data.count > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {data.ips.map((ip, i) => (
                              <span key={i} className="text-xs font-mono px-2 py-1 bg-white rounded border">
                                {ip}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">No usage data</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assigned' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-dark">
                  Assigned IPs ({ipPool.used_ips})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ipPool.device_assignments && ipPool.device_assignments.length > 0 ? (
                      ipPool.device_assignments.map((device, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-dark">{device.ip}</td>
                          <td className="px-6 py-4 text-sm text-dark">{device.device_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{device.user_email}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status="active" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          No assigned IPs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'available' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-dark">
                  Available IPs ({ipPool.available_ips})
                </h3>
              </div>
              <div className="p-4">
                {ipPool.available_ip_list && ipPool.available_ip_list.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {ipPool.available_ip_list.map((ip, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1.5 bg-green-50 text-green-700 rounded text-xs font-mono text-center border border-green-200"
                        title={ip}
                      >
                        {ip}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">
                    {ipPool.available_ips > 0 
                      ? `Showing first 50 of ${ipPool.available_ips} available IPs`
                      : 'No available IPs - pool exhausted!'}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
