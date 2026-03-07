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
          </nav>

          {/* User Profile - Clickable to navigate to profile page */}
          <div className="p-4 border-t border-gray-100 dark:border-[#38383A] bg-gray-50 dark:bg-[#1C1C1E] flex-shrink-0">
            <button
              onClick={() => onPageChange('profile')}
              className="w-full flex items-center gap-3 mb-3"
            >
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.name || user?.email}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-[#38383A] flex-shrink-0"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-dark dark:text-white truncate">
                  {userData?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                {isAdmin && (
                  <div className={`text-xs ${theme.primaryText} font-medium`}>Administrator</div>
                )}
              </div>
              <Icon name="chevron_right" variant="round" size="medium" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
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
