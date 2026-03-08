import { useEffect, useState } from 'react';
import { useVpnStore, useUIStore } from '../store';
import { vpnAPI, billingAPI } from '../lib/api';
import { useRequestPending } from '../components/RequestBlockingOverlay';

export default function Dashboard({ token, userData }) {
  const { devices, setDevices, selectedDevice, setSelectedDevice, updateDeviceConfig } = useVpnStore();
  const { showNotification, setActivePage } = useUIStore();
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

  // Use request pending hook for generate VPN
  const generatingVpn = useRequestPending('generate_vpn');

  // Debug logging
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔵 Dashboard - devices:', devices.length, 'selectedDevice:', selectedDevice?.device_name);
    }
  }, [devices, selectedDevice]);

  useEffect(() => {
    console.log('🔑 Dashboard token:', token ? '✅ Present' : '❌ Missing');
    console.log('👤 Dashboard userData:', userData);
    
    if (token) {
      fetchData();
    } else {
      console.warn('⚠️ No token available, skipping fetch');
      setLoading(false);
    }
  }, [token]);

  // Fetch device config when selected device changes
  useEffect(() => {
    const deviceId = selectedDevice?.id || selectedDevice?.device_id || selectedDevice?.public_key;
    
    // Only fetch if we have a valid device ID and missing config/qr
    if (deviceId && !selectedDevice?.config && !selectedDevice?.qr) {
      fetchDeviceConfig(deviceId);
    }
  }, [selectedDevice?.id]); // Only depend on ID, not entire object

  // Generate dynamic placeholder based on existing devices
  const getDynamicPlaceholder = () => {
    const lastDevice = devices[devices.length - 1];
    if (lastDevice?.device_name) {
      return `e.g., ${lastDevice.device_name.replace(/\d+$/, n => parseInt(n) + 1)}`;
    }
    return 'Device name (e.g., iPhone 1)';
  };

  const fetchData = async () => {
    try {
      const [devicesData, subData] = await Promise.all([
        vpnAPI.getDevices(),
        billingAPI.getSubscription(),
      ]);
      console.log('✅ Devices data:', devicesData);
      console.log('✅ Subscription data:', subData);
      const devicesWithId = (devicesData.devices || []).map(d => ({
        ...d,
        id: d.id || d.device_id
      }));
      setDevices(devicesWithId);
      setSubscription(subData.subscription || null);
      setSubLoading(false);
    } catch (error) {
      console.error('🔴 Fetch error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      showNotification(`Failed to load data: ${error.message}`, 'error');
      setSubLoading(false);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceConfig = async (deviceId) => {
    if (!deviceId) {
      console.error('🔴 No device ID provided');
      return;
    }

    setFetchingConfig(true);
    try {
      const data = await vpnAPI.getDevice(deviceId);
      const updatedDevice = {
        id: data.device_id || data.id || deviceId,
        device_name: data.device_name,
        ip_address: data.ip_address,
        public_key: data.public_key,
        config: data.config,
        qr: data.qr,
        status: data.status,
        created_at: data.created_at,
      };
      
      updateDeviceConfig(deviceId, data.config, data.qr);
      setSelectedDevice(updatedDevice);
    } catch (error) {
      console.error('🔴 Failed to fetch device config:', error);
      showNotification('Failed to load device configuration', 'error');
    } finally {
      setFetchingConfig(false);
    }
  };

  const generateConfig = async () => {
    if (!deviceName.trim()) {
      showNotification('Please enter a device name', 'error');
      return;
    }

    try {
      const data = await vpnAPI.generateConfig(deviceName);
      showNotification('Device added successfully!');
      setDeviceName('');
      setSelectedDevice({
        ...data,
        isNew: true,
        id: data.device_id || data.id,
        device_name: data.device_name || deviceName
      });
      fetchData();
    } catch (error) {
      console.error('🔴 Generate config error:', error);
      if (error.code === 'RATE_LIMIT' || error.status === 429) {
        showNotification(
          `⏱️ Too many attempts. Please wait ${error.retryAfter || 30} seconds.`,
          'error'
        );
      } else if (error.message.includes('rate limit')) {
        showNotification(
          '⏱️ Rate limit exceeded. Please slow down and try again.',
          'error'
        );
      } else {
        showNotification(error.message || 'Failed to generate config', 'error');
      }
    }
  };

  const revokeDevice = async (deviceId) => {
    try {
      await vpnAPI.deleteDevice(deviceId);
      showNotification('Device removed');
      setSelectedDevice(null);
      fetchData();
    } catch (error) {
      if (error.code === 'RATE_LIMIT' || error.status === 429) {
        showNotification(
          `⏱️ Too many attempts. Please wait ${error.retryAfter || 30} seconds.`,
          'error'
        );
      } else if (error.message.includes('rate limit')) {
        showNotification(
          '⏱️ Rate limit exceeded. Please slow down and try again.',
          'error'
        );
      } else {
        showNotification(error.message || 'Failed to remove device', 'error');
      }
    }
  };

  const disableDevice = async (deviceId) => {
    try {
      await vpnAPI.disableDevice(deviceId);
      showNotification('Device disabled - VPN access suspended');
      setSelectedDevice(null);
      fetchData();
    } catch (error) {
      if (error.code === 'RATE_LIMIT' || error.status === 429) {
        showNotification(
          `⏱️ Too many attempts. Please wait ${error.retryAfter || 30} seconds.`,
          'error'
        );
      } else {
        showNotification(error.message || 'Failed to disable device', 'error');
      }
    }
  };

  const reactivateDevice = async (deviceId) => {
    try {
      await vpnAPI.reactivateDevice(deviceId);
      showNotification('Device reactivated - VPN access restored');
      setSelectedDevice(null);
      fetchData();
    } catch (error) {
      if (error.code === 'RATE_LIMIT' || error.status === 429) {
        showNotification(
          `⏱️ Too many attempts. Please wait ${error.retryAfter || 30} seconds.`,
          'error'
        );
      } else {
        showNotification(error.message || 'Failed to reactivate device', 'error');
      }
    }
  };

  const downloadConfig = (config, name) => {
    const safeName = name?.replace(/\s+/g, '-').toLowerCase() || 'vpn-config';
    const filename = `${safeName}.conf`;
    
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.setAttribute('download', filename);
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto space-y-4 sm:space-y-5 px-4 sm:px-0">
      {/* Subscription Card - iOS Style */}
      {subscription && !subLoading && (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#1C1C1E] dark:to-[#151516] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-base sm:text-lg font-semibold text-dark dark:text-white tracking-tight">
                {subscription.plan_label || subscription.plan || 'No Plan'}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  subscription.active 
                    ? 'bg-green-100/80 dark:bg-green-500/15 text-green-700 dark:text-green-400' 
                    : 'bg-gray-100/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${subscription.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {subscription.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {subscription.days_remaining}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">days left</div>
            </div>
          </div>
          {subscription.subscription_end && (
            <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-100/60 dark:border-[#38383A]/60">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Expires</span>
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                {new Date(subscription.subscription_end).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add New Device - iOS Style */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary-600/20 dark:to-primary-600/5 flex items-center justify-center">
            <span className="text-lg">📱</span>
          </div>
          <h2 className="text-base font-semibold text-dark dark:text-white tracking-tight">Add New Device</h2>
        </div>

        {!subscription || !subscription.active ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-8 text-center border border-gray-200/50 dark:border-[#38383A]/50">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="text-sm font-semibold text-dark dark:text-white mb-1.5">Subscription Required</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">Subscribe to add new devices to your account</div>
            <button
              onClick={() => setActivePage('payment')}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 dark:from-primary-600 dark:to-primary-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              Subscribe Now
            </button>
          </div>
        ) : !userData?.vpn_enabled ? (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-500/10 dark:to-amber-500/5 rounded-2xl p-8 text-center border border-amber-200/50 dark:border-amber-200/20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-sm font-semibold text-dark dark:text-white mb-1.5">VPN Access Disabled</div>
            <div className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">Contact admin to enable VPN access</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={getDynamicPlaceholder()}
                disabled={devices.length >= 3 || generatingVpn}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200/60 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:bg-gray-100 dark:disabled:bg-[#1C1C1E]/50 disabled:opacity-60 transition-all duration-200"
              />
              <button
                onClick={generateConfig}
                disabled={generatingVpn || devices.length >= 3 || !deviceName.trim()}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  generatingVpn || devices.length >= 3
                    ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-primary/90 dark:from-primary-600 dark:to-primary-500 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
                }`}
              >
                {generatingVpn ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </span>
                ) : devices.length >= 3 ? 'Limit Reached' : (
                  <span className="flex items-center justify-center gap-1.5">
                    <span>+</span>
                    <span>Add Device</span>
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-1 bg-gray-100 dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
                  style={{ width: `${(devices.length / 3) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{devices.length}/3</span>
            </div>
          </div>
        )}
      </div>

      {/* Devices List - iOS Style */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <h2 className="text-base font-semibold text-dark dark:text-white tracking-tight">My Devices</h2>
          </div>
          <div className="px-2.5 py-1.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-lg">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{devices.length}/3</span>
          </div>
        </div>

        {!subscription || !subscription.active ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-8 text-center border border-gray-200/50 dark:border-[#38383A]/50">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="text-sm font-semibold text-dark dark:text-white mb-1.5">Subscription Required</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">Subscribe to view and manage your devices</div>
            <button
              onClick={() => setActivePage('payment')}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 dark:from-primary-600 dark:to-primary-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              Subscribe Now
            </button>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-10 text-center border border-gray-200/50 dark:border-[#38383A]/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
              <span className="text-3xl opacity-60">📱</span>
            </div>
            <div className="text-sm font-semibold text-dark dark:text-white mb-1.5">No devices yet</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Add your first device above to get started</div>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device, index) => {
              const deviceKey = device.id || device.device_id || device.public_key || `device-${index}`;
              const displayName = device.device_name
                ? device.device_name.trim()
                : `${device.ip_address || 'Device'} ${index + 1}`;

              return (
                <div
                  key={deviceKey}
                  onClick={() => {
                    const deviceWithId = {
                      ...device,
                      id: device.id || device.device_id || device.public_key,
                      device_name: displayName,
                    };
                    setSelectedDevice(deviceWithId);
                  }}
                  className="group flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-[#2C2C2E]/80 rounded-xl border border-gray-100/60 dark:border-[#38383A] cursor-pointer hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-md hover:shadow-primary/5 active:scale-[0.98] transition-all duration-200"
                  data-device-id={deviceKey}
                >
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                    {getDeviceIcon(displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark dark:text-white truncate">{displayName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{device.ip_address || 'No IP'}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        device.status === 'active' ? 'bg-green-100/80 dark:bg-green-500/15 text-green-600 dark:text-green-400' :
                        device.status === 'disabled' ? 'bg-amber-100/80 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                        'bg-gray-100/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                      }`}>
                        {device.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      device.status === 'active' ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className="text-gray-300 dark:text-gray-600 group-hover:text-primary/60 transition-colors">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Device Modal */}
      {selectedDevice && (
        <DeviceModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRevoke={() => {
            const deviceId = selectedDevice.id || selectedDevice.device_id || selectedDevice.public_key;
            if (deviceId) {
              revokeDevice(deviceId);
            } else {
              showNotification('Device ID not found', 'error');
            }
          }}
          onDisable={() => {
            const deviceId = selectedDevice.id || selectedDevice.device_id || selectedDevice.public_key;
            if (deviceId) {
              disableDevice(deviceId);
            } else {
              showNotification('Device ID not found', 'error');
            }
          }}
          onReactivate={() => {
            const deviceId = selectedDevice.id || selectedDevice.device_id || selectedDevice.public_key;
            if (deviceId) {
              reactivateDevice(deviceId);
            } else {
              showNotification('Device ID not found', 'error');
            }
          }}
          onDownload={() => {
            if (selectedDevice.config) {
              downloadConfig(selectedDevice.config, selectedDevice.device_name || selectedDevice.ip_address || 'vpn-config');
            }
          }}
          fetchingConfig={fetchingConfig}
        />
      )}
    </div>
  );
}

// Device Modal Component - iOS Style
function DeviceModal({ device, onClose, onRevoke, onDisable, onReactivate, onDownload, fetchingConfig }) {
  const [activeTab, setActiveTab] = useState('qrcode');
  const deletingDevice = useRequestPending('delete_vpn_device');
  const disablingDevice = useRequestPending('disable_vpn_device');
  const reactivatingDevice = useRequestPending('reactivate_vpn_device');

  // Get device ID and name with fallbacks
  const deviceId = device.id || device.device_id || device.public_key;
  const displayName = device.device_name?.trim()
    ? device.device_name
    : `${device.ip_address || 'Device'}`;

  if (!deviceId) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[28px] w-full max-w-lg p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="text-lg font-semibold text-dark dark:text-white mb-2">Device ID Missing</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">Unable to load device details. Please try again.</div>
          <button onClick={onClose} className="w-full px-6 py-3.5 bg-gradient-to-r from-primary to-primary/90 dark:from-primary-600 dark:to-primary-500 text-white rounded-xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1C1C1E] rounded-[28px] w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - iOS Style */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100/60 dark:border-[#38383A]/60 sticky top-0 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-t-[28px] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary-600/20 dark:to-primary-600/5 flex items-center justify-center">
              <span className="text-lg">{getDeviceIcon(displayName)}</span>
            </div>
            <div>
              <div className="text-base font-semibold text-dark dark:text-white">{displayName}</div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{device.ip_address || 'No IP'}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center text-gray-400 hover:text-dark dark:hover:text-white transition-colors">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Tab Navigation - iOS Style */}
        <div className="flex gap-1.5 p-1.5 mx-5 mt-5 bg-gray-100/80 dark:bg-[#2C2C2E] rounded-xl sticky top-[73px] bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl z-10">
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'qrcode'
                ? 'bg-white dark:bg-[#1C1C1E] text-primary shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>📱</span>
            <span>QR</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'config'
                ? 'bg-white dark:bg-[#1C1C1E] text-primary shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>⚙️</span>
            <span>Config</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-[#1C1C1E] text-primary shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span>📖</span>
            <span>Guide</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Device Info - iOS Style */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Status" value={device.status} active={device.status === 'active'} />
            <InfoCard label="Created" value={new Date(device.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
          </div>

          {/* QR Code Tab */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4">
              {fetchingConfig ? (
                <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl p-10 text-center">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading configuration...</div>
                </div>
              ) : device.qr ? (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-6 sm:p-8 text-center border border-gray-200/50 dark:border-[#38383A]/50">
                  <div className="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">Scan to Connect</div>
                  <div className="flex justify-center">
                    {/* QR Code PNG - 200x200px with object-fit contain */}
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/30 border-2 border-gray-300 dark:border-gray-600">
                      <img
                        src={device.qr}
                        alt="WireGuard QR Code"
                        className="block"
                        style={{ 
                          width: '200px', 
                          height: '200px', 
                          objectFit: 'contain',
                          objectPosition: 'center'
                        }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">
                      📱 Use WireGuard App to Scan
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Open WireGuard app → Tap "+" → Select "Scan from QR code"
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">QR Code not available</div>
                </div>
              )}
            </div>
          )}

          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="space-y-3">
              {fetchingConfig ? (
                <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl p-10 text-center">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading configuration...</div>
                </div>
              ) : device.config ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuration File</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(device.config);
                      }}
                      className="text-xs text-primary hover:text-primary/80 dark:text-primary-400 font-semibold flex items-center gap-1"
                    >
                      <span>📋</span>
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="bg-gray-900 dark:bg-black/40 rounded-xl p-4 text-xs font-mono text-green-400 overflow-auto max-h-80 leading-relaxed border border-gray-800">
                    {device.config}
                  </pre>
                </>
              ) : (
                <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
                    <span className="text-3xl">📄</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Configuration not available</div>
                </div>
              )}
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-500/10 dark:to-blue-500/5 border border-blue-200/50 dark:border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-sm">1</div>
                  <div className="text-sm font-semibold text-blue-800 dark:text-blue-400">Download WireGuard App</div>
                </div>
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed pl-9">
                  Download dan install aplikasi WireGuard dari App Store (iOS), Google Play Store (Android),
                  atau website resmi WireGuard untuk desktop.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/60 dark:from-green-500/10 dark:to-green-500/5 border border-green-200/50 dark:border-green-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center text-sm">2</div>
                  <div className="text-sm font-semibold text-green-800 dark:text-green-400">Scan QR Code / Import Config</div>
                </div>
                <p className="text-xs text-green-700/80 dark:text-green-300/80 leading-relaxed pl-9">
                  <strong>Mobile:</strong> Buka aplikasi WireGuard, tap "+" dan pilih "Scan from QR code".<br />
                  <strong>Desktop:</strong> Buka aplikasi WireGuard, pilih "Import tunnel from file" dan download config dari tab Config.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-500/10 dark:to-purple-500/5 border border-purple-200/50 dark:border-purple-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-sm">3</div>
                  <div className="text-sm font-semibold text-purple-800 dark:text-purple-400">Connect to VPN</div>
                </div>
                <p className="text-xs text-purple-700/80 dark:text-purple-300/80 leading-relaxed pl-9">
                  Setelah konfigurasi berhasil diimport, tap tombol power/connect di aplikasi WireGuard
                  untuk mulai menggunakan VPN.
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-500/10 dark:to-amber-500/5 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-sm">💡</div>
                  <div className="text-sm font-semibold text-amber-800 dark:text-amber-400">Tips</div>
                </div>
                <ul className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed space-y-1 pl-9">
                  <li>• Pastikan koneksi internet aktif saat connect</li>
                  <li>• VPN akan aktif hingga Anda disconnect manual</li>
                  <li>• Anda bisa menambahkan maksimal 3 devices</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Actions - iOS Style */}
        <div className="flex gap-2.5 p-5 pt-2 border-t border-gray-100/60 dark:border-[#38383A]/60 sticky bottom-0 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-b-[28px]">
          {/* Download Config Button - Modern iOS Style */}
          {device.config && !fetchingConfig && (
            <button
              onClick={onDownload}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-[#007AFF] to-blue-500 hover:from-[#0056CC] hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-[#007AFF]/30 hover:shadow-xl hover:shadow-[#007AFF]/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="download" variant="round" size="small" className="text-white" />
              <span>Download Config</span>
            </button>
          )}

          {/* Show Disable/Reactivate based on status */}
          {device.status === 'disabled' ? (
            <button
              onClick={onReactivate}
              disabled={reactivatingDevice || fetchingConfig}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reactivatingDevice ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon name="check_circle" variant="round" size="small" className="text-white" />
              )}
              {reactivatingDevice ? '...' : 'Reactivate'}
            </button>
          ) : device.status === 'active' ? (
            <button
              onClick={onDisable}
              disabled={disablingDevice || fetchingConfig}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disablingDevice ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon name="pause_circle" variant="round" size="small" className="text-white" />
              )}
              {disablingDevice ? '...' : 'Disable'}
            </button>
          ) : null}

          {/* Hard Remove button - always show for revoked or active devices */}
          <button
            onClick={onRevoke}
            disabled={deletingDevice || fetchingConfig}
            className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingDevice ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon name="delete" variant="round" size="small" className="text-white" />
            )}
            {deletingDevice ? '...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, active = false }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-xl p-3.5 text-center border border-gray-200/50 dark:border-[#38383A]/50">
      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`text-sm font-semibold flex items-center justify-center gap-1.5 ${active ? 'text-green-600 dark:text-green-400' : 'text-dark dark:text-white'}`}>
        {active && <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />}
        {value}
      </div>
    </div>
  );
}

function getDeviceIcon(name) {
  const lower = name.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android')) return '📱';
  if (lower.includes('ipad') || lower.includes('tablet')) return '📟';
  return '💻';
}
