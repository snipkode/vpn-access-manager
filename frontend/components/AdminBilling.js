import { useEffect, useState, useMemo } from 'react';
import { useUIStore } from '../store';
import { adminPaymentsAPI, formatCurrency } from '../lib/api';
import { Tabs, DataTable, StatCard } from './admin';
import StatusBadge from './ui/StatusBadge.js';

const TABS = [
  { id: 'pending', label: 'Pending', color: 'text-amber-500' },
  { id: 'approved', label: 'Approved', color: 'text-success' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-500' },
  { id: 'all', label: 'All', color: 'text-gray-400' },
];

const STATS_CONFIG = [
  { id: 'total', key: 'total_payments', label: 'Total Payments', color: 'text-gray-500', bg: 'bg-gray-50' },
  { id: 'pending', key: 'pending', label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-50', highlight: true },
  { id: 'approved', key: 'approved', label: 'Approved', color: 'text-success', bg: 'bg-green-50' },
  { id: 'rejected', key: 'rejected', label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'revenue', key: 'total_revenue', label: 'Total Revenue', color: 'text-primary', bg: 'bg-primary/10', isCurrency: true },
];

export default function AdminBilling({ token }) {
  const { showNotification } = useUIStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, paymentsData] = await Promise.all([
        adminPaymentsAPI.getStats(),
        adminPaymentsAPI.getPayments({ status: activeTab === 'all' ? '' : activeTab, limit: 50 }),
      ]);
      setStats(statsData.stats || null);
      setPayments(paymentsData.payments || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      showNotification('Failed to load billing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      await adminPaymentsAPI.approvePayment(selectedPayment.id, { admin_note: adminNote });
      showNotification('Payment approved successfully');
      setShowApproveModal(false);
      setSelectedPayment(null);
      setAdminNote('');
      fetchData();
    } catch (error) {
      showNotification(error.message || 'Failed to approve payment', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      await adminPaymentsAPI.rejectPayment(selectedPayment.id, { reason: rejectReason, admin_note: rejectReason });
      showNotification('Payment rejected');
      setShowRejectModal(false);
      setSelectedPayment(null);
      setRejectReason('');
      fetchData();
    } catch (error) {
      showNotification(error.message || 'Failed to reject payment', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const openApproveModal = (payment) => {
    setSelectedPayment(payment);
    setAdminNote('');
    setShowApproveModal(true);
  };

  const openRejectModal = (payment) => {
    setSelectedPayment(payment);
    setRejectReason('');
    setShowRejectModal(true);
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
          {STATS_CONFIG.map((config) => (
            <StatCard
              key={config.id}
              label={config.label}
              value={config.isCurrency ? formatCurrency(stats[config.key] || 0) : stats[config.key] || 0}
              color={config.color}
              bg={config.bg}
              highlight={config.highlight && activeTab === config.id}
            />
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Payments Table */}
      <PaymentsTable
        payments={payments}
        onApprove={openApproveModal}
        onReject={openRejectModal}
        onView={setSelectedPayment}
      />

      {/* View Payment Modal */}
      {selectedPayment && !showApproveModal && !showRejectModal && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onApprove={() => openApproveModal(selectedPayment)}
          onReject={() => openRejectModal(selectedPayment)}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-dark mb-4">Approve Payment</h2>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="text-sm text-green-700">
                <strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}<br />
                <strong>User:</strong> {selectedPayment.user_email}<br />
                <strong>Plan:</strong> {selectedPayment.plan_label}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
                Admin Note (Optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowApproveModal(false); setSelectedPayment(null); setAdminNote(''); }}
                disabled={processing}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-3 bg-success text-white rounded-xl font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Approve Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-dark mb-4">Reject Payment</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="text-sm text-red-700">
                <strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}<br />
                <strong>User:</strong> {selectedPayment.user_email}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this payment is rejected..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedPayment(null); setRejectReason(''); }}
                disabled={processing}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentDetailModal({ payment, onClose, onApprove, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-dark tracking-tight">Detail Pembayaran</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-dark text-2xl p-1 transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Payment ID" value={payment.id} />
            <InfoRow label="Status" value={<StatusBadge status={payment.status} />} />
          </div>

          <div className="bg-[#F2F2F7] rounded-2xl p-4 border border-gray-100">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Informasi User</div>
            <div className="text-[17px] font-semibold text-dark tracking-tight">{payment.user_email}</div>
            <div className="text-[13px] text-gray-500 font-medium mt-0.5">Bank: {payment.bank_from}</div>
          </div>

          <div className="bg-gradient-to-br from-[#007AFF]/10 to-[#007AFF]/5 rounded-2xl p-5 border border-[#007AFF]/20">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Nominal Pembayaran</div>
            <div className="text-3xl font-bold text-[#007AFF] tracking-tight">{formatCurrency(payment.amount)}</div>
            <div className="text-[13px] text-gray-500 font-medium mt-1">Paket: {payment.plan_label} ({payment.duration_days} hari)</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Tanggal Transfer" value={new Date(payment.transfer_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <InfoRow label="Dikirim" value={new Date(payment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
          </div>

          {payment.proof_image_url && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <i className="fas fa-image mr-1.5 text-[#007AFF]" />
                Bukti Pembayaran
              </div>
              <div className="bg-[#F2F2F7] rounded-2xl p-4 text-center border border-gray-100">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}${payment.proof_image_url}`}
                  alt="Payment proof"
                  className="max-w-full max-h-80 rounded-2xl shadow-md mx-auto"
                />
                <div className="mt-3 text-[11px] text-gray-400 font-medium">
                  <i className="fas fa-file mr-1" /> {payment.proof_filename}
                </div>
              </div>
            </div>
          )}

          {payment.admin_note && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <i className="fas fa-sticky-note mr-1.5 text-[#FF9500]" />
                Catatan Admin
              </div>
              <div className="bg-[#FFF3CD] border border-[#FFC107] rounded-2xl p-4 text-[13px] text-[#856404] font-medium">
                {payment.admin_note}
              </div>
            </div>
          )}
        </div>

        {payment.status === 'pending' && (
          <div className="p-6 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-3xl">
            <div className="flex gap-3">
              <button
                onClick={onReject}
                className="flex-1 py-[14px] bg-[#FF3B30]/10 text-[#FF3B30] rounded-2xl font-semibold text-[15px] hover:bg-[#FF3B30]/20 transition-all active:scale-[0.98]"
              >
                <i className="fas fa-times-circle mr-1.5" /> Tolak
              </button>
              <button
                onClick={onApprove}
                className="flex-1 py-[14px] bg-[#34C759] text-white rounded-2xl font-semibold text-[15px] hover:bg-[#34C759]/90 transition-all active:scale-[0.98] shadow-lg shadow-[#34C759]/30"
              >
                <i className="fas fa-check-circle mr-1.5" /> Setujui
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
    <div className="bg-[#F2F2F7] rounded-xl p-3.5 border border-gray-100">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[15px] font-medium text-dark">{value}</div>
    </div>
  );
}

function PaymentsTable({ payments, onApprove, onReject, onView }) {
  const columns = useMemo(() => [
    {
      key: 'user',
      label: 'User',
      sortable: true,
      render: (payment) => (
        <div>
          <div className="text-sm font-medium text-dark">{payment.user_email}</div>
          <div className="text-xs text-gray-400">{payment.bank_from}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (payment) => (
        <div className="text-sm font-bold text-primary">
          {formatCurrency(payment.amount)}
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      sortable: true,
      render: (payment) => (
        <div>
          <div className="text-sm text-dark">{payment.plan_label || payment.plan}</div>
          <div className="text-xs text-gray-400">{payment.duration_days} days</div>
        </div>
      ),
    },
    {
      key: 'bank',
      label: 'Bank',
      sortable: false,
      render: (payment) => (
        <div>
          <div className="text-sm text-gray-500">{payment.bank_from}</div>
          <div className="text-xs text-gray-400">
            {new Date(payment.transfer_date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (payment) => (
        <div className="text-sm text-gray-500">
          {new Date(payment.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (payment) => (
        <div className="flex gap-2">
          <button
            onClick={() => onView(payment)}
            className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            View
          </button>
          {payment.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(payment)}
                className="px-3 py-1.5 bg-green-50 text-success rounded-lg text-xs font-medium hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(payment)}
                className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ], [onApprove, onReject, onView]);

  return (
    <DataTable
      columns={columns}
      data={payments}
      itemsPerPage={10}
      emptyMessage="No payments found"
      searchable={true}
      searchKeys={['user_email', 'bank_from', 'plan_label']}
      sortable={true}
      mobileCardView={true}
      renderCard={(payment) => (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-dark">{formatCurrency(payment.amount)}</div>
              <div className="text-xs text-gray-400">{payment.plan_label || payment.plan}</div>
              <div className="text-xs text-gray-500 mt-1">{payment.user_email}</div>
            </div>
            <StatusBadge status={payment.status} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onView(payment)}
              className="flex-1 px-3 py-2 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              View Details
            </button>
            {payment.status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove(payment)}
                  className="flex-1 px-3 py-2 bg-green-50 text-success rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(payment)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      )}
    />
  );
}
