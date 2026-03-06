import { useEffect, useState } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { userAPI, notificationsAPI } from '../lib/api';

export default function ProfileEdit({ token }) {
  const { user, updateUserData } = useAuthStore();
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState({
    display_name: '',
    phone: '',
    whatsapp: '',
    avatar_url: '',
  });
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
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileData, prefsData] = await Promise.all([
        userAPI.getProfile(),
        notificationsAPI.getNotifications(),
      ]);
      setProfile(profileData.profile || profile);
      setPreferences(prefsData.preferences || preferences);
    } catch (error) {
      showNotification('Failed to load profile data', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await userAPI.updateProfile(profile);
      showNotification('Profile updated successfully');
      updateUserData(profile);
    } catch (error) {
      showNotification(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await notificationsAPI.updatePreferences(preferences);
      showNotification('Preferences updated successfully');
    } catch (error) {
      showNotification(error.message || 'Failed to update preferences', 'error');
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
    <div className="max-w-[600px] mx-auto space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-user mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-bell mr-2" />
            Notifications
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">Edit Profile</h1>

          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/30">
                {profile.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-dark mb-1">Profile Picture</div>
                <input
                  type="url"
                  value={profile.avatar_url || ''}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
                <div className="text-xs text-gray-400 mt-1">Optional: Add a profile picture URL</div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profile.display_name || ''}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 text-sm cursor-not-allowed"
              />
              <div className="text-xs text-gray-400 mt-1">Email cannot be changed</div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+628123456789"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <div className="text-xs text-gray-400 mt-1">Format: +62xxx (optional)</div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={profile.whatsapp || ''}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                placeholder="+628123456789"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <div className="text-xs text-gray-400 mt-1">For WhatsApp notifications (optional)</div>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="w-full mt-6 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">Notification Preferences</h1>

          <div className="space-y-4">
            <ToggleRow
              label="WhatsApp Notifications"
              description="Receive notifications via WhatsApp"
              enabled={preferences.whatsapp_enabled}
              onChange={(value) => setPreferences({ ...preferences, whatsapp_enabled: value })}
              icon="📱"
            />
            <ToggleRow
              label="Email Notifications"
              description="Receive notifications via email"
              enabled={preferences.email_enabled}
              onChange={(value) => setPreferences({ ...preferences, email_enabled: value })}
              icon="📧"
            />
            <ToggleRow
              label="Low Balance Alert"
              description="Get notified when balance is low"
              enabled={preferences.low_balance_alert}
              onChange={(value) => setPreferences({ ...preferences, low_balance_alert: value })}
              icon="⚠️"
            />
            <ToggleRow
              label="Expiring Soon Alert"
              description="Get notified before subscription expires"
              enabled={preferences.expiring_soon_alert}
              onChange={(value) => setPreferences({ ...preferences, expiring_soon_alert: value })}
              icon="⏰"
            />
            <ToggleRow
              label="Payment Approved Alert"
              description="Get notified when payment is approved"
              enabled={preferences.payment_approved_alert}
              onChange={(value) => setPreferences({ ...preferences, payment_approved_alert: value })}
              icon="✅"
            />
            <ToggleRow
              label="Payment Rejected Alert"
              description="Get notified when payment is rejected"
              enabled={preferences.payment_rejected_alert}
              onChange={(value) => setPreferences({ ...preferences, payment_rejected_alert: value })}
              icon="❌"
            />
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
            onClick={handleSavePreferences}
            disabled={loading}
            className="w-full mt-6 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}
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
