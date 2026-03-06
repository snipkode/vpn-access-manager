import { useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore, useUIStore } from '../store';
import { authAPI, referralAPI } from '../lib/api';

// Components
import Login from '../components/Login';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import MyDevices from '../components/MyDevices';
import Wallet from '../components/Wallet';
import Payment from '../components/Payment';
import Referral from '../components/Referral';
import ProfileEdit from '../components/ProfileEdit';
import Notifications from '../components/Notifications';
import AdminDashboard from '../components/AdminDashboard';
import AdminBilling from '../components/AdminBilling';
import AdminCredit from '../components/AdminCredit';
import AdminReferral from '../components/AdminReferral';
import PaymentSettings from '../components/PaymentSettings';
import AdminSettings from '../components/AdminSettings';

// Menu configuration
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'devices', label: 'Devices', icon: 'mobile' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  { id: 'payment', label: 'Payment', icon: 'credit-card' },
  { id: 'referral', label: 'Referral', icon: 'gift' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
];

const ADMIN_ITEMS = [
  { id: 'admin-dashboard', label: 'Overview', icon: 'chart-line' },
  { id: 'admin-billing', label: 'Billing', icon: 'file-invoice-dollar' },
  { id: 'admin-credit', label: 'Credit', icon: 'coins' },
  { id: 'admin-referral', label: 'Referrals', icon: 'users' },
  { id: 'payment-settings', label: 'Payment Settings', icon: 'cog' },
  { id: 'admin-settings', label: 'Settings', icon: 'sliders-h' },
];

// Page components mapping
const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  devices: MyDevices,
  wallet: Wallet,
  payment: Payment,
  referral: Referral,
  profile: ProfileEdit,
  notifications: Notifications,
  'admin-dashboard': AdminDashboard,
  'admin-billing': AdminBilling,
  'admin-credit': AdminCredit,
  'admin-referral': AdminReferral,
  'payment-settings': PaymentSettings,
  'admin-settings': AdminSettings,
};

export default function App() {
  const { user, token, userData, loading, setUser, clearUser, updateUserData } = useAuthStore();
  const { activePage, setActivePage, showNotification } = useUIStore();
  const [initialized, setInitialized] = useState(false);

  // Initialize Firebase auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();

        try {
          const data = await authAPI.login(idToken);

          setUser(firebaseUser, idToken, data.user);

          // Track referral if exists in localStorage
          const pendingRefCode = localStorage.getItem('pending_referral_code');
          if (pendingRefCode) {
            try {
              await referralAPI.track({
                referrer_code: pendingRefCode,
                metadata: {
                  signup_method: 'google_oauth',
                  signup_page: 'index'
                }
              });
              showNotification('Referral tracked! 🎉');
              localStorage.removeItem('pending_referral_code');
            } catch (error) {
              console.log('Referral tracking:', error.message);
            }
          }

          // Auto redirect to dashboard
          setActivePage('dashboard');
        } catch (error) {
          console.error('Auth verification failed:', error);
          setUser(firebaseUser, idToken, {
            email: firebaseUser.email,
            role: 'user',
            vpn_enabled: true
          });
          setActivePage('dashboard');
        }
      } else {
        clearUser();
      }
      setInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Handle login
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Note: Auth state change will handle the rest via onAuthStateChanged
      // Referral tracking will happen if ref code is in localStorage
    } catch (error) {
      showNotification('Login failed: ' + error.message, 'error');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearUser();
      setActivePage('dashboard');
    } catch (error) {
      showNotification('Logout failed', 'error');
    }
  };

  // Handle page change with loading
  const handlePageChange = (pageId) => {
    setActivePage(pageId);
  };

  // Show loading screen
  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading VPN Access...</p>
      </div>
    );
  }

  // Show login screen
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Determine menu items and layout based on role
  const isAdmin = userData?.role === 'admin';
  
  // Separate menu items for admin and user
  const userMenuItems = MENU_ITEMS; // User only sees user menu
  const adminMenuItems = ADMIN_ITEMS; // Admin only sees admin menu
  
  // Use separate menu based on role
  const allMenuItems = isAdmin ? adminMenuItems : userMenuItems;
  
  // Map active page to component
  const CurrentPage = PAGE_COMPONENTS[activePage] || (isAdmin ? AdminDashboard : Dashboard);
  
  // Determine if current page is admin page
  const isCurrentPageAdmin = ADMIN_ITEMS.some(item => item.id === activePage);

  return (
    <Layout
      user={user}
      userData={userData}
      menuItems={allMenuItems}
      activePage={activePage}
      onPageChange={handlePageChange}
      onLogout={handleLogout}
      isAdmin={isAdmin}
      isCurrentPageAdmin={isCurrentPageAdmin}
    >
      <CurrentPage token={token} userData={userData} />
    </Layout>
  );
}
