import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function Wallet({ token }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topups, setTopups] = useState([]);
  const [autoRenewal, setAutoRenewal] = useState({ enabled: false, preferred_plan: 'monthly' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTopupForm, setShowTopupForm] = useState(false);

  // Top-up form state
  const [topupAmount, setTopupAmount] = useState('');
  const [topupBank, setTopupBank] = useState('');
  const [topupDate, setTopupDate] = useState('');
  const [topupNotes, setTopupNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [balanceRes, transactionsRes, topupsRes, autoRenewalRes] = await Promise.all([
        fetch(`${API_URL}/credit/balance`, { headers }),
        fetch(`${API_URL}/credit/transactions?limit=10`, { headers }),
        fetch(`${API_URL}/credit/topups?limit=5`, { headers }),
        fetch(`${API_URL}/credit/auto-renewal`, { headers }),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data.balance);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (topupsRes.ok) {
        const data = await topupsRes.json();
        setTopups(data.topups || []);
      }

      if (autoRenewalRes.ok) {
        const data = await autoRenewalRes.json();
        setAutoRenewal(data.auto_renewal || { enabled: false, preferred_plan: 'monthly' });
      }
    } catch (error) {
      console.error('Fetch wallet data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/credit/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: topupAmount,
          bank_from: topupBank,
          transfer_date: topupDate,
          notes: topupNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit top-up');
      }

      setMessage('Top-up request submitted successfully! Please wait for admin approval.');
      setShowTopupForm(false);
      setTopupAmount('');
      setTopupBank('');
      setTopupDate('');
      setTopupNotes('');
      fetchData();
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoRenewalToggle = async () => {
    try {
      const res = await fetch(`${API_URL}/credit/auto-renewal`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: !autoRenewal.enabled,
        }),
      });

      if (res.ok) {
        setAutoRenewal(prev => ({ ...prev, enabled: !prev.enabled }));
        setMessage(`Auto-renewal ${!autoRenewal.enabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      setError('Failed to update auto-renewal settings');
    }
  };

  const handlePlanChange = async (plan) => {
    try {
      const res = await fetch(`${API_URL}/credit/auto-renewal`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_plan: plan }),
      });

      if (res.ok) {
        setAutoRenewal(prev => ({ ...prev, preferred_plan: plan }));
      }
    } catch (error) {
      setError('Failed to update plan');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading wallet...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Balance Card */}
      <div style={styles.balanceCard}>
        <div style={styles.balanceHeader}>
          <h2 style={styles.balanceTitle}>
            <i className="fas fa-wallet" style={styles.walletIcon}></i>
            My Wallet
          </h2>
          <button
            onClick={() => setShowTopupForm(!showTopupForm)}
            style={styles.topupBtn}
          >
            <i className="fas fa-plus"></i> Top Up
          </button>
        </div>
        <div style={styles.balanceAmount}>{formatCurrency(balance)}</div>
        <div style={styles.balanceSub}>Available Credit</div>

        {/* Auto-renewal Status */}
        <div style={styles.autoRenewalBox}>
          <div style={styles.autoRenewalHeader}>
            <span style={styles.autoRenewalLabel}>
              <i className="fas fa-sync"></i> Auto-Renewal
            </span>
            <button
              onClick={handleAutoRenewalToggle}
              style={autoRenewal.enabled ? styles.toggleOn : styles.toggleOff}
            >
              {autoRenewal.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          {autoRenewal.enabled && (
            <div style={styles.planSelector}>
              {['monthly', 'quarterly', 'yearly'].map(plan => (
                <button
                  key={plan}
                  onClick={() => handlePlanChange(plan)}
                  style={autoRenewal.preferred_plan === plan ? styles.planBtnActive : styles.planBtn}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.message}>{message}</div>}

      {/* Top-up Form Modal */}
      {showTopupForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Top Up Credit</h3>
              <button onClick={() => setShowTopupForm(false)} style={styles.closeBtn}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleTopupSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (IDR)</label>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  style={styles.input}
                  placeholder="Minimum 10,000"
                  min="10000"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Bank / E-Wallet</label>
                <input
                  type="text"
                  value={topupBank}
                  onChange={(e) => setTopupBank(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., BCA, GoPay, OVO"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Transfer Date</label>
                <input
                  type="date"
                  value={topupDate}
                  onChange={(e) => setTopupDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Notes (Optional)</label>
                <textarea
                  value={topupNotes}
                  onChange={(e) => setTopupNotes(e.target.value)}
                  style={styles.textarea}
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>
              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setShowTopupForm(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={styles.submitBtn}
                >
                  {submitting ? 'Submitting...' : 'Submit Top-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('transactions')}
          style={activeTab === 'transactions' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-history"></i> Transactions
        </button>
        <button
          onClick={() => setActiveTab('topups')}
          style={activeTab === 'topups' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-upload"></i> Top-up History
        </button>
      </div>

      {/* Transactions List */}
      {activeTab === 'transactions' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fas fa-receipt"></i> Recent Transactions
          </h3>
          {transactions.length === 0 ? (
            <p style={styles.emptyText}>No transactions yet</p>
          ) : (
            <div style={styles.list}>
              {transactions.map(tx => (
                <div key={tx.id} style={styles.listItem}>
                  <div style={styles.listIcon}>
                    <i className={`fas ${getTransactionIcon(tx.type)}`}></i>
                  </div>
                  <div style={styles.listContent}>
                    <div style={styles.listTitle}>{tx.description || tx.type}</div>
                    <div style={styles.listDate}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    ...styles.listAmount,
                    color: tx.type === 'topup' || tx.type === 'credit' ? '#10b981' : '#ef4444'
                  }}>
                    {tx.type === 'topup' || tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top-up History */}
      {activeTab === 'topups' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fas fa-clock-rotate-left"></i> Top-up Requests
          </h3>
          {topups.length === 0 ? (
            <p style={styles.emptyText}>No top-up requests</p>
          ) : (
            <div style={styles.list}>
              {topups.map(topup => (
                <div key={topup.id} style={styles.listItem}>
                  <div style={styles.listIcon}>
                    <i className="fas fa-upload"></i>
                  </div>
                  <div style={styles.listContent}>
                    <div style={styles.listTitle}>
                      {formatCurrency(topup.amount)} - {topup.bank_from}
                    </div>
                    <div style={styles.listDate}>
                      {new Date(topup.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    ...getStatusStyle(topup.status)
                  }}>
                    {topup.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

function getTransactionIcon(type) {
  const icons = {
    topup: 'fa-arrow-down',
    credit: 'fa-gift',
    deduction: 'fa-arrow-up',
    auto_renewal: 'fa-sync',
  };
  return icons[type] || 'fa-circle';
}

function getStatusStyle(status) {
  const styles = {
    pending: { backgroundColor: '#451a03', color: '#fbbf24' },
    approved: { backgroundColor: '#14532d', color: '#86efac' },
    rejected: { backgroundColor: '#7f1d1d', color: '#fca5a5' },
  };
  return styles[status] || { backgroundColor: '#334155', color: '#94a3b8' };
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  balanceCard: {
    backgroundColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid #334155',
    marginBottom: '20px',
  },
  balanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  balanceTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  walletIcon: {
    color: '#3b82f6',
  },
  topupBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  balanceAmount: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '4px',
  },
  balanceSub: {
    color: '#64748b',
    fontSize: '14px',
  },
  autoRenewalBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  autoRenewalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  autoRenewalLabel: {
    fontSize: '14px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggleOn: {
    padding: '6px 16px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toggleOff: {
    padding: '6px 16px',
    backgroundColor: '#475569',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  planSelector: {
    display: 'flex',
    gap: '8px',
  },
  planBtn: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  planBtnActive: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  error: {
    padding: '12px',
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  message: {
    padding: '12px',
    backgroundColor: '#14532d',
    color: '#86efac',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    border: '1px solid #334155',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #334155',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
  },
  formGroup: {
    marginBottom: '16px',
    padding: '0 20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  modalFooter: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid #334155',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#475569',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  tab: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  activeTab: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: '1px solid #3b82f6',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
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
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  listIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: '#1e293b',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3b82f6',
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    marginBottom: '4px',
  },
  listDate: {
    fontSize: '12px',
    color: '#64748b',
  },
  listAmount: {
    fontSize: '14px',
    fontWeight: '600',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
};
