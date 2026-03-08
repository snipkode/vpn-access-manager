import { useState, useEffect } from 'react';
import { useUIStore } from '../store';

/**
 * SubscriptionExpired - Warning UI for expired subscriptions
 * Clean design with fraud tracking info
 */
export default function SubscriptionExpired({ subscription, onRenew }) {
  const { showNotification, setActivePage } = useUIStore();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [daysExpired, setDaysExpired] = useState(0);

  useEffect(() => {
    collectDeviceInfo();
    
    if (subscription?.subscription_end) {
      const endDate = new Date(subscription.subscription_end);
      const now = new Date();
      const diffTime = Math.abs(now - endDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysExpired(diffDays);
    }
  }, [subscription]);

  const collectDeviceInfo = async () => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      const fingerprint = {
        publicIP: ipData.ip || 'unknown',
        platform: navigator.platform,
        language: navigator.language,
        connectedDevices: 0,
      };

      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          fingerprint.connectedDevices = devices.length;
        } catch (e) {
          console.log('Cannot enumerate devices:', e.message);
        }
      }

      setDeviceInfo(fingerprint);
      window.expiredUserInfo = {
        ...fingerprint,
        subscriptionEnd: subscription?.subscription_end,
        daysExpired,
      };
    } catch (error) {
      console.error('❌ Failed to collect device info:', error);
    }
  };

  const handleRenewNow = () => {
    if (onRenew) {
      onRenew();
    } else {
      setActivePage('payment');
    }
  };

  return (
    <div className="relative w-full">
      {/* Card */}
      <div className="bg-gradient-to-br from-red-50 to-red-100/60 dark:from-red-500/10 dark:to-red-500/5 rounded-2xl p-8 text-center border border-red-200/50 dark:border-red-500/20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-600 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            <span className="text-3xl">⚠️</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-dark dark:text-white mb-2">
            Subscription Expired
          </h3>

          {/* Days Expired Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100/80 dark:bg-red-500/15 rounded-full mb-4">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{daysExpired}</span>
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">days expired</span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your VPN access has been suspended. Renew to restore full access.
          </p>

          {/* Fraud Tracking Warning */}
          {deviceInfo && (
            <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-500/10 rounded-xl border border-red-200/40 dark:border-red-500/15">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl mt-0.5">🚨</span>
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-red-700 dark:text-red-400 mb-2 uppercase tracking-wide">
                    Fraud Detection Active
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-red-700/80 dark:text-red-300/80">
                    <div className="flex justify-between">
                      <span className="opacity-70">IP:</span>
                      <span className="font-mono font-medium">{deviceInfo.publicIP}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Device:</span>
                      <span className="font-medium">{deviceInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Browser:</span>
                      <span className="font-medium">{deviceInfo.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Devices:</span>
                      <span className="font-medium">{deviceInfo.connectedDevices}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-red-600 dark:text-red-400 pt-3 border-t border-red-200/40 dark:border-red-500/15 font-medium">
                ⚠️ Unauthorized access is logged and tracked
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRenewNow}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🔄</span>
                <span>Renew Subscription Now</span>
              </span>
            </button>

            <button
              onClick={() => setActivePage('payment')}
              className="w-full px-6 py-3.5 bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#38383A] transition-all duration-200"
            >
              View Plans
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-50/80 dark:bg-[#2C2C2E]/50 rounded-xl border border-gray-200/50 dark:border-[#38383A]/50">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🔐</span>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Security Notice
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  We track device fingerprints and IP addresses to prevent unauthorized usage.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
