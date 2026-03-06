import { useAuthStore } from '../store';

export default function Profile() {
  const { user, userData } = useAuthStore();

  return (
    <div className="max-w-[500px] mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-lg shadow-primary/30">
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Email</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm">
              {user?.email}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Role</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${userData?.role === 'admin' ? 'bg-purple-500' : 'bg-gray-400'}`} />
              {userData?.role || 'user'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">VPN Access</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              {userData?.vpn_enabled ? (
                <span className="text-success font-medium flex items-center gap-2">
                  <i className="fas fa-check-circle" />
                  Enabled
                </span>
              ) : (
                <span className="text-gray-400 font-medium flex items-center gap-2">
                  <i className="fas fa-times-circle" />
                  Disabled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-700 leading-relaxed flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <span>Contact admin to change your role or VPN access status.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
