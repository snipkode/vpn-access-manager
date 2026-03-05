import { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import AdminDashboard from '../components/AdminDashboard';
import Layout from '../components/Layout';
import Wallet from '../components/Wallet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        setUser(firebaseUser);

        // Verify user with backend
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
          } else {
            // If backend verify fails, use firebase user data with default role
            setUserData({
              email: firebaseUser.email,
              role: 'user',
              vpn_enabled: true,
            });
          }
        } catch (error) {
          console.error('Verify error:', error);
          // Fallback to firebase user data
          setUserData({
            email: firebaseUser.email,
            role: 'user',
            vpn_enabled: true,
          });
        }
      } else {
        setUser(null);
        setToken(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setActivePage('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loader}>
          <i className="fas fa-circle-notch fa-spin" style={styles.spinner}></i>
          <p style={styles.loadingText}>Loading VPN Access...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout
      user={userData}
      onLogout={handleLogout}
      activePage={activePage}
      onPageChange={setActivePage}
    >
      {activePage === 'admin' || activePage === 'users' || activePage === 'all-devices' ? (
        <AdminDashboard token={token} activeTab={activePage} />
      ) : activePage === 'wallet' ? (
        <Wallet token={token} />
      ) : (
        <Dashboard token={token} userData={userData} activePage={activePage} />
      )}
    </Layout>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    textAlign: 'center',
  },
  spinner: {
    fontSize: '48px',
    color: '#3b82f6',
  },
  loadingText: {
    marginTop: '16px',
    color: '#94a3b8',
    fontSize: '16px',
  },
};
