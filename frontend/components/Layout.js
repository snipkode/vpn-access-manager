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
            <div className="flex items-center gap-3 min-w-0">
              {/* Custom SVG Logo */}
              <div className={`w-11 h-11 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden`}>
                <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Shield Base */}
                  <path d="M20 4L6 10V18C6 27 12 34 20 36C28 34 34 27 34 18V10L20 4Z" fill="white" fillOpacity="0.9"/>
                  {/* Lock Icon */}
                  <path d="M20 14C18.5 14 17.2 14.5 16.2 15.5C15.2 16.5 14.7 17.8 14.7 19.3V21H16.7V19.3C16.7 18.3 17 17.5 17.7 16.8C18.4 16.1 19.2 15.7 20.3 15.7C21.3 15.7 22.1 16 22.7 16.6C23.3 17.2 23.6 18 23.6 19V21H25.6V18.8C25.6 17.3 25.1 16.1 24.1 15.1C23.1 14.2 21.7 13.7 20 13.7V14Z" fill="url(#logoGradient)"/>
                  <rect x="15.5" y="21" width="9" width="7" height="5" rx="1" fill="url(#logoGradient)"/>
                  {/* Checkmark */}
                  <path d="M18.5 23.5L20.5 25.5L23.5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Gradient Definition */}
                  <defs>
                    <linearGradient id="logoGradient" x1="14" y1="14" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3B82F6"/>
                      <stop offset="1" stopColor="#06B6D4"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-dark dark:text-white truncate whitespace-nowrap hidden sm:block">
                {isAdmin ? 'Admin Panel' : 'VPN Access'}
              </span>
              <span className="text-lg font-bold text-dark dark:text-white truncate whitespace-nowrap sm:hidden">
                {isAdmin ? 'Admin' : 'VPN'}
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
            <div className="space-y-1.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold transition-all whitespace-nowrap ${
                    activePage === item.id
                      ? `${theme.primary} text-white shadow-lg ${theme.shadow}`
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2E]'
                  }`}
                >
                  <Icon name={item.icon || 'circle'} variant="round" size="medium" className="w-6 h-6 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Subscription Status - Only for user menu */}
            {!isAdmin && userData?.subscription_end_at && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#38383A]">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Subscription
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3 mx-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">Active</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Expires: {new Date(userData.subscription_end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-500">
                    {userData.role === 'user' ? 'Standard Plan' : 'Premium Plan'}
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade Prompt - For users without subscription */}
            {!isAdmin && !userData?.subscription_end_at && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#38383A]">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mx-2 text-center">
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">
                    Upgrade to Premium
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-500 mb-3">
                    Get full VPN access now!
                  </div>
                  <button
                    onClick={() => onPageChange('payment')}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    View Plans
                  </button>
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
                  className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-[#38383A] flex-shrink-0"
                />
              ) : (
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[15px] font-semibold text-dark dark:text-white truncate whitespace-nowrap">
                  {userData?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                {isAdmin && (
                  <div className={`text-xs ${theme.primaryText} font-semibold truncate whitespace-nowrap`}>Administrator</div>
                )}
              </div>
              <Icon name="chevron_right" variant="round" size="medium" className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl text-[15px] font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors whitespace-nowrap"
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
        <header className={`sticky top-0 z-30 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border-b ${isAdmin ? 'border-purple-200 dark:border-purple-900' : 'border-gray-200 dark:border-[#38383A]'} px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4`}>
          <button
            className="lg:hidden flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-all flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" variant="round" size="medium" />
          </button>

          <h1 className="text-lg sm:text-xl font-bold text-dark dark:text-white flex-1 min-w-0 truncate">
            {currentPage?.label || 'Dashboard'}
          </h1>

          {isCurrentPageAdmin && (
            <span className={`hidden sm:inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 ${theme.primaryLight} dark:bg-purple-500/20 ${theme.primaryText} dark:text-purple-400 rounded-xl text-xs font-semibold border ${isAdmin ? 'border-purple-200 dark:border-purple-800' : 'border-purple-200 dark:border-purple-800'} flex-shrink-0`}>
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
