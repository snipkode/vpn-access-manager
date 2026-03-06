import { useState, useEffect } from 'react';
import { useUIStore, useBillingStore } from '../store';
import { billingAPI, formatCurrency } from '../lib/api';

const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
  yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
};

export default function PaymentForm({ token }) {
  const { showNotification } = useUIStore();
  const { billingEnabled, plans, bankAccounts, setBillingData } = useBillingStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('submit');

  // Form state
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [amount, setAmount] = useState(50000);
  const [bankFrom, setBankFrom] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  // Payment history (keep local as it's specific to this component)
  const [paymentHistory, setPaymentHistory] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, historyData] = await Promise.all([
        billingAPI.getSettings(),
        billingAPI.getPayments({ limit: 10 }),
      ]);

      // Update global billing store
      setBillingData({
        billing_enabled: plansData.billing_enabled || false,
        currency: plansData.currency || 'IDR',
        plans: plansData.plans || [],
        bank_accounts: plansData.bank_accounts || [],
      });

      setPaymentHistory(historyData.payments || []);

      // Set default amount
      if (plansData.plans && plansData.plans.length > 0) {
        const defaultPlan = plansData.plans.find(p => p.id === selectedPlan) || plansData.plans[0];
        setAmount(defaultPlan.price);
      }
    } catch (error) {
      showNotification('Failed to load payment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planId) => {
    setSelectedPlan(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setAmount(plan.price);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only images (JPEG, PNG) and PDF files are allowed');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setProofFile(file);
      setError(null);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProofPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      // Validate amount
      const plan = PLANS[selectedPlan];
      if (amount < plan.price * 0.9) {
        throw new Error(`Amount must be at least ${formatCurrency(plan.price)}`);
      }

      // Validate transfer date
      if (!transferDate) {
        throw new Error('Transfer date is required');
      }

      // Validate proof file
      if (!proofFile) {
        throw new Error('Proof of transfer is required');
      }

      // Create form data
      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('plan', selectedPlan);
      formData.append('bank_from', bankFrom);
      formData.append('transfer_date', transferDate);
      formData.append('notes', notes);
      formData.append('proof', proofFile);

      const res = await fetch(`${API_URL}/billing/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment');
      }

      setMessage('Payment submitted successfully! Please wait for admin approval.');
      // Reset form
      setProofFile(null);
      setProofPreview(null);
      setBankFrom('');
      setTransferDate('');
      setNotes('');
      // Refresh history
      fetchData();
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: { backgroundColor: '#451a03', color: '#fbbf24' },
      approved: { backgroundColor: '#14532d', color: '#86efac' },
      rejected: { backgroundColor: '#7f1d1d', color: '#fca5a5' },
    };
    return styles[status] || { backgroundColor: '#334155', color: '#94a3b8' };
  };

  if (loading) {
    return <div style={styles.loading}>Loading payment...</div>;
  }

  if (!billingEnabled) {
    return (
      <div style={styles.container}>
        <div style={styles.disabledBox}>
          <i className="fas fa-triangle-exclamation" style={styles.disabledIcon}></i>
          <h2 style={styles.disabledTitle}>Payment System Currently Unavailable</h2>
          <p style={styles.disabledText}>
            The payment system is temporarily disabled. Please contact admin for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <i className="fas fa-credit-card"></i> Payment & Billing
        </h1>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.message}>{message}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('submit')}
          style={activeTab === 'submit' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-upload"></i> Submit Payment
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={activeTab === 'history' ? styles.activeTab : styles.tab}
        >
          <i className="fas fa-history"></i> Payment History
        </button>
      </div>

      {activeTab === 'submit' && (
        <>
          {/* Bank Accounts Info */}
          {bankAccounts.length > 0 && (
            <div style={styles.bankInfo}>
              <h3 style={styles.bankTitle}>
                <i className="fas fa-university"></i> Transfer To
              </h3>
              {bankAccounts.map((bank) => (
                <div key={bank.id} style={styles.bankCard}>
                  <div style={styles.bankHeader}>
                    <i className="fas fa-university" style={styles.bankIcon}></i>
                    <span style={styles.bankName}>{bank.bank}</span>
                  </div>
                  <div style={styles.bankDetails}>
                    <div style={styles.bankAccount}>
                      <strong>Account Number:</strong> {bank.account_number}
                    </div>
                    <div style={styles.bankAccount}>
                      <strong>Account Name:</strong> {bank.account_name}
                    </div>
                    {bank.description && (
                      <div style={styles.bankDescription}>{bank.description}</div>
                    )}
                  </div>
                  {bank.qr_code_url && (
                    <div style={styles.qrCode}>
                      <img src={bank.qr_code_url} alt="QR Code" style={styles.qrImage} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <i className="fas fa-box"></i> Select Plan
              </h3>
              <div style={styles.planGrid}>
                {Object.entries(PLANS).map(([planId, plan]) => (
                  <div
                    key={planId}
                    onClick={() => handlePlanChange(planId)}
                    style={
                      selectedPlan === planId ? styles.planCardSelected : styles.planCard
                    }
                  >
                    <div style={styles.planName}>{plan.label}</div>
                    <div style={styles.planPrice}>{formatCurrency(plan.price)}</div>
                    <div style={styles.planDuration}>{plan.duration} days</div>
                    {selectedPlan === planId && (
                      <div style={styles.selectedBadge}>
                        <i className="fas fa-check-circle"></i> Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount (IDR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                style={styles.input}
                placeholder="Amount"
                min="10000"
                required
              />
              <small style={styles.hint}>
                Minimum: {formatCurrency(PLANS[selectedPlan].price)}
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-university"></i> Bank / E-Wallet Used
              </label>
              <input
                type="text"
                value={bankFrom}
                onChange={(e) => setBankFrom(e.target.value)}
                style={styles.input}
                placeholder="e.g., BCA, Mandiri, GoPay, OVO"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-calendar"></i> Transfer Date
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-file-upload"></i> Proof of Transfer
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                style={styles.fileInput}
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                required
              />
              <small style={styles.hint}>
                Upload screenshot or PDF (Max 5MB). Allowed: JPEG, PNG, PDF
              </small>

              {proofPreview && (
                <div style={styles.previewContainer}>
                  <img src={proofPreview} alt="Proof preview" style={styles.previewImage} />
                </div>
              )}

              {proofFile && !proofPreview && (
                <div style={styles.fileInfo}>
                  <i className="fas fa-file-pdf"></i> {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-sticky-note"></i> Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={styles.textarea}
                placeholder="Additional notes or instructions..."
                rows="3"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={styles.submitBtn}
            >
              {submitting ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i> Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Submit Payment
                </>
              )}
            </button>
          </form>
        </>
      )}

      {activeTab === 'history' && (
        <div style={styles.historySection}>
          <h3 style={styles.sectionTitle}>
            <i className="fas fa-clock-rotate-left"></i> Payment History
          </h3>
          {paymentHistory.length === 0 ? (
            <p style={styles.emptyText}>No payment history yet</p>
          ) : (
            <div style={styles.historyList}>
              {paymentHistory.map((payment) => (
                <div key={payment.id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <div style={styles.historyAmount}>
                      {formatCurrency(payment.amount)}
                    </div>
                    <span style={{...styles.statusBadge, ...getStatusStyle(payment.status)}}>
                      {payment.status}
                    </span>
                  </div>
                  <div style={styles.historyDetails}>
                    <div style={styles.historyDetail}>
                      <i className="fas fa-box"></i> Plan: {payment.plan_label || payment.plan}
                    </div>
                    <div style={styles.historyDetail}>
                      <i className="fas fa-university"></i> From: {payment.bank_from}
                    </div>
                    <div style={styles.historyDetail}>
                      <i className="fas fa-calendar"></i> Transfer: {new Date(payment.transfer_date).toLocaleDateString()}
                    </div>
                    <div style={styles.historyDetail}>
                      <i className="fas fa-clock"></i> Submitted: {new Date(payment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {payment.admin_note && (
                    <div style={styles.adminNote}>
                      <strong>Admin Note:</strong> {payment.admin_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  disabledBox: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    border: '1px solid #334155',
  },
  disabledIcon: {
    fontSize: '48px',
    color: '#fbbf24',
    marginBottom: '16px',
  },
  disabledTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    color: '#fff',
  },
  disabledText: {
    margin: 0,
    color: '#94a3b8',
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
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    padding: '12px 24px',
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
    padding: '12px 24px',
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
  bankInfo: {
    marginBottom: '24px',
  },
  bankTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bankCard: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #334155',
    marginBottom: '12px',
  },
  bankHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  bankIcon: {
    fontSize: '24px',
    color: '#3b82f6',
  },
  bankName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  bankDetails: {
    marginBottom: '12px',
  },
  bankAccount: {
    fontSize: '14px',
    color: '#e2e8f0',
    marginBottom: '4px',
  },
  bankDescription: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  qrCode: {
    textAlign: 'center',
    marginTop: '12px',
  },
  qrImage: {
    maxWidth: '200px',
    borderRadius: '8px',
  },
  form: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid #334155',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  planCard: {
    backgroundColor: '#0f172a',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },
  planCardSelected: {
    backgroundColor: '#0f172a',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },
  planName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '8px',
  },
  planPrice: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: '4px',
  },
  planDuration: {
    fontSize: '13px',
    color: '#64748b',
  },
  selectedBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  hint: {
    display: 'block',
    marginTop: '6px',
    fontSize: '12px',
    color: '#64748b',
  },
  fileInput: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
  },
  previewContainer: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    textAlign: 'center',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
  },
  fileInfo: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
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
  historySection: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid #334155',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: '40px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  historyItem: {
    backgroundColor: '#0f172a',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  historyAmount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statusBadge: {
    padding: '6px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  historyDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyDetail: {
    fontSize: '14px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  adminNote: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#fbbf24',
    border: '1px solid #451a03',
  },
};
