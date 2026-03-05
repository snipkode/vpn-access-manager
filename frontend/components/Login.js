export default function Login({ onLogin }) {
  return (
    <div style={styles.container}>
      <div style={styles.background}>
        <div style={styles.bgCircle1}></div>
        <div style={styles.bgCircle2}></div>
        <div style={styles.bgCircle3}></div>
      </div>
      
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
    position: 'relative',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  bgCircle1: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
    top: '-200px',
    right: '-200px',
  },
  bgCircle2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
    bottom: '-100px',
    left: '-100px',
  },
  bgCircle3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(20px)',
    padding: '56px 48px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    textAlign: 'center',
    maxWidth: '440px',
    width: '100%',
    border: '1px solid rgba(51, 65, 85, 0.5)',
  },
  iconContainer: {
    width: '96px',
    height: '96px',
    margin: '0 auto 28px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    boxShadow: '0 0 40px rgba(59, 130, 246, 0.2)',
  },
  icon: {
    fontSize: '48px',
    color: '#3b82f6',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    margin: '0 0 40px 0',
    color: '#94a3b8',
    fontSize: '15px',
  },
  loginBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px 28px',
    backgroundColor: '#fff',
    color: '#1e293b',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
  },
  googleIcon: {
    fontSize: '22px',
    color: '#DB4437',
  },
  footer: {
    marginTop: '32px',
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
