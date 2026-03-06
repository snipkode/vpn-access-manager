import { useState, useEffect } from 'react';
import { useUIStore, apiFetch } from '../store';

export default function Settings() {
  const { showNotification } = useUIStore();
  const [settings, setSettings] = useState({
    billing_enabled: false,
    max_devices: 3,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/admin/settings');
      setSettings(data.settings || data);
    } catch (error) {
      // Settings might not be available for non-admin
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiFetch('/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      showNotification('Settings saved');
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-dark mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Billing System */}
          <div className="flex justify-between items-center py-4 border-b border-gray-100">
            <div className="flex-1">
              <label className="block text-base font-semibold text-dark mb-1">Billing System</label>
              <p className="text-sm text-gray-400">Enable or disable payment features</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, billing_enabled: !s.billing_enabled }))}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                settings.billing_enabled 
                  ? 'bg-success text-white shadow-lg shadow-success/30' 
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {settings.billing_enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Max Devices */}
          <div className="flex justify-between items-center py-4 border-b border-gray-100">
            <div className="flex-1">
              <label className="block text-base font-semibold text-dark mb-1">Max Devices per User</label>
              <p className="text-sm text-gray-400">Maximum VPN devices allowed</p>
            </div>
            <input
              type="number"
              value={settings.max_devices}
              onChange={(e) => setSettings(s => ({ ...s, max_devices: parseInt(e.target.value) }))}
              className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm text-center font-semibold"
              min="1"
              max="10"
            />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full mt-8 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>

        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-sm text-amber-700 leading-relaxed flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>Note: Some settings require admin privileges.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
