import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { adminCreditAPI, formatCurrency } from '../lib/api';

const tabs = [
  { id: 'all', label: 'All Transactions' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'pending_review', label: 'Needs Review' },
];

export default function AdminCredit({ token }) {
  const { showNotification } = useUIStore();
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, txData] = await Promise.all([
        adminCreditAPI.getStats().catch(() => ({ stats: null })),
        adminCreditAPI.getTransactions({ type: activeTab === 'all' ? '' : activeTab, limit: 100 }),
      ]);
      setStats(statsData.stats || null);
      setTransactions(txData.transactions || []);
    } catch (error) {
      showNotification('Failed to load credit data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewTransaction = async (txId, action, note = '') => {
    try {
      // Note: API endpoint may vary based on backend implementation
      await adminCreditAPI.getTransactions(); // Placeholder - adjust based on actual review endpoint
      showNotification(`Transaction ${action} successfully`);
      fetchData();
      setSelectedTx(null);
    } catch (error) {
      showNotification(error.message || 'Failed to review transaction', 'error');
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
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Transactions"
            value={stats.total_transactions || 0}
            color="text-gray-500"
            bg="bg-gray-50"
          />
          <StatCard
            label="Total Volume"
            value={formatCurrency(stats.total_volume || 0)}
            color="text-primary"
            bg="bg-primary/10"
          />
          <StatCard
            label="Transfers Today"
            value={stats.transfers_today || 0}
            color="text-blue-500"
            bg="bg-blue-50"
          />
          <StatCard
            label="Blocked"
            value={stats.blocked_count || 0}
            color="text-red-500"
            bg="bg-red-50"
          />
          <StatCard
            label="Needs Review"
            value={stats.pending_review_count || 0}
            color="text-amber-500"
            bg="bg-amber-50"
            highlight={activeTab === 'pending_review'}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white dark:bg-primary-600 shadow-md'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-4xl mb-2 block">📭</span>
                      No transactions found
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-dark">{tx.from_user_email || tx.from_user_id}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyle(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-primary">
                        {formatCurrency(tx.amount)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-500">
                        {tx.to_user_email || tx.to_user_id || '-'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-4 px-4">
                      <RiskBadge level={tx.fraud_check?.risk_level || 'low'} />
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onReview={handleReviewTransaction}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg, highlight }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-2 ${highlight ? 'border-primary' : 'border-gray-100'}`}>
      <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
        <div className={`text-lg font-bold ${color}`}>#</div>
      </div>
      <div className={`text-xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    blocked: 'bg-red-100 text-red-700',
    pending_review: 'bg-purple-100 text-purple-700',
    failed: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function RiskBadge({ level }) {
  const styles = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[level] || 'bg-gray-100 text-gray-600'}`}>
      {level}
    </span>
  );
}

function getTypeStyle(type) {
  const styles = {
    transfer: 'bg-blue-100 text-blue-700',
    topup: 'bg-green-100 text-green-700',
    deduction: 'bg-red-100 text-red-700',
    credit: 'bg-purple-100 text-purple-700',
  };
  return styles[type] || 'bg-gray-100 text-gray-600';
}

function TransactionDetailModal({ transaction, onClose, onReview }) {
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    await onReview(transaction.id, 'approve', note);
    setProcessing(false);
  };

  const handleReject = async () => {
    setProcessing(true);
    await onReview(transaction.id, 'reject', note);
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-dark">Transaction Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-dark text-xl p-1 transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Transaction ID" value={transaction.id} />
            <InfoRow label="Status" value={<StatusBadge status={transaction.status} />} />
          </div>

          <div className="bg-primary/5 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Amount</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(transaction.amount)}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="From" value={transaction.from_user_email || transaction.from_user_id} />
            <InfoRow label="To" value={transaction.to_user_email || transaction.to_user_id || '-'} />
          </div>

          <InfoRow label="Type" value={transaction.type} />
          <InfoRow label="Description" value={transaction.description || '-'} />

          {transaction.notes && (
            <InfoRow label="Notes" value={transaction.notes} />
          )}

          {transaction.fraud_check && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-amber-800 mb-2">⚠️ Fraud Check Results</div>
              <div className="space-y-1 text-sm text-amber-700">
                <div><strong>Risk Level:</strong> {transaction.fraud_check.risk_level}</div>
                <div><strong>Fraudulent:</strong> {transaction.fraud_check.is_fraudulent ? 'Yes' : 'No'}</div>
                {transaction.fraud_check.flags && (
                  <div><strong>Flags:</strong> {transaction.fraud_check.flags.join(', ')}</div>
                )}
                {transaction.fraud_check.reasons && (
                  <div><strong>Reasons:</strong> {transaction.fraud_check.reasons.join('; ')}</div>
                )}
              </div>
            </div>
          )}

          {transaction.admin_note && (
            <InfoRow label="Admin Note" value={transaction.admin_note} />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
              Admin Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>
        </div>

        {transaction.status === 'pending_review' && (
          <div className="p-6 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-3 bg-success text-white rounded-xl font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-dark">{value}</div>
    </div>
  );
}
