import { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import RequestBlockingOverlay from './RequestBlockingOverlay';
import Toast from './Toast';
import DarkModeToggle from './DarkModeToggle';
import Icon from './ui/Icon';

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
    icon: 'security'
  } : {
    primary: 'bg-primary',
    primaryLight: 'bg-blue-50',
    primaryText: 'text-primary',
    shadow: 'shadow-primary/30',
    gradient: 'from-primary to-blue-600',
    icon: 'dashboard'
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black text-dark dark:text-white font-sans transition-colors duration-200">
      {/* Mobile Overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#1C1C1E] border-r border-gray-200 dark:border-[#38383A] transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-gray-100 dark:border-[#38383A] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <Icon name={theme.icon} variant="round" size="large" color="white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-dark dark:text-white truncate">
                {isAdmin ? 'Admin Panel' : 'VPN Access'}
              </span>
            </div>
            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-dark dark:hover:text-white p-1 transition-colors flex-shrink-0"
              >
                <Icon name="close" variant="round" size="medium" />
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
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
                  }`}
                >
                  <Icon name={item.icon || 'circle'} variant="round" size="small" className="w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Stats - Only for user menu */}
            {!isAdmin && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#38383A]">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Quick Stats
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-[#1C1C1E] dark:to-[#2C2C2E] rounded-xl p-3 mx-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Devices</span>
                    <span className="text-xs font-semibold text-dark dark:text-white">3/3</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-[#38383A] rounded-full h-1.5">
                    <div className={`bg-gradient-to-r ${theme.gradient} h-1.5 rounded-full`} style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Account - Navigate to Profile */}
            <button
              onClick={() => onPageChange('profile')}
              className={`mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === 'profile'
                  ? 'bg-gray-100 dark:bg-[#2C2C2E]'
                  : 'hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold text-dark dark:text-white truncate">
                  Google Account
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {userData?.name || user?.email?.split('@')[0] || 'User'}
                </div>
              </div>
              <Icon name="chevron_right" variant="round" size="medium" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
          </nav>

          {/* Logout Button */}
          <div className="p-3 border-t border-gray-100 dark:border-[#38383A] bg-gray-50 dark:bg-[#1C1C1E] flex-shrink-0">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              <Icon name="logout" variant="round" size="medium" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${isDesktop ? 'ml-72' : ''}`}>
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b ${isAdmin ? 'border-purple-200 dark:border-purple-900' : 'border-gray-200 dark:border-[#38383A]'} px-3 sm:px-5 py-2.5 sm:py-4 flex items-center gap-2.5 sm:gap-4`}>
          <button
            className="lg:hidden flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-all flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" variant="round" size="medium" />
          </button>

          <h1 className="text-base sm:text-lg md:text-xl font-bold text-dark dark:text-white flex-1 min-w-0 truncate">
            {currentPage?.label || 'Dashboard'}
          </h1>

          {isCurrentPageAdmin && (
            <span className={`hidden sm:inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 ${theme.primaryLight} dark:bg-purple-500/20 ${theme.primaryText} dark:text-purple-400 rounded-full text-[9px] sm:text-xs font-semibold border ${isAdmin ? 'border-purple-200 dark:border-purple-800' : 'border-purple-200 dark:border-purple-800'} flex-shrink-0`}>
              <Icon name="security" variant="round" size="small" />
              <span className="hidden xs:inline">Admin</span>
            </span>
          )}

          {/* Dark Mode Toggle */}
          <div className="flex-shrink-0">
            <DarkModeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-5 pb-6 sm:pb-10">
          {children}
        </main>
      </div>

      {/* Request Blocking Overlay - Global loading state */}
      <RequestBlockingOverlay />
      
      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}
