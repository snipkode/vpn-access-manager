import { useState, useEffect } from 'react';
import { useUIStore } from '../store';

/**
 * SubscriptionExpired - Warning UI for expired subscriptions
 * Shows fraud tracking warning and subscription renewal CTA
 */
export default function SubscriptionExpired({ subscription, onRenew }) {
  const { showNotification, setActivePage } = useUIStore();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [daysExpired, setDaysExpired] = useState(0);

  useEffect(() => {
    // Collect device fingerprinting info
    collectDeviceInfo();
    
    // Calculate days since expiration
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
        expiredAt: new Date().toISOString(),
      };

      // Try to get connected devices info
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          fingerprint.connectedDevices = devices.length;
          fingerprint.deviceTypes = devices.map(d => d.kind).filter((v, i, a) => a.indexOf(v) === i);
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

      // Canvas fingerprinting
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

      // WebRTC local IP detection (if available)
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        await pc.createOffer().then(offer => pc.setLocalDescription(offer));
        pc.onicecandidate = (ice) => {
          if (ice && ice.candidate && ice.candidate.candidate) {
            const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
            if (ipMatch) {
              fingerprint.localIP = ipMatch[1];
            }
          }
        };
      } catch (e) {
        console.log('WebRTC IP detection failed:', e.message);
      }

      setDeviceInfo(fingerprint);
      console.log('🔍 Expired user device fingerprint collected:', fingerprint);
      
      // Store for fraud tracking
      window.expiredUserInfo = {
        ...fingerprint,
        subscriptionEnd: subscription?.subscription_end,
        daysExpired: diffDays,
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

      {/* Overlay Mask - Expired Warning */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full mx-4 border border-red-200 dark:border-red-500/20 shadow-2xl">
          {/* Warning Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            <span className="text-3xl">⚠️</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-center text-dark dark:text-white mb-2">
            Subscription Expired
          </h3>

          {/* Days Expired */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-500/10 rounded-full">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{daysExpired}</span>
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">days expired</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your VPN access has been suspended. Renew your subscription to restore access.
          </p>

          {/* Fraud Tracking Warning */}
          {deviceInfo && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">🚨</span>
                <div className="text-xs text-red-700 dark:text-red-400 text-left flex-1">
                  <div className="font-bold mb-2 uppercase tracking-wide">Fraud Detection Active</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="opacity-70">Public IP:</span>
                      <span className="font-mono font-semibold">{deviceInfo.publicIP}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Device:</span>
                      <span className="font-semibold">{deviceInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Browser:</span>
                      <span className="font-semibold">{deviceInfo.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Devices:</span>
                      <span className="font-semibold">{deviceInfo.connectedDevices || 'N/A'}</span>
                    </div>
                    {deviceInfo.localIP && (
                      <div className="flex justify-between">
                        <span className="opacity-70">Local IP:</span>
                        <span className="font-mono font-semibold">{deviceInfo.localIP}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-red-600 dark:text-red-400 text-center pt-3 border-t border-red-200 dark:border-red-500/20">
                ⚠️ Unauthorized access attempts are logged and tracked
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRenewNow}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-1.5">
                <span>🔄</span>
                <span>Renew Subscription Now</span>
              </span>
            </button>

            <button
              onClick={() => setActivePage('payment')}
              className="w-full px-6 py-3 bg-white dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:border-primary dark:hover:border-primary-600 transition-all duration-200"
            >
              View Plans & Pricing
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-[#2C2C2E]/50 rounded-xl border border-gray-200 dark:border-[#38383A]">
            <div className="flex items-start gap-2">
              <span className="text-lg">🔐</span>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-left">
                <div className="font-semibold mb-1">Security Notice</div>
                <div className="leading-relaxed">
                  For your security, we track device fingerprints, IP addresses, and access patterns to prevent unauthorized usage.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
