import { useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { useAuthStore, useUIStore } from '../store';
import { referralAPI } from '../lib/api';

// Components
import Login from '../components/Login';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import Wallet from '../components/Wallet';
import Payment from '../components/Payment';
import Referral from '../components/Referral';
import ProfileEdit from '../components/ProfileEdit';
import AdminDashboard from '../components/AdminDashboard';
import AdminBilling from '../components/AdminBilling';
import AdminCredit from '../components/AdminCredit';
import AdminReferral from '../components/AdminReferral';
import PaymentSettings from '../components/PaymentSettings';
import AdminSettings from '../components/AdminSettings';
import AdminGuard from '../components/AdminGuard';
import Unauthorized from '../components/Unauthorized';

// Menu configuration
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  { id: 'payment', label: 'Payment', icon: 'credit-card' },
  { id: 'referral', label: 'Referral', icon: 'gift' },
  { id: 'profile', label: 'Profile', icon: 'user' },
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
// Admin pages are wrapped with AdminGuard for protection
const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  wallet: Wallet,
  payment: Payment,
  referral: Referral,
  profile: ProfileEdit,
  'admin-dashboard': AdminGuard(AdminDashboard),
  'admin-billing': AdminGuard(AdminBilling),
  'admin-credit': AdminGuard(AdminCredit),
  'admin-referral': AdminGuard(AdminReferral),
  'payment-settings': AdminGuard(PaymentSettings),
  'admin-settings': AdminGuard(AdminSettings),
};

export default function App() {
  const { user, token, userData, loading, setUser, clearUser, updateUserData } = useAuthStore();
  const { activePage, setActivePage, showNotification } = useUIStore();
  const [initialized, setInitialized] = useState(false);

  // Initialize Firebase auth + Firestore user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();

        // Fetch or create user data from Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userRef);

        let userData = {};

        if (userDoc.exists()) {
          // User exists in Firestore
          userData = userDoc.data();
          console.log('📄 User data from Firestore:', userData);
        } else {
          // New user - create document in Firestore
          userData = {
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            role: 'user', // Default role
            vpn_enabled: true,
            provider: firebaseUser.providerData[0]?.providerId || 'google.com',
            emailVerified: firebaseUser.emailVerified,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };

          console.log('📝 Creating new user in Firestore:', userData);
          await setDoc(userRef, userData);
        }

        // Ensure userData has required fields (even if missing in Firestore)
        userData = {
          ...userData,
          email: userData.email || firebaseUser.email,
          name: userData.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: userData.photoURL || firebaseUser.photoURL,
          role: userData.role || 'user',
          vpn_enabled: userData.vpn_enabled !== undefined ? userData.vpn_enabled : true,
          provider: userData.provider || firebaseUser.providerData[0]?.providerId || 'google.com',
          uid: firebaseUser.uid,
          emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : firebaseUser.emailVerified,
        };

        // Debug: Log user data
        console.log('🔐 Firebase Auth:', {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          role: userData.role,
        });

        // Set user with complete profile data
        setUser(firebaseUser, idToken, userData);

        // Auto redirect to dashboard based on role from Firestore
        const targetPage = userData.role === 'admin' ? 'admin-dashboard' : 'dashboard';
        console.log('🎯 Redirecting to:', targetPage, '(role:', userData.role + ')');
        setActivePage(targetPage);

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

        // Setup token refresh listener - refresh token every 55 minutes (before 1 hour expiry)
        const setupTokenRefresh = async () => {
          try {
            // Firebase tokens expire after 1 hour, refresh every 55 minutes
            const REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes in ms
            
            setInterval(async () => {
              const currentUser = auth.currentUser;
              if (currentUser) {
                try {
                  const freshToken = await currentUser.getIdToken(true);
                  console.log('🔄 Auto-refreshed Firebase token');
                  
                  // Update store with fresh token
                  const { userData: currentUserData } = useAuthStore.getState();
                  setUser(currentUser, freshToken, currentUserData);
                } catch (error) {
                  console.error('❌ Auto-refresh failed:', error.message);
                }
              }
            }, REFRESH_INTERVAL);
            
            console.log('⏰ Token auto-refresh scheduled every 55 minutes');
          } catch (error) {
            console.error('❌ Failed to setup token refresh:', error);
          }
        };

        setupTokenRefresh();
      } else {
          }
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

  // SECURITY GUARD: Prevent non-admin from accessing admin pages
  if (isCurrentPageAdmin && !isAdmin) {
    return <Unauthorized />;
  }

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
