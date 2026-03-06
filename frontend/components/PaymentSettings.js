import { useEffect, useState } from 'react';
import { useUIStore, apiFetch } from '../store';

export default function PaymentSettings({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
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
      const data = await apiFetch('/payment-settings/settings');
      setSettings(data.settings || settings);
      setBankAccounts(data.bank_accounts || []);
    } catch (error) {
      showNotification('Failed to load payment settings', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await apiFetch('/payment-settings/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      showNotification('Payment settings saved');
    } catch (error) {
      showNotification(error.message || 'Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = () => {
    setBankForm({
      bank: '',
      account_number: '',
      account_name: '',
      description: '',
      qr_code_url: '',
      order: bankAccounts.length,
      active: true,
    });
    setEditingBank(null);
    setShowBankModal(true);
  };

  const handleEditBank = (bank) => {
    setBankForm(bank);
    setEditingBank(bank.id);
    setShowBankModal(true);
  };

  const handleSaveBank = async () => {
    if (!bankForm.bank || !bankForm.account_number || !bankForm.account_name) {
      showNotification('Bank, account number, and account name are required', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingBank) {
        await apiFetch(`/payment-settings/banks/${editingBank}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bankForm),
        });
        showNotification('Bank account updated');
      } else {
        await apiFetch('/payment-settings/banks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bankForm),
        });
        showNotification('Bank account added');
      }
      setShowBankModal(false);
      fetchData();
    } catch (error) {
      showNotification(error.message || 'Failed to save bank account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBank = async (bankId) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      await apiFetch(`/payment-settings/banks/${bankId}`, {
        method: 'DELETE',
      });
      showNotification('Bank account deleted');
      fetchData();
    } catch (error) {
      showNotification(error.message || 'Failed to delete bank account', 'error');
    }
  };

  const handleToggleBilling = async () => {
    try {
      await apiFetch('/payment-settings/toggle-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_enabled: !settings.billing_enabled }),
      });
      setSettings({ ...settings, billing_enabled: !settings.billing_enabled });
      showNotification(`Billing ${!settings.billing_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showNotification(error.message || 'Failed to toggle billing', 'error');
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

          <div className="space-y-6">
            {/* Billing Toggle */}
            <div className="flex justify-between items-center py-4 border-b border-gray-100">
              <div>
                <div className="text-base font-semibold text-dark mb-1">Billing System</div>
                <div className="text-sm text-gray-400">
                  {settings.billing_enabled ? 'Currently enabled' : 'Currently disabled'}
                </div>
              </div>
              <button
                onClick={handleToggleBilling}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  settings.billing_enabled
                    ? 'bg-success text-white shadow-lg shadow-success/30'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {settings.billing_enabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

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
            <div className="flex justify-between items-center py-4 border-b border-gray-100">
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
              <div className="text-xs text-gray-400 mt-1">Email for payment notifications</div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full mt-6 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {activeTab === 'banks' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-dark">Bank Accounts</h1>
            <button
              onClick={handleAddBank}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-plus" />
              Add Bank
            </button>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-10 text-center">
              <span className="text-5xl mb-4 block opacity-50">🏦</span>
              <div className="text-base font-medium text-dark mb-1">No bank accounts</div>
              <div className="text-sm text-gray-400">Add your first bank account to receive payments</div>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((bank, index) => (
                <div
                  key={bank.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                    🏦
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-dark">{bank.bank}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {bank.account_number} • {bank.account_name}
                    </div>
                    {!bank.active && (
                      <div className="text-xs text-red-500 mt-1">Inactive</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditBank(bank)}
                      className="px-3 py-2 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBank(bank.id)}
                      className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-dark">
                  {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
                </h2>
                <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-dark text-xl p-1 transition-colors">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={bankForm.bank}
                  onChange={(e) => setBankForm({ ...bankForm, bank: e.target.value })}
                  placeholder="e.g., BCA, Mandiri, BNI"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  placeholder="e.g., 1234567890"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                  placeholder="e.g., PT VPN Access"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                  Description
                </label>
                <textarea
                  value={bankForm.description}
                  onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })}
                  placeholder="Optional instructions for users"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                  QR Code URL
                </label>
                <input
                  type="url"
                  value={bankForm.qr_code_url}
                  onChange={(e) => setBankForm({ ...bankForm, qr_code_url: e.target.value })}
                  placeholder="https://example.com/qr.png"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
                {bankForm.qr_code_url && (
                  <div className="mt-2 text-center">
                    <img
                      src={bankForm.qr_code_url}
                      alt="QR Preview"
                      className="max-h-32 mx-auto rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 uppercase mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={bankForm.order}
                  onChange={(e) => setBankForm({ ...bankForm, order: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
                <div className="text-xs text-gray-400 mt-1">Lower numbers appear first</div>
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">Active</div>
                  <div className="text-xs text-gray-400">Show to users</div>
                </div>
                <button
                  onClick={() => setBankForm({ ...bankForm, active: !bankForm.active })}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    bankForm.active
                      ? 'bg-success text-white shadow-lg shadow-success/30'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {bankForm.active ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBankModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBank}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Bank'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
