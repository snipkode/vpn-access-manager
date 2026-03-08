/**
 * VPN Access API Client
 * Integrated with Swagger API documentation at http://localhost:3000/api-docs/
 */

import { useAuthStore, useUIStore } from '../store';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Refresh Firebase token
 */
const refreshAuthToken = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('⚠️ No Firebase user logged in');
      return null;
    }

    // Get fresh ID token (forces refresh if expired)
    const freshToken = await currentUser.getIdToken(true);
    console.log('✅ Token refreshed successfully');
    
    // Update store with new token
    useAuthStore.getState().setUser(
      currentUser,
      freshToken,
      useAuthStore.getState().userData
    );
    
    return freshToken;
  } catch (error) {
    console.error('❌ Failed to refresh token:', error.message);
    return null;
  }
};

/**
 * Handle token expiration - logout user
 */
const handleTokenExpired = async () => {
  console.warn('🚫 Token expired - logging out user');
  
  try {
    const { clearUser } = useAuthStore.getState();
    const { showNotification } = useUIStore.getState();
    
    // Clear user data
    clearUser();
    
    // Show notification
    showNotification('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
    
    // Redirect to login (optional - Firebase will handle this)
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  } catch (error) {
    console.error('❌ Error during logout:', error);
  }
};

/**
 * Base API fetch with authentication and request locking
 * Handles standardized API response format
 */
export const apiFetch = async (endpoint, options = {}, requestKey = null) => {
  let token = useAuthStore.getState().token;

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

  // Add request to pending list if requestKey provided
  if (requestKey) {
    useUIStore.getState().addPendingRequest(requestKey);
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Parse response - handle empty responses gracefully
    let responseData = {};
    try {
      responseData = await res.json();
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON response:', parseError.message);
      console.warn('Response status:', res.status);
      console.warn('Response text:', await res.text().catch(() => 'Unable to read'));
      responseData = {
        success: false,
        error: res.ok ? 'Empty response from server' : `HTTP ${res.status}: ${res.statusText}`
      };
    }

    if (!res.ok) {
      // Handle token expiration (401)
      if (res.status === 401) {
        const errorData = responseData.details || responseData.error || '';
        const isTokenExpired = errorData.includes('id-token-expired') || 
                               errorData.includes('token has expired') ||
                               errorData.includes('invalid token');
        
        if (isTokenExpired) {
          console.warn('⚠️ Token expired detected, attempting refresh...');
          
          // Try to refresh token
          const freshToken = await refreshAuthToken();
          
          if (freshToken) {
            // Retry request with new token
            console.log('🔄 Retrying request with fresh token...');
            headers['Authorization'] = `Bearer ${freshToken}`;
            
            const retryRes = await fetch(`${API_URL}${endpoint}`, {
              ...options,
              headers,
            });
            
            if (retryRes.ok) {
              return await retryRes.json();
            }
            
            // If retry also fails, continue to error handling
            responseData = await retryRes.json().catch(() => ({ error: 'Retry failed' }));
          } else {
            // Token refresh failed, logout user
            await handleTokenExpired();
            throw new Error('Token expired. Please login again.');
          }
        }
        
        // If we get here, authentication failed
        if (res.status === 401) {
          await handleTokenExpired();
          throw new Error('Authentication failed. Please login again.');
        }
      }

      console.error('❌ API Error:', {
        status: res.status,
        statusText: res.statusText,
        data: responseData,
        endpoint,
      });

      // Handle rate limit (429)
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') || responseData.retryAfter || 30;
        const rateLimitError = new Error(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        );
        rateLimitError.code = 'RATE_LIMIT';
        rateLimitError.status = 429;
        rateLimitError.retryAfter = parseInt(retryAfter);
        throw rateLimitError;
      }

      // Use standardized error message from response
      throw new Error(responseData.message || responseData.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    // Return data from standardized response
    // If response has { success: true, data: {...} }, return data
    // Otherwise return the whole response for backward compatibility
    return responseData.data || responseData;
  } catch (error) {
    console.error('❌ API Fetch Error:', {
      endpoint,
      message: error.message,
      stack: error.stack,
    });

    // Re-throw rate limit errors with special handling
    if (error.code === 'RATE_LIMIT' || error.status === 429) {
      throw error;
    }
    
    // Don't throw if already handled (token expired)
    if (error.message.includes('Token expired') || error.message.includes('Authentication failed')) {
      throw error;
    }
    
    throw error;
  } finally {
    // Remove request from pending list
    if (requestKey) {
      useUIStore.getState().removePendingRequest(requestKey);
    }
  }
};

/**
 * Auth API - Authentication and user management
 */
export const authAPI = {
  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile: async () => {
    return apiFetch('/auth/profile');
  },

  /**
   * Login with Firebase token
   * POST /api/auth/login
   */
  login: async (firebaseToken) => {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ firebase_token: firebaseToken }),
    });
  },

  /**
   * Logout
   * POST /api/auth/logout
   */
  logout: async () => {
    return apiFetch('/auth/logout', { method: 'POST' });
  },
};

