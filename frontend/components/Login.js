export default function Login({ onLogin }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <i style={styles.icon} className="fas fa-shield-halved"></i>
        </div>
        <h1 style={styles.title}>VPN Access Manager</h1>
        <p style={styles.subtitle}>Secure WireGuard VPN Access</p>

        <button onClick={onLogin} style={styles.loginBtn}>
          <i className="fab fa-google" style={styles.googleIcon}></i>
          Sign in with Google
        </button>

        <p style={styles.footer}>
          <i className="fas fa-lock" style={styles.lockIcon}></i>
          Managed WireGuard VPN Access
        </p>
      </div>

      <style jsx global>{`
        @media (max-width: 480px) {
          .login-card {
            padding: 24px !important;
          }
          .login-title {
            font-size: 24px !important;
          }
          .login-icon {
            font-size: 48px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '48px 40px',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    maxWidth: '420px',
    width: '100%',
    border: '1px solid #334155',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    margin: '0 auto 24px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(59, 130, 246, 0.3)',
  },
  icon: {
    fontSize: '40px',
    color: '#3b82f6',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '26px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    margin: '0 0 32px 0',
    color: '#94a3b8',
    fontSize: '15px',
  },
  loginBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '14px 24px',
    backgroundColor: '#fff',
    color: '#1e293b',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  },
  googleIcon: {
    fontSize: '20px',
    color: '#DB4437',
  },
  footer: {
    marginTop: '28px',
    color: '#64748b',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  lockIcon: {
    fontSize: '12px',
  },
};
