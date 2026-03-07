import { useEffect, useState } from 'react';
import { useVpnStore, useSubscriptionStore, useUIStore } from '../store';
import { vpnAPI, billingAPI } from '../lib/api';
import { useRequestPending } from '../components/RequestBlockingOverlay';

export default function Dashboard({ token, userData }) {
  const { devices, setDevices, selectedDevice, setSelectedDevice, updateDeviceConfig } = useVpnStore();
  const { subscription, setSubscription, loading: subLoading } = useSubscriptionStore();
  const { showNotification } = useUIStore();
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [deviceType, setDeviceType] = useState('');
  const [fetchingConfig, setFetchingConfig] = useState(false);
  
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
    fetchData();
  }, []);

  // Fetch device config when selected device changes
  useEffect(() => {
    const deviceId = selectedDevice?.id || selectedDevice?.device_id || selectedDevice?.public_key;
    
    // Only fetch if we have a valid device ID and missing config/qr
    if (deviceId && !selectedDevice?.config && !selectedDevice?.qr) {
      fetchDeviceConfig(deviceId);
    }
  }, [selectedDevice?.id]); // Only depend on ID, not entire object

  const deviceSuggestions = [
    { type: 'iphone', label: 'iPhone', icon: '📱', prefix: 'iPhone' },
    { type: 'android', label: 'Android', icon: '📱', prefix: 'Android' },
    { type: 'ipad', label: 'iPad', icon: '📟', prefix: 'iPad' },
    { type: 'laptop', label: 'Laptop', icon: '💻', prefix: 'Laptop' },
    { type: 'desktop', label: 'Desktop', icon: '🖥️', prefix: 'Desktop' },
  ];

  const selectDeviceType = (type) => {
    setDeviceType(type);
    const suggestion = deviceSuggestions.find(s => s.type === type);
    if (suggestion) {
      // Count existing devices with similar prefix
      const count = devices.filter(d =>
        d.device_name?.toLowerCase().includes(suggestion.prefix.toLowerCase())
      ).length;
      // Generate dynamic name with timestamp
      const timestamp = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/:/g, '');
      setDeviceName(`${suggestion.prefix} ${count + 1} - ${timestamp}`);
    }
  };

  // Generate dynamic placeholder based on existing devices
  const getDynamicPlaceholder = () => {
    const lastDevice = devices[devices.length - 1];
    if (lastDevice?.device_name) {
      return `e.g., ${lastDevice.device_name.replace(/\d+$/, n => parseInt(n) + 1)}`;
    }
    return 'Device name (e.g., iPhone 1, MacBook Pro)';
  };

  const fetchData = async () => {
    try {
      const [devicesData, subData] = await Promise.all([
        vpnAPI.getDevices(),
        billingAPI.getSubscription(),
      ]);
      const devicesWithId = (devicesData.devices || []).map(d => ({
        ...d,
        id: d.id || d.device_id
      }));
      setDevices(devicesWithId);
      setSubscription(subData.subscription || null);
    } catch (error) {
      console.error('🔴 Fetch error:', error);
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
    <div className="max-w-[700px] mx-auto space-y-6">
      {/* Subscription Card */}
      {subscription && !subLoading && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-lg font-semibold text-dark mb-2">
                {subscription.plan_label || subscription.plan || 'No Plan'}
              </div>
              <div className="text-sm">
                {subscription.active ? (
                  <span className="text-success flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Active
                  </span>
                ) : (
                  <span className="text-gray-400">Inactive</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {subscription.days_remaining}
                <span className="text-sm font-normal text-gray-400 ml-1">days</span>
              </div>
            </div>
          </div>
          {subscription.subscription_end && (
            <div className="text-xs text-gray-400 pt-3 border-t border-gray-100">
              Expires {new Date(subscription.subscription_end).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </div>
          )}
        </div>
      )}

      {/* VPN Configuration */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-dark mb-4">VPN Configuration</h2>

        {!userData?.vpn_enabled ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <span className="text-4xl mb-3 block">⚠️</span>
            <div className="text-base font-semibold text-dark mb-1">VPN Access Disabled</div>
            <div className="text-sm text-gray-500">Contact admin to enable VPN access</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Device Type Quick Select */}
            <div className="flex flex-wrap gap-2">
              {deviceSuggestions.map((suggestion) => (
                <button
                  key={suggestion.type}
                  onClick={() => selectDeviceType(suggestion.type)}
                  disabled={devices.length >= 3 || generatingVpn}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    deviceType === suggestion.type
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${devices.length >= 3 || generatingVpn ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.label}</span>
                </button>
              ))}
            </div>

            {/* Device Name Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => {
                  setDeviceName(e.target.value);
                  setDeviceType('');
                }}
                placeholder={getDynamicPlaceholder()}
                disabled={devices.length >= 3 || generatingVpn}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 transition-all"
              />
              <button
                onClick={generateConfig}
                disabled={generatingVpn || devices.length >= 3 || !deviceName.trim()}
                className={`w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl text-base font-semibold whitespace-nowrap transition-all ${
                  generatingVpn || devices.length >= 3
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-primary/90 active:scale-95'
                }`}
              >
                {generatingVpn ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </span>
                ) : devices.length >= 3 ? 'Limit Reached' : 'Add Device'}
              </button>
            </div>
            {devices.length < 3 && (
              <p className="text-xs text-gray-400">You can add up to {3 - devices.length} more device(s)</p>
            )}
          </div>
        )}
      </div>

      {/* Devices List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-dark">My Devices</h2>
          <span className="text-sm text-gray-400 font-medium">{devices.length}/3</span>
        </div>

        {devices.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-10 text-center">
            <span className="text-5xl mb-4 block opacity-50">📱</span>
            <div className="text-base font-semibold text-dark mb-1">No devices yet</div>
            <div className="text-sm text-gray-400">Add your first device above</div>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device, index) => {
              // Fallback key: use device_id, public_key, or index
              const deviceKey = device.id || device.device_id || device.public_key || `device-${index}`;
              
              // Get device name with proper fallback
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
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98]"
                  data-device-id={deviceKey}
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                    {getDeviceIcon(displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-dark truncate">{displayName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="text-xs text-gray-400 font-mono">{device.ip_address || 'No IP'}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        device.status === 'active' ? 'bg-green-100 text-green-600' : 
                        device.status === 'disabled' ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {device.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${device.status === 'active' ? 'bg-success' : 'bg-gray-300'}`} />
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

// Device Modal Component
function DeviceModal({ device, onClose, onRevoke, onDownload, fetchingConfig }) {
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-3xl w-full max-w-lg p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-5xl mb-4">⚠️</div>
          <div className="text-lg font-semibold text-dark mb-2">Device ID Missing</div>
          <div className="text-sm text-gray-500">Unable to load device details. Please try again.</div>
          <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl font-medium">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div>
            <div className="text-lg font-semibold text-dark">{displayName}</div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">{device.ip_address || 'No IP'}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-dark text-xl p-1 transition-colors">✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 sticky top-[73px] bg-white">
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'qrcode'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📱 QR Code
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'config'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ⚙️ Config
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === 'guide'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📖 Panduan
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Device Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Status" value={device.status} active={device.status === 'active'} />
            <InfoCard label="Created" value={new Date(device.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
          </div>

          {/* QR Code Tab */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4">
              {fetchingConfig ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <div className="text-sm text-gray-500">Loading configuration...</div>
                </div>
              ) : device.qr ? (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center border border-gray-200">
                  <div className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">Scan to Connect</div>
                  <div className="flex justify-center">
                    {/* QR Code Container - Force square with aspect-ratio */}
                    <div 
                      className="bg-white p-2 sm:p-3 rounded-2xl shadow-md"
                      style={{
                        maxWidth: '220px',
                        width: '100%',
                        aspectRatio: '1/1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: '95%',
                          height: '95%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: device.qr
                            .replace(/<svg/, '<svg style="max-width: 100%; max-height: 100%; width: auto; height: auto;" preserveAspectRatio="xMidYMid meet"')
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-4">
                    Use WireGuard app to scan this QR code
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="text-5xl mb-3">⚠️</div>
                  <div className="text-sm text-gray-500">QR Code not available</div>
                </div>
              )}
            </div>
          )}

          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="space-y-3">
              {fetchingConfig ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <div className="text-sm text-gray-500">Loading configuration...</div>
                </div>
              ) : device.config ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Configuration File</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(device.config);
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-green-400 overflow-auto max-h-80 leading-relaxed">
                    {device.config}
                  </pre>
                </>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="text-5xl mb-3">📄</div>
                  <div className="text-sm text-gray-500">Configuration not available</div>
                </div>
              )}
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-blue-800 mb-2">📥 Step 1: Download WireGuard App</div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Download dan install aplikasi WireGuard dari App Store (iOS), Google Play Store (Android),
                  atau website resmi WireGuard untuk desktop.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-green-800 mb-2">📱 Step 2: Scan QR Code / Import Config</div>
                <p className="text-xs text-green-700 leading-relaxed">
                  <strong>Mobile:</strong> Buka aplikasi WireGuard, tap "+" dan pilih "Scan from QR code".<br />
                  <strong>Desktop:</strong> Buka aplikasi WireGuard, pilih "Import tunnel from file" dan download config dari tab Config.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-purple-800 mb-2">🔌 Step 3: Connect to VPN</div>
                <p className="text-xs text-purple-700 leading-relaxed">
                  Setelah konfigurasi berhasil diimport, tap tombol power/connect di aplikasi WireGuard
                  untuk mulai menggunakan VPN.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-amber-800 mb-2">💡 Tips</div>
                <ul className="text-xs text-amber-700 leading-relaxed space-y-1">
                  <li>• Pastikan koneksi internet aktif saat connect</li>
                  <li>• VPN akan aktif hingga Anda disconnect manual</li>
                  <li>• Anda bisa menambahkan maksimal 3 devices</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-3xl">
          {/* Show Download button only if config is available */}
          {device.config && !fetchingConfig && (
            <button
              onClick={onDownload}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-primary rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              <i className="fas fa-download" />
              Download
            </button>
          )}
          
          {/* Show Disable/Reactivate based on status */}
          {device.status === 'disabled' ? (
            <button
              onClick={onReactivate}
              disabled={reactivatingDevice || fetchingConfig}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-green-600 rounded-xl font-semibold hover:bg-green-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reactivatingDevice ? (
                <span className="w-4 h-4 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
              ) : (
                <i className="fas fa-check-circle" />
              )}
              {reactivatingDevice ? 'Reactivating...' : 'Reactivate'}
            </button>
          ) : device.status === 'active' ? (
            <button
              onClick={onDisable}
              disabled={disablingDevice || fetchingConfig}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-600 rounded-xl font-semibold hover:bg-amber-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disablingDevice ? (
                <span className="w-4 h-4 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
              ) : (
                <i className="fas fa-pause-circle" />
              )}
              {disablingDevice ? 'Disabling...' : 'Disable'}
            </button>
          ) : null}
          
          {/* Hard Remove button - always show for revoked or active devices */}
          <button
            onClick={onRevoke}
            disabled={deletingDevice || fetchingConfig}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingDevice ? (
              <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <i className="fas fa-trash" />
            )}
            {deletingDevice ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, active = false }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${active ? 'text-success' : 'text-dark'}`}>
        {active && <span className="inline-block w-2 h-2 rounded-full bg-success mr-1.5" />}
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
