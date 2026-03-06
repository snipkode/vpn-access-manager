import { useState, useEffect } from 'react';
import { useUIStore, apiFetch } from '../store';

export default function AdminCredit({ token }) {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useUIStore();

  useEffect(() => {
    fetchTopups();
  }, []);

  const fetchTopups = async () => {
    try {
      const data = await apiFetch('/admin/credit/topups?limit=50');
      setTopups(data.topups || []);
    } catch (error) {
      showNotification('Failed to load top-ups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiFetch(`/admin/credit/topups/${id}/approve`, { method: 'POST' });
      showNotification('Top-up approved');
      fetchTopups();
    } catch (error) {
      showNotification('Failed to approve', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await apiFetch(`/admin/credit/topups/${id}/reject`, { method: 'POST' });
      showNotification('Top-up rejected');
      fetchTopups();
    } catch (error) {
      showNotification('Failed to reject', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      <h1 className="text-2xl font-bold text-dark mb-5">Credit Management</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-medium uppercase tracking-wider">User</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-medium uppercase tracking-wider">Amount</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-medium uppercase tracking-wider">Bank</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-medium uppercase tracking-wider">Date</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-medium uppercase tracking-wider">Status</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topups.map((topup) => (
                <tr key={topup.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3.5 px-4 text-sm text-dark">{topup.user_email}</td>
                  <td className="py-3.5 px-4 text-sm font-medium text-dark">{formatCurrency(topup.amount)}</td>
                  <td className="py-3.5 px-4 text-sm text-dark">{topup.bank_from}</td>
                  <td className="py-3.5 px-4 text-sm text-gray-medium">{new Date(topup.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      topup.status === 'pending' ? 'bg-warning/10 text-warning' :
                      topup.status === 'approved' ? 'bg-success/10 text-success' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {topup.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {topup.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(topup.id)} 
                          className="px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(topup.id)} 
                          className="px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-xs font-medium hover:bg-danger/20 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
