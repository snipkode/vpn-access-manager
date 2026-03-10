import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { useAuthStore, useUIStore } from '../store';
import { referralAPI, billingAPI } from '../lib/api';

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
import AdminSettings from '../components/AdminSettings';
import AdminGuard from '../components/AdminGuard';
import Unauthorized from '../components/Unauthorized';
import Onboarding from '../components/Onboarding';

// Menu configuration
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'wallet', label: 'Wallet', icon: 'account_balance_wallet' },
  { id: 'referral', label: 'Referral', icon: 'people' },
];

const ADMIN_ITEMS = [
  { id: 'admin-dashboard', label: 'Overview', icon: 'insights' },
  { id: 'admin-billing', label: 'Billing', icon: 'receipt_long' },
  { id: 'admin-credit', label: 'Credit', icon: 'monetization_on' },
  { id: 'admin-referral', label: 'Referrals', icon: 'group' },
  { id: 'admin-settings', label: 'Settings', icon: 'tune' },
];

// Page components mapping
// Admin pages are wrapped with AdminGuard for protection
const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  wallet: Wallet,
  referral: Referral,
  profile: ProfileEdit,
  'admin-dashboard': AdminGuard(AdminDashboard),
  'admin-billing': AdminGuard(AdminBilling),
  'admin-credit': AdminGuard(AdminCredit),
  'admin-referral': AdminGuard(AdminReferral),
  'admin-settings': AdminGuard(AdminSettings),
};