/**
 * User API - User profile management
 */
export const userAPI = {
  /**
   * Get user profile
   * GET /api/user/profile
   */
  getProfile: async () => {
    return apiFetch('/user/profile');
  },

  /**
   * Update user profile
   * PATCH /api/user/profile
   */
  updateProfile: async (data) => {
    return apiFetch('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

/**
 * VPN API - VPN devices and configurations
 */
export const vpnAPI = {
  /**
   * Get user's VPN devices
   * GET /api/vpn/devices
   */
  getDevices: async () => {
    return apiFetch('/vpn/devices', {}, 'get_vpn_devices');
  },

  /**
   * Generate VPN config for new device
   * POST /api/vpn/generate
   */
  generateConfig: async (deviceName) => {
    console.log('🔵 vpnAPI.generateConfig called with:', deviceName);
    const requestBody = { device_name: deviceName };
    console.log('🔵 Request body:', JSON.stringify(requestBody));
    return apiFetch('/vpn/generate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }, 'generate_vpn');
  },

  /**
   * Delete/revoke a device
   * DELETE /api/vpn/device/:id
   */
  deleteDevice: async (deviceId) => {
    return apiFetch(`/vpn/device/${deviceId}`, { method: 'DELETE' }, 'delete_vpn_device');
  },

  /**
   * Get device details
   * GET /api/vpn/device/:id
   */
  getDevice: async (deviceId) => {
    return apiFetch(`/vpn/device/${deviceId}`, {}, 'get_vpn_device');
  },

  /**
   * Disable a device (admin)
   * POST /api/vpn/device/:id/disable
   */
  disableDevice: async (deviceId) => {
    return apiFetch(`/vpn/device/${deviceId}/disable`, { method: 'POST' }, 'disable_vpn_device');
  },

  /**
   * Reactivate a device (admin)
   * POST /api/vpn/device/:id/reactivate
   */
  reactivateDevice: async (deviceId) => {
    return apiFetch(`/vpn/device/${deviceId}/reactivate`, { method: 'POST' }, 'reactivate_vpn_device');
  },
};

/**
 * Billing API - Subscription and payments
 */
export const billingAPI = {
  /**
   * Get billing settings (plans, banks, etc.)
   * GET /api/payment-settings/config
   */
  getSettings: async () => {
    return apiFetch('/payment-settings/config');
  },

  /**
   * Get user subscription
   * GET /api/billing/subscription
   */
  getSubscription: async () => {
    return apiFetch('/billing/subscription');
  },

  /**
   * Activate 7-day free trial
   * POST /api/billing/trial
   */
  activateTrial: async () => {
    return apiFetch('/billing/trial', { method: 'POST' }, 'activate_trial');
  },

  /**
   * Get user payments history
   * GET /api/billing/history
   */
  getPayments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/billing/history?${queryString}` : '/billing/history';
    return apiFetch(url);
  },

  /**
   * Submit payment proof
   * POST /api/billing/submit
   */
  submitPayment: async (formData) => {
    return apiFetch('/billing/submit', {
      method: 'POST',
      body: formData, // FormData object with proof_image, plan, bank_from, transfer_date
    });
  },

  /**
   * Get payment details
   * GET /api/billing/payment/:id
   */
  getPayment: async (paymentId) => {
    return apiFetch(`/billing/payment/${paymentId}`);
  },
};

/**
 * Credit API - User credit balance and transactions
 */
export const creditAPI = {
  /**
   * Get user credit balance
   * GET /api/credit/balance
   */
  getBalance: async () => {
    return apiFetch('/credit/balance');
  },

  /**
   * Sync user credit balance
   * POST /api/credit/sync
   */
  syncBalance: async () => {
    return apiFetch('/credit/sync', { method: 'POST' });
  },

  /**
   * Get credit transactions history
   * GET /api/credit/transactions
   */
  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/credit/transactions?${queryString}` : '/credit/transactions';
    return apiFetch(url);
  },

  /**
   * Transfer credit to another user
   * POST /api/credit/transfer
   */
  transfer: async (data) => {
    return apiFetch('/credit/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Referral API - Referral program
 */
export const referralAPI = {
  /**
   * Get or create user's referral code
   * GET /api/referral/code
   */
  getCode: async () => {
    return apiFetch('/referral/code');
  },

  /**
   * Get referral statistics
   * GET /api/referral/stats
   */
  getStats: async () => {
    return apiFetch('/referral/stats');
  },

  /**
   * Get referral earnings history
   * GET /api/referral/earnings
   */
  getEarnings: async () => {
    return apiFetch('/referral/earnings');
  },

  /**
   * Track referral signup
   * POST /api/referral/track
   */
  track: async (data) => {
    return apiFetch('/referral/track', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Notifications API - User notifications
 */
export const notificationsAPI = {
  /**
   * Get user notifications
   * GET /api/user/notifications
   */
  getNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/user/notifications?${queryString}` : '/user/notifications';
    return apiFetch(url);
  },

  /**
   * Get notification history
   * GET /api/user/notifications/history
   */
  getHistory: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/user/notifications/history?${queryString}` : '/user/notifications/history';
    return apiFetch(url);
  },

  /**
   * Mark notification as read
   * PATCH /api/user/notifications/:id/read
   */
  markAsRead: async (notificationId) => {
    return apiFetch(`/user/notifications/${notificationId}/read`, { method: 'PATCH' });
  },

  /**
   * Mark all notifications as read
   * PATCH /api/user/notifications/read-all
   */
  markAllAsRead: async () => {
    return apiFetch('/user/notifications/read-all', { method: 'PATCH' });
  },

  /**
   * Update notification preferences
   * PATCH /api/user/notifications/preferences
   */
  updatePreferences: async (preferences) => {
    return apiFetch('/user/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  },
};

/**
 * Admin Users API - User management (Admin only)
 */
export const adminUsersAPI = {
  /**
   * Get all users with filters
   * GET /api/admin/users
   */
  getUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/users?${queryString}` : '/admin/users';
    return apiFetch(url);
  },

  /**
   * Get user details
   * GET /api/admin/users/:id
   */
  getUser: async (userId) => {
    return apiFetch(`/admin/users/${userId}`);
  },

  /**
   * Update user (role, vpn_enabled, etc.)
   * PATCH /api/admin/users/:id
   */
  updateUser: async (userId, data) => {
    return apiFetch(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update user role
   * PATCH /api/admin/users/:id/role
   */
  updateUserRole: async (userId, role) => {
    return apiFetch(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Delete user
   * DELETE /api/admin/users/:id
   */
  deleteUser: async (userId) => {
    return apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  /**
   * Get user devices
   * GET /api/admin/users/:id/devices
   */
  getUserDevices: async (userId) => {
    return apiFetch(`/admin/users/${userId}/devices`);
  },

  /**
   * Get user payments
   * GET /api/admin/users/:id/payments
   */
  getUserPayments: async (userId) => {
    return apiFetch(`/admin/users/${userId}/payments`);
  },

  /**
   * Get user transactions
   * GET /api/admin/users/:id/transactions
   */
  getUserTransactions: async (userId) => {
    return apiFetch(`/admin/users/${userId}/transactions`);
  },

  /**
   * Enable VPN for user
   * POST /api/admin/users/:id/enable-vpn
   */
  enableVpn: async (userId) => {
    return apiFetch(`/admin/users/${userId}/enable-vpn`, { method: 'POST' });
  },

  /**
   * Disable VPN for user
   * POST /api/admin/users/:id/disable-vpn
   */
  disableVpn: async (userId) => {
    return apiFetch(`/admin/users/${userId}/disable-vpn`, { method: 'POST' });
  },

  /**
   * Reset user subscription
   * POST /api/admin/users/:id/reset-subscription
   */
  resetSubscription: async (userId) => {
    return apiFetch(`/admin/users/${userId}/reset-subscription`, { method: 'POST' });
  },

  /**
   * Extend user subscription
   * POST /api/admin/users/:id/extend-subscription
   */
  extendSubscription: async (userId, days) => {
    return apiFetch(`/admin/users/${userId}/extend-subscription`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },
};

/**
 * Admin Payments API - Payment management (Admin only)
 * Note: Backend routes are at /api/admin/billing/*
 */
export const adminPaymentsAPI = {
  /**
   * Get all payments with filters
   * GET /api/admin/billing/payments
   */
  getPayments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/billing/payments?${queryString}` : '/admin/billing/payments';
    return apiFetch(url);
  },

  /**
   * Get payment details
   * GET /api/admin/billing/payments/:id
   */
  getPayment: async (paymentId) => {
    return apiFetch(`/admin/billing/payments/${paymentId}`);
  },

  /**
   * Approve payment
   * POST /api/admin/billing/payments/:id/approve
   */
  approvePayment: async (paymentId, data = {}) => {
    return apiFetch(`/admin/billing/payments/${paymentId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Reject payment
   * POST /api/admin/billing/payments/:id/reject
   */
  rejectPayment: async (paymentId, data = {}) => {
    return apiFetch(`/admin/billing/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get statistics
   * GET /api/admin/billing/stats
   */
  getStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/billing/stats?${queryString}` : '/admin/billing/stats';
    return apiFetch(url);
  },
};

/**
 * Admin Billing API - Billing management (Admin only)
 */
export const adminBillingAPI = {
  /**
   * Get billing dashboard data
   * GET /api/admin/billing/dashboard
   */
  getDashboard: async () => {
    return apiFetch('/admin/billing/dashboard');
  },

  /**
   * Get billing settings
   * GET /api/payment-settings/settings
   */
  getSettings: async () => {
    return apiFetch('/payment-settings/settings');
  },

  /**
   * Update billing settings
   * PATCH /api/payment-settings/settings
   */
  updateSettings: async (data) => {
    return apiFetch('/payment-settings/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all subscription plans
   * GET /api/admin/billing/plans
   */
  getPlans: async () => {
    return apiFetch('/admin/billing/plans');
  },

  /**
   * Save all subscription plans (bulk update)
   * POST /api/admin/billing/plans
   */
  savePlans: async (plans) => {
    return apiFetch('/admin/billing/plans', {
      method: 'POST',
      body: JSON.stringify({ plans }),
    });
  },

  /**
   * Delete plan
   * DELETE /api/admin/billing/plans/:id
   */
  deletePlan: async (planId) => {
    return apiFetch(`/admin/billing/plans/${planId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update plan
   * PATCH /api/admin/billing/plans/:id
   */
  updatePlan: async (planId, data) => {
    return apiFetch(`/admin/billing/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get bank accounts
   * GET /api/admin/billing/bank-accounts
   */
  getBankAccounts: async () => {
    return apiFetch('/admin/billing/bank-accounts');
  },

  /**
   * Add bank account
   * POST /api/admin/billing/bank-accounts
   */
  addBankAccount: async (data) => {
    return apiFetch('/admin/billing/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update bank account
   * PATCH /api/admin/billing/bank-accounts/:id
   */
  updateBankAccount: async (bankId, data) => {
    return apiFetch(`/admin/billing/bank-accounts/${bankId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete bank account
   * DELETE /api/admin/billing/bank-accounts/:id
   */
  deleteBankAccount: async (bankId) => {
    return apiFetch(`/admin/billing/bank-accounts/${bankId}`, { method: 'DELETE' });
  },
};

/**
 * Admin Credit API - Credit management (Admin only)
 */
export const adminCreditAPI = {
  /**
   * Get credit dashboard
   * GET /api/admin/credit/dashboard
   */
  getDashboard: async () => {
    return apiFetch('/admin/credit/dashboard');
  },

  /**
   * Get all credit transactions
   * GET /api/admin/credit/transactions
   */
  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/credit/transactions?${queryString}` : '/admin/credit/transactions';
    return apiFetch(url);
  },

  /**
   * Get fraud alerts
   * GET /api/admin/credit/fraud-alerts
   */
  getFraudAlerts: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/credit/fraud-alerts?${queryString}` : '/admin/credit/fraud-alerts';
    return apiFetch(url);
  },

  /**
   * Review fraud alert
   * PATCH /api/admin/credit/fraud-alerts/:id/review
   */
  reviewFraudAlert: async (alertId, action, notes = '') => {
    return apiFetch(`/admin/credit/fraud-alerts/${alertId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, notes }),
    });
  },

  /**
   * Get credit statistics
   * GET /api/admin/credit/stats
   */
  getStats: async () => {
    return apiFetch('/admin/credit/stats');
  },

  /**
   * Add credit to user
   * POST /api/admin/credit/users/:id/add
   */
  addCredit: async (userId, data) => {
    return apiFetch(`/admin/credit/users/${userId}/add`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deduct credit from user
   * POST /api/admin/credit/users/:id/deduct
   */
  deductCredit: async (userId, data) => {
    return apiFetch(`/admin/credit/users/${userId}/deduct`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Admin Referral API - Referral management (Admin only)
 */
export const adminReferralAPI = {
  /**
   * Get referral stats (admin overview)
   * GET /api/admin/referral/stats
   */
  getStats: async () => {
    return apiFetch('/admin/referral/stats');
  },

  /**
   * Get user referral details
   * GET /api/admin/referral/users/:id
   */
  getUser: async (userId) => {
    return apiFetch(`/admin/referral/users/${userId}`);
  },

  /**
   * Get referral events with filters
   * GET /api/admin/referral/events
   */
  getEvents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/referral/events?${queryString}` : '/admin/referral/events';
    return apiFetch(url);
  },

  /**
   * Get referral config/settings
   * GET /api/admin/referral/config
   */
  getConfig: async () => {
    return apiFetch('/admin/referral/config');
  },

  /**
   * Update referral config/settings
   * PATCH /api/admin/referral/config
   */
  updateConfig: async (data) => {
    return apiFetch('/admin/referral/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get fraud suspects
   * GET /api/admin/referral/fraud/suspects
   */
  getFraudSuspects: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/referral/fraud/suspects?${queryString}` : '/admin/referral/fraud/suspects';
    return apiFetch(url);
  },

  /**
   * Review fraud event
   * PATCH /api/admin/referral/events/:id/review
   */
  reviewEvent: async (eventId, data) => {
    return apiFetch(`/admin/referral/events/${eventId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Admin Settings API - System settings (Admin only)
 */
export const adminSettingsAPI = {
  /**
   * Get all settings
   * GET /api/admin/settings
   */
  getSettings: async () => {
    return apiFetch('/admin/settings');
  },

  /**
   * Get settings by category
   * GET /api/admin/settings/:category
   */
  getCategory: async (category) => {
    return apiFetch(`/admin/settings/${category}`);
  },

  /**
   * Update settings by category
   * PATCH /api/admin/settings/:category
   */
  updateSettings: async (category, data) => {
    return apiFetch(`/admin/settings/${category}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Test WhatsApp connection
   * POST /api/admin/settings/whatsapp/test
   */
  testWhatsApp: async (data = {}) => {
    return apiFetch('/admin/settings/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Test email connection
   * POST /api/admin/settings/email/test
   */
  testEmail: async (data = {}) => {
    return apiFetch('/admin/settings/email/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Admin Dashboard API - Dashboard statistics (Admin only)
 */
export const adminDashboardAPI = {
  /**
   * Get dashboard statistics
   * GET /api/admin/stats
   */
  getStats: async () => {
    return apiFetch('/admin/stats');
  },

  /**
   * Get recent activity
   * GET /api/admin/dashboard/activity
   */
  getActivity: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/dashboard/activity?${queryString}` : '/admin/dashboard/activity';
    return apiFetch(url);
  },
};

/**
 * Admin Devices API - Device management (Admin only)
 */
export const adminDevicesAPI = {
  /**
   * Get all devices
   * GET /api/admin/devices
   */
  getDevices: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/admin/devices?${queryString}` : '/admin/devices';
    return apiFetch(url, {}, 'get_admin_devices');
  },

  /**
   * Get device details
   * GET /api/admin/device/:id
   */
  getDevice: async (deviceId) => {
    return apiFetch(`/admin/device/${deviceId}`, {}, 'get_admin_device');
  },

  /**
   * Delete device
   * DELETE /api/admin/device/:id
   */
  deleteDevice: async (deviceId) => {
    return apiFetch(`/admin/device/${deviceId}`, { method: 'DELETE' }, 'delete_admin_device');
  },

  /**
   * Reset device IP
   * POST /api/admin/device/:id/reset-ip
   */
  resetDeviceIP: async (deviceId) => {
    return apiFetch(`/admin/device/${deviceId}/reset-ip`, { method: 'POST' }, 'reset_device_ip');
  },

  /**
   * Disable device
   * POST /api/admin/device/:id/disable
   */
  disableDevice: async (deviceId) => {
    return apiFetch(`/admin/device/${deviceId}/disable`, { method: 'POST' }, 'disable_admin_device');
  },

  /**
   * Reactivate device
   * POST /api/admin/device/:id/reactivate
   */
  reactivateDevice: async (deviceId) => {
    return apiFetch(`/admin/device/${deviceId}/reactivate`, { method: 'POST' }, 'reactivate_admin_device');
  },
};

/**
 * Admin VPN API - WireGuard management (Admin only)
 */
export const adminVpnAPI = {
  /**
   * Get WireGuard health status
   * GET /api/vpn/health
   */
  getHealth: async () => {
    return apiFetch('/vpn/health', {}, 'get_vpn_health');
  },

  /**
   * Get IP pool status
   * GET /api/vpn/ip-pool
   */
  getIpPool: async () => {
    return apiFetch('/vpn/ip-pool', {}, 'get_vpn_ip_pool');
  },

  /**
   * Sync WireGuard with Firestore
   * POST /api/vpn/sync
   */
  sync: async () => {
    return apiFetch('/vpn/sync', { method: 'POST' }, 'sync_vpn');
  },

  /**
   * Run expired lease cleanup
   * POST /api/vpn/admin/leases/cleanup
   */
  cleanupLeases: async () => {
    return apiFetch('/vpn/admin/leases/cleanup', { method: 'POST' }, 'cleanup_vpn_leases');
  },

  /**
   * Extend device lease
   * POST /api/vpn/admin/device/:id/extend-lease
   */
  extendLease: async (deviceId, days = 30) => {
    return apiFetch(`/vpn/admin/device/${deviceId}/extend-lease`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    }, 'extend_vpn_lease');
  },

  /**
   * Renew device lease from subscription
   * POST /api/vpn/admin/device/:id/renew-lease
   */
  renewLease: async (deviceId) => {
    return apiFetch(`/vpn/admin/device/${deviceId}/renew-lease`, { method: 'POST' }, 'renew_vpn_lease');
  },
};

/**
 * Export all API modules
 */
export default {
  auth: authAPI,
  user: userAPI,
  vpn: vpnAPI,
  billing: billingAPI,
  credit: creditAPI,
  referral: referralAPI,
  notifications: notificationsAPI,
  admin: {
    users: adminUsersAPI,
    payments: adminPaymentsAPI,
    billing: adminBillingAPI,
    credit: adminCreditAPI,
    referral: adminReferralAPI,
    settings: adminSettingsAPI,
    dashboard: adminDashboardAPI,
    devices: adminDevicesAPI,
    vpn: adminVpnAPI,
  },
};

/**
 * Utility functions
 */
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
