import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function AdminCredit({ token }) {
  const [stats, setStats] = useState(null);
  const [topups, setTopups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, filterStatus]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'overview') {
        const statsRes = await fetch(`${API_URL}/admin/credit/credit/stats`, { headers });
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
      } else if (activeTab === 'topups') {
        const url = filterStatus 
          ? `${API_URL}/admin/credit/topups?status=${filterStatus}&limit=50`
          : `${API_URL}/admin/credit/topups?limit=50`;
        const topupsRes = await fetch(url, { headers });
        if (topupsRes.ok) {
          const data = await topupsRes.json();
          setTopups(data.topups || []);
        }
      } else if (activeTab === 'transactions') {
        const url = filterStatus
          ? `${API_URL}/admin/credit/credit/transactions?type=${filterStatus}&limit=100`
          : `${API_URL}/admin/credit/credit/transactions?limit=100`;
        const txRes = await fetch(url, { headers });
        if (txRes.ok) {
          const data = await txRes.json();
          setTransactions(data.transactions || []);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTopup = async (id) => {
    if (!confirm('Approve this top-up?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/credit/topups/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert('Top-up approved successfully');
        fetchData();
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to approve'));
      }
    } catch (error) {
      alert('Failed to approve top-up');
    }
  };

  const handleRejectTopup = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      const res = await fetch(`${API_URL}/admin/credit/topups/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        alert('Top-up rejected');
        fetchData();
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to reject'));
      }
    } catch (error) {
      alert('Failed to reject top-up');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading credit management...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={activeTab === 'overview' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-chart-pie"></i> Overview
        </button>
        <button
          onClick={() => setActiveTab('topups')}
          style={activeTab === 'topups' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-upload"></i> Top-ups
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          style={activeTab === 'transactions' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-history"></i> Transactions
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && stats && (
          <>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <i className="fas fa-coins"></i>
                </div>
                <div style={styles.statValue}>{formatCurrency(stats.total_credit_issued)}</div>
                <div style={styles.statLabel}>Total Credit Issued</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <i className="fas fa-arrow-down"></i>
                </div>
                <div style={styles.statValue}>{formatCurrency(stats.total_credit_used)}</div>
                <div style={styles.statLabel}>Total Credit Used</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <div style={styles.statValue}>{stats.users_with_balance}</div>
                <div style={styles.statLabel}>Users with Balance</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <i className="fas fa-wallet"></i>
                </div>
                <div style={styles.statValue}>{formatCurrency(stats.total_user_balance)}</div>
                <div style={styles.statLabel}>Total User Balance</div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, color: '#f59e0b' }}>
                  <i className="fas fa-clock"></i>
                </div>
                <div style={styles.statValue}>{stats.total_topups_pending}</div>
                <div style={styles.statLabel}>Pending Top-ups</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, color: '#10b981' }}>
                  <i className="fas fa-check"></i>
                </div>
                <div style={styles.statValue}>{stats.total_topups_approved}</div>
                <div style={styles.statLabel}>Approved Top-ups</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statIcon, color: '#ef4444' }}>
                  <i className="fas fa-times"></i>
                </div>
                <div style={styles.statValue}>{stats.total_topups_rejected}</div>
                <div style={styles.statLabel}>Rejected Top-ups</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'topups' && (
          <>
            <div style={styles.filterBar}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.select}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Bank</th>
                    <th style={styles.th}>Transfer Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topups.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.emptyCell}>No top-ups found</td>
                    </tr>
                  ) : (
                    topups.map((topup) => (
                      <tr key={topup.id}>
                        <td style={styles.td}>{topup.user_email}</td>
                        <td style={styles.td}>{formatCurrency(topup.amount)}</td>
                        <td style={styles.td}>{topup.bank_from}</td>
                        <td style={styles.td}>{new Date(topup.transfer_date).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <span style={getStatusStyle(topup.status)}>{topup.status}</span>
                        </td>
                        <td style={styles.td}>{new Date(topup.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          {topup.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveTopup(topup.id)}
                                style={styles.approveBtn}
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => handleRejectTopup(topup.id)}
                                style={styles.rejectBtn}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          )}
                          {topup.admin_note && (
                            <span style={styles.noteBadge}>
                              <i className="fas fa-comment"></i>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            <div style={styles.filterBar}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.select}
              >
                <option value="">All Types</option>
                <option value="topup">Top-up</option>
                <option value="credit">Manual Credit</option>
                <option value="deduction">Deduction</option>
                <option value="auto_renewal">Auto-Renewal</option>
              </select>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Balance Before</th>
                    <th style={styles.th}>Balance After</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.emptyCell}>No transactions found</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={styles.td}>{tx.user_email}</td>
                        <td style={styles.td}>
                          <span style={getTypeStyle(tx.type)}>{tx.type}</span>
                        </td>
                        <td style={styles.td}>{formatCurrency(tx.amount)}</td>
                        <td style={styles.td}>{formatCurrency(tx.balance_before)}</td>
                        <td style={styles.td}>{formatCurrency(tx.balance_after)}</td>
                        <td style={styles.td}>{tx.description}</td>
                        <td style={styles.td}>{new Date(tx.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getStatusStyle(status) {
  const styles = {
    pending: { backgroundColor: '#451a03', color: '#fbbf24', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    approved: { backgroundColor: '#14532d', color: '#86efac', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    rejected: { backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  };
  return styles[status] || {};
}

function getTypeStyle(type) {
  const styles = {
    topup: { backgroundColor: '#1e3a5f', color: '#60a5fa', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    credit: { backgroundColor: '#14532d', color: '#86efac', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    deduction: { backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
    auto_renewal: { backgroundColor: '#3b82f6', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  };
  return styles[type] || {};
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  content: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#0f172a',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #334155',
  },
  statIcon: {
    fontSize: '28px',
    color: '#3b82f6',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    marginTop: '8px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  filterBar: {
    marginBottom: '16px',
  },
  select: {
    padding: '10px 16px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tableContainer: {
    overflow: 'auto',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    backgroundColor: '#1e293b',
    color: '#60a5fa',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #3b82f6',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
    borderBottom: '1px solid #334155',
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#64748b',
  },
  approveBtn: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '8px',
  },
  rejectBtn: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noteBadge: {
    backgroundColor: '#475569',
    color: '#94a3b8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
};
