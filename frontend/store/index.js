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
const VPN_STORAGE_KEY = 'vpn_devices_cache';

// Helper functions for localStorage
const getStoredDevices = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(VPN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get stored devices:', error);
    return [];
  }
};

const storeDevices = (devices) => {
  if (typeof window === 'undefined') return;
  try {
    // Only store basic device info, not config/qr (they can be regenerated)
    const devicesToStore = devices.map(({ config, qr, ...rest }) => rest);
    localStorage.setItem(VPN_STORAGE_KEY, JSON.stringify(devicesToStore));
  } catch (error) {
    console.error('Failed to store devices:', error);
  }
};

const getStoredDeviceConfig = (deviceId) => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${VPN_STORAGE_KEY}_config_${deviceId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get stored device config:', error);
    return null;
  }
};

const storeDeviceConfig = (deviceId, config, qr) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${VPN_STORAGE_KEY}_config_${deviceId}`, JSON.stringify({ config, qr }));
  } catch (error) {
    console.error('Failed to store device config:', error);
  }
};

const clearDeviceConfig = (deviceId) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${VPN_STORAGE_KEY}_config_${deviceId}`);
  } catch (error) {
    console.error('Failed to clear device config:', error);
  }
};

export const useVpnStore = create((set, get) => ({
  devices: [],
  generating: false,
  selectedDevice: null,

  setDevices: (devices) => {
    storeDevices(devices);
    set({ devices });
  },
  
  addDevice: (device) => {
    const newDevices = [...get().devices, device];
    storeDevices(newDevices);
    // Store config/qr separately
    if (device.config && device.qr) {
      storeDeviceConfig(device.device_id || device.id, device.config, device.qr);
    }
    set({ devices: newDevices });
  },
  
  removeDevice: (deviceId) => {
    const state = get();
    clearDeviceConfig(deviceId);
    const newDevices = state.devices.filter(d => d.id !== deviceId);
    storeDevices(newDevices);
    set({
      devices: newDevices,
      selectedDevice: state.selectedDevice?.id === deviceId ? null : state.selectedDevice,
    });
  },
  
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  
  setGenerating: (generating) => set({ generating }),
  
  // Update device with config/qr from API
  updateDeviceConfig: (deviceId, config, qr) => {
    const state = get();
    storeDeviceConfig(deviceId, config, qr);
    // Update in devices list
    const updatedDevices = state.devices.map(d => 
      d.id === deviceId ? { ...d, config, qr } : d
    );
    storeDevices(updatedDevices);
    set({ 
      devices: updatedDevices,
      selectedDevice: state.selectedDevice?.id === deviceId 
        ? { ...state.selectedDevice, config, qr } 
        : state.selectedDevice 
    });
  },
  
  // Get cached config for a device
  getCachedConfig: (deviceId) => getStoredDeviceConfig(deviceId),
  
  reset: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(VPN_STORAGE_KEY);
    }
    set({ devices: [], selectedDevice: null, generating: false });
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

  setActivePage: (page) => set({ activePage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  showNotification: (message, type = 'success') => {
    set({ notification: { message, type } });
    setTimeout(() => set({ notification: null }), 3000);
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
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
