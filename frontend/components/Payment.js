import { useEffect, useState } from 'react';
import { useUIStore, useBillingStore } from '../store';
import { billingAPI, formatCurrency } from '../lib/api';

const PLANS = {
  monthly: { price: 50000, duration: 30, label: 'Monthly' },
  quarterly: { price: 135000, duration: 90, label: 'Quarterly (10% off)' },
  yearly: { price: 480000, duration: 365, label: 'Yearly (20% off)' },
};

export default function Payment({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');
  const [isBillingEnabled, setIsBillingEnabled] = useState(false);

  // Form state
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [amount, setAmount] = useState(50000);
  const [bankFrom, setBankFrom] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  // Payment data - use local state for reliability
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

      // Set default amount based on selected plan from API response
      const defaultPlan = settingsData.plans?.find(p => p.id === 'monthly');
      if (defaultPlan) {
        setAmount(defaultPlan.price);
        console.log('💰 [PAYMENT] Default amount set:', defaultPlan.price);
      }

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

  const handlePlanChange = (planId) => {
    setSelectedPlan(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setAmount(plan.price);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Only images (JPEG, PNG) and PDF files are allowed', 'error');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('File size must be less than 5MB', 'error');
        return;
      }

      setProofFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProofPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate amount
      const plan = PLANS[selectedPlan];
      if (amount < plan.price * 0.9) {
        throw new Error(`Amount must be at least ${formatCurrency(plan.price)}`);
      }

      // Validate transfer date
      if (!transferDate) {
        throw new Error('Transfer date is required');
      }

      // Validate proof file
      if (!proofFile) {
        throw new Error('Proof of transfer is required');
      }

      // Create form data
      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('plan', selectedPlan);
      formData.append('bank_from', bankFrom);
      formData.append('transfer_date', transferDate);
      formData.append('notes', notes);
      formData.append('proof', proofFile);

      await billingAPI.submitPayment(formData);

      showNotification('Payment submitted successfully! Please wait for admin approval.');
      
      // Reset form
      setProofFile(null);
      setProofPreview(null);
      setBankFrom('');
      setTransferDate('');
      setNotes('');
      
      // Refresh history
      fetchData();
      setActiveTab('history');
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
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
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'submit'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-upload mr-2" />
            Submit Payment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-history mr-2" />
            History
          </button>
        </div>
      </div>

      {activeTab === 'submit' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">
            <i className="fas fa-credit-card text-primary mr-2" />
            Submit Payment
          </h1>

          {/* Bank Accounts Info */}
          {bankAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-dark mb-3">
                <i className="fas fa-university text-primary mr-2" />
                Transfer To
              </h3>
              <div className="space-y-3">
                {bankAccounts.map((bank) => (
                  <div key={bank.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm">
                        🏦
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-bold text-dark">{bank.bank}</div>
                        <div className="text-sm text-gray-500">{bank.account_name}</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 mb-2">
                      <div className="text-xs text-gray-400 mb-1">Account Number</div>
                      <div className="text-lg font-mono font-bold text-dark">{bank.account_number}</div>
                    </div>
                    {bank.description && (
                      <p className="text-sm text-gray-600 mt-2">{bank.description}</p>
                    )}
                    {bank.qr_code_url && (
                      <div className="mt-3 text-center">
                        <img
                          src={bank.qr_code_url}
                          alt="QR Code"
                          className="max-h-40 mx-auto rounded-lg shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Plan Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-3">
                Select Plan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(PLANS).map(([planId, plan]) => (
                  <div
                    key={planId}
                    onClick={() => handlePlanChange(planId)}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                      selectedPlan === planId
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-gray-50 hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-dark mb-1">{plan.label}</div>
                    <div className="text-lg font-bold text-primary mb-1">
                      {formatCurrency(plan.price)}
                    </div>
                    <div className="text-xs text-gray-400">{plan.duration} days</div>
                    {selectedPlan === planId && (
                      <div className="mt-2 text-xs text-primary font-semibold">
                        <i className="fas fa-check-circle mr-1" /> Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Amount (IDR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                min="10000"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum: {formatCurrency(PLANS[selectedPlan].price)}
              </p>
            </div>

            {/* Bank From */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-university mr-2" />
                Bank / E-Wallet Used
              </label>
              <input
                type="text"
                value={bankFrom}
                onChange={(e) => setBankFrom(e.target.value)}
                placeholder="e.g., BCA, Mandiri, GoPay, OVO"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>

            {/* Transfer Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-calendar mr-2" />
                Transfer Date
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>

            {/* Proof of Transfer */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-file-upload mr-2" />
                Proof of Transfer
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Upload screenshot or PDF (Max 5MB). Allowed: JPEG, PNG, PDF
              </p>

              {proofPreview && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 text-center">
                  <img
                    src={proofPreview}
                    alt="Proof preview"
                    className="max-h-64 mx-auto rounded-lg shadow-sm"
                  />
                </div>
              )}

              {proofFile && !proofPreview && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                  <i className="fas fa-file-pdf text-red-500 text-2xl" />
                  <div className="text-sm text-dark">
                    {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                <i className="fas fa-sticky-note mr-2" />
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-base focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-paper-plane" />
                  Submit Payment
                </span>
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">
            <i className="fas fa-clock-rotate-left text-primary mr-2" />
            Payment History
          </h1>

          {paymentHistory.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <div className="text-base font-medium text-dark mb-1">No payment history yet</div>
              <div className="text-sm text-gray-400">Your submitted payments will appear here</div>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-100 rounded-xl p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {payment.plan_label || payment.plan} • {payment.duration_days} days
                      </div>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-gray-400">
                      <i className="fas fa-university mr-2" />
                      {payment.bank_from}
                    </div>
                    <div className="text-gray-400">
                      <i className="fas fa-calendar mr-2" />
                      Transfer: {new Date(payment.transfer_date).toLocaleDateString()}
                    </div>
                    <div className="text-gray-400">
                      <i className="fas fa-clock mr-2" />
                      Submitted: {new Date(payment.created_at).toLocaleDateString()}
                    </div>
                    {payment.admin_note && (
                      <div className="text-amber-600 col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                        <i className="fas fa-info-circle mr-2" />
                        <strong>Admin Note:</strong> {payment.admin_note}
                      </div>
                    )}
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

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}
