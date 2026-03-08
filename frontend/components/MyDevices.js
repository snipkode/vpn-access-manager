import { useEffect, useState } from 'react';
import { vpnAPI } from '../lib/api';
import { useUIStore } from '../store';

export default function MyDevices({ token }) {
  const { showNotification } = useUIStore();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await vpnAPI.getDevices();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      showNotification(`Failed to load devices: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (deviceId, deviceName) => {
    if (!confirm(`Revoke device "${deviceName}"? This will remove VPN access from this device.`)) {
      return;
    }

    try {
      await vpnAPI.deleteDevice(deviceId);
      showNotification('Device revoked successfully');
      fetchDevices();
    } catch (error) {
      showNotification(`Failed to revoke device: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto">
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark">My Devices</h2>
              <p className="text-sm text-gray-500">Manage your VPN devices</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
            <span className="text-sm font-semibold text-gray-600">{devices.length}/3</span>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl opacity-60">📱</span>
            </div>
            <p className="text-gray-500 text-sm">No devices yet</p>
            <p className="text-gray-400 text-xs mt-1">Add a device from the Dashboard</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device, index) => {
              const deviceKey = device.id || device.device_id || device.public_key || `device-${index}`;
              const displayName = device.device_name || `${device.ip_address || 'Device'}`;

              return (
                <div
                  key={deviceKey}
                  className="group flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                    {getDeviceIcon(displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark truncate">{displayName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 font-mono">{device.ip_address || 'No IP'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                        device.status === 'active' ? 'bg-green-100 text-green-700' :
                        device.status === 'disabled' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {device.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      device.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <button
                      onClick={() => handleRevoke(deviceKey, displayName)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-all"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Active
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              Disabled
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              Revoked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDeviceIcon(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('iphone') || lowerName.includes('ipad')) return '📱';
  if (lowerName.includes('mac')) return '💻';
  if (lowerName.includes('windows')) return '🖥️';
  if (lowerName.includes('android')) return '📲';
  if (lowerName.includes('linux')) return '🐧';
  return '🔌';
}
