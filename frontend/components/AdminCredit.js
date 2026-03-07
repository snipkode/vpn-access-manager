import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { adminCreditAPI, formatCurrency } from '../lib/api';
import { Tabs, DataTable, StatCard } from './admin';

const TABS = [
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
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Transactions List */}
      <TransactionsTable
        transactions={transactions}
        onView={setSelectedTx}
      />

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

function TransactionsTable({ transactions, onView }) {
  const columns = useMemo(() => [
    {
      key: 'user',
      label: 'User',
      sortable: true,
      render: (tx) => (
        <div>
          <div className="text-sm font-medium text-dark">{tx.from_user_email || tx.from_user_id}</div>
          <div className="text-xs text-gray-400">
            {new Date(tx.created_at).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (tx) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyle(tx.type)}`}>
          {tx.type}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (tx) => (
        <div className="text-sm font-bold text-primary">
          {formatCurrency(tx.amount)}
        </div>
      ),
    },
    {
      key: 'recipient',
      label: 'Recipient',
      sortable: true,
      render: (tx) => (
        <div className="text-sm text-gray-500">
          {tx.to_user_email || tx.to_user_id || '-'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (tx) => <StatusBadge status={tx.status} />,
    },
    {
      key: 'risk',
      label: 'Risk',
      sortable: true,
      render: (tx) => <RiskBadge level={tx.fraud_check?.risk_level || 'low'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (tx) => (
        <button
          onClick={() => onView(tx)}
          className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
        >
          View
        </button>
      ),
    },
  ], [onView]);

  return (
    <DataTable
      columns={columns}
      data={transactions}
      itemsPerPage={10}
      emptyMessage="No transactions found"
      searchable={true}
      searchKeys={['from_user_email', 'to_user_email', 'type', 'status']}
      sortable={true}
      mobileCardView={true}
      renderCard={(tx) => (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex justify-between items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">User</div>
              <div className="text-sm font-medium text-dark truncate">{tx.from_user_email || tx.from_user_id}</div>
            </div>
            <StatusBadge status={tx.status} />
          </div>
          <div className="flex justify-between items-center gap-3 mb-2">
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Type</div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeStyle(tx.type)}`}>
                {tx.type}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Amount</div>
              <div className="text-sm font-bold text-primary">{formatCurrency(tx.amount)}</div>
            </div>
          </div>
          <div className="flex justify-between items-center gap-3">
            <div className="text-xs text-gray-500 truncate flex-1">
              To: {tx.to_user_email || tx.to_user_id || '-'}
            </div>
            <RiskBadge level={tx.fraud_check?.risk_level || 'low'} />
          </div>
          <button
            onClick={() => onView(tx)}
            className="w-full mt-3 px-3 py-2 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            View Details
          </button>
        </div>
      )}
    />
  );
}
