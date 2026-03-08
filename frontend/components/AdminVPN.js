import { useEffect, useState } from 'react';
import { adminVpnAPI } from '../lib/api';
import { useUIStore } from '../store';
import Icon from './ui/Icon';

export default function AdminVPN({ token }) {
  const { showNotification } = useUIStore();
  const [health, setHealth] = useState(null);
  const [ipPool, setIpPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cleaningLeases, setCleaningLeases] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthData, ipPoolData] = await Promise.all([
        adminVpnAPI.getHealth(),
        adminVpnAPI.getIpPool(),
      ]);
      setHealth(healthData);
      setIpPool(ipPoolData);
    } catch (error) {
      console.error('Failed to fetch VPN data:', error);
      showNotification(`Failed to load VPN data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await adminVpnAPI.sync();
      showNotification('WireGuard synced successfully');
      fetchData();
    } catch (error) {
      showNotification(`Sync failed: ${error.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanupLeases = async () => {
    try {
      setCleaningLeases(true);
      await adminVpnAPI.cleanupLeases();
      showNotification('Expired leases cleaned up');
      fetchData();
    } catch (error) {
      showNotification(`Cleanup failed: ${error.message}`, 'error');
    } finally {
      setCleaningLeases(false);
    }
  };

  // Pagination logic
  const getCurrentPageItems = () => {
    if (!ipPool?.pool) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return ipPool.pool.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    if (!ipPool?.pool) return 0;
    return Math.ceil(ipPool.pool.length / itemsPerPage);
  };

  const getPaginationRange = () => {
    const totalPages = getTotalPages();
    const current = currentPage;
    
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (current >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', current - 1, current, current + 1, '...', totalPages];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WireGuard Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor and manage WireGuard VPN infrastructure
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCleanupLeases}
            disabled={cleaningLeases}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              cleaningLeases
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:shadow-md'
            }`}
          >
            {cleaningLeases ? (
              <>
                <span className="w-4 h-4 border-2 border-amber-700/30 border-t-amber-700 rounded-full animate-spin" />
                <span>Cleaning...</span>
              </>
            ) : (
              <>
                <Icon name="delete" className="w-5 h-5" />
                <span>Cleanup Leases</span>
              </>
            )}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              syncing
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/25'
            }`}
          >
            {syncing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Icon name="sync" className="w-5 h-5" />
                <span>Sync</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Health Status Cards */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* WireGuard Status */}
          <div className="group relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  WireGuard Status
                </p>
                <p className={`text-2xl font-bold ${
                  health.wireguard_healthy 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {health.wireguard_healthy ? 'Healthy' : 'Down'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                health.wireguard_healthy
                  ? 'bg-green-50 dark:bg-green-500/10'
                  : 'bg-red-50 dark:bg-red-500/10'
              }`}>
                <Icon name={health.wireguard_healthy ? 'check_circle' : 'error'} className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                health.wireguard_healthy ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs font-medium ${
                health.wireguard_healthy 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {health.wireguard_healthy ? 'Operational' : 'Issues Detected'}
              </span>
            </div>
          </div>

          {/* Active Peers */}
          <div className="group relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Active Peers
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {health.active_peers || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Icon name="devices" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {health.total_devices || 0} in Database
              </span>
            </div>
          </div>

          {/* IP Utilization */}
          <div className="group relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  IP Utilization
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {health.ip_utilization || '0/252'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                <Icon name="insights" className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${health.ip_utilization_percent || 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1 inline-block">
                {health.ip_utilization_percent || 0}% used
              </span>
            </div>
          </div>

          {/* Sync Status */}
          <div className="group relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Sync Status
                </p>
                <p className={`text-2xl font-bold ${
                  health.sync_status === 'synced'
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {health.sync_status === 'synced' ? 'Synced' : 'Out of Sync'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                health.sync_status === 'synced'
                  ? 'bg-green-50 dark:bg-green-500/10'
                  : 'bg-amber-50 dark:bg-amber-500/10'
              }`}>
                <Icon name={health.sync_status === 'synced' ? 'check_circle' : 'warning'} className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                health.sync_status === 'synced' ? 'bg-green-500' : 'bg-amber-500'
              }`} />
              <span className={`text-xs font-medium ${
                health.sync_status === 'synced'
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {health.sync_status === 'synced' ? 'All good' : 'Action Required'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync Issues Alert */}
      {(health?.orphaned_peers > 0 || health?.stale_records > 0) && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Icon name="warning" className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-400">
                Sync Issues Detected
              </h3>
              <div className="mt-2 space-y-1.5 text-sm text-red-700 dark:text-red-500">
                {health?.orphaned_peers > 0 && (
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {health.orphaned_peers} orphaned peer(s) in WireGuard (not in database)
                  </p>
                )}
                {health?.stale_records > 0 && (
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {health.stale_records} stale record(s) in database (not in WireGuard)
                  </p>
                )}
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-4 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25"
              >
                {syncing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Syncing...
                  </span>
                ) : (
                  'Fix Sync Issues'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IP Pool Summary */}
      {ipPool && ipPool.summary && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">IP Pool Summary</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="group text-center p-4 rounded-xl bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {ipPool.summary.active}
                </div>
                <div className="text-xs font-medium text-green-700 dark:text-green-400 mt-1.5 uppercase tracking-wide">
                  Active
                </div>
              </div>
              <div className="group text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {ipPool.summary.stale}
                </div>
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1.5 uppercase tracking-wide">
                  Stale
                </div>
              </div>
              <div className="group text-center p-4 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {ipPool.summary.orphaned}
                </div>
                <div className="text-xs font-medium text-red-700 dark:text-red-400 mt-1.5 uppercase tracking-wide">
                  Orphaned
                </div>
              </div>
              <div className="group text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                  {ipPool.summary.gateway}
                </div>
                <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mt-1.5 uppercase tracking-wide">
                  Gateway
                </div>
              </div>
              <div className="group text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {ipPool.summary.available}
                </div>
                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mt-1.5 uppercase tracking-wide">
                  Available
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IP Pool Table */}
      {ipPool && ipPool.pool && ipPool.pool.length > 0 && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">IP Pool Details</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Showing</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min((currentPage - 1) * itemsPerPage + 1, ipPool.pool.length)}-{Math.min(currentPage * itemsPerPage, ipPool.pool.length)}
              </span>
              <span>of</span>
              <span className="font-medium text-gray-900 dark:text-white">{ipPool.pool.length}</span>
              <span>IPs</span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lease Expires
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {getCurrentPageItems().map((item, index) => (
                  <tr
                    key={item.ip || index}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        {item.ip}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.status === 'active'
                          ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                          : item.status === 'stale'
                          ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : item.status === 'orphaned'
                          ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'active' ? 'bg-green-500'
                          : item.status === 'stale' ? 'bg-amber-500'
                          : item.status === 'orphaned' ? 'bg-red-500'
                          : 'bg-gray-500'
                        }`} />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.device_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-500">
                        {item.user_id ? `${item.user_id.substring(0, 8)}...` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.lease_expires ? (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(item.lease_expires).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {getCurrentPageItems().map((item, index) => (
              <div
                key={item.ip || index}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {item.ip}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.status === 'active'
                          ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                          : item.status === 'stale'
                          ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : item.status === 'orphaned'
                          ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          item.status === 'active' ? 'bg-green-500'
                          : item.status === 'stale' ? 'bg-amber-500'
                          : item.status === 'orphaned' ? 'bg-red-500'
                          : 'bg-gray-500'
                        }`} />
                        {item.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Icon name="devices" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {item.device_name || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Icon name="person" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-500 truncate">
                          {item.user_id ? `${item.user_id.substring(0, 8)}...` : '-'}
                        </span>
                      </div>
                      {item.lease_expires && (
                        <div className="flex items-center gap-1.5">
                          <Icon name="schedule" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(item.lease_expires).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {getTotalPages() > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="flex items-center gap-1.5">
                  {getPaginationRange().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                      className={`min-w-[2.5rem] h-10 rounded-xl text-sm font-medium transition-all duration-200 ${
                        page === currentPage
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : page === '...'
                          ? 'cursor-default'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                  disabled={currentPage === getTotalPages()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Icon name="info" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400">
              WireGuard IP Conflict Prevention
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-blue-700 dark:text-blue-500">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>IP allocation checks both Firestore and WireGuard interface</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>Automatic rollback on failure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>Lease expiry: 30 days (auto-cleanup available)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span>Real-time sync status monitoring</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
