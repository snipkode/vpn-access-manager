import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function Dashboard({ token, userData }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [deviceName, setDeviceName] = useState('My Device');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/vpn/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Fetch devices error:', error);
    }
  };

  const generateConfig = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/vpn/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to generate config');
      }

      setConfig(data.config);
      setQrCode(data.qr);
      setMessage('VPN configuration generated successfully!');
      fetchDevices();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadConfig = () => {
    if (!config) return;
    
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vpn-${deviceName.replace(/\s+/g, '-').toLowerCase()}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const revokeDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to revoke this device?')) return;

    try {
      const res = await fetch(`${API_URL}/vpn/device/${deviceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMessage('Device revoked successfully');
        fetchDevices();
        setConfig(null);
        setQrCode(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to revoke device');
      }
    } catch (error) {
      setError('Failed to revoke device');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {/* Generate Config Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <i className="fas fa-mobile-screen" style={styles.cardIcon}></i>
            Generate VPN Config
          </h2>

          {!userData.vpn_enabled ? (
            <div style={styles.disabledBox}>
              <p style={styles.disabledText}>
                <i className="fas fa-triangle-exclamation" style={styles.warningIcon}></i>
                Your VPN access is currently disabled.
                <br />
                Please contact your administrator to enable access.
              </p>
            </div>
          ) : (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <i className="fas fa-tag" style={styles.labelIcon}></i> Device Name
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  style={styles.input}
                  placeholder="My Device"
                />
              </div>

              <button
                onClick={generateConfig}
                disabled={loading}
                style={styles.generateBtn}
              >
                <i className="fas fa-bolt" style={styles.btnIcon}></i>
                {loading ? 'Generating...' : 'Generate Configuration'}
              </button>
            </>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.message}>{message}</div>}
        </div>

        {/* Config Display Card */}
        {config && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <i className="fas fa-sliders" style={styles.cardIcon}></i>
              Configuration
            </h2>

            {qrCode && (
              <div style={styles.qrContainer}>
                <div dangerouslySetInnerHTML={{ __html: qrCode }} />
                <p style={styles.qrLabel}>
                  <i className="fas fa-qrcode"></i> Scan QR Code
                </p>
              </div>
            )}

            <div style={styles.configBox}>
              <pre style={styles.configPre}>{config}</pre>
            </div>

            <button onClick={downloadConfig} style={styles.downloadBtn}>
              <i className="fas fa-download" style={styles.btnIcon}></i>
              Download .conf File
            </button>
          </div>
        )}

        {/* Devices List Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <i className="fas fa-list-check" style={styles.cardIcon}></i>
            My Devices
          </h2>

          <button onClick={fetchDevices} style={styles.refreshBtn}>
            <i className="fas fa-rotate" style={styles.btnIconSmall}></i> Refresh
          </button>

          {devices.length === 0 ? (
            <p style={styles.emptyText}>
              <i className="fas fa-inbox" style={styles.emptyIcon}></i>
              <br />No devices registered
            </p>
          ) : (
            <div style={styles.deviceList}>
              {devices.map((device) => (
                <div key={device.id} style={styles.deviceItem}>
                  <div style={styles.deviceInfo}>
                    <strong>
                      <i className="fas fa-laptop" style={styles.deviceIcon}></i> {device.device_name}
                    </strong>
                    <span style={styles.deviceIP}>
                      <i className="fas fa-globe"></i> {device.ip_address}
                    </span>
                    <span style={styles.deviceStatus}>
                      <i className="fas fa-circle-check"></i> {device.status}
                    </span>
                  </div>
                  <button
                    onClick={() => revokeDevice(device.id)}
                    style={styles.revokeBtn}
                  >
                    <i className="fas fa-trash"></i> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .dashboard-card {
            padding: 16px !important;
          }
          .dashboard-title {
            font-size: 16px !important;
          }
          .device-item {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start !important;
          }
          .revoke-btn {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .dashboard-container {
            padding: 0 !important;
          }
          .dashboard-card {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardIcon: {
    color: '#3b82f6',
    fontSize: '18px',
  },
  disabledBox: {
    backgroundColor: '#451a03',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  disabledText: {
    color: '#fbbf24',
    margin: 0,
    lineHeight: '1.6',
  },
  warningIcon: {
    color: '#fbbf24',
    fontSize: '16px',
    marginRight: '8px',
  },
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  labelIcon: {
    color: '#64748b',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  generateBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  btnIcon: {
    fontSize: '16px',
  },
  btnIconSmall: {
    fontSize: '14px',
  },
  error: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    borderRadius: '6px',
    fontSize: '14px',
  },
  message: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#14532d',
    color: '#86efac',
    borderRadius: '6px',
    fontSize: '14px',
  },
  qrContainer: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  qrLabel: {
    marginTop: '12px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  configBox: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    overflow: 'auto',
    maxHeight: '300px',
    marginBottom: '16px',
  },
  configPre: {
    margin: 0,
    padding: '16px',
    fontSize: '12px',
    lineHeight: '1.6',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    color: '#86efac',
  },
  downloadBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  refreshBtn: {
    padding: '8px 16px',
    backgroundColor: '#475569',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px 20px',
    fontSize: '14px',
  },
  emptyIcon: {
    fontSize: '32px',
    color: '#475569',
    marginBottom: '8px',
    display: 'block',
  },
  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  deviceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
  },
  deviceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  deviceIcon: {
    color: '#64748b',
    marginRight: '6px',
  },
  deviceIP: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  deviceStatus: {
    fontSize: '12px',
    color: '#10b981',
  },
  revokeBtn: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
