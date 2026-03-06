import { useEffect, useState } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { notificationsAPI } from '../lib/api';

export default function Notifications({ token }) {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [preferences, setPreferences] = useState({
    whatsapp_enabled: true,
    email_enabled: true,
    low_balance_alert: true,
    expiring_soon_alert: true,
    payment_approved_alert: true,
    payment_rejected_alert: true,
    language: 'en',
    timezone: 'Asia/Jakarta',
  });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prefsData, notificationsData] = await Promise.all([
        notificationsAPI.getNotifications(),
        notificationsAPI.getHistory().catch(() => ({ notifications: [] })),
      ]);
      setPreferences(prefsData.preferences || preferences);
      setNotifications(notificationsData.notifications || []);
    } catch (error) {
      // Continue even if notifications history fails
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await notificationsAPI.updatePreferences(preferences);
      showNotification('Notification preferences saved');
    } catch (error) {
      showNotification(error.message || 'Failed to save preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      {/* Preferences */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-dark mb-6">Notification Preferences</h1>

        <div className="space-y-4">
          <ToggleRow
            label="WhatsApp Notifications"
            description="Receive notifications via WhatsApp"
            icon="📱"
            enabled={preferences.whatsapp_enabled}
            onChange={(value) => setPreferences({ ...preferences, whatsapp_enabled: value })}
          />
          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            icon="📧"
            enabled={preferences.email_enabled}
            onChange={(value) => setPreferences({ ...preferences, email_enabled: value })}
          />
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Alert Types</h2>
          <div className="space-y-4">
            <ToggleRow
              label="Low Balance Alert"
              description="Get notified when balance is low"
              icon="⚠️"
              enabled={preferences.low_balance_alert}
              onChange={(value) => setPreferences({ ...preferences, low_balance_alert: value })}
            />
            <ToggleRow
              label="Expiring Soon Alert"
              description="Get notified before subscription expires"
              icon="⏰"
              enabled={preferences.expiring_soon_alert}
              onChange={(value) => setPreferences({ ...preferences, expiring_soon_alert: value })}
            />
            <ToggleRow
              label="Payment Approved Alert"
              description="Get notified when payment is approved"
              icon="✅"
              enabled={preferences.payment_approved_alert}
              onChange={(value) => setPreferences({ ...preferences, payment_approved_alert: value })}
            />
            <ToggleRow
              label="Payment Rejected Alert"
              description="Get notified when payment is rejected"
              icon="❌"
              enabled={preferences.payment_rejected_alert}
              onChange={(value) => setPreferences({ ...preferences, payment_rejected_alert: value })}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Language
              </label>
              <select
                value={preferences.language || 'en'}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Timezone
              </label>
              <select
                value={preferences.timezone || 'Asia/Jakarta'}
                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="Asia/Jakarta">WIB (Jakarta)</option>
                <option value="Asia/Makassar">WITA (Makassar)</option>
                <option value="Asia/Jayapura">WIT (Jayapura)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Notification History */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-dark mb-4">Notification History</h2>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="text-2xl flex-shrink-0">
                  {getNotifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-dark mb-1">{notif.title}</div>
                  <div className="text-sm text-gray-500">{notif.message}</div>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(notif.sent_at).toLocaleString('id-ID')}
                  </div>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-700 leading-relaxed flex items-start gap-2">
          <span className="text-lg">ℹ️</span>
          <span>
            Notifications will be sent to your connected WhatsApp number and email address. 
            Make sure both are properly configured in your profile.
          </span>
        </p>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange, icon }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-dark">{label}</div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
          enabled
            ? 'bg-success text-white shadow-lg shadow-success/30'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

function getNotifIcon(type) {
  const icons = {
    payment_approved: '✅',
    payment_rejected: '❌',
    payment_pending: '⏳',
    subscription_expiring: '⏰',
    low_balance: '⚠️',
    welcome: '🎉',
    general: '📢',
  };
  return icons[type] || '📬';
}
