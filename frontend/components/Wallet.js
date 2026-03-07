import { useEffect, useState } from 'react';
import { useUIStore, useBillingStore } from '../store';
import { creditAPI, billingAPI, formatCurrency } from '../lib/api';
import PaymentForm, { BankAccountsDisplay, PaymentHistory } from './PaymentForm';
import Tabs from './ui/Tabs';
import Icon from './ui/Icon';

export default function Wallet({ token }) {
  const { showNotification } = useUIStore();
  const { bankAccounts, plans } = useBillingStore();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

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

  const handleTopupSuccess = () => {
    fetchData();
    setActiveTab('history');
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
        <h1 className="text-xl font-bold text-dark dark:text-white">
          <Icon name="account_balance_wallet" variant="round" size="medium" className="text-primary mr-2" />
          Wallet & Top Up
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm text-primary dark:text-primary border border-primary dark:border-primary rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Icon name="refresh" variant="round" size="small" className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-200/30 rounded-xl p-4 flex gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">Failed to Load Data</div>
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#007AFF] to-blue-600 rounded-2xl p-5 sm:p-6 shadow-lg shadow-[#007AFF]/30">
        <div className="text-[13px] sm:text-sm text-white/80 mb-2">Available Balance</div>
        <div className="text-3xl sm:text-4xl font-bold text-white mb-1 tracking-tight">{formatCurrency(balance)}</div>
        <div className="text-[13px] sm:text-sm text-white/80 font-medium">Credit available for subscription</div>
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          { id: 'topup', label: 'Top Up', icon: <Icon name="add_card" size="small" /> },
          { id: 'history', label: 'History', icon: <Icon name="history" size="small" /> },
          { id: 'transactions', label: 'Transactions', icon: <Icon name="receipt_long" size="small" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="default"
        size="small"
      />

      {/* Top Up Form */}
      {activeTab === 'topup' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#38383A]">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-6">
            <Icon name="upload_file" variant="round" size="medium" className="text-primary mr-2" />
            Submit Top Up Request
          </h2>

          {/* Bank Accounts Info */}
          <BankAccountsDisplay bankAccounts={bankAccounts} />

          {/* Reusable Payment Form in topup mode */}
          <PaymentForm
            mode="topup"
            bankAccounts={bankAccounts}
            onSuccess={handleTopupSuccess}
            defaultAmount={50000}
          />
        </div>
      )}

      {/* Topup History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#38383A]">
          <h2 className="text-lg font-bold text-dark dark:text-white mb-6">
            <Icon name="history" variant="round" size="medium" className="text-primary mr-2" />
            Top Up History
          </h2>

          <PaymentHistory
            payments={topups}
            emptyMessage="No top up history yet"
          />
        </div>
      )}

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#38383A]">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Recent Transactions</h2>

          {transactions.length === 0 ? (
            <div className="bg-gray-50 dark:bg-[#2C2C2E] rounded-xl p-8 text-center">
              <div className="text-sm text-gray-400 dark:text-gray-500">No transactions yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl border border-gray-100 dark:border-[#38383A]">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0 ${
                    getTxColor(tx.type)
                  }`}>
                    {getTxIcon(tx.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-dark dark:text-white">{tx.description || tx.type}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    (tx.type === 'topup' || tx.type === 'credit') ? 'text-success dark:text-green-400' : 'text-red-500 dark:text-red-400'
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
