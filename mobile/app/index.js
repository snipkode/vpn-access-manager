import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { auth } from '../src/config/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { branding } from '../src/config/config';

WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      if (firebaseUser) {
        // Navigate to dashboard after short delay
        setTimeout(() => {
          router.replace('/dashboard');
        }, 500);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      // Exchange ID token for Firebase credentials
      // This is handled in the dashboard
    }
  }, [response]);

  const handleLogin = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🔐</Text>
          <Text style={styles.logoText}>{branding.logoText}</Text>
          <Text style={styles.logoSubtext}>{branding.logoSubtext}</Text>
        </View>
        <Text style={styles.welcomeText}>Welcome, {user.email}</Text>
        <Text style={styles.redirectText}>Redirecting to dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🔐</Text>
        <Text style={styles.logoText}>{branding.logoText}</Text>
        <Text style={styles.logoSubtext}>{branding.logoSubtext}</Text>
        <Text style={styles.tagline}>{branding.appTagline}</Text>
      </View>

      {/* Login Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={handleLogin}
          disabled={!request}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.loginButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Secure WireGuard VPN Access
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerVersion}>{branding.footerText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: branding.backgroundColor,
    justifyContent: 'space-between',
    padding: 24,
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
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: branding.textColor,
  },
  logoSubtext: {
    fontSize: 24,
    fontWeight: '600',
    color: branding.primaryColor,
    marginTop: 4,
  },
  tagline: {
    fontSize: 16,
    color: branding.textColorSecondary,
    marginTop: 12,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  footerText: {
    marginTop: 24,
    color: branding.textColorSecondary,
    fontSize: 14,
  },
  welcomeText: {
    color: branding.textColor,
    fontSize: 18,
    marginTop: 24,
  },
  redirectText: {
    color: branding.textColorSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerVersion: {
    color: branding.textColorSecondary,
    fontSize: 12,
  },
});
