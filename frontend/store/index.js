import { create } from 'zustand';

// Auth Store
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  userData: null,
  loading: true,

  setUser: (user, token, userData) => set({ user, token, userData, loading: false }),
  clearUser: () => set({ user: null, token: null, userData: null, loading: false }),
  updateUserData: (data) => set((state) => ({ userData: { ...state.userData, ...data } })),
  setLoading: (loading) => set({ loading }),

  // Logout (Firebase only - no backend call)
  logout: async () => {
    set({ user: null, token: null, userData: null, loading: false });
  },

  // Sync user data from API (optional - if you need to fetch from backend)
  syncUserData: async () => {
    try {
      const { authAPI } = await import('../lib/api');
      const userData = await authAPI.getProfile();
      set({ userData, loading: false });
      return userData;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));

// VPN Store
// No localStorage caching - always fetch from Firestore

export const useVpnStore = create((set, get) => ({
  devices: [],
  generating: false,
  selectedDevice: null,
  deviceConfigs: {}, // In-memory cache for configs/QR (not persisted)

  setDevices: (devices) => {
    console.log('setDevices: Setting', devices.length, 'devices');
    set({ devices });
  },

  addDevice: (device) => {
    const newDevices = [...get().devices, device];
    set({ devices: newDevices });
    // Store config in memory only
    if (device.config && device.qr) {
      const deviceId = device.device_id || device.id;
      set((state) => ({
        deviceConfigs: {
          ...state.deviceConfigs,
          [deviceId]: { config: device.config, qr: device.qr }
        }
      }));
    }
  },

  removeDevice: (deviceId) => {
    const state = get();
    const newDevices = state.devices.filter(d => d.id !== deviceId && d.device_id !== deviceId);
    // Remove from in-memory cache
    const newConfigs = { ...state.deviceConfigs };
    delete newConfigs[deviceId];
    set({ devices: newDevices, deviceConfigs: newConfigs });
  },

  setSelectedDevice: (device) => set({ selectedDevice: device }),

  setGenerating: (generating) => set({ generating }),

  // Update device with config/qr from API (in-memory only)
  updateDeviceConfig: (deviceId, config, qr) => {
    const state = get();
    // Update in-memory cache
    set((state) => ({
      deviceConfigs: {
        ...state.deviceConfigs,
        [deviceId]: { config, qr }
      }
    }));
    // Update in devices list
    const updatedDevices = state.devices.map(d =>
      d.id === deviceId || d.device_id === deviceId ? { ...d, config, qr } : d
    );
    set({
      devices: updatedDevices,
      selectedDevice: state.selectedDevice?.id === deviceId || state.selectedDevice?.device_id === deviceId
        ? { ...state.selectedDevice, config, qr }
        : state.selectedDevice
    });
  },

  // Get cached config from memory (not localStorage)
  getCachedConfig: (deviceId) => {
    const state = get();
    return state.deviceConfigs[deviceId] || null;
  },

  reset: () => {
    set({ devices: [], selectedDevice: null, generating: false, deviceConfigs: {} });
  },
}));

// Subscription Store
export const useSubscriptionStore = create((set) => ({
  subscription: null,
  loading: true,

  setSubscription: (subscription) => set({ subscription, loading: false }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ subscription: null, loading: true }),
}));

// UI Store
export const useUIStore = create((set) => ({
  activePage: 'dashboard',
  sidebarOpen: false,
  notification: null,

  // Request blocking/loading state
  pendingRequests: [], // Array of pending request keys e.g. ['generate_vpn', 'disable_peer']

  // Rate limit state
  rateLimitState: {
    isRateLimited: false,
    retryAfter: 0, // seconds until retry
    countdown: 0, // current countdown value
    progress: 0, // progress bar percentage
    requestKey: null, // which request triggered rate limit
  },

  setActivePage: (page) => set({ activePage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  showNotification: (message, type = 'success') => {
    set({ notification: { message, type } });
    setTimeout(() => set({ notification: null }), 3000);
  },

  // Add pending request
  addPendingRequest: (requestKey) => set((state) => ({
    pendingRequests: [...state.pendingRequests, requestKey]
  })),

  // Remove pending request
  removePendingRequest: (requestKey) => set((state) => ({
    pendingRequests: state.pendingRequests.filter(key => key !== requestKey)
  })),

  // Check if request is pending
  isRequestPending: (requestKey) => {
    const state = useUIStore.getState();
    return state.pendingRequests.includes(requestKey);
  },

  // Clear all pending requests
  clearPendingRequests: () => set({ pendingRequests: [] }),

  // Rate limit actions
  setRateLimited: (retryAfter, requestKey = null) => set({
    rateLimitState: {
      isRateLimited: true,
      retryAfter,
      countdown: retryAfter,
      progress: 0,
      requestKey,
    }
  }),

  updateRateLimitCountdown: (countdown, progress) => set((state) => ({
    rateLimitState: {
      ...state.rateLimitState,
      countdown,
      progress,
    }
  })),

  clearRateLimit: () => set({
    rateLimitState: {
      isRateLimited: false,
      retryAfter: 0,
      countdown: 0,
      progress: 0,
      requestKey: null,
    }
  }),

  isRateLimitedForRequest: (requestKey) => {
    const state = useUIStore.getState();
    return state.rateLimitState.isRateLimited && state.rateLimitState.requestKey === requestKey;
  },
}));

// Billing/Payment Store
export const useBillingStore = create((set) => ({
  billingEnabled: false,
  currency: 'IDR',
  plans: [],
  bankAccounts: [],
  loading: true,

  setBillingData: (data) => set({
    billingEnabled: data.billing_enabled || false,
    currency: data.currency || 'IDR',
    plans: data.plans || [],
    bankAccounts: data.bank_accounts || [],
    loading: false,
  }),
  setBillingEnabled: (enabled) => set({ billingEnabled: enabled }),
  resetBilling: () => set({
    billingEnabled: false,
    currency: 'IDR',
    plans: [],
    bankAccounts: [],
    loading: true,
  }),
}));

// API helper
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = useAuthStore.getState().token;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't add Content-Type for FormData (let browser set it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return res.json();
};

// Utility functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return new Date(dateString).toLocaleDateString('id-ID', { ...defaultOptions, ...options });
};

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Status helpers
export const getStatusStyle = (status) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
  };
  return styles[status] || 'bg-gray-100 text-gray-600';
};

export const getRiskStyle = (level) => {
  const styles = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-purple-100 text-purple-700',
  };
  return styles[level] || 'bg-gray-100 text-gray-600';
};
