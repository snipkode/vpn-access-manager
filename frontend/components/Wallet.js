import { useEffect, useState } from 'react';
import { useUIStore, useBillingStore } from '../store';
import { creditAPI, billingAPI, formatCurrency } from '../lib/api';
import PaymentForm, { PaymentHistory } from './PaymentForm';
import Tabs from './ui/Tabs';
import Icon from './ui/Icon';

// Bank Account Card Component - iOS Style with Copy to Clipboard
function BankAccountCard({ bank }) {
  const { showNotification } = useUIStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bank.account_number);
      setCopied(true);
      showNotification('Account number copied!', 'success');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      showNotification('Failed to copy', 'error');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-[#2C2C2E] dark:to-[#252527] rounded-xl p-4 border border-gray-200/50 dark:border-[#38383A]/50">
      {/* Bank Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center text-2xl shadow-sm">
          🏦
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-dark dark:text-white tracking-tight truncate">{bank.bank}</div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400 font-medium truncate">{bank.account_name}</div>
        </div>
      </div>

      {/* Account Number with Copy Button */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-3.5 mb-3 border border-gray-200/50 dark:border-[#38383A]/50">
        <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Account Number</div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xl sm:text-2xl font-mono font-bold text-dark dark:text-white tracking-tight">
            {bank.account_number}
          </div>
          <button
            onClick={handleCopy}
            disabled={copied}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              copied
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-primary/10 text-primary dark:text-primary-400 hover:bg-primary/20'
            }`}
          >
            {copied ? (
              <>
                <Icon name="check_circle" variant="round" size="small" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Icon name="content_copy" variant="round" size="small" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR Code (if available) */}
      {bank.qr_code_url && (
        <div className="flex items-center gap-3 pt-3 border-t border-gray-200/50 dark:border-[#38383A]/50">
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scan QR</div>
          <img
            src={bank.qr_code_url}
            alt="QR Code"
            className="w-16 h-16 rounded-lg object-contain border border-gray-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-1"
          />
        </div>
      )}

      {/* Description (if available) */}
      {bank.description && (
        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mt-3 pt-3 border-t border-gray-200/50 dark:border-[#38383A]/50">
          {bank.description}
        </p>
      )}
    </div>
  );
}

export default function Wallet({ token }) {
  const { showNotification } = useUIStore();
  const { plans, setBillingData } = useBillingStore();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [bankAccountsLocal, setBankAccountsLocal] = useState([]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch bank accounts, balance, transactions, and topups in parallel
      const [settingsData, balanceData, transactionsData, topupsData] = await Promise.all([
        billingAPI.getSettings(),
        creditAPI.getBalance(),
        creditAPI.getTransactions({ limit: 20 }),
        billingAPI.getPayments({ limit: 10 }),
      ]);

      // Update bank accounts from settings
      const bankAccs = settingsData.bank_accounts || [];
      setBankAccountsLocal(bankAccs);

      // Also update global billing store
      setBillingData({
        billing_enabled: settingsData.billing_enabled || false,
        currency: settingsData.currency || 'IDR',
        plans: settingsData.plans || [],
        bank_accounts: bankAccs,
      });

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
    <div className="max-w-[900px] mx-auto space-y-4 sm:space-y-5 px-4 sm:px-0">
      {/* Balance Card with Integrated Refresh - iOS Style */}
      <div className="relative bg-gradient-to-br from-[#007AFF] via-blue-500 to-blue-600 rounded-[24px] p-6 shadow-xl shadow-[#007AFF]/25 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header with Refresh Button */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <div>
                <div className="text-[13px] sm:text-sm text-white/80 font-medium">Available Balance</div>
                <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-0.5">{formatCurrency(balance)}</div>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh balance"
            >
              <Icon 
                name="refresh" 
                variant="round" 
                size="small" 
                className={`text-white ${refreshing ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
          
          {/* Footer info */}
          <div className="flex items-center gap-2 pt-4 border-t border-white/20">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
            <div className="text-[13px] sm:text-sm text-white/80 font-medium">Credit available for subscription</div>
          </div>
        </div>
      </div>

      {/* Tabs - iOS Style */}
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

      {/* Top Up Form - iOS Style */}
      {activeTab === 'topup' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Bank Accounts Info - iOS Style */}
          {bankAccountsLocal.length > 0 && (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5 flex items-center justify-center">
                  <span className="text-lg">🏦</span>
                </div>
                <h2 className="text-base font-semibold text-dark dark:text-white tracking-tight">Transfer To</h2>
              </div>

              <div className="space-y-3">
                {bankAccountsLocal.map((bank) => (
                  <BankAccountCard key={bank.id} bank={bank} />
                ))}
              </div>
            </div>
          )}

          {/* Reusable Payment Form in topup mode */}
          <PaymentForm
            mode="topup"
            bankAccounts={bankAccountsLocal}
            onSuccess={handleTopupSuccess}
            defaultAmount={50000}
          />
        </div>
      )}

      {/* Topup History - iOS Style */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5 flex items-center justify-center">
              <span className="text-lg">📜</span>
            </div>
            <h2 className="text-base font-semibold text-dark dark:text-white tracking-tight">Top Up History</h2>
          </div>

          <PaymentHistory
            payments={topups}
            emptyMessage="No top up history yet"
          />
        </div>
      )}

      {/* Transactions - iOS Style */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/5 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <h2 className="text-base font-semibold text-dark dark:text-white tracking-tight">Recent Transactions</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-[#2C2C2E] dark:to-[#252527] rounded-2xl p-10 text-center border border-gray-200/50 dark:border-[#38383A]/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] flex items-center justify-center shadow-sm">
                <span className="text-3xl opacity-60">📄</span>
              </div>
              <div className="text-sm font-semibold text-dark dark:text-white mb-1.5">No transactions yet</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Your transaction history will appear here</div>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="group flex items-center gap-3 p-3.5 bg-gray-50/80 dark:bg-[#2C2C2E]/80 rounded-xl border border-gray-100/60 dark:border-[#38383A] hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-semibold flex-shrink-0 shadow-sm ${
                    getTxColor(tx.type)
                  }`}>
                    {getTxIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark dark:text-white truncate">{tx.description || tx.type}</div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${
                    (tx.type === 'topup' || tx.type === 'credit') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
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
