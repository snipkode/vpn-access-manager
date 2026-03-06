import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { creditAPI, formatCurrency } from '../lib/api';

export default function Wallet({ token }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useUIStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceData, transactionsData] = await Promise.all([
        creditAPI.getBalance(),
        creditAPI.getTransactions({ limit: 10 }),
      ]);
      setBalance(balanceData.balance || 0);
      setTransactions(transactionsData.transactions || []);
    } catch (error) {
      showNotification('Failed to load wallet data', 'error');
    } finally {
      setLoading(false);
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
    <div className="max-w-[700px] mx-auto space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 shadow-lg shadow-primary/30">
        <div className="text-sm text-white/80 mb-2">Available Balance</div>
        <div className="text-4xl font-bold text-white mb-1">{formatCurrency(balance)}</div>
        <div className="text-sm text-white/80">Credit available for subscription</div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <div className="text-2xl">ℹ️</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-blue-900 mb-1">Payment System</div>
          <div className="text-sm text-blue-700 leading-relaxed">
            Contact admin to top up your balance or subscribe to a plan.
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-dark mb-4">Recent Transactions</h2>
        
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
    </div>
  );
}

function getTxIcon(type) {
  const icons = { topup: '↓', credit: '⊕', deduction: '↑', auto_renewal: '⟳' };
  return icons[type] || '•';
}

function getTxColor(type) {
  const colors = {
    topup: 'bg-success/10 text-success',
    credit: 'bg-primary/10 text-primary',
    deduction: 'bg-red-500/10 text-red-500',
    auto_renewal: 'bg-amber-500/10 text-amber-500',
  };
  return colors[type] || 'bg-gray-400/10 text-gray-400';
}
