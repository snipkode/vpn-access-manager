/**
 * Cron Job: Cleanup Expired Leases
 * 
 * This script checks for devices with expired leases and:
 * 1. Removes them from WireGuard interface
 * 2. Updates their status to 'expired' in Firestore
 * 3. Creates audit logs
 * 
 * Run this every hour via cron:
 * 0 * * * * /usr/bin/node /path/to/backend/scripts/cleanup-expired-leases.js
 */

import { execSync } from 'child_process';
import { db } from '../config/firebase.js';
import { removePeer, getUsedIPsFromWireGuard } from '../services/wireguard.js';

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

async function cleanupExpiredLeases() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🕐 Starting expired lease cleanup');
  console.log('='.repeat(60));

  const now = new Date();
  const nowISO = now.toISOString();

  try {
    // Query devices where lease_expires < now and status is active/pending
    // Note: This requires a composite index on (status, lease_expires)
    let expiredDevices;
    try {
      expiredDevices = await db.collection('devices')
        .where('lease_expires', '<', nowISO)
        .where('status', 'in', ['active', 'pending'])
        .get();
    } catch (indexError) {
      // Fallback: Get all devices and filter manually if index not available
      console.log('⚠️ Firestore index not found, using fallback method');
      console.log('   Create index for better performance:', indexError.message);
      
      const allDevices = await db.collection('devices').get();
      const filtered = allDevices.docs.filter(doc => {
        const data = doc.data();
        return (data.status === 'active' || data.status === 'pending') &&
               data.lease_expires && 
               data.lease_expires < nowISO;
      });
      
      // Create a mock QuerySnapshot-like object
      expiredDevices = {
        empty: filtered.length === 0,
        size: filtered.length,
        docs: filtered
      };
    }

    if (expiredDevices.empty) {
      console.log('✅ No expired leases found');
      return { cleaned: 0, errors: [] };
    }

    console.log(`📋 Found ${expiredDevices.size} expired lease(s)`);
    
    const results = {
      cleaned: 0,
      errors: [],
      details: []
    };
    
    // Get current WireGuard peers for verification
    const wgIPs = getUsedIPsFromWireGuard();
    
    for (const doc of expiredDevices.docs) {
      const data = doc.data();
      
      try {
        console.log(`\n🔍 Processing: ${doc.id}`);
        console.log(`   Device: ${data.device_name}`);
        console.log(`   User: ${data.user_id}`);
        console.log(`   IP: ${data.ip_address}`);
        console.log(`   Lease expired: ${data.lease_expires}`);
        
        // Remove from WireGuard if present
        if (wgIPs.includes(data.ip_address)) {
          try {
            removePeer(data.public_key);
            console.log(`   ✅ Removed from WireGuard`);
          } catch (wgError) {
            console.log(`   ⚠️ WireGuard remove failed: ${wgError.message}`);
          }
        } else {
          console.log(`   ℹ️ Not in WireGuard (already removed or stale)`);
        }
        
        // Update status to expired
        await doc.ref.update({
          status: 'expired',
          expired_at: nowISO,
          lease_expires: null,
        });
        
        console.log(`   ✅ Status updated to 'expired'`);
        
        // Create audit log
        await db.collection('audit_logs').doc().set({
          action: 'lease_expired',
          user_id: data.user_id,
          device_id: doc.id,
          device_name: data.device_name,
          device_public_key: data.public_key,
          device_ip: data.ip_address,
          lease_expired_at: data.lease_expires,
          cleaned_at: nowISO,
          timestamp: nowISO
        });
        
        console.log(`   ✅ Audit log created`);
        
        results.cleaned++;
        results.details.push({
          device_id: doc.id,
          user_id: data.user_id,
          device_name: data.device_name,
          ip_address: data.ip_address,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`   ❌ Error processing ${doc.id}: ${error.message}`);
        results.errors.push({
          device_id: doc.id,
          error: error.message
        });
        results.details.push({
          device_id: doc.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Cleanup completed: ${results.cleaned} lease(s) expired`);
    if (results.errors.length > 0) {
      console.log(`⚠️ ${results.errors.length} error(s) occurred`);
    }
    console.log('='.repeat(60));
    
    return results;
    
  } catch (error) {
    console.error('❌ Cleanup job failed:', error.message);
    throw error;
  }
}

/**
 * Extend lease for a specific device (admin utility)
 * @param {string} deviceId - Device ID to extend
 * @param {number} days - Number of days to extend (default: 30)
 */
export async function extendLease(deviceId, days = 30) {
  try {
    const deviceRef = db.collection('devices').doc(deviceId);
    const deviceDoc = await deviceRef.get();
    
    if (!deviceDoc.exists) {
      throw new Error('Device not found');
    }
    
    const data = deviceDoc.data();
    const now = new Date();
    const currentLease = data.lease_expires ? new Date(data.lease_expires) : now;
    
    // If lease already expired, start from now
    const baseDate = currentLease < now ? now : currentLease;
    const newLease = new Date(baseDate.getTime() + (days * 24 * 60 * 60 * 1000));
    
    await deviceRef.update({
      lease_expires: newLease.toISOString(),
      status: 'active',
      extended_at: now.toISOString(),
    });
    
    // Create audit log
    await db.collection('audit_logs').doc().set({
      action: 'lease_extended',
      device_id: deviceId,
      user_id: data.user_id,
      device_name: data.device_name,
      device_ip: data.ip_address,
      previous_lease: data.lease_expires,
      new_lease: newLease.toISOString(),
      extension_days: days,
      timestamp: now.toISOString()
    });
    
    console.log(`✅ Lease extended for ${deviceId}: ${newLease.toISOString()} (+${days} days)`);
    
    return {
      device_id: deviceId,
      previous_lease: data.lease_expires,
      new_lease: newLease.toISOString(),
      extension_days: days
    };
    
  } catch (error) {
    console.error('Failed to extend lease:', error.message);
    throw error;
  }
}

/**
 * Renew lease based on user's subscription
 * @param {string} deviceId - Device ID to renew
 */
export async function renewLeaseFromSubscription(deviceId) {
  try {
    const deviceRef = db.collection('devices').doc(deviceId);
    const deviceDoc = await deviceRef.get();
    
    if (!deviceDoc.exists) {
      throw new Error('Device not found');
    }
    
    const deviceData = deviceDoc.data();
    const userDoc = await db.collection('users').doc(deviceData.user_id).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    if (!userData.subscription_end) {
      throw new Error('User has no subscription');
    }
    
    const subscriptionEnd = new Date(userData.subscription_end);
    const now = new Date();
    
    if (subscriptionEnd < now) {
      throw new Error('Subscription expired');
    }
    
    // Set lease to match subscription end
    await deviceRef.update({
      lease_expires: subscriptionEnd.toISOString(),
      status: 'active',
      renewed_at: now.toISOString(),
    });
    
    // Create audit log
    await db.collection('audit_logs').doc().set({
      action: 'lease_renewed',
      device_id: deviceId,
      user_id: deviceData.user_id,
      device_name: deviceData.device_name,
      device_ip: deviceData.ip_address,
      previous_lease: deviceData.lease_expires,
      new_lease: subscriptionEnd.toISOString(),
      subscription_end: userData.subscription_end,
      timestamp: now.toISOString()
    });
    
    console.log(`✅ Lease renewed for ${deviceId}: ${subscriptionEnd.toISOString()}`);
    
    return {
      device_id: deviceId,
      new_lease: subscriptionEnd.toISOString(),
      subscription_end: userData.subscription_end
    };
    
  } catch (error) {
    console.error('Failed to renew lease:', error.message);
    throw error;
  }
}

// Run cleanup if executed directly
if (process.argv[1]?.includes('cleanup-expired-leases.js')) {
  cleanupExpiredLeases()
    .then(results => {
      console.log('\n📊 Summary:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error.message);
      process.exit(1);
    });
}

export { cleanupExpiredLeases };
