import { useAuthStore } from '../store';
import { userAPI } from '../lib/api';

export default function Profile() {
  const { user, userData, updateUserData } = useAuthStore();

  return (
    <div className="max-w-[500px] mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        {/* Avatar */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {userData?.photoURL ? (
            <img
              src={userData.photoURL}
              alt={userData.name || user?.email}
              className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/30">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Name</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm flex items-center gap-2">
              <i className="fas fa-user text-gray-400" />
              {userData?.name || user?.displayName || user?.email?.split('@')[0] || 'N/A'}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Email</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm flex items-center gap-2">
              <i className="fas fa-envelope text-gray-400" />
              {user?.email}
              {userData?.emailVerified && (
                <span className="text-green-500 text-xs" title="Verified">
                  <i className="fas fa-check-circle" />
                </span>
              )}
            </div>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Login Provider</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm flex items-center gap-2">
              {userData?.provider === 'google.com' ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Google</span>
                </>
              ) : (
                <>
                  <i className="fas fa-shield-alt text-gray-400" />
                  <span>{userData?.provider || 'N/A'}</span>
                </>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Role</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm flex items-center gap-2">
              <i className="fas fa-user-tag text-gray-400" />
              <span className={`w-2 h-2 rounded-full ${userData?.role === 'admin' ? 'bg-purple-500' : 'bg-gray-400'}`} />
              {userData?.role || 'user'}
            </div>
          </div>

          {/* VPN Access */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">VPN Access</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center gap-2">
              <i className={`fas ${userData?.vpn_enabled ? 'fa-check-circle text-success' : 'fa-times-circle text-gray-400'}`} />
              {userData?.vpn_enabled ? (
                <span className="text-success font-medium">Enabled</span>
              ) : (
                <span className="text-gray-400 font-medium">Disabled</span>
              )}
            </div>
          </div>
        </div>

        {/* User ID */}
        <div className="mt-6 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 font-mono break-all">
            <span className="font-semibold">UID:</span> {user?.uid || userData?.uid || 'N/A'}
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-700 leading-relaxed flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <span>Contact admin to change your role or VPN access status.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
