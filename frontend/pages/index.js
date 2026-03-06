import { useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore, useUIStore, apiFetch } from '../store';

// Components
import Login from '../components/Login';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import MyDevices from '../components/MyDevices';
import Wallet from '../components/Wallet';
import AdminDashboard from '../components/AdminDashboard';

// Menu configuration
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'devices', label: 'Devices', icon: 'mobile' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
];

const ADMIN_ITEMS = [
  { id: 'admin', label: 'Admin', icon: 'shield' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'credit', label: 'Credits', icon: 'coins' },
];

// Page components mapping
const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  devices: MyDevices,
  wallet: Wallet,
  admin: AdminDashboard,
  users: AdminDashboard,
  credit: AdminDashboard,
};

export default function App() {
  const { user, token, userData, loading, setUser, clearUser, updateUserData } = useAuthStore();
  const { activePage, setActivePage, showNotification } = useUIStore();

  // Initialize Firebase auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        
        try {
          const data = await apiFetch('/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
          });
          
          setUser(firebaseUser, idToken, data.user);
        } catch (error) {
          console.error('Auth verification failed:', error);
          setUser(firebaseUser, idToken, {
            email: firebaseUser.email,
            role: 'user',
            vpn_enabled: true
          });
        }
      } else {
        clearUser();
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle login
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
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
  if (loading) {
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

  // Determine menu items based on role
  const isAdmin = userData?.role === 'admin';
  const allMenuItems = [...MENU_ITEMS, ...(isAdmin ? ADMIN_ITEMS : [])];
  const CurrentPage = PAGE_COMPONENTS[activePage] || Dashboard;

  return (
    <Layout
      user={user}
      userData={userData}
      menuItems={allMenuItems}
      activePage={activePage}
      onPageChange={handlePageChange}
      onLogout={handleLogout}
    >
      <CurrentPage token={token} userData={userData} />
    </Layout>
  );
}
