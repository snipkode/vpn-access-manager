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
      <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-8 text-center border border-gray-200/50 dark:border-[#38383A]/50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-3xl">🔒</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-dark dark:text-white mb-2">
            Subscription Required
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Start your 7-day free trial to access all features. No credit card required.
          </p>

          {/* Device Info (subtle) */}
          {deviceInfo && (
            <div className="mb-6 px-4 py-2.5 bg-amber-50/80 dark:bg-amber-500/10 rounded-xl border border-amber-200/30 dark:border-amber-500/15 inline-block">
              <div className="flex items-center gap-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                <span>ℹ️</span>
                <span className="font-medium">Device tracked:</span>
                <span className="font-mono">{deviceInfo.publicIP}</span>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleStartTrial}
              disabled={activatingTrial}
              className={`w-full px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activatingTrial
                  ? 'bg-gray-200 dark:bg-[#38383A] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
              }`}
            >
              {activatingTrial ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                  Activating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>🎁</span>
                  <span>Start 7-Day Free Trial</span>
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] text-gray-400 dark:text-gray-500 rounded-full">
                  or
                </span>
              </div>
            </div>

            <button
              onClick={() => setActivePage('payment')}
              className="w-full px-6 py-3.5 bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#38383A] transition-all duration-200"
            >
              View Plans
            </button>
          </div>

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#38383A]/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl mb-1">📱</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">3 Devices</div>
              </div>
              <div>
                <div className="text-xl mb-1">⚡</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Unlimited</div>
              </div>
              <div>
                <div className="text-xl mb-1">🌍</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">All Servers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