export default function App() {
  const router = useRouter();
  const { user, token, userData, loading, setUser, clearUser, updateUserData } = useAuthStore();
  const { activePage, setActivePage, showNotification } = useUIStore();
  const [initialized, setInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState(false);
  const [lang, setLang] = useState('id'); // Default language

  // Translations
  const t = {
    id: {
      badge: '🔒 Dipercaya 1000+ Pengguna',
      title: 'Akses VPN Aman',
      subtitle: 'Koneksi VPN Cepat, Aman, dan Terpercaya',
      description: 'Lindungi privasi online Anda dengan layanan VPN kelas enterprise. Akses konten dari mana saja dengan enkripsi tingkat militer.',
      cta: 'Mulai Gratis',
      login: 'Login',
      features: 'FITUR',
      featuresTitle: 'Mengapa Memilih Kami?',
      featuresSubtitle: 'Fitur VPN Premium untuk Pengguna Internet Modern',
      stats: {
        users: 'Pengguna Aktif',
        servers: 'Lokasi Server',
        uptime: 'Waktu Aktif',
        support: 'Support'
      },
      featuresList: [
        { icon: '⚡', title: 'Super Cepat', desc: 'Server berkecepatan tinggi untuk streaming, gaming, dan download tanpa lag.' },
        { icon: '🔒', title: 'Keamanan Militer', desc: 'Enkripsi AES-256 menjaga data Anda aman dari hacker.' },
        { icon: '🌍', title: 'Akses Global', desc: 'Terhubung ke server di seluruh dunia dan akses konten dari mana saja.' },
        { icon: '📱', title: 'Multi-Device', desc: 'Lindungi semua perangkat Anda. Hingga 3 perangkat bersamaan.' },
        { icon: '🎯', title: 'No Logs', desc: 'Kami tidak melacak aktivitas browsing Anda. Privasi terjamin.' },
        { icon: '💬', title: 'Support 24/7', desc: 'Tim support kami selalu siap membantu Anda.' }
      ],
      footer: '© 2024 VPN Access Manager. Hak cipta dilindungi.',
      lang: '🇮🇩'
    },
    en: {
      badge: '🔒 Trusted by 1000+ Users',
      title: 'Secure VPN Access',
      subtitle: 'Fast, Secure, and Reliable VPN Connection',
      description: 'Protect your online privacy with our enterprise-grade VPN service. Access content from anywhere with military-grade encryption.',
      cta: 'Get Started Free',
      login: 'Login',
      features: 'FEATURES',
      featuresTitle: 'Why Choose Us?',
      featuresSubtitle: 'Premium VPN Features for Modern Internet Users',
      stats: {
        users: 'Active Users',
        servers: 'Server Locations',
        uptime: 'Uptime',
        support: 'Support'
      },
      featuresList: [
        { icon: '⚡', title: 'Lightning Fast', desc: 'High-speed servers optimized for streaming, gaming, and downloading without lag.' },
        { icon: '🔒', title: 'Military-Grade Security', desc: 'AES-256 encryption keeps your data safe from hackers and surveillance.' },
        { icon: '🌍', title: 'Global Access', desc: 'Connect to servers worldwide and access content from any location.' },
        { icon: '📱', title: 'Multi-Device Support', desc: 'Protect all your devices with one account. Up to 3 devices simultaneously.' },
        { icon: '🎯', title: 'No Logs Policy', desc: 'We don\'t track or store your browsing activity. Your privacy is guaranteed.' },
        { icon: '💬', title: '24/7 Support', desc: 'Our support team is always ready to help you with any questions.' }
      ],
      footer: '© 2024 VPN Access Manager. All rights reserved.',
      lang: '🇬🇧'
    }
  };

  const toggleLang = () => setLang(lang === 'en' ? 'id' : 'en');
  const content = t[lang];

  // Initialize Firebase auth + Firestore user data with timeout
  useEffect(() => {
    let timeoutId;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear timeout when auth state changes
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
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
          credit_balance: userData.credit_balance || 0,
        };

        // Debug: Log user data
        console.log('🔐 Firebase Auth:', {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          role: userData.role,
        });

        // Set user with complete profile data
        setUser(firebaseUser, idToken, userData);

        console.log('✅ User initialized successfully');

        // Auto redirect to dashboard based on role from Firestore
        const targetPage = userData.role === 'admin' ? 'admin-dashboard' : 'dashboard';
        console.log('🎯 Redirecting to:', targetPage, '(role:', userData.role + ')');
        setActivePage(targetPage);

        // Track referral if exists in localStorage
        const pendingRefCode = localStorage.getItem('pending_referral_code');
        if (pendingRefCode) {
          try {
            console.log('🔗 Tracking referral:', pendingRefCode);
            await referralAPI.track({
              referrer_code: pendingRefCode,
              metadata: {
                signup_method: 'google_oauth',
                signup_page: 'index'
              }
            });
            console.log('✅ Referral tracked successfully!');
            showNotification('Referral bonus applied! 🎉');
            localStorage.removeItem('pending_referral_code');
          } catch (error) {
            console.error('❌ Referral tracking error:', error.message);
            // Don't show error to user, just log it
          }
        } else {
          console.log('ℹ️ No referral code found');
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
        clearUser();
      }
      setInitialized(true);
    });

    // Fallback timeout - set initialized after 3 seconds even if auth doesn't fire
    timeoutId = setTimeout(() => {
      console.warn('⏱️ Auth initialization timeout - forcing initialized state');
      setInitialized(true);
    }, 3000);

    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
      setShowOnboarding(false);
    } catch (error) {
      showNotification('Logout failed', 'error');
    }
  };

  // Handle page change with loading
  const handlePageChange = (pageId) => {
    setActivePage(pageId);
  };

  // Handle onboarding complete - go to wallet
  const handleOnboardingComplete = () => {
    setHasSkippedOnboarding(true);
    setActivePage('wallet');
    setShowOnboarding(false);
  };

  // Handle onboarding skip - go to dashboard
  const handleOnboardingSkip = () => {
    setHasSkippedOnboarding(true);
    setShowOnboarding(false);
    setActivePage('dashboard');
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

  // Show Login page if not logged in
  if (!user) {
    // Redirect to login page
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4L6 10V18C6 27 12 34 20 36C28 34 34 27 34 18V10L20 4Z" fill="white" fillOpacity="0.9"/>
                    <path d="M20 14C18.5 14 17.2 14.5 16.2 15.5C15.2 16.5 14.7 17.8 14.7 19.3V21H16.7V19.3C16.7 18.3 17 17.5 17.7 16.8C18.4 16.1 19.2 15.7 20.3 15.7C21.3 15.7 22.1 16 22.7 16.6C23.3 17.2 23.6 18 23.6 19V21H25.6V18.8C25.6 17.3 25.1 16.1 24.1 15.1C23.1 14.2 21.7 13.7 20 13.7V14Z" fill="url(#logoGradient)"/>
                    <rect x="15.5" y="21" width="7" height="5" rx="1" fill="url(#logoGradient)"/>
                    <path d="M18.5 23.5L20.5 25.5L23.5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="logoGradient" x1="14" y1="14" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B82F6"/>
                        <stop offset="1" stopColor="#06B6D4"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span className="text-xl font-bold">VPN Access</span>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-3">
                {/* Language Toggle */}
                <button
                  onClick={toggleLang}
                  className="flex items-center justify-center px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all"
                >
                  <span className="text-lg">{content.lang}</span>
                </button>

                {/* Login Button */}
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  {content.login}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
                <span className="text-sm font-medium text-gray-300">{content.badge}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-white via-blue-50 to-white bg-clip-text text-transparent">
                  {content.title}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl sm:text-2xl font-medium text-gray-400 mb-6">
                {content.subtitle}
              </p>

              {/* Description */}
              <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-10">
                {content.description}
              </p>

              {/* Single CTA Button */}
              <button
                onClick={() => router.push('/login')}
                className="inline-block px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-semibold text-lg transition-all transform hover:scale-105 shadow-xl shadow-blue-500/25"
              >
                {content.cta}
              </button>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-3xl mx-auto mt-16">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    1000+
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{content.stats.users}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    50+
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{content.stats.servers}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    99.9%
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{content.stats.uptime}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                    24/7
                  </div>
                  <div className="text-sm text-gray-500 font-medium">{content.stats.support}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-black via-blue-950/5 to-black">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-blue-400 tracking-wider uppercase mb-3">
                {content.features}
              </p>
              <h2 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight">
                {content.featuresTitle}
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                {content.featuresSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.featuresList.map((feature, index) => (
                <div key={index} className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.05] hover:border-blue-500/30 transition-all">
                  <div className="text-4xl mb-5">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-4">
          <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
            <p>{content.footer}</p>
          </div>
        </footer>
      </div>
    );
  }

  // Show onboarding for new users (check from userData without API fetch)
  // Onboarding will be shown if user has no subscription_end_at (never subscribed)
  const shouldShowOnboarding = !userData?.subscription_end_at && userData?.role === 'user' && !hasSkippedOnboarding;

  if (shouldShowOnboarding && !showOnboarding) {
    setShowOnboarding(true);
  }

  // Show onboarding for users without active subscription
  if (showOnboarding) {
    return (
      <Onboarding
        userData={userData}
        onGoToPayment={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
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
