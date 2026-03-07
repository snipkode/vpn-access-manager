import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { adminPaymentsAPI, formatCurrency } from '../lib/api';

const tabs = [
  { id: 'pending', label: 'Pending', color: 'text-amber-500' },
  { id: 'approved', label: 'Approved', color: 'text-success' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-500' },
  { id: 'all', label: 'All', color: 'text-gray-400' },
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
          <StatCard
            label="Total Payments"
            value={stats.total_payments || 0}
            color="text-gray-500"
            bg="bg-gray-50"
          />
          <StatCard
            label="Pending"
            value={stats.pending || 0}
            color="text-amber-500"
            bg="bg-amber-50"
            highlight={activeTab === 'pending'}
          />
          <StatCard
            label="Approved"
            value={stats.approved || 0}
            color="text-success"
            bg="bg-green-50"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected || 0}
            color="text-red-500"
            bg="bg-red-50"
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.total_revenue || 0)}
            color="text-primary"
            bg="bg-primary/10"
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
              className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-4xl mb-2 block">📭</span>
                      No payments found
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="text-sm font-medium text-dark">{payment.user_email}</div>
                        <div className="text-xs text-gray-400">{payment.bank_from}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-primary">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-dark">{payment.plan_label || payment.plan}</div>
                      <div className="text-xs text-gray-400">{payment.duration_days} days</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-500">{payment.bank_from}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(payment.transfer_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPayment(payment)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          View
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApproveModal(payment)}
                              className="px-3 py-1.5 bg-green-50 text-success rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(payment)}
                              className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function PaymentDetailModal({ payment, onClose, onApprove, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-dark">Payment Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-dark text-xl p-1 transition-colors">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Payment ID" value={payment.id} />
            <InfoRow label="Status" value={<StatusBadge status={payment.status} />} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">User Information</div>
            <div className="text-base font-semibold text-dark">{payment.user_email}</div>
            <div className="text-sm text-gray-500">Bank: {payment.bank_from}</div>
          </div>

          <div className="bg-primary/5 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Payment Amount</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(payment.amount)}</div>
            <div className="text-sm text-gray-500 mt-1">Plan: {payment.plan_label} ({payment.duration_days} days)</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Transfer Date" value={new Date(payment.transfer_date).toLocaleDateString()} />
            <InfoRow label="Submitted" value={new Date(payment.created_at).toLocaleDateString()} />
          </div>

          {payment.proof_image_url && (
            <div>
              <div className="text-sm text-gray-400 mb-2">Proof of Payment</div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'https://solusikonsep.co.id:4443/api'}${payment.proof_image_url}`}
                  alt="Payment proof"
                  className="max-w-full max-h-64 rounded-lg shadow-sm"
                />
              </div>
            </div>
          )}

          {payment.admin_note && (
            <div>
              <div className="text-sm text-gray-400 mb-2">Admin Note</div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                {payment.admin_note}
              </div>
            </div>
          )}
        </div>

        {payment.status === 'pending' && (
          <div className="p-6 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
            <div className="flex gap-3">
              <button
                onClick={onReject}
                className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-semibold hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                className="flex-1 py-3 bg-success text-white rounded-xl font-semibold hover:bg-success/90 transition-colors"
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
