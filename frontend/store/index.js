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
}));

// VPN Store
export const useVpnStore = create((set) => ({
  devices: [],
  generating: false,
  selectedDevice: null,

  setDevices: (devices) => set({ devices }),
  addDevice: (device) => set((state) => ({ devices: [...state.devices, device] })),
  removeDevice: (deviceId) => set((state) => ({ 
    devices: state.devices.filter(d => d.id !== deviceId),
    selectedDevice: state.selectedDevice?.id === deviceId ? null : state.selectedDevice,
  })),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setGenerating: (generating) => set({ generating }),
  reset: () => set({ devices: [], selectedDevice: null, generating: false }),
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
