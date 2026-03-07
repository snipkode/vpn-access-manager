import { useEffect, useState, useRef } from 'react';
import { useAuthStore, useUIStore } from '../store';
import { userAPI, notificationsAPI } from '../lib/api';
import Icon from './ui/Icon';

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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileData, prefsData] = await Promise.all([
        userAPI.getProfile(),
        notificationsAPI.getNotifications(),
      ]);
      
      // Merge profile data with fallback from Firebase user
      const mergedProfile = {
        display_name: profileData.profile?.display_name || user?.displayName || user?.email?.split('@')[0] || '',
        phone: profileData.profile?.phone || '',
        whatsapp: profileData.profile?.whatsapp || '',
        avatar_url: profileData.profile?.avatar_url || user?.photoURL || '',
      };
      
      setProfile(mergedProfile);
      setPreferences(prefsData.preferences || preferences);
      if (mergedProfile.avatar_url) {
        setAvatarPreview(mergedProfile.avatar_url);
      }
    } catch (error) {
      showNotification('Failed to load profile data', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Only JPG, JPEG, and PNG images are allowed', 'error');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showNotification('File size must be less than 2MB', 'error');
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);

      showNotification('Profile picture selected. Click Save to apply.', 'success');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfile({ ...profile, avatar_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showNotification('Profile picture removed. Click Save to apply.', 'success');
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // If there's an avatar file, you would upload it here
      // For now, we'll just save the profile data
      const profileData = { ...profile };
      
      // If avatarFile exists, you would upload it to get a URL
      // and then include it in profileData.avatar_url
      
      await userAPI.updateProfile(profileData);
      showNotification('Profile updated successfully');
      updateUserData(profileData);
      
      // Reset avatar file after save
      setAvatarFile(null);
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
        <div className="w-10 h-10 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      {/* Tabs */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-1.5 shadow-sm border border-gray-100 dark:border-[#38383A]">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-[#007AFF] text-white shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
            }`}
          >
            <Icon name="person" variant="round" size="small" className="mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-[#007AFF] text-white shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
            }`}
          >
            <Icon name="notifications" variant="round" size="small" className="mr-2" />
            Notifications
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#38383A]">
          <h1 className="text-xl font-bold text-dark dark:text-white mb-6">Edit Profile</h1>

          <div className="space-y-5">
            {/* Avatar Upload */}
            <div className="pb-6 border-b border-gray-100 dark:border-[#38383A]">
              <label className="block text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                Profile Picture
              </label>
              
              <div className="flex items-start gap-6">
                {/* Avatar Preview */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-[#38383A] shadow-lg">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#007AFF] to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                        {profile.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Button Overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-[#007AFF] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#007AFF]/90 active:scale-95 transition-all border-4 border-white dark:border-[#1C1C1E]"
                    title="Change profile picture"
                  >
                    <Icon name="camera_alt" variant="round" size="small" />
                  </button>
                </div>

                {/* Upload Info */}
                <div className="flex-1 pt-1">
                  <div className="text-sm font-medium text-dark dark:text-white mb-2">
                    {avatarFile ? avatarFile.name : (avatarPreview ? 'Current profile picture' : 'No profile picture')}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    {avatarFile 
                      ? `${(avatarFile.size / 1024 / 1024).toFixed(2)} MB` 
                      : 'JPG, PNG (Max 2MB)'}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 dark:bg-[#2C2C2E] text-dark dark:text-white text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-[#38383A] transition-all"
                    >
                      {avatarPreview ? 'Change Picture' : 'Upload Picture'}
                    </button>
                    {avatarPreview && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profile.display_name || ''}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
                className="w-full px-4 py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-[12px] bg-gray-100 dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#38383A] rounded-xl text-gray-400 dark:text-gray-500 text-[15px] cursor-not-allowed"
              />
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">Email cannot be changed</div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                <Icon name="phone" variant="round" size="small" className="mr-1.5 text-[#007AFF]" />
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+628123456789"
                className="w-full px-4 py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
              />
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">Format: +62xxx (optional)</div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                <Icon name="whatsapp" variant="round" size="small" className="mr-1.5 text-[#25D366]" />
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={profile.whatsapp || ''}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                placeholder="+628123456789"
                className="w-full px-4 py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
              />
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">For WhatsApp notifications (optional)</div>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="w-full mt-6 py-[14px] bg-[#007AFF] text-white rounded-xl font-semibold text-[15px] hover:bg-[#007AFF]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007AFF]/30"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#38383A]">
          <h1 className="text-xl font-bold text-dark dark:text-white mb-6">Notification Preferences</h1>

          <div className="space-y-3">
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

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#38383A]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Language
                </label>
                <select
                  value={preferences.language || 'en'}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none"
                >
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Timezone
                </label>
                <select
                  value={preferences.timezone || 'Asia/Jakarta'}
                  onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                  className="w-full px-4 py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none"
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
            className="w-full mt-6 py-[14px] bg-[#007AFF] text-white rounded-xl font-semibold text-[15px] hover:bg-[#007AFF]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007AFF]/30"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange, icon }) {
  return (
    <div className="flex justify-between items-center py-3 sm:py-4 px-3 sm:px-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl border border-gray-100 dark:border-[#38383A]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-lg sm:text-xl flex-shrink-0 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-base font-semibold text-dark dark:text-white truncate">{label}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:block">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 sm:w-12 sm:h-7 rounded-full transition-all flex-shrink-0 ml-2 sm:ml-0 ${
          enabled ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full shadow-md transition-transform ${
            enabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
