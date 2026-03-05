import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { auth } from '../src/config/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { branding, API_URL } from '../src/config/config';
import { LinearGradient } from 'expo-linear-gradient';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [token, setToken] = useState(null);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        
        // Fetch user data from backend
        try {
          const res = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token: idToken }),
          });
          
          if (res.ok) {
            const data = await res.json();
            setUserData(data.user);
          }
        } catch (error) {
          console.error('Verify error:', error);
        }
      } else {
        router.replace('/');
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
            router.replace('/');
          },
        },
      ]
    );
  };

  const getStatusColor = () => {
    if (!userData) return '#64748b';
    return userData.vpn_enabled ? '#10b981' : '#f59e0b';
  };

  const getStatusText = () => {
    if (!userData) return 'Loading...';
    return userData.vpn_enabled ? 'Active' : 'Inactive';
  };

  if (!user || !userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <LinearGradient
        colors={[branding.primaryColor, branding.secondaryColor]}
        style={styles.headerCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.emailText}>{user.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>VPN Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        {!userData.vpn_enabled && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Your VPN access is disabled. Contact admin to enable.
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, !userData.vpn_enabled && styles.actionButtonDisabled]}
          onPress={() => router.push('/config')}
          disabled={!userData.vpn_enabled}
        >
          <Text style={styles.actionIcon}>📱</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>VPN Configuration</Text>
            <Text style={styles.actionSubtitle}>Generate or view config</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/devices')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>My Devices</Text>
            <Text style={styles.actionSubtitle}>Manage connected devices</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        {userData.role === 'admin' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.adminButton]}
            onPress={() => router.push('/admin')}
          >
            <Text style={styles.actionIcon}>🔧</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Admin Panel</Text>
              <Text style={styles.actionSubtitle}>Manage users & devices</Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{branding.footerText}</Text>
        <Text style={styles.footerLink}>{branding.appTagline}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: branding.textColorSecondary,
    fontSize: 16,
  },
  headerCard: {
    padding: 24,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  emailText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: branding.secondaryColor,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    color: branding.textColor,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451a03',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 14,
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: branding.backgroundColor,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  adminButton: {
    borderWidth: 1,
    borderColor: branding.primaryColor,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: branding.textColor,
    fontSize: 16,
    fontWeight: '600',
  },
  actionSubtitle: {
    color: branding.textColorSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  actionArrow: {
    color: branding.textColorSecondary,
    fontSize: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: branding.textColorSecondary,
    fontSize: 12,
  },
  footerLink: {
    color: branding.primaryColor,
    fontSize: 12,
    marginTop: 4,
  },
});
