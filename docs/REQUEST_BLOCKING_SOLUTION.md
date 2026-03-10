# Request Blocking Solution - Frontend

## Problem
Frontend tidak memiliki status workflow/event creation step, sehingga user tidak tahu ketika request sedang diproses. User bisa klik tombol berkali-kali atau tidak ada feedback visual saat operasi penting berlangsung.

## Solution: Global Request Lock dengan Overlay

Kami menggunakan **Zustand store + Overlay component** untuk blocking UI saat request berlangsung. Ini lebih simple daripada socket/stream karena:
- ✅ Tidak perlu real-time connection
- ✅ Proses backend cepat (< 5 detik)
- ✅ Simple implementation
- ✅ Works dengan existing code
- ✅ Automatic cleanup

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Action                           │
│              (Click "Add Device" button)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              apiFetch() with requestKey                 │
│  - Adds request to pendingRequests array in store       │
│  - Makes actual API call                                │
│  - Removes request from pendingRequests on complete     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         RequestBlockingOverlay Component                │
│  - Watches pendingRequests array                        │
│  - Shows blocking overlay when length > 0               │
│  - Displays user-friendly message                       │
│  - Prevents all user interaction                        │
└─────────────────────────────────────────────────────────┘
```

## Implementation

### 1. UI Store (`frontend/store/index.js`)

```javascript
export const useUIStore = create((set) => ({
  // ... existing state
  
  // Request blocking/loading state
  pendingRequests: [], // Array of pending request keys
  
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
}));
```

### 2. API Client (`frontend/lib/api.js`)

```javascript
export const apiFetch = async (endpoint, options = {}, requestKey = null) => {
  // ... auth headers setup
  
  // Add request to pending list if requestKey provided
  if (requestKey) {
    useUIStore.getState().addPendingRequest(requestKey);
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    return res.json();
  } finally {
    // Remove request from pending list (always runs)
    if (requestKey) {
      useUIStore.getState().removePendingRequest(requestKey);
    }
  }
};
```

### 3. RequestBlockingOverlay Component (`frontend/components/RequestBlockingOverlay.js`)

```javascript
export default function RequestBlockingOverlay() {
  const { pendingRequests } = useUIStore();

  if (pendingRequests.length === 0) return null;

  const requestMessages = {
    generate_vpn: 'Generating VPN configuration...',
    delete_vpn_device: 'Removing device...',
    disable_vpn_device: 'Disabling device...',
    reactivate_vpn_device: 'Reactivating device...',
    // ... more messages
  };

  const currentRequest = pendingRequests[pendingRequests.length - 1];
  const message = requestMessages[currentRequest] || 'Processing...';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <div className="text-lg font-semibold text-dark">{message}</div>
        <div className="text-sm text-gray-500">Please wait, do not close this window</div>
      </div>
    </div>
  );
}
```

### 4. Layout Integration (`frontend/components/Layout.js`)

```javascript
import RequestBlockingOverlay from './RequestBlockingOverlay';

export default function Layout({ children, ... }) {
  return (
    <div className="min-h-screen bg-gray-100 text-dark font-sans">
      {/* ... sidebar and content ... */}
      
      {/* Request Blocking Overlay - Global loading state */}
      <RequestBlockingOverlay />
    </div>
  );
}
```

### 5. Component Usage (`frontend/components/Dashboard.js`)

```javascript
import { useRequestPending } from '../components/RequestBlockingOverlay';

export default function Dashboard() {
  const generatingVpn = useRequestPending('generate_vpn');
  const deletingDevice = useRequestPending('delete_vpn_device');

  return (
    <button
      onClick={generateConfig}
      disabled={generatingVpn || devices.length >= 3}
      className={generatingVpn ? 'opacity-50 cursor-not-allowed' : ''}
    >
      {generatingVpn ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Adding...
        </span>
      ) : 'Add Device'}
    </button>
  );
}
```

## Request Keys Reference

| Request Key | API Function | Description |
|-------------|--------------|-------------|
| `generate_vpn` | `vpnAPI.generateConfig()` | Generate new VPN config |
| `delete_vpn_device` | `vpnAPI.deleteDevice()` | Remove VPN device |
| `disable_vpn_device` | `vpnAPI.disableDevice()` | Disable device |
| `reactivate_vpn_device` | `vpnAPI.reactivateDevice()` | Reactivate device |
| `get_vpn_device` | `vpnAPI.getDevice()` | Get device config |
| `submit_payment` | `billingAPI.submitPayment()` | Submit payment proof |
| `transfer_credit` | `creditAPI.transfer()` | Transfer credit |

## Usage Pattern

### Basic Usage
```javascript
// API call with request lock
const handleSubmit = async () => {
  try {
    await api.fetch('/endpoint', { method: 'POST', body: data }, 'request_key');
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### Check Request Status in Component
```javascript
import { useRequestPending } from '../components/RequestBlockingOverlay';

function MyComponent() {
  const isSubmitting = useRequestPending('submit_payment');
  
  return (
    <button disabled={isSubmitting}>
      {isSubmitting ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

## Benefits

1. **Automatic Blocking** - Overlay automatically shows/hides based on pending requests
2. **User-Friendly Messages** - Shows what operation is in progress
3. **Prevents Double Submission** - User cannot click buttons while request is pending
4. **Clean Implementation** - No need to manage loading state in every component
5. **Multiple Requests** - Handles multiple concurrent requests gracefully
6. **Always Cleans Up** - `finally` block ensures request is removed even on error

## Alternative Approaches Considered

### ❌ Socket.io / WebSocket
- Overkill for this use case
- Requires backend changes
- More complex to implement
- Better for real-time updates (notifications, live stats)

### ❌ Server-Sent Events (SSE) / Streaming
- Good for long-running operations (> 10 seconds)
- Requires backend to support streaming
- More complex error handling

### ❌ Polling
- Inefficient
- Adds latency
- More network requests

## When to Use What

| Approach | Best For | Response Time |
|----------|----------|---------------|
| **Request Lock (This solution)** | Form submissions, CRUD operations | < 5 seconds |
| **Polling** | Checking job status | 5-30 seconds |
| **WebSocket** | Real-time chat, notifications, live updates | Real-time |
| **SSE/Streaming** | Large data transfers, progress updates | > 10 seconds |

## Testing

1. Click "Add Device" button multiple times rapidly - should only trigger once
2. Try to interact with other UI elements during request - should be blocked
3. Check overlay shows correct message for each operation
4. Verify overlay disappears after request completes (success or error)
5. Test error scenarios - overlay should still disappear

## Future Enhancements

1. **Progress Indicator** - Add progress bar for long operations
2. **Cancel Button** - Allow user to cancel certain operations
3. **Toast Notifications** - Show success/error toasts in addition to overlay
4. **Request Priority** - High priority requests could bypass queue
5. **Timeout Handling** - Auto-cancel requests that take too long
