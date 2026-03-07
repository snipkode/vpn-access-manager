import { useEffect, useState } from 'react';
import { useUIStore, useBillingStore, useAuthStore } from '../store';
import { creditAPI, billingAPI, userAPI, adminBillingAPI, formatCurrency } from '../lib/api';
import PaymentForm, { PaymentHistory, PlanDetailsModal } from './PaymentForm';
import CreditTransferForm from './CreditTransferForm';
import Tabs from './ui/Tabs';
import Icon from './ui/Icon';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Wallet({ token }) {
  const { showNotification } = useUIStore();
  const { plans, setBillingData } = useBillingStore();
  const { user, userData, updateUserData } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [bankAccountsLocal, setBankAccountsLocal] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);

  // Get balance directly from global Zustand state
  const balance = userData?.credit_balance || 0;

  // Real-time Firestore listener for credit_balance
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const newBalance = data.credit_balance || 0;
        
        // Update global Zustand state
        updateUserData({ credit_balance: newBalance });
        setLastUpdated(new Date());
      }
    });

    return () => unsubscribe();
  }, [user?.uid, updateUserData]);

  // Fetch user profile on mount to ensure credit_balance is loaded
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await userAPI.getProfile();
        if (profileData?.profile?.credit_balance !== undefined) {
          updateUserData({ credit_balance: profileData.profile.credit_balance });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error.message);
      }
    };

    if (user?.uid) {
      fetchProfile();
    }
  }, [user?.uid, updateUserData]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch billing config, balance, transactions, and topups in parallel
      const [configData, balanceData, transactionsData, topupsData] = await Promise.all([
        billingAPI.getConfig(),
        creditAPI.getBalance(),
        creditAPI.getTransactions({ limit: 20 }),
        billingAPI.getPayments({ limit: 10 }),
      ]);

      // Update bank accounts from config
      const bankAccs = configData.bank_accounts || [];
      setBankAccountsLocal(bankAccs);

      // Also update global billing store with config
      setBillingData({
        billing_enabled: configData.billing_enabled || false,
        currency: configData.currency || 'IDR',
        plans: configData.plans || [],
        bank_accounts: bankAccs,
      });

      // Sync balance to global Zustand state
      updateUserData({ credit_balance: balanceData.balance || 0 });
      setLastUpdated(new Date());

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

  const handleRefresh = async () => {
    try {
      // First, sync balance from Firestore
      const syncResult = await creditAPI.syncBalance();
      console.log('🔄 Sync result:', syncResult);

      // If balance changed, update state immediately
      if (syncResult?.synced && syncResult?.new_balance !== undefined) {
        updateUserData({ credit_balance: syncResult.new_balance });
        setLastUpdated(new Date());
        showNotification('Balance synced successfully', 'success');
      } else {
        // Fetch fresh data if no sync needed
        await fetchData(true);
        showNotification('Balance updated', 'success');
      }
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      showNotification(error.message || 'Failed to refresh balance', 'error');
    }
  };

  const handleTopupSuccess = async () => {
    try {
      // Sync balance after successful topup
      const syncResult = await creditAPI.syncBalance();
      
      // Update state immediately if sync succeeded
      if (syncResult?.synced && syncResult?.new_balance !== undefined) {
        updateUserData({ credit_balance: syncResult.new_balance });
        setLastUpdated(new Date());
      } else {
        await fetchData();
      }
      
      setActiveTab('history');
      showNotification('Payment submitted successfully', 'success');
    } catch (error) {
      console.error('❌ Sync after topup failed:', error);
      await fetchData();
      setActiveTab('history');
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
    <div className="max-w-[900px] mx-auto space-y-4 sm:space-y-5 px-4 sm:px-0">
      {/* Balance Card - Simple & Clean */}
      <div className="relative bg-gradient-to-br from-[#007AFF] via-blue-500 to-blue-600 rounded-[24px] p-6 sm:p-8 shadow-xl shadow-[#007AFF]/25 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header with Refresh Button */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-[13px] sm:text-sm text-white/80 font-medium">Available Balance</div>
              <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight mt-1">
                {formatCurrency(balance)}
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          {/* Last Updated */}
          <div className="flex items-center gap-2 pt-4 border-t border-white/20">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
            <div className="text-[13px] sm:text-sm text-white/70">
              Last updated: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - iOS Style with Horizontal Scroll */}
      <Tabs
        items={[
          { id: 'topup', label: 'Top Up', icon: <Icon name="add_card" size="small" /> },
          { id: 'subscription', label: 'Subscription', icon: <Icon name="card_membership" size="small" /> },
          { id: 'transfer', label: 'Transfer', icon: <Icon name="swap_horiz" size="small" /> },
          { id: 'history', label: 'History', icon: <Icon name="history" size="small" /> },
          { id: 'transactions', label: 'Transactions', icon: <Icon name="receipt_long" size="small" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="default"
        size="medium"
        scrollable={true}
      />

      {/* Top Up Form - iOS Style */}
      {activeTab === 'topup' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Reusable Payment Form in topup mode */}
          <PaymentForm
            mode="topup"
            bankAccounts={bankAccountsLocal}
            onSuccess={handleTopupSuccess}
            defaultAmount={50000}
          />
        </div>
      )}

      {/* Subscription Form - iOS Style */}
      {activeTab === 'subscription' && (
        <div className="space-y-4 sm:space-y-5">
          {plans.length === 0 ? (
            /* No Plans Available Warning */
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#2C2C2E] dark:to-[#1C1C1E] rounded-[20px] p-6 sm:p-8 border border-amber-200 dark:border-[#38383A] shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-dark dark:text-white mb-2">
                    No Subscription Plans Available
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    There are no subscription plans configured at the moment. Please contact admin or check back later.
                  </p>
                  <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-amber-700 dark:text-amber-500 font-medium">
                    <Icon name="info" variant="round" size="small" />
                    <span>Subscription payments are currently unavailable</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Payment Form with Plans */
            <PaymentForm
              mode="plan"
              plans={plans}
              bankAccounts={bankAccountsLocal}
              onSuccess={handleTopupSuccess}
              defaultAmount={plans[0]?.price || 50000}
              onViewPlanDetails={(plan) => {
                setSelectedPlanDetails(plan);
                setShowPlanDetails(true);
              }}
            />
          )}
        </div>
      )}

      {/* Plan Details Modal */}
      {showPlanDetails && selectedPlanDetails && (
        <PlanDetailsModal
          plan={selectedPlanDetails}
          onClose={() => setShowPlanDetails(false)}
        />
      )}

      {/* Credit Transfer Form - iOS Style */}
      {activeTab === 'transfer' && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-[#38383A]/50">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/5 flex items-center justify-center">
              <span className="text-lg">💸</span>
            </div>
            <h2 className="text-base font-semibold text-dark dark:text-white tracking-tight">Transfer Credit</h2>
          </div>

          <CreditTransferForm onSuccess={handleRefresh} />
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
