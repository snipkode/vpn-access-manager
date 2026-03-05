import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function AdminDashboard({ token }) {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
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
    } finally {
      setLoading(false);
    }
  };

  const toggleVpnAccess = async (userId, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vpn_enabled: !currentStatus }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const revokeDevice = async (deviceId) => {
    if (!confirm('Revoke this device?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/device/${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Revoke error:', error);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading admin dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={activeTab === 'overview' ? styles.activeTab : styles.tab}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={activeTab === 'users' ? styles.activeTab : styles.tab}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          style={activeTab === 'devices' ? styles.activeTab : styles.tab}
        >
          📱 Devices
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats?.total_users || 0}</div>
              <div style={styles.statLabel}>Total Users</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats?.vpn_enabled_users || 0}</div>
              <div style={styles.statLabel}>VPN Enabled</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats?.vpn_disabled_users || 0}</div>
              <div style={styles.statLabel}>VPN Disabled</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats?.active_devices || 0}</div>
              <div style={styles.statLabel}>Active Devices</div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>VPN Access</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={user.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                        {user.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => toggleVpnAccess(user.id, user.vpn_enabled)}
                        style={user.vpn_enabled ? styles.enabledBtn : styles.disabledBtn}
                      >
                        {user.vpn_enabled ? '✅ Enabled' : '❌ Disabled'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => toggleVpnAccess(user.id, user.vpn_enabled)}
                        style={styles.actionBtn}
                      >
                        {user.vpn_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'devices' && (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Device Name</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} style={styles.tr}>
                    <td style={styles.td}>{device.device_name}</td>
                    <td style={styles.td}>{device.user_id}</td>
                    <td style={styles.td}>{device.ip_address}</td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge}>{device.status}</span>
                    </td>
                    <td style={styles.td}>
                      {new Date(device.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => revokeDevice(device.id)}
                        style={styles.revokeBtn}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#94a3b8',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  activeTab: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  content: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    backgroundColor: '#0f172a',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #334155',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    marginTop: '8px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  tableContainer: {
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #334155',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
  },
  adminBadge: {
    backgroundColor: '#3b82f6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  userBadge: {
    backgroundColor: '#475569',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  enabledBtn: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  disabledBtn: {
    backgroundColor: '#64748b',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  actionBtn: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  revokeBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
