import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { adminBillingAPI } from '../lib/api';

export default function PaymentSettings({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [debugInfo, setDebugInfo] = useState(null);

  const [settings, setSettings] = useState({
    billing_enabled: false,
    currency: 'IDR',
    min_amount: 10000,
    max_amount: 1000000,
    auto_approve: false,
    notification_email: '',
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [editingBank, setEditingBank] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank: '',
    account_number: '',
    account_name: '',
    description: '',
    qr_code_url: '',
    order: 0,
    active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await adminBillingAPI.getSettings();

      setDebugInfo({
        rawSettings: data.settings,
        timestamp: new Date().toISOString(),
      });

      setSettings(data.settings || settings);
      setBankAccounts(data.bank_accounts || []);

      console.log('💳 Payment Settings Loaded:', data.settings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      showNotification('Failed to load payment settings: ' + error.message, 'error');
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      console.log('💾 Saving settings:', settings);

      const payload = {
        billing_enabled: settings.billing_enabled,
        currency: settings.currency,
        min_amount: settings.min_amount,
        max_amount: settings.max_amount,
        auto_approve: settings.auto_approve,
        notification_email: settings.notification_email,
      };

      console.log('📤 Payload:', payload);

      const response = await adminBillingAPI.updateSettings(payload);

      console.log('📥 Response:', response);

      // Verify the update
      await fetchData();

      showNotification('Payment settings saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      showNotification(error.message || 'Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBilling = async () => {
    const newStatus = !settings.billing_enabled;

    console.log('🔘 Toggle billing:', newStatus ? 'ON' : 'OFF');

    try {
      // Update with ALL required fields
      const payload = {
        billing_enabled: newStatus,
        currency: settings.currency || 'IDR',
        min_amount: settings.min_amount || 10000,
        max_amount: settings.max_amount || 1000000,
        auto_approve: settings.auto_approve || false,
      };

      console.log('📤 Toggle payload:', payload);

      const updateResponse = await adminBillingAPI.updateSettings(payload);

      console.log('📥 Update response:', updateResponse);

      // Force refresh to verify
      await fetchData();

      // Check if actually updated
      if (settings.billing_enabled !== newStatus) {
        setSettings({ ...settings, billing_enabled: newStatus });
        showNotification(`Billing ${newStatus ? '✅ ENABLED' : '❌ DISABLED'} successfully!`);
        
        if (newStatus && bankAccounts.length === 0) {
          showNotification('⚠️ Warning: No bank accounts found. Please add at least one bank account.', 'warning');
        }
      }
    } catch (error) {
      console.error('Toggle billing error:', error);
      showNotification(
        'Failed to toggle billing: ' + error.message + '\n\nCheck console for details.',
        'error'
      );
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <strong>🔍 Debug Info</strong>
            <button
              onClick={() => setDebugInfo(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'general'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-cog mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'banks'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <i className="fas fa-university mr-2" />
            Bank Accounts
          </button>
        </div>
      </div>

      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-dark mb-6">General Payment Settings</h1>

          {/* Billing Toggle */}
          <div className="border border-gray-100 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="text-base font-semibold text-dark mb-1">Billing System</div>
                <div className="text-sm text-gray-400">
                  {settings.billing_enabled ? (
                    <span className="text-success font-medium">
                      ✅ Currently ENABLED
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      ❌ Currently DISABLED
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Toggle to enable/disable payment features
                </div>
              </div>
              <button
                onClick={handleToggleBilling}
                disabled={loading}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-50 ${
                  settings.billing_enabled
                    ? 'bg-success text-white shadow-lg shadow-success/30'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {settings.billing_enabled ? 'ENABLED ✓' : 'DISABLED ✕'}
              </button>
            </div>
          </div>

          {/* Other settings */}
          <div className="space-y-5">
            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Currency
              </label>
              <select
                value={settings.currency || 'IDR'}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="IDR">IDR - Indonesian Rupiah</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="SGD">SGD - Singapore Dollar</option>
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Minimum Amount
              </label>
              <input
                type="number"
                value={settings.min_amount || 10000}
                onChange={(e) => setSettings({ ...settings, min_amount: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Maximum Amount
              </label>
              <input
                type="number"
                value={settings.max_amount || 1000000}
                onChange={(e) => setSettings({ ...settings, max_amount: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Auto Approve */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-base font-semibold text-dark mb-1">Auto Approve Payments</div>
                  <div className="text-sm text-gray-400">Automatically approve payments (not recommended)</div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, auto_approve: !settings.auto_approve })}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    settings.auto_approve
                      ? 'bg-success text-white shadow-lg shadow-success/30'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {settings.auto_approve ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Notification Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                Notification Email
              </label>
              <input
                type="email"
                value={settings.notification_email || ''}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full mt-6 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <span className="text-lg">ℹ️</span>
              <span>
                After enabling billing, make sure to add at least one bank account in the Bank Accounts tab.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Bank Accounts Tab */}
      {activeTab === 'banks' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-dark">Bank Accounts</h1>
            <button
              onClick={() => {
                setBankForm({
                  bank: '',
                  account_number: '',
                  account_name: '',
                  description: '',
                  qr_code_url: '',
                  order: 0,
                  active: true,
                });
                setEditingBank(null);
                setShowBankModal(true);
              }}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <i className="fas fa-plus mr-2" />
              Add Bank
            </button>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-10 text-center">
              <span className="text-5xl mb-4 block">🏦</span>
              <div className="text-base font-medium text-dark mb-1">No bank accounts</div>
              <div className="text-sm text-gray-400">Add your first bank account to receive payments</div>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl">
                    🏦
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-dark">{bank.bank}</div>
                    <div className="text-sm text-gray-500">
                      {bank.account_number} • {bank.account_name}
                    </div>
                    {!bank.active && (
                      <div className="text-xs text-red-500 mt-1">Inactive</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setBankForm(bank);
                        setEditingBank(bank.id);
                        setShowBankModal(true);
                      }}
                      className="px-3 py-2 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100"
                    >
                      Edit
                    </button>
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
