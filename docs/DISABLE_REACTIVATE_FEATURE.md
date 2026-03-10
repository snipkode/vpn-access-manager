# Disable/Reactivate Feature Implementation

## Overview
Added support for **disabling** and **reactivating** WireGuard peers while keeping their configuration in Firebase Firestore. This allows admins to temporarily suspend VPN access without deleting device records.

## Changes Made

### 1. WireGuard Service (`backend/services/wireguard.js`)

#### New Functions:
- **`disablePeer(publicKey)`** - Removes peer from running WireGuard interface only (keeps in config file)
- **`reactivatePeer(publicKey, ipAddress)`** - Adds peer back to running interface and saves config

#### Modified Functions:
- **`addPeer(publicKey, ipAddress)`** - Now uses `wg showconf` to persist peers to config file
- **`removePeer(publicKey)`** - Now uses `wg showconf` to update config file after removal

### 2. VPN Routes (`backend/routes/vpn.js`)

#### New Endpoints:
```
POST /api/vpn/device/:id/disable   - Disable a device (admin only)
POST /api/vpn/device/:id/reactivate - Reactivate a disabled device (admin only)
```

**Disable Response:**
```json
{
  "message": "Device disabled successfully",
  "device_id": "abc123",
  "device_name": "iPhone",
  "ip_address": "10.0.0.5",
  "wireguard_removed": true,
  "disabled_at": "2026-03-07T01:00:00.000Z"
}
```

**Reactivate Response:**
```json
{
  "message": "Device reactivated successfully",
  "device_id": "abc123",
  "device_name": "iPhone",
  "ip_address": "10.0.0.5",
  "wireguard_added": true,
  "reactivated_at": "2026-03-07T02:00:00.000Z"
}
```

### 3. Admin Routes (`backend/routes/admin.js`)

#### New Endpoints:
```
POST /api/admin/device/:id/disable   - Disable a device
POST /api/admin/device/:id/reactivate - Reactivate a disabled device
```

## Device Status Flow

```
┌─────────┐     disable      ┌──────────┐   reactivate   ┌─────────┐
│ active  │ ───────────────> │ disabled │ ─────────────> │ active  │
└─────────┘                  └──────────┘                └─────────┘
     │                            │                          │
     | revoke                     | revoke                   | revoke
     v                            v                          v
┌─────────┐                  ┌─────────┐              ┌─────────┐
│ revoked │                  │ revoked │              │ revoked │
└─────────┘                  └─────────┘              └─────────┘
```

## Status Values

| Status | WireGuard Interface | Firestore Record | Config File | Can Reactivate |
|--------|---------------------|------------------|-------------|----------------|
| `active` | ✓ Present | ✓ Present | ✓ Present | N/A |
| `disabled` | ✗ Removed | ✓ Present | ✓ Present | ✓ Yes |
| `revoked` | ✗ Removed | ✓ Present (soft delete) | ✗ Removed | ✗ No |

## API Usage Examples

### Disable a Device
```bash
curl -X POST http://localhost:4000/api/vpn/device/DEVICE_ID/disable \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Reactivate a Device
```bash
curl -X POST http://localhost:4000/api/vpn/device/DEVICE_ID/reactivate \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Revoke a Device (Permanent)
```bash
curl -X DELETE http://localhost:4000/api/vpn/device/DEVICE_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Test Scripts

### Diagnostic Script
```bash
cd backend
./scripts/diagnostic.sh
```

### Disable/Reactivate Test
```bash
cd backend
./scripts/test-disable-reactivate-full.sh
```

## Key Implementation Details

### Config Persistence
- Uses `wg showconf wg0 > /etc/wireguard/wg0.conf` to save peer configurations
- `wg-quick strip` was removed because it strips peer information
- Peers are now properly persisted across server restarts

### Disable vs Revoke
- **Disable**: Temporary - peer removed from runtime only, kept in config for reactivation
- **Revoke**: Permanent - peer removed from both runtime and config, device marked as revoked

### Audit Logging
Both disable and reactivate operations create audit logs in Firestore:
- `device_disabled` - Records when a device was disabled
- `device_reactivated` - Records when a device was reactivated

## Firestore Device Schema

```javascript
{
  user_id: "user123",
  device_name: "iPhone",
  public_key: "abc123...",
  private_key: "xyz789...",
  ip_address: "10.0.0.5",
  status: "active" | "disabled" | "revoked",
  created_at: "2026-03-07T00:00:00.000Z",
  
  // Added when disabled
  disabled_at: "2026-03-07T01:00:00.000Z",
  disabled_by: "admin_uid",
  
  // Added when reactivated
  reactivated_at: "2026-03-07T02:00:00.000Z",
  reactivated_by: "admin_uid",
  
  // Added when revoked
  revoked_at: "2026-03-07T03:00:00.000Z",
  revoked_by: "admin_uid"
}
```

## Verification Checklist

- [x] WireGuard interface active
- [x] Peer creation works (adds to runtime + config)
- [x] Peer disable works (removes from runtime, keeps in config)
- [x] Peer reactivate works (adds back to runtime + config)
- [x] Multiple disable/reactivate cycles work
- [x] Peer removal works (removes from runtime + config)
- [x] API endpoints require admin authentication
- [x] Audit logs created for disable/reactivate operations
- [x] Diagnostic script passes all checks

## Files Modified

1. `backend/services/wireguard.js` - Core WireGuard operations
2. `backend/routes/vpn.js` - VPN device endpoints
3. `backend/routes/admin.js` - Admin device management endpoints
4. `backend/scripts/diagnostic.sh` - Updated diagnostic script

## Files Created

1. `backend/scripts/test-disable-reactivate-full.sh` - Comprehensive test
2. `backend/scripts/test-new-approach.sh` - Initial approach test
3. `backend/scripts/test-persistence.sh` - Persistence test
4. `backend/scripts/test-strip.sh` - wg-quick strip debug test
5. `backend/scripts/debug-wg.sh` - WireGuard debug script
