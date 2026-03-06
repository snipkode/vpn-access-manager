import { useEffect, useState } from 'react';
import { useUIStore, useBillingStore } from '../store';
import { creditAPI, billingAPI, formatCurrency } from '../lib/api';

export default function Wallet({ token }) {
  const { showNotification } = useUIStore();
  const { bankAccounts } = useBillingStore();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [submitting, setSubmitting] = useState(false);
  
  // Topup form state
  const [amount, setAmount] = useState(50000);
  const [bankFrom, setBankFrom] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [balanceData, transactionsData, topupsData] = await Promise.all([
        creditAPI.getBalance(),
        creditAPI.getTransactions({ limit: 20 }),
        billingAPI.getPayments({ limit: 10 }),
      ]);

      setBalance(balanceData.balance || 0);
      setTransactions(transactionsData.transactions || []);
      setTopups(topupsData.payments || []);
    } catch (error) {
      console.error('❌ Failed to load wallet data:', error);
      setError(error.message);
      showNotification('Failed to load wallet data: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Only images (JPEG, PNG) and PDF files are allowed', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
      }

      setProofFile(file);

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

  const handleSubmitTopup = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!transferDate) {
        throw new Error('Transfer date is required');
      }

      if (!proofFile) {
        throw new Error('Proof of transfer is required');
      }

      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('bank_from', bankFrom);
      formData.append('transfer_date', transferDate);
      formData.append('notes', notes || '');
      formData.append('proof', proofFile);

      await billingAPI.submitPayment(formData);

      showNotification('Top-up submitted successfully! Please wait for admin approval.');
      
      // Reset form
      setProofFile(null);
      setProofPreview(null);
      setBankFrom('');
      setTransferDate('');
      setNotes('');
      setAmount(50000);
      
      // Refresh data
      fetchData();
      setActiveTab('history');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-dark">
          <i className="fas fa-wallet text-primary mr-2" />
          Wallet & Top Up
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <i className={`fas fa-sync-alt mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-900 mb-1">Failed to Load Data</div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 shadow-lg shadow-primary/30">
        <div className="text-sm text-white/80 mb-2">Available Balance</div>
        <div className="text-4xl font-bold text-white mb-1">{formatCurrency(balance)}</div>
        <div className="text-sm text-white/80">Credit available for subscription</div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('topup')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'topup'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-plus-circle mr-2" />
            Top Up
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-history mr-2" />
            Topup History
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-list mr-2" />
            Transactions
          </button>
        </div>
      </div>

      {/* Top Up Form */}
      {activeTab === 'topup' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-dark mb-6">
            <i className="fas fa-upload text-primary mr-2" />
            Submit Top Up Request
          </h2>

          {/* Bank Accounts Info */}
          {bankAccounts.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                <i className="fas fa-university text-primary mr-2" />
                Transfer To
              </h3>
              {bankAccounts.map((bank) => (
                <div key={bank.id} className="bg-white rounded-lg p-3 mb-2">
                  <div className="text-sm font-bold text-dark">{bank.bank}</div>
                  <div className="text-xs text-gray-500 mb-1">{bank.account_name}</div>
                  <div className="text-base font-mono font-bold text-primary">{bank.account_number}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitTopup} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Amount (IDR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                min="10000"
                step="10000"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Minimum: Rp 10,000</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-university mr-2" />
                Bank / E-Wallet Used
              </label>
              <input
                type="text"
                value={bankFrom}
                onChange={(e) => setBankFrom(e.target.value)}
                placeholder="e.g., BCA, Mandiri, GoPay, OVO"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-calendar mr-2" />
                Transfer Date
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-file-upload mr-2" />
                Proof of Transfer
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Upload screenshot or PDF (Max 5MB)</p>

              {proofPreview && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 text-center">
                  <img
                    src={proofPreview}
                    alt="Proof preview"
                    className="max-h-64 mx-auto rounded-lg shadow-sm"
                  />
                </div>
              )}

              {proofFile && !proofPreview && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <i className="fas fa-file-pdf text-red-500 text-2xl" />
                  <div className="text-sm text-dark">
                    {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-sticky-note mr-2" />
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-paper-plane" />
                  Submit Top Up Request
                </span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Topup History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-dark mb-6">
            <i className="fas fa-clock-rotate-left text-primary mr-2" />
            Top Up History
          </h2>

          {topups.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <div className="text-base font-medium text-dark mb-1">No top up history yet</div>
              <div className="text-sm text-gray-400">Your submitted top ups will appear here</div>
            </div>
          ) : (
            <div className="space-y-3">
              {topups.map((topup) => (
                <div
                  key={topup.id}
                  className="border border-gray-100 rounded-xl p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(topup.amount)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {topup.plan_label || 'Top Up'} • {topup.duration_days || 'N/A'} days
                      </div>
                    </div>
                    <StatusBadge status={topup.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-gray-400">
                      <i className="fas fa-university mr-2" />
                      {topup.bank_from}
                    </div>
                    <div className="text-gray-400">
                      <i className="fas fa-calendar mr-2" />
                      Transfer: {new Date(topup.transfer_date).toLocaleDateString()}
                    </div>
                    <div className="text-gray-400">
                      <i className="fas fa-clock mr-2" />
                      Submitted: {new Date(topup.created_at).toLocaleDateString()}
                    </div>
                    {topup.admin_note && (
                      <div className="text-amber-600 col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                        <i className="fas fa-info-circle mr-2" />
                        <strong>Admin Note:</strong> {topup.admin_note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-dark mb-4">Recent Transactions</h2>

          {transactions.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-sm text-gray-400">No transactions yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0 ${
                    getTxColor(tx.type)
                  }`}>
                    {getTxIcon(tx.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-dark">{tx.description || tx.type}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    (tx.type === 'topup' || tx.type === 'credit') ? 'text-success' : 'text-red-500'
                  }`}>
                    {(tx.type === 'topup' || tx.type === 'credit') ? '+' : '-'}
                    {formatCurrency(tx.amount)}
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

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
      styles[status] || 'bg-gray-100 text-gray-600'
    }`}>
      {status}
    </span>
  );
}

function getTxIcon(type) {
  const icons = { topup: '↓', credit: '⊕', deduction: '↑', auto_renewal: '⟳', transfer: '→' };
  return icons[type] || '•';
}

function getTxColor(type) {
  const colors = {
    topup: 'bg-success/10 text-success',
    credit: 'bg-primary/10 text-primary',
    deduction: 'bg-red-500/10 text-red-500',
    auto_renewal: 'bg-amber-500/10 text-amber-500',
    transfer: 'bg-blue-500/10 text-blue-500',
  };
  return colors[type] || 'bg-gray-400/10 text-gray-400';
}
