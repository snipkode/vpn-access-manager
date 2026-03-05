import { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import AdminDashboard from '../components/AdminDashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        
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
          }
        } catch (error) {
          console.error('Verify error:', error);
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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <i style={styles.logoIcon} className="fas fa-shield-halved"></i>
          <h1 style={styles.title}>VPN Access Manager</h1>
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>
            <i className="fas fa-user"></i>
          </div>
          <span style={styles.userEmail}>{userData.email}</span>
          {userData.role === 'admin' && (
            <span style={styles.adminBadge}>
              <i className="fas fa-crown"></i> Admin
            </span>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
            <i className="fas fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {userData.role === 'admin' ? (
          <AdminDashboard token={token} />
        ) : (
          <Dashboard token={token} userData={userData} />
        )}
      </main>

      <style jsx global>{`
        @media (max-width: 768px) {
          .header-mobile {
            flex-direction: column;
            gap: 12px;
            padding: 16px 20px !important;
          }
          .user-email-mobile {
            font-size: 14px;
          }
          .main-mobile {
            padding: 16px !important;
          }
          .title-mobile {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
    gap: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '28px',
    color: '#3b82f6',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '-0.025em',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  userEmail: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  adminBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  logoutBtn: {
    padding: '10px 12px',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  main: {
    padding: '24px',
  },
};
