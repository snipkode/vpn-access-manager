import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { auth } from '../src/config/firebase';
import { branding, API_URL } from '../src/config/config';

export default function DevicesScreen() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const res = await fetch(`${API_URL}/vpn/devices`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const revokeDevice = async (deviceId) => {
    Alert.alert(
      'Revoke Device',
      'Are you sure you want to revoke this device? This action cannot be undone.',
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
              
              const res = await fetch(`${API_URL}/vpn/device/${deviceId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` },
              });

              if (res.ok) {
                fetchDevices();
                Alert.alert('Success', 'Device revoked successfully');
              } else {
                Alert.alert('Error', 'Failed to revoke device');
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
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyTitle}>No Devices</Text>
            <Text style={styles.emptyText}>
              You haven't added any devices yet.{'\n'}
              Generate a configuration to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {devices.map((device) => (
              <View key={device.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceIcon}>📱</Text>
                    <View>
                      <Text style={styles.deviceName}>{device.device_name}</Text>
                      <Text style={styles.deviceIP}>{device.ip_address}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    device.status === 'active' ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={styles.statusText}>{device.status}</Text>
                  </View>
                </View>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.createdText}>
                    Added: {new Date(device.created_at).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.revokeButton}
                    onPress={() => revokeDevice(device.id)}
                  >
                    <Text style={styles.revokeButtonText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchDevices}>
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
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: branding.textColor,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: branding.textColorSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: branding.secondaryColor,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    fontSize: 28,
  },
  deviceName: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
  deviceIP: {
    color: branding.textColorSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#64748b',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: branding.backgroundColor,
  },
  createdText: {
    color: branding.textColorSecondary,
    fontSize: 12,
  },
  revokeButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  revokeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
