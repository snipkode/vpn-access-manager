import { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import { billingAPI } from '../lib/api';

/**
 * SubscriptionMask - Clean overlay for non-subscribed users
 * Modern design with smooth animations
 */
export default function SubscriptionMask({ onActivateTrial, activatingTrial }) {
  const { showNotification, setActivePage } = useUIStore();
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    collectDeviceInfo();
  }, []);

  const collectDeviceInfo = async () => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      const fingerprint = {
        publicIP: ipData.ip || 'unknown',
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
      };

      setDeviceInfo(fingerprint);
    } catch (error) {
      console.error('❌ Failed to collect device info:', error);
    }
  };

  const handleStartTrial = async () => {
    if (!onActivateTrial) return;
    window.pendingTrialDeviceInfo = deviceInfo;
    await onActivateTrial();
  };

  return (
    <div className="relative w-full">
      {/* Card */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-6 sm:p-8 text-center border border-gray-200/50 dark:border-[#38383A]/50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-blue-500 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative">
          {/* Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-2xl sm:text-3xl">🔒</span>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-dark dark:text-white mb-2">
            Subscription Required
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Start your 7-day free trial to access all features. No credit card required.
          </p>

          {/* Device Info (subtle) */}
          {deviceInfo && (
            <div className="mb-6 px-3 sm:px-4 py-2 bg-amber-50/80 dark:bg-amber-500/10 rounded-xl border border-amber-200/30 dark:border-amber-500/15 inline-block max-w-full">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-amber-700/80 dark:text-amber-400/80 flex-wrap justify-center">
                <span>ℹ️</span>
                <span className="font-medium">Device tracked:</span>
                <span className="font-mono truncate">{deviceInfo.publicIP}</span>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <div className="space-y-3">
            <button
              onClick={handleStartTrial}
              disabled={activatingTrial}
              className={`w-full px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                activatingTrial
                  ? 'bg-gray-200 dark:bg-[#38383A] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
              }`}
            >
              {activatingTrial ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                  Activating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>🎁</span>
                  <span>Start 7-Day Free Trial</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
