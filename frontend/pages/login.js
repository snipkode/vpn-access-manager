import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useUIStore } from '../store';

export default function LoginPage() {
  const router = useRouter();
  const { showNotification } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [lang, setLang] = useState('id'); // Default language

  // Translations
  const t = {
    id: {
      back: 'Kembali',
      title: 'Selamat Datang Kembali',
      subtitle: 'Masuk untuk akses dashboard VPN Anda',
      login: 'Secure Login',
      signIn: 'Masuk dengan Google',
      features: {
        fast: 'Cepat',
        secure: 'Aman',
        global: 'Global'
      },
      encrypted: 'Terenkripsi end-to-end',
      terms: 'Dengan masuk, Anda setuju dengan',
      and: 'dan',
      privacy: 'Kebijakan Privasi',
      termsLink: 'Syarat Layanan',
      lang: '🇮🇩'
    },
    en: {
      back: 'Back',
      title: 'Welcome Back',
      subtitle: 'Sign in to access your VPN dashboard',
      login: 'Secure Login',
      signIn: 'Sign in with Google',
      features: {
        fast: 'Fast',
        secure: 'Secure',
        global: 'Global'
      },
      encrypted: 'End-to-end encrypted',
      terms: 'By signing in, you agree to our',
      and: 'and',
      privacy: 'Privacy Policy',
      termsLink: 'Terms of Service',
      lang: '🇬🇧'
    }
  };

  const toggleLang = () => setLang(lang === 'en' ? 'id' : 'en');
  const content = t[lang];

  useEffect(() => {
    setMounted(true);

    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('✅ User already logged in, redirecting to home...');
        window.location.href = '/';
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setLoggingIn(true);
      console.log('🔐 Initiating Google sign-in popup...');

      await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign-in successful');

      showNotification('Login successful! Redirecting...');

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('❌ Login error:', error);
      showNotification('Login failed: ' + error.message, 'error');
      setLoggingIn(false);
    }
  };

  // Show loading state
  if (loggingIn) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Signing in with Google...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>

      {/* Animated Orbs */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl transition-opacity duration-1000 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/40 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Back Button & Language Toggle */}
      <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">{content.back}</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center justify-center px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all"
        >
          <span className="text-lg">{content.lang}</span>
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Main Card */}
        <div className={`w-full bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 sm:p-10 shadow-2xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            {/* Animated Logo Container */}
            <div className="relative mb-6">
              {/* Outer Ring */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-50 animate-pulse" />

              {/* Logo Box */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl transform transition-transform duration-500 hover:scale-105">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              {/* Status Indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-black flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center tracking-tight">
              {content.title}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base text-center leading-relaxed">
              {content.subtitle}
            </p>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-4 bg-[#0a0a0f]/80 text-gray-500 backdrop-blur-sm rounded-full">
                {content.login}
              </span>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="group w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl font-semibold text-[15px] sm:text-base py-4 px-6 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative flex items-center justify-center gap-3">
              {/* Google Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{content.signIn}</span>

              {/* Arrow Icon */}
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-[11px] text-gray-400">{content.features.fast}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-[11px] text-gray-400">{content.features.secure}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <span className="text-[11px] text-gray-400">{content.features.global}</span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className={`mt-6 text-center transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-2 text-gray-500 text-xs mb-3">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{content.encrypted}</span>
          </div>

          <p className="text-gray-600 text-[11px] leading-relaxed">
            {content.terms}{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">{content.termsLink}</a>
            {' '}{content.and}{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">{content.privacy}</a>
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>
    </div>
  );
}
