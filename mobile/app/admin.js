import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { auth } from '../src/config/firebase';
import { branding, API_URL } from '../src/config/config';

export default function AdminScreen() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      const headers = { Authorization: `Bearer ${idToken}` };

      const [statsRes, usersRes, devicesRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/admin/users`, { headers }),
        fetch(`${API_URL}/admin/devices`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers((await usersRes.json()).users);
      if (devicesRes.ok) setDevices((await devicesRes.json()).devices);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleVpnAccess = async (userId, currentStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ vpn_enabled: !currentStatus }),
      });

      if (res.ok) {
        fetchData();
        Alert.alert('Success', `VPN access ${!currentStatus ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const revokeDevice = async (deviceId) => {
    Alert.alert(
      'Revoke Device',
      'Are you sure you want to revoke this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              const idToken = await user.getIdToken();
              
              const res = await fetch(`${API_URL}/admin/device/${deviceId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` },
              });

              if (res.ok) {
                fetchData();
                Alert.alert('Success', 'Device revoked');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke device');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Users
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'devices' && styles.activeTab]}
          onPress={() => setActiveTab('devices')}
        >
          <Text style={[styles.tabText, activeTab === 'devices' && styles.activeTabText]}>
            Devices
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_users}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.vpn_enabled_users}</Text>
              <Text style={styles.statLabel}>VPN Enabled</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.vpn_disabled_users}</Text>
              <Text style={styles.statLabel}>VPN Disabled</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.active_devices}</Text>
              <Text style={styles.statLabel}>Active Devices</Text>
            </View>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View style={styles.list}>
            {users.map((userItem) => (
              <View key={userItem.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{userItem.email}</Text>
                  <View style={styles.badgeContainer}>
                    <Text style={[
                      styles.badge,
                      userItem.role === 'admin' ? styles.adminBadge : styles.userBadge
                    ]}>
                      {userItem.role}
                    </Text>
                    <Text style={[
                      styles.badge,
                      userItem.vpn_enabled ? styles.enabledBadge : styles.disabledBadge
                    ]}>
                      {userItem.vpn_enabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    userItem.vpn_enabled ? styles.toggleEnabled : styles.toggleDisabled
                  ]}
                  onPress={() => toggleVpnAccess(userItem.id, userItem.vpn_enabled)}
                >
                  <Text style={styles.toggleButtonText}>
                    {userItem.vpn_enabled ? 'Disable' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <View style={styles.list}>
            {devices.map((device) => (
              <View key={device.id} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{device.device_name}</Text>
                  <Text style={styles.listItemSubtitle}>{device.ip_address}</Text>
                  <Text style={styles.listItemMeta}>{device.user_id}</Text>
                </View>
                <TouchableOpacity
                  style={styles.revokeButton}
                  onPress={() => revokeDevice(device.id)}
                >
                  <Text style={styles.revokeButtonText}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {((activeTab === 'users' && users.length === 0) ||
          (activeTab === 'devices' && devices.length === 0)) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        )}
      </ScrollView>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
        <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: branding.backgroundColor,
  },
  loadingText: {
    color: branding.textColorSecondary,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: branding.secondaryColor,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: branding.backgroundColor,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: branding.primaryColor,
  },
  tabText: {
    color: branding.textColorSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: branding.secondaryColor,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: branding.primaryColor,
  },
  statLabel: {
    color: branding.textColorSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  list: {
    gap: 12,
  },
  listItem: {
    backgroundColor: branding.secondaryColor,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
  listItemSubtitle: {
    color: branding.textColorSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  listItemMeta: {
    color: branding.textColorSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  userBadge: {
    backgroundColor: '#475569',
    color: '#fff',
  },
  enabledBadge: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  disabledBadge: {
    backgroundColor: '#64748b',
    color: '#fff',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  toggleEnabled: {
    backgroundColor: '#10b981',
  },
  toggleDisabled: {
    backgroundColor: '#64748b',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  revokeButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  revokeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: branding.textColorSecondary,
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: branding.secondaryColor,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
});
