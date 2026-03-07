import { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import RequestBlockingOverlay from './RequestBlockingOverlay';

export default function Layout({
  children,
  user,
  userData,
  menuItems,
  activePage,
  onPageChange,
  onLogout,
  isAdmin = false,
  isCurrentPageAdmin = false
}) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle responsive sidebar
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(true);
      }
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, [setSidebarOpen]);

  // Close sidebar on page change (mobile only)
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [activePage, isDesktop, setSidebarOpen]);

  const currentPage = menuItems.find(m => m.id === activePage);
  
  // Theme colors based on role
  const theme = isAdmin ? {
    primary: 'bg-purple-500',
    primaryLight: 'bg-purple-50',
    primaryText: 'text-purple-600',
    shadow: 'shadow-purple-500/30',
    gradient: 'from-purple-600 to-indigo-700',
    icon: '🛡️'
  } : {
    primary: 'bg-primary',
    primaryLight: 'bg-blue-50',
    primaryText: 'text-primary',
    shadow: 'shadow-primary/30',
    gradient: 'from-primary to-blue-600',
    icon: '📊'
  };

  return (
    <div className="min-h-screen bg-gray-100 text-dark font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && !isDesktop && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center`}>
                <span className="text-white text-xl">{theme.icon}</span>
              </div>
              <span className="text-xl font-bold text-dark">
                {isAdmin ? 'Admin Panel' : 'VPN Access'}
              </span>
            </div>
            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-dark p-1 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 overflow-y-auto">
            {/* Main Menu */}
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    activePage === item.id
                      ? `${theme.primary} text-white shadow-lg ${theme.shadow}`
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <i className={`fas fa-${item.icon} w-5 text-center`} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Stats - Only for user menu */}
            {!isAdmin && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Quick Stats
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 mx-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">Devices</span>
                    <span className="text-xs font-semibold text-dark">3/3</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`bg-gradient-to-r ${theme.gradient} h-1.5 rounded-full`} style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.name || user?.email}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-dark truncate">
                  {userData?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                {isAdmin && (
                  <div className={`text-xs ${theme.primaryText} font-medium`}>Administrator</div>
                )}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <i className="fas fa-sign-out-alt" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${isDesktop ? 'ml-72' : ''}`}>
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b ${isAdmin ? 'border-purple-200' : 'border-gray-200'} px-5 py-4 flex items-center gap-4`}>
          <button
            className="lg:hidden flex items-center justify-center text-gray-500 hover:text-dark p-2 rounded-lg hover:bg-gray-100 transition-all"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-xl font-bold text-dark flex-1">
            {currentPage?.label || 'Dashboard'}
          </h1>

          {isCurrentPageAdmin && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${theme.primaryLight} ${theme.primaryText} rounded-full text-xs font-semibold border ${isAdmin ? 'border-purple-200' : 'border-purple-200'}`}>
              <i className="fas fa-shield-alt text-xs" />
              Admin
            </span>
          )}
        </header>

        {/* Page Content */}
        <main className="p-5 pb-10">
          {children}
        </main>
      </div>

      {/* Request Blocking Overlay - Global loading state */}
      <RequestBlockingOverlay />
    </div>
  );
}
