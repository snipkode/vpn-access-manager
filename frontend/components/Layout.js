import { useState, useEffect } from 'react';

export default function Layout({ children, user, onLogout, activePage, onPageChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth > 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    }
  }, [isDesktop]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge' },
    { id: 'devices', label: 'My Devices', icon: 'fa-mobile-screen' },
    { id: 'wallet', label: 'Wallet', icon: 'fa-wallet' },
    { id: 'settings', label: 'Settings', icon: 'fa-gear' },
  ];

  if (user?.role === 'admin') {
    menuItems.push(
      { id: 'admin', label: 'Admin Panel', icon: 'fa-shield-halved', admin: true },
      { id: 'users', label: 'Users', icon: 'fa-users', admin: true },
      { id: 'all-devices', label: 'All Devices', icon: 'fa-network-wired', admin: true },
      { id: 'credit', label: 'Credit Mgmt', icon: 'fa-coins', admin: true },
    );
  }

  return (
    <div style={styles.layout}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          style={styles.overlay} 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={isDesktop ? 'sidebar-desktop' : (sidebarOpen ? 'sidebar-mobile-open' : 'sidebar-mobile')}
        style={styles.sidebar}
      >
        <div style={styles.sidebarHeader}>
          <div style={styles.logoContainer}>
            <i style={styles.logoIcon} className="fas fa-shield-halved"></i>
            <span style={styles.logoText}>VPN Access</span>
          </div>
          <button 
            className={!isDesktop ? '' : 'hidden'}
            style={{...styles.closeBtn, display: isDesktop ? 'none' : 'flex'}} 
            onClick={() => setSidebarOpen(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onPageChange(item.id);
                setSidebarOpen(false);
              }}
              style={{
                ...styles.navItem,
                ...(activePage === item.id ? styles.navItemActive : {}),
                ...(item.admin ? styles.navItemAdmin : {}),
              }}
            >
              <i className={`fas ${item.icon}`} style={styles.navIcon}></i>
              <span style={styles.navLabel}>{item.label}</span>
              {item.admin && <span style={styles.adminTag}>Admin</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              <i className="fas fa-user"></i>
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{user?.email?.split('@')[0]}</span>
              <span style={styles.userEmail}>{user?.email}</span>
            </div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn}>
            <i className="fas fa-right-from-bracket"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={isDesktop ? 'main-container-desktop' : 'main-container-mobile'} style={styles.mainContainer}>
        {/* Top Bar */}
        <header style={styles.topBar}>
          <button 
            className="menu-btn-mobile"
            style={styles.menuBtn} 
            onClick={() => setSidebarOpen(true)}
          >
            <i className="fas fa-bars"></i>
          </button>
          <h1 style={styles.pageTitle}>
            {menuItems.find(m => m.id === activePage)?.label || 'Dashboard'}
          </h1>
          <div style={styles.topBarRight}>
            {user?.role === 'admin' && (
              <span style={styles.adminBadge}>
                <i className="fas fa-crown"></i> Admin
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main style={styles.content}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        @media (min-width: 769px) {
          .sidebar-desktop {
            transform: translateX(0) !important;
          }
          .main-container-desktop {
            margin-left: 280px !important;
          }
          .menu-btn-desktop {
            display: none !important;
          }
        }
        
        @media (max-width: 768px) {
          .sidebar-mobile {
            transform: translateX(-100%) !important;
          }
          .sidebar-mobile-open {
            transform: translateX(0) !important;
          }
          .main-container-mobile {
            margin-left: 0 !important;
          }
          .menu-btn-mobile {
            display: flex !important;
          }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 40,
    backdropFilter: 'blur(4px)',
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '280px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    transition: 'transform 0.3s ease',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
    transform: 'translateX(-100%)',
  },
  sidebarOpen: {
    transform: 'translateX(0)',
  },
  sidebarHeader: {
    padding: '24px 20px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '28px',
    color: '#3b82f6',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto',
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: 'none',
    border: 'none',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '4px',
    textAlign: 'left',
  },
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  navItemAdmin: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  navIcon: {
    fontSize: '16px',
    width: '20px',
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
  },
  adminTag: {
    fontSize: '10px',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#a78bfa',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #334155',
    backgroundColor: '#0f172a',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  userAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
    overflow: 'hidden',
  },
  userName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '2px',
  },
  userEmail: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  mainContainer: {
    marginLeft: 0,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.3s ease',
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #334155',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  pageTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  adminBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#a78bfa',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  content: {
    flex: 1,
    padding: '24px',
  },
};
