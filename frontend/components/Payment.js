import { useEffect, useState } from 'react';
import { useUIStore, useBillingStore } from '../store';
import { billingAPI, formatCurrency } from '../lib/api';
import PaymentForm, { BankAccountsDisplay, PaymentHistory } from './PaymentForm';
import Tabs from './ui/Tabs';
import Icon from './ui/Icon';

const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
  yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
};

export default function Payment({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submit');
  const [isBillingEnabled, setIsBillingEnabled] = useState(false);

  // Payment data
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('📡 [PAYMENT] Fetching payment settings from /payment-settings/config...');

      // Fetch config and payment history in parallel for better performance
      const [settingsData, historyData] = await Promise.all([
        billingAPI.getSettings(),
        billingAPI.getPayments({ limit: 10 }),
      ]);

      console.log('✅ [PAYMENT] Settings received:', settingsData);
      console.log('✅ [PAYMENT] Payment history received:', historyData);

      // Check can_submit_payment from config endpoint
      const canSubmitPayment = settingsData.can_submit_payment === true;
      const billingEnabledFlag = settingsData.billing_enabled === true;

      console.log('💾 [PAYMENT] System status:', {
        billing_enabled: billingEnabledFlag,
        can_submit_payment: canSubmitPayment,
        has_bank_accounts: settingsData.has_bank_accounts,
        bank_accounts_count: settingsData.bank_accounts_count,
        message: settingsData.message,
      });

      // Update local state for UI
      setIsBillingEnabled(canSubmitPayment);
      setPlans(settingsData.plans || []);
      setBankAccounts(settingsData.bank_accounts || []);

      console.log('📦 [PAYMENT] Local state updated:', {
        isBillingEnabled: canSubmitPayment,
        plansCount: (settingsData.plans || []).length,
        bankAccountsCount: (settingsData.bank_accounts || []).length,
      });

      // Also update global billing store for other components
      useBillingStore.getState().setBillingData({
        billing_enabled: billingEnabledFlag,
        currency: settingsData.currency || 'IDR',
        plans: settingsData.plans || [],
        bank_accounts: settingsData.bank_accounts || [],
      });

      setPaymentHistory(historyData.payments || []);

      console.log('✅ [PAYMENT] Data fetch complete - UI should now show payment form');
    } catch (error) {
      console.error('❌ [PAYMENT] Failed to load payment data:', error);
      // Set billing to disabled on error
      setIsBillingEnabled(false);
      setPlans([]);
      setBankAccounts([]);
      useBillingStore.getState().setBillingData({
        billing_enabled: false,
        currency: 'IDR',
        plans: [],
        bank_accounts: [],
      });
      showNotification('Failed to load payment data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
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

  if (!isBillingEnabled) {
    return (
      <div className="max-w-[600px] mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-dark mb-2">Payment System Unavailable</h2>
          <p className="text-gray-400 mb-4">
            The payment system is temporarily disabled. Please contact admin for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Tabs */}
      <Tabs
        items={[
          { id: 'submit', label: 'Submit', icon: <Icon name="upload_file" size="small" /> },
          { id: 'history', label: 'History', icon: <Icon name="history" size="small" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="default"
        size="small"
      />

      {activeTab === 'submit' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">
            <i className="fas fa-credit-card text-primary mr-2" />
            Submit Payment
          </h1>

          {/* Bank Accounts Info */}
          <BankAccountsDisplay bankAccounts={bankAccounts} />

          {/* Reusable Payment Form in plan mode */}
          <PaymentForm
            mode="plan"
            plans={plans.length > 0 ? plans : Object.entries(PLANS).map(([id, plan]) => ({
              id,
              label: plan.label,
              price: plan.price,
              duration_days: plan.duration,
            }))}
            bankAccounts={bankAccounts}
            onSuccess={handlePaymentSuccess}
            defaultAmount={plans[0]?.price || PLANS.monthly.price}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">
            <i className="fas fa-clock-rotate-left text-primary mr-2" />
            Payment History
          </h1>

          <PaymentHistory
            payments={paymentHistory}
            emptyMessage="No payment history yet"
          />
        </div>
      )}
    </div>
  );
}
