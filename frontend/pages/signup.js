import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuthStore, useUIStore, apiFetch } from '../store';

// Components
import Layout from '../components/Layout';

// Menu configuration (same as index.js)
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
  dashboard: dynamic(() => import('../components/Dashboard')),
  devices: dynamic(() => import('../components/MyDevices')),
  wallet: dynamic(() => import('../components/Wallet')),
  payment: dynamic(() => import('../components/Payment')),
  referral: dynamic(() => import('../components/Referral')),
  profile: dynamic(() => import('../components/ProfileEdit')),
  notifications: dynamic(() => import('../components/Notifications')),
  'admin-dashboard': dynamic(() => import('../components/AdminDashboard')),
  'admin-billing': dynamic(() => import('../components/AdminBilling')),
  'admin-credit': dynamic(() => import('../components/AdminCredit')),
  'admin-referral': dynamic(() => import('../components/AdminReferral')),
  'admin-settings': dynamic(() => import('../components/AdminSettings')),
};

import dynamic from 'next/dynamic';

export default function Signup() {
  const router = useRouter();
  const { user, token, userData, loading, setUser, clearUser, updateUserData } = useAuthStore();
  const { activePage, setActivePage, showNotification } = useUIStore();
  const [referralCode, setReferralCode] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Get referral code from URL on mount
  useEffect(() => {
    if (router.isReady) {
      const ref = router.query.ref;
      if (ref) {
        setReferralCode(ref);
        // Store in localStorage for later use
        localStorage.setItem('pending_referral_code', ref);
      }
    }
  }, [router.isReady, router.query.ref]);

  // Check if user already logged in
  useEffect(() => {
    if (user && !loading) {
      // Already logged in, redirect to dashboard
      router.push('/');
    }
  }, [user, loading, router]);

  // Handle Google login
  const handleLogin = async () => {
    setAuthenticating(true);
    try {
      // Google OAuth
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Verify with backend
      const data = await apiFetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });

      setUser(result.user, idToken, data.user);

      // Track referral if exists
      if (referralCode || localStorage.getItem('pending_referral_code')) {
        const refCode = referralCode || localStorage.getItem('pending_referral_code');
        
        try {
          await apiFetch('/referral/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrer_code: refCode,
              metadata: {
                signup_method: 'google_oauth',
                signup_page: '/signup'
              }
            }),
          });
          showNotification('Referral tracked successfully! 🎉');
          localStorage.removeItem('pending_referral_code');
        } catch (error) {
          // Referral might already be tracked or invalid
          console.log('Referral tracking:', error.message);
        }
      }

      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      showNotification('Login failed: ' + error.message, 'error');
    } finally {
      setAuthenticating(false);
    }
  };

  // Show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  // Already logged in - redirect
  if (user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/15 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Logo */}
        <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border border-white/20">
          <span className="text-4xl">🔐</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">
          Create Your Account
        </h1>
        <p className="text-gray-medium text-base mb-10 text-center leading-relaxed">
          Sign up to access VPN services
        </p>

        {/* Referral Info */}
        {referralCode && (
          <div className="w-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎁</span>
              <div className="text-white font-semibold">Referred by {referralCode}</div>
            </div>
            <p className="text-gray-400 text-sm">
              You&apos;ll be referred by this user and they&apos;ll earn rewards when you subscribe!
            </p>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={authenticating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-dark rounded-2xl font-semibold text-base cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {authenticating ? (
            <>
              <span className="w-5 h-5 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        {/* Info Box */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 max-w-sm">
          <p className="text-gray-400 text-sm text-center flex items-center justify-center gap-2">
            <span>🔒</span>
            <span>Secure Google authentication • End-to-end encrypted</span>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-6">
          <a
            href="/"
            className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}
