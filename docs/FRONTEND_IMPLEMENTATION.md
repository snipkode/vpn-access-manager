# 📱 Frontend Implementation Guide - VPN Access System

Dokumentasi lengkap untuk frontend developer dalam mengimplementasikan semua fitur VPN Access Backend.

---

## 📋 Table of Contents

1. [Tech Stack Recommendation](#tech-stack-recommendation)
2. [Project Structure](#project-structure)
3. [Environment Setup](#environment-setup)
4. [Authentication Flow](#authentication-flow)
5. [API Integration](#api-integration)
6. [Feature Implementation](#feature-implementation)
7. [State Management](#state-management)
8. [UI Components](#ui-components)
9. [Error Handling](#error-handling)
10. [Security Best Practices](#security-best-practices)

---

## 🛠️ Tech Stack Recommendation

### Recommended Stack
```json
{
  "framework": "Next.js 14+ (App Router)",
  "ui": "Material-UI (MUI) v5",
  "state": "Zustand + React Query",
  "auth": "Firebase SDK (Client)",
  "http": "Axios",
  "forms": "React Hook Form",
  "validation": "Zod",
  "charts": "Recharts",
  "tables": "TanStack Table"
}
```

### Alternative Stacks

| Stack | Framework | UI Library | State |
|-------|-----------|------------|-------|
| **Option A** | Next.js | Material-UI | Zustand |
| **Option B** | React Vite | Ant Design | Redux Toolkit |
| **Option C** | Vue 3 | Vuetify | Pinia |

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── vpn/
│   │   │   ├── billing/
│   │   │   ├── credit/
│   │   │   ├── referral/
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── users/
│   │   │   │   ├── payments/
│   │   │   │   ├── credit/
│   │   │   │   ├── backup/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── forms/              # Form components
│   │   ├── tables/             # Table components
│   │   ├── charts/             # Chart components
│   │   └── layout/             # Layout components
│   ├── lib/
│   │   ├── api/                # API client & endpoints
│   │   ├── firebase/           # Firebase config
│   │   ├── hooks/              # Custom hooks
│   │   └── utils/              # Utility functions
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript types
│   └── middleware.ts           # Next.js middleware (auth)
├── .env.local
├── next.config.js
└── package.json
```

---

## ⚙️ Environment Setup

### `.env.local`
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# App
NEXT_PUBLIC_APP_NAME=VPN Access
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## 🔐 Authentication Flow

### Firebase + Backend Auth Integration

```typescript
// lib/firebase/client.ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';
import { api } from '@/lib/api';

interface User {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  vpn_enabled: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      
      // Verify with backend
      const response = await api.post('/auth/verify', { token });
      
      set({
        user: response.data.user,
        token,
        isLoading: false,
      });
      
      // Store token for API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('auth_token', token);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, token: null });
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
  },

  refreshToken: async () => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      set({ token });
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('auth_token', token);
    }
  },
}));
```

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  const { pathname } = request.nextUrl;

  // Protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    const role = request.cookies.get('user_role');
    if (role?.value !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
```

---

## 🔌 API Integration

### API Client Setup

```typescript
// lib/api/index.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 429) {
      // Rate limited
      const retryAfter = error.response.data.retryAfter;
      console.warn(`Rate limited. Retry after ${retryAfter}s`);
    }
    
    return Promise.reject(error);
  }
);
```

### API Endpoints

```typescript
// lib/api/endpoints.ts
export const endpoints = {
  // Auth
  auth: {
    verify: '/auth/verify',
    me: '/auth/me',
  },
  
  // User
  user: {
    profile: '/user/profile',
    preferences: '/user/preferences',
  },
  
  // VPN
  vpn: {
    generate: '/vpn/generate',
    devices: '/vpn/devices',
    device: (id: string) => `/vpn/device/${id}`,
  },
  
  // Billing
  billing: {
    plans: '/billing/plans',
    submit: '/billing/submit',
    history: '/billing/history',
    subscription: '/billing/subscription',
  },
  
  // Credit
  credit: {
    balance: '/credit/balance',
    transfer: '/credit/transfer',
    transactions: '/credit/transactions',
    stats: '/credit/stats',
  },
  
  // Referral
  referral: {
    code: '/referral/code',
    stats: '/referral/stats',
    track: '/referral/track',
    earnings: '/referral/earnings',
    config: '/referral/config',
  },
  
  // Admin
  admin: {
    users: '/admin/users',
    payments: '/admin/billing/payments',
    approvePayment: (id: string) => `/admin/billing/payments/${id}/approve`,
    rejectPayment: (id: string) => `/admin/billing/payments/${id}/reject`,
    backup: {
      create: '/admin/backup/create',
      list: '/admin/backup/list',
      config: '/admin/backup/config',
      stats: '/admin/backup/stats',
    },
    referral: {
      stats: '/admin/referral/stats',
      events: '/admin/referral/events',
      config: '/admin/referral/config',
    },
  },
};
```

### React Query Hooks

```typescript
// lib/hooks/useReferral.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { endpoints } from '@/lib/api/endpoints';

export function useReferralCode() {
  return useQuery({
    queryKey: ['referral', 'code'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.referral.code);
      return data;
    },
  });
}

export function useReferralStats() {
  return useQuery({
    queryKey: ['referral', 'stats'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.referral.stats);
      return data.referral;
    },
  });
}

export function useTrackReferral() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (referrerCode: string) => {
      const { data } = await api.post(endpoints.referral.track, {
        referrer_code: referrerCode,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral'] });
    },
  });
}

export function useReferralConfig() {
  return useQuery({
    queryKey: ['referral', 'config'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.referral.config);
      return data.config;
    },
  });
}
```

---

## 🎯 Feature Implementation

### 1. Referral System

#### Referral Dashboard Component

```typescript
// components/referral/ReferralDashboard.tsx
'use client';

import { Card, Box, Typography, Grid, Button, Alert } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import { useReferralCode, useReferralStats, useReferralConfig } from '@/lib/hooks/useReferral';
import { useSnackbar } from 'notistack';

export function ReferralDashboard() {
  const { data: codeData, isLoading } = useReferralCode();
  const { data: stats } = useReferralStats();
  const { data: config } = useReferralConfig();
  const { enqueueSnackbar } = useSnackbar();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    enqueueSnackbar('Copied to clipboard!', { variant: 'success' });
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join VPN Access',
        text: 'Get Rp 25,000 credit when you sign up!',
        url: codeData?.referral_link,
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box>
      {/* Referral Code Card */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Your Referral Code
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" sx={{ fontFamily: 'monospace' }}>
            {codeData?.referral_code}
          </Typography>
          
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={() => copyToClipboard(codeData?.referral_code)}
          >
            Copy
          </Button>
          
          <Button
            startIcon={<ShareIcon />}
            onClick={shareLink}
            variant="contained"
          >
            Share
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          Share your link: {codeData?.referral_link}
        </Alert>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              {stats?.stats?.total_referrals || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Referrals
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">
              {stats?.stats?.successful_referrals || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Successful
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {stats?.tier || 'Bronze'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your Tier
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="warning.main">
              Rp {(stats?.stats?.total_earned || 0).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Earned
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Rewards Info */}
      <Card sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rewards Structure
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">For You (Referrer)</Typography>
              <Typography variant="body2">
                • Base Reward: Rp {config?.referrer_reward?.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                • Commission: 5-15% of referee's payment
              </Typography>
              <Typography variant="body2">
                • Milestone Bonuses: Up to Rp 1,500,000
              </Typography>
            </Alert>
          </Grid>

          <Grid item xs={12} md={6}>
            <Alert severity="info">
              <Typography variant="subtitle2">For Friend (Referee)</Typography>
              <Typography variant="body2">
                • Signup Bonus: Rp {config?.referee_reward?.toLocaleString()}
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}
```

#### Referral Signup Flow

```typescript
// app/(auth)/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { api } from '@/lib/api';
import { endpoints } from '@/lib/api/endpoints';
import { Alert } from '@mui/material';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [referrerCode, setReferrerCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Get referrer code from URL
    const code = searchParams.get('ref');
    if (code) {
      setReferrerCode(code);
      localStorage.setItem('pending_referrer_code', code);
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Create Firebase user
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Get ID token
      const user = auth.currentUser;
      const token = await user?.getIdToken();

      // 3. Verify with backend
      await api.post(endpoints.auth.verify, { token });

      // 4. Track referral if code exists
      const pendingCode = referrerCode || localStorage.getItem('pending_referrer_code');
      if (pendingCode) {
        await api.post(endpoints.referral.track, {
          referrer_code: pendingCode,
        });
        localStorage.removeItem('pending_referrer_code');
      }

      // 5. Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration failed:', error.response?.data || error.message);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      {/* ... form fields ... */}
      
      {referrerCode && (
        <Alert severity="success">
          Referral code applied: {referrerCode}
          <br />
          You'll receive Rp 25,000 credit after first payment!
        </Alert>
      )}
      
      {/* ... submit button ... */}
    </form>
  );
}
```

---

### 2. VPN Management

```typescript
// components/vpn/DeviceList.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { endpoints } from '@/lib/api/endpoints';
import { Card, CardContent, Button, Typography, Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import QRCode from 'react-qr-code';

interface Device {
  id: string;
  device_name: string;
  ip_address: string;
  status: string;
  qr?: string;
  config?: string;
}

export function DeviceList() {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['vpn', 'devices'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.vpn.devices);
      return data.devices;
    },
  });

  const generateConfig = useMutation({
    mutationFn: async (deviceName: string) => {
      const { data } = await api.post(endpoints.vpn.generate, { deviceName });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpn'] });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box>
      {/* Device List */}
      {devices?.map((device: Device) => (
        <Card key={device.id} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{device.device_name}</Typography>
            <Typography variant="body2">IP: {device.ip_address}</Typography>
            <Typography variant="body2">Status: {device.status}</Typography>
            
            <Button
              onClick={() => setSelectedDevice(device)}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            >
              View QR Code
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* QR Code Dialog */}
      <Dialog open={!!selectedDevice} onClose={() => setSelectedDevice(null)}>
        <DialogTitle>{selectedDevice?.device_name}</DialogTitle>
        <DialogContent>
          {selectedDevice?.qr && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <QRCode value={selectedDevice.config || ''} size={256} />
            </Box>
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            Scan with WireGuard app
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
```

---

### 3. Billing & Payment

```typescript
// components/billing/PaymentSubmit.tsx
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { endpoints } from '@/lib/api/endpoints';
import { useForm } from 'react-hook-form';
import { Box, Button, TextField, MenuItem, Alert } from '@mui/material';

interface Plan {
  id: string;
  label: string;
  price: number;
  price_formatted: string;
}

export function PaymentSubmit() {
  const { register, handleSubmit, watch } = useForm();
  const selectedPlan = watch('plan');

  const { data: plansData } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.billing.plans);
      return data;
    },
  });

  const submitPayment = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post(endpoints.billing.submit, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
  });

  const onSubmit = async (values: any) => {
    const formData = new FormData();
    formData.append('amount', values.amount);
    formData.append('plan', values.plan);
    formData.append('bank_from', values.bank_from);
    formData.append('transfer_date', values.transfer_date);
    formData.append('proof', values.proof[0]);

    await submitPayment.mutateAsync(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {/* Plan Selection */}
      <TextField
        {...register('plan', { required: true })}
        select
        label="Plan"
        fullWidth
        sx={{ mb: 2 }}
      >
        {plansData?.plans?.map((plan: Plan) => (
          <MenuItem key={plan.id} value={plan.id}>
            {plan.label} - {plan.price_formatted}
          </MenuItem>
        ))}
      </TextField>

      {/* Bank Selection */}
      <TextField
        {...register('bank_from', { required: true })}
        select
        label="Bank From"
        fullWidth
        sx={{ mb: 2 }}
      >
        {plansData?.bank_accounts?.map((bank: any) => (
          <MenuItem key={bank.id} value={bank.bank}>
            {bank.bank} - {bank.account_number}
          </MenuItem>
        ))}
      </TextField>

      {/* Transfer Date */}
      <TextField
        {...register('transfer_date', { required: true })}
        type="date"
        label="Transfer Date"
        fullWidth
        sx={{ mb: 2 }}
        InputLabelProps={{ shrink: true }}
      />

      {/* Proof Upload */}
      <input
        {...register('proof', { required: true })}
        type="file"
        accept="image/*,.pdf"
      />

      <Button 
        type="submit" 
        loading={submitPayment.isPending}
        variant="contained"
        sx={{ mt: 2 }}
      >
        Submit Payment
      </Button>

      {submitPayment.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitPayment.error.response?.data?.message}
        </Alert>
      )}

      {submitPayment.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Payment submitted successfully!
        </Alert>
      )}
    </Box>
  );
}
```

---

### 4. Credit Transfer

```typescript
// components/credit/TransferForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { endpoints } from '@/lib/api/endpoints';
import { Box, Button, TextField, Alert } from '@mui/material';

export function TransferForm() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const transfer = useMutation({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post(endpoints.credit.transfer, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit'] });
      reset();
    },
  });

  return (
    <Box component="form" onSubmit={handleSubmit((data) => transfer.mutate(data))}>
      <TextField
        {...register('to_user_email', { 
          required: 'Recipient email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
        label="Recipient Email"
        fullWidth
        error={!!errors.to_user_email}
        helperText={errors.to_user_email?.message}
        sx={{ mb: 2 }}
      />

      <TextField
        {...register('amount', { 
          required: 'Amount is required',
          min: { value: 1000, message: 'Minimum transfer is Rp 1,000' }
        })}
        label="Amount"
        type="number"
        fullWidth
        error={!!errors.amount}
        helperText={errors.amount?.message}
        sx={{ mb: 2 }}
      />

      <TextField
        {...register('description')}
        label="Description (Optional)"
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />

      <Button type="submit" loading={transfer.isPending} variant="contained">
        Transfer Credit
      </Button>

      {transfer.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {transfer.error.response?.data?.message}
        </Alert>
      )}

      {transfer.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Transfer successful!
        </Alert>
      )}
    </Box>
  );
}
```

---

### 5. Admin Dashboard

```typescript
// app/(admin)/admin/dashboard/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { endpoints } from '@/lib/api/endpoints';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PaymentIcon from '@mui/icons-material/Payment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface Stats {
  total_users: number;
  vpn_enabled_users: number;
  pending_payments: number;
  monthly_revenue: number;
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.admin.stats);
      return data;
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={<PeopleIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active VPN"
            value={stats?.vpn_enabled_users || 0}
            icon={<VpnKeyIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Payments"
            value={stats?.pending_payments || 0}
            icon={<PaymentIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Revenue (Month)"
            value={`Rp ${stats?.monthly_revenue?.toLocaleString() || 0}`}
            icon={<AttachMoneyIcon />}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
```

---

## 🗄️ State Management

### Zustand Store Example

```typescript
// stores/vpnStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Device {
  id: string;
  device_name: string;
  ip_address: string;
  status: string;
  public_key: string;
  created_at: string;
}

interface VpnState {
  devices: Device[];
  selectedDevice: Device | null;
  setDevices: (devices: Device[]) => void;
  setSelectedDevice: (device: Device | null) => void;
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
}

export const useVpnStore = create<VpnState>()(
  persist(
    (set) => ({
      devices: [],
      selectedDevice: null,
      
      setDevices: (devices) => set({ devices }),
      setSelectedDevice: (device) => set({ selectedDevice: device }),
      addDevice: (device) => set((state) => ({
        devices: [...state.devices, device],
      })),
      removeDevice: (deviceId) => set((state) => ({
        devices: state.devices.filter((d) => d.id !== deviceId),
      })),
    }),
    { name: 'vpn-storage' }
  )
);
```

---

## ⚠️ Error Handling

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error?.message}
            <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
              Reload Page
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

---

## 🔒 Security Best Practices

### 1. Token Storage

```typescript
// ❌ Don't store in localStorage for production
localStorage.setItem('token', token);

// ✅ Use httpOnly cookies in production
// Set cookie from backend response
document.cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict`;
```

### 2. API Rate Limiting

```typescript
// lib/api/rateLimit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(endpoint: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = endpoint;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
```

### 3. Input Validation

```typescript
// schemas/referral.ts
import { z } from 'zod';

export const referralSchema = z.object({
  referrer_code: z.string().regex(/^REF-[A-Z0-9]{8}$/, 'Invalid referral code'),
  amount: z.number().min(1000, 'Minimum transfer is Rp 1,000'),
  to_user_email: z.string().email('Invalid email address'),
});
```

---

## 📱 Responsive Design

```typescript
// components/layout/ResponsiveAppBar.tsx
'use client';

import { useMediaQuery, useTheme, AppBar, Toolbar, Typography } from '@mui/material';

export function ResponsiveAppBar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          VPN Access
        </Typography>
        
        {isMobile && <MobileMenu />}
        {isTablet && <TabletMenu />}
        {isDesktop && <DesktopMenu />}
      </Toolbar>
    </AppBar>
  );
}
```

---

## 🚀 Deployment

### Vercel Deployment

```json
// vercel.json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com/api"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase-api-key"
    }
  }
}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT 3001
CMD ["node", "server.js"]
```

---

## 📊 Complete API Checklist

| Feature | Endpoint | Component | Status |
|---------|----------|-----------|--------|
| Login | `POST /auth/verify` | LoginForm | ⬜ |
| Profile | `GET /user/profile` | ProfilePage | ⬜ |
| VPN Devices | `GET /vpn/devices` | DeviceList | ⬜ |
| Generate VPN | `POST /vpn/generate` | GenerateButton | ⬜ |
| Payment Submit | `POST /billing/submit` | PaymentForm | ⬜ |
| Payment History | `GET /billing/history` | PaymentHistory | ⬜ |
| Credit Transfer | `POST /credit/transfer` | TransferForm | ⬜ |
| Referral Code | `GET /referral/code` | ReferralDashboard | ⬜ |
| Admin Users | `GET /admin/users` | UserTable | ⬜ |
| Admin Payments | `GET /admin/billing/payments` | PaymentReview | ⬜ |
| Admin Backup | `POST /admin/backup/create` | BackupPanel | ⬜ |

---

## 📞 Need Help?

### Backend API Documentation
- Health Check: `GET /health`
- API Info: `GET /api`

### API Testing
- Use Postman collection (available in `/docs` folder)
- Test with: `curl http://localhost:3000/health`

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token in localStorage, verify Firebase config |
| 403 Forbidden | User doesn't have admin role |
| 429 Too Many Requests | Wait for retry period, check `X-RateLimit-Remaining` header |
| CORS Error | Add your frontend URL to backend CORS config |

### Contact Backend Team
- API Issues: Check `/health` endpoint first
- Auth Issues: Verify Firebase configuration
- Rate Limits: Check response headers `X-RateLimit-Remaining`

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Components](https://mui.com/components/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Firebase SDK](https://firebase.google.com/docs/web/setup)

---

**Happy Coding! 🚀**

*Last Updated: 2024*
