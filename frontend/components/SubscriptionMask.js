import { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import { billingAPI } from '../lib/api';

/**
 * SubscriptionMask - Overlay mask for non-subscribed users
 * Shows CTA to start trial or subscribe
 */
export default function SubscriptionMask({ onActivateTrial, activatingTrial }) {
  const { showNotification, setActivePage } = useUIStore();
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    // Collect device fingerprinting info
    collectDeviceInfo();
  }, []);

  const collectDeviceInfo = async () => {
    try {
      // Get IP address from API
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      // Collect browser fingerprint
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookiesEnabled,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        publicIP: ipData.ip || 'unknown',
        timestamp: new Date().toISOString(),
      };

      // Try to get MAC address (limited browser support, but we try)
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          fingerprint.connectedDevices = devices.length;
          fingerprint.deviceLabels = devices.map(d => d.kind).filter((v, i, a) => a.indexOf(v) === i);
        } catch (e) {
          console.log('Cannot enumerate devices:', e.message);
        }
      }

      // Get connection info
      if (navigator.connection) {
        fingerprint.connection = {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
        };
      }

      // Canvas fingerprinting (basic)
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        fingerprint.canvasFingerprint = canvas.toDataURL().substring(0, 100);
      } catch (e) {
        console.log('Canvas fingerprinting failed:', e.message);
      }

      setDeviceInfo(fingerprint);
      console.log('🔍 Device fingerprint collected:', fingerprint);
    } catch (error) {
      console.error('❌ Failed to collect device info:', error);
    }
  };

  const handleStartTrial = async () => {
    if (!onActivateTrial) return;
    
    // Attach device info to window for backend to capture
    window.pendingTrialDeviceInfo = deviceInfo;
    await onActivateTrial();
  };

  return (
    <div className="relative">
      {/* Blurred Background */}
      <div className="filter blur-xl opacity-50 select-none pointer-events-none">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 mb-4">
          <div className="h-8 bg-gray-200 dark:bg-[#2C2C2E] rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 dark:bg-[#38383A] rounded-xl" />
            <div className="h-12 bg-gray-100 dark:bg-[#38383A] rounded-xl" />
            <div className="h-12 bg-gray-100 dark:bg-[#38383A] rounded-xl" />
          </div>
        </div>
      </div>

      {/* Overlay Mask */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-[#38383A] shadow-2xl">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-3xl">🔒</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-center text-dark dark:text-white mb-2">
            Subscription Required
          </h3>

          {/* Description */}
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            This feature is only available for active subscribers. Start your free trial or subscribe to continue.
          </p>

          {/* Device Info Warning */}
          {deviceInfo && (
            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <div className="flex items-start gap-2">
                <span className="text-lg">ℹ️</span>
                <div className="text-xs text-amber-700 dark:text-amber-400 text-left">
                  <div className="font-semibold mb-1">Device Information Recorded</div>
                  <div className="space-y-0.5 text-[10px] opacity-80">
                    <div>IP: {deviceInfo.publicIP}</div>
                    <div>Device: {deviceInfo.platform}</div>
                    <div>Browser: {deviceInfo.language}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleStartTrial}
              disabled={activatingTrial}
              className={`w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activatingTrial
                  ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-[#38383A]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-[#1C1C1E] text-gray-400">or</span>
              </div>
            </div>

            <button
              onClick={() => setActivePage('payment')}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/90 dark:from-primary-600 dark:to-primary-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
            >
              View Subscription Plans
            </button>
          </div>

          {/* Features */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-[#38383A]">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg mb-1">📱</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">3 Devices</div>
              </div>
              <div>
                <div className="text-lg mb-1">⚡</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Unlimited</div>
              </div>
              <div>
                <div className="text-lg mb-1">🌍</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">All Servers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
