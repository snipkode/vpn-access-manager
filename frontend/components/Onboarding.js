import { useState, useEffect } from 'react';
import { useUIStore } from '../store';

export default function Onboarding({ userData, onGoToPayment, onSkip }) {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hasReferral, setHasReferral] = useState(false);
  const { showNotification } = useUIStore();

  useEffect(() => {
    setMounted(true);
    
    // Check if user has referral code
    const refCode = localStorage.getItem('pending_referral_code');
    if (refCode) {
      setHasReferral(true);
      console.log('🏷️ User has referral code:', refCode);
    }
  }, []);

  const steps = [
    {
      icon: '🎉',
      title: 'Welcome to VPN Access!',
      description: 'Your account has been successfully created. Get ready to experience secure and fast VPN access.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🔒',
      title: 'Premium VPN Service',
      description: 'To access our VPN servers, you need an active subscription. Our plans start from Rp 50,000/month.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: '⚡',
      title: 'Instant Activation',
      description: 'After payment confirmation, your VPN access will be activated immediately. No waiting required!',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: '🌍',
      title: 'Ready to Connect?',
      description: 'Complete your payment now and start enjoying secure, fast, and unlimited VPN access.',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onGoToPayment();
    }
  };

  const handleSkip = () => {
    showNotification('You can subscribe anytime from the Payment page', 'info');
    onSkip();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Step {step + 1} of {steps.length}</span>
            <span className="text-xs text-gray-500 font-medium">{Math.round(((step + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`relative z-10 max-w-lg w-full transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 sm:p-10 shadow-2xl">
          
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className={`relative w-24 h-24 bg-gradient-to-br ${steps[step].color} rounded-3xl flex items-center justify-center shadow-xl transform transition-all duration-500 hover:scale-105`}>
              <span className="text-5xl">{steps[step].icon}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-4 tracking-tight">
            {steps[step].title}
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-center text-base sm:text-lg leading-relaxed mb-8">
            {steps[step].description}
          </p>

          {/* User Info */}
          {step === 0 && userData && (
            <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
              <div className="flex items-center gap-3">
                {userData.photoURL ? (
                  <img src={userData.photoURL} alt={userData.name} className="w-12 h-12 rounded-full border-2 border-white/20" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {userData.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{userData.name}</p>
                  <p className="text-gray-500 text-sm truncate">{userData.email}</p>
                </div>
              </div>
              
              {/* Referral Badge */}
              {hasReferral && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-xs font-medium">Referral bonus will be applied!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Benefits Preview */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: '⚡', text: 'Lightning Fast' },
                { icon: '🔒', text: 'AES-256 Encryption' },
                { icon: '🌍', text: 'Global Servers' },
                { icon: '📱', text: 'Multi-Device' }
              ].map((benefit, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-2">
                  <span className="text-xl">{benefit.icon}</span>
                  <span className="text-gray-300 text-sm font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
            >
              {step === steps.length - 1 ? 'Go to Payment →' : 'Continue'}
            </button>

            {step < steps.length - 1 && (
              <button
                onClick={handleSkip}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-gray-400 hover:text-white transition-all"
              >
                Skip for Now
              </button>
            )}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-8 bg-gradient-to-r from-blue-500 to-cyan-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 text-xs">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure payment powered by bank transfer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
