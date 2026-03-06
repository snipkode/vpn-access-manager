import { useEffect, useState } from 'react';
import { useVpnStore, useSubscriptionStore, useUIStore } from '../store';
import { vpnAPI, billingAPI } from '../lib/api';

export default function Dashboard({ token, userData }) {
  const { devices, setDevices, selectedDevice, setSelectedDevice, generating, setGenerating } = useVpnStore();
  const { subscription, setSubscription, loading: subLoading } = useSubscriptionStore();
  const { showNotification } = useUIStore();
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [devicesData, subData] = await Promise.all([
        vpnAPI.getDevices(),
        billingAPI.getSubscription(),
      ]);
      setDevices(devicesData.devices || []);
      setSubscription(subData.subscription || null);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateConfig = async () => {
    if (!deviceName.trim()) {
      showNotification('Please enter a device name', 'error');
      return;
    }

    setGenerating(true);
    try {
      const data = await vpnAPI.generateConfig(deviceName);
      showNotification('Device added successfully!');
      setDeviceName('');
      setSelectedDevice({ ...data, isNew: true });
      fetchData();
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const revokeDevice = async (deviceId) => {
    try {
      await vpnAPI.deleteDevice(deviceId);
      showNotification('Device removed');
      setSelectedDevice(null);
      fetchData();
    } catch (error) {
      showNotification('Failed to remove device', 'error');
    }
  };

  const downloadConfig = (config, name) => {
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vpn-${name.replace(/\s+/g, '-').toLowerCase()}.conf`;
    a.click();
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
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Device name (e.g., iPhone, MacBook)"
                disabled={devices.length >= 3 || generating}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 transition-all"
              />
              <button
                onClick={generateConfig}
                disabled={generating || devices.length >= 3 || !deviceName.trim()}
                className={`w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl text-base font-semibold whitespace-nowrap transition-all ${
                  generating || devices.length >= 3 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-primary/90 active:scale-95'
                }`}
              >
                {generating ? (
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
            {devices.map((device) => (
              <div
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                  {getDeviceIcon(device.device_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-dark truncate">{device.device_name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{device.ip_address}</div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${device.status === 'active' ? 'bg-success' : 'bg-gray-300'}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device Modal */}
      {selectedDevice && (
        <DeviceModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRevoke={() => revokeDevice(selectedDevice.id)}
          onDownload={() => downloadConfig(selectedDevice.config, selectedDevice.device_name)}
        />
      )}
    </div>
  );
}

// Device Modal Component
function DeviceModal({ device, onClose, onRevoke, onDownload }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-auto shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="text-lg font-semibold text-dark">{device.device_name}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-dark text-xl p-1 transition-colors">✕</button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <InfoRow label="IP Address" value={device.ip_address} />
          <InfoRow label="Status" value={device.status} />
          <InfoRow label="Created" value={new Date(device.created_at).toLocaleDateString()} />

          {device.qr && (
            <div className="bg-gray-50 rounded-xl p-5 text-center">
              <div className="text-sm text-gray-400 mb-3">Scan to Connect</div>
              <div className="inline-block bg-white p-3 rounded-lg shadow-sm" dangerouslySetInnerHTML={{ __html: device.qr }} />
            </div>
          )}

          {device.config && (
            <div>
              <div className="text-sm text-gray-400 mb-2">Configuration</div>
              <pre className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-green-400 overflow-auto max-h-60 leading-relaxed">
                {device.config}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-3xl">
          {device.config && (
            <button 
              onClick={onDownload} 
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-primary rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-download" />
              Download
            </button>
          )}
          <button 
            onClick={onRevoke} 
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors"
          >
            <i className="fas fa-trash" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-dark font-medium">{value}</span>
    </div>
  );
}

function getDeviceIcon(name) {
  const lower = name.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android')) return '📱';
  if (lower.includes('ipad') || lower.includes('tablet')) return '📟';
  return '💻';
}
