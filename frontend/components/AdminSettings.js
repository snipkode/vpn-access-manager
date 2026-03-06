import { useState } from 'react';
import { useUIStore, apiFetch } from '../store';

export default function AdminSettings({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [whatsapp, setWhatsapp] = useState({ enabled: false, api_url: '', session_id: '' });

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiFetch('/admin/settings/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsapp),
      });
      showNotification('WhatsApp settings saved');
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-dark mb-6">WhatsApp Settings</h1>

        <div className="space-y-5">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <div>
              <div className="text-base font-semibold text-dark">WhatsApp Notifications</div>
              <div className="text-sm text-gray-medium mt-0.5">Enable WhatsApp notifications</div>
            </div>
            <button
              onClick={() => setWhatsapp(s => ({ ...s, enabled: !s.enabled }))}
              className={`px-5 py-2 rounded-full text-sm font-semibold ${
                whatsapp.enabled ? 'bg-success text-white' : 'bg-gray-200 text-gray-medium'
              }`}
            >
              {whatsapp.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-2">API URL</label>
            <input
              type="text"
              value={whatsapp.api_url}
              onChange={(e) => setWhatsapp(s => ({ ...s, api_url: e.target.value }))}
              placeholder="https://api.whatsapp.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-2">Session ID</label>
            <input
              type="text"
              value={whatsapp.session_id}
              onChange={(e) => setWhatsapp(s => ({ ...s, session_id: e.target.value }))}
              placeholder="session_123"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full mt-6 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
