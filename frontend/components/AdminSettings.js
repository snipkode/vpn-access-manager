import { useState, useEffect } from 'react';
import { useUIStore } from '../store';
import { adminSettingsAPI, adminBillingAPI, formatCurrency } from '../lib/api';
import { Tabs, DataTable } from './admin';

const CATEGORIES = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp' },
  { id: 'email', label: 'Email', icon: 'fas fa-envelope' },
  { id: 'billing', label: 'Billing', icon: 'fas fa-credit-card' },
  { id: 'payments', label: 'Payment Methods', icon: 'fas fa-university' },
  { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
  { id: 'general', label: 'General', icon: 'fas fa-cog' },
];

export default function AdminSettings({ token }) {
  const { showNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [testing, setTesting] = useState(false);
  
  // Settings state
  const [whatsapp, setWhatsapp] = useState({
    enabled: false,
    api_url: '',
    session_id: '',
    api_key: '',
    test_phone: '',
  });
  
  const [email, setEmail] = useState({
    enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  });
  
  const [billing, setBilling] = useState({
    billing_enabled: true,
    currency: 'IDR',
    min_topup: 10000,
    max_topup: 1000000,
    auto_renewal_enabled: true,
    low_balance_days: 5,
  });
  
  const [notifications, setNotifications] = useState({
    whatsapp_enabled: true,
    email_enabled: true,
    low_balance_alert: true,
    expiring_soon_alert: true,
    payment_approved_alert: true,
    payment_rejected_alert: true,
  });
  
  const [general, setGeneral] = useState({
    app_name: 'VPN Access Manager',
    app_url: '',
    support_email: '',
    maintenance_mode: false,
  });

  // Payment Methods state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
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
    fetchSettings();
    fetchBankAccounts();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminSettingsAPI.getSettings();
      const settings = data.settings || {};

      if (settings.whatsapp) setWhatsapp(settings.whatsapp);
      if (settings.email) setEmail(settings.email);
      if (settings.billing) setBilling(settings.billing);
      if (settings.notifications) setNotifications(settings.notifications);
      if (settings.general) setGeneral(settings.general);
    } catch (error) {
      console.error('Failed to load settings:', error);
      showNotification('Failed to load settings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const data = await adminBillingAPI.getSettings();
      setBankAccounts(data.bank_accounts || []);
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    }
  };

  const handleAddBank = () => {
    setEditingBank(null);
    setBankForm({
      bank: '',
      account_number: '',
      account_name: '',
      description: '',
      qr_code_url: '',
      order: bankAccounts.length + 1,
      active: true,
    });
    setShowBankModal(true);
  };

  const handleEditBank = (bank) => {
    setEditingBank(bank);
    setBankForm({
      bank: bank.bank || '',
      account_number: bank.account_number || '',
      account_name: bank.account_name || '',
      description: bank.description || '',
      qr_code_url: bank.qr_code_url || '',
      order: bank.order || 0,
      active: bank.active !== false,
    });
    setShowBankModal(true);
  };

  const handleSaveBank = async () => {
    setLoading(true);
    try {
      if (editingBank) {
        await adminBillingAPI.updateBank(editingBank.id, bankForm);
        showNotification('Bank account updated successfully');
      } else {
        await adminBillingAPI.addBank(bankForm);
        showNotification('Bank account added successfully');
      }
      setShowBankModal(false);
      fetchBankAccounts();
    } catch (error) {
      showNotification('Failed to save bank account: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBank = async (bankId) => {
    if (!confirm('Delete this bank account?')) return;
    try {
      await adminBillingAPI.deleteBank(bankId);
      showNotification('Bank account deleted successfully');
      fetchBankAccounts();
    } catch (error) {
      showNotification('Failed to delete bank account: ' + error.message, 'error');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let categoryData;
      switch (activeTab) {
        case 'whatsapp':
          categoryData = whatsapp;
          break;
        case 'email':
          categoryData = email;
          break;
        case 'billing':
          categoryData = billing;
          break;
        case 'notifications':
          categoryData = notifications;
          break;
        case 'general':
          categoryData = general;
          break;
        default:
          categoryData = {};
      }
      
      await adminSettingsAPI.updateSettings(activeTab, categoryData);
      showNotification(`${activeTab} settings saved successfully`);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification('Failed to save settings: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      if (activeTab === 'whatsapp') {
        await adminSettingsAPI.testWhatsApp({ test_phone: whatsapp.test_phone });
        showNotification('WhatsApp test message sent!');
      } else if (activeTab === 'email') {
        await adminSettingsAPI.testEmail({ to: email.smtp_user });
        showNotification('Email test sent!');
      }
    } catch (error) {
      console.error('Test failed:', error);
      showNotification('Test failed: ' + error.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading && !whatsapp.api_url && !email.smtp_host) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* Tabs */}
      <Tabs 
        tabs={CATEGORIES} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        renderTab={(tab) => (
          <>
            <i className={`${tab.icon} mr-2`} />
            {tab.label}
          </>
        )}
      />

      {/* Settings Content */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {activeTab === 'whatsapp' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <div className="text-base font-semibold text-dark">WhatsApp Notifications</div>
                <div className="text-sm text-gray-400 mt-0.5">Enable WhatsApp notifications via WAHA</div>
              </div>
              <button
                onClick={() => setWhatsapp(s => ({ ...s, enabled: !s.enabled }))}
                className={`px-5 py-2 rounded-full text-sm font-semibold ${
                  whatsapp.enabled ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {whatsapp.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
                <i className="fas fa-link mr-2" />
                WAHA API URL
              </label>
              <input
                type="text"
                value={whatsapp.api_url}
                onChange={(e) => setWhatsapp(s => ({ ...s, api_url: e.target.value }))}
                placeholder="http://localhost:9000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">WAHA API endpoint (e.g., http://localhost:9000)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
                <i className="fas fa-fingerprint mr-2" />
                Session ID
              </label>
              <input
                type="text"
                value={whatsapp.session_id}
                onChange={(e) => setWhatsapp(s => ({ ...s, session_id: e.target.value }))}
                placeholder="default"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">WAHA session identifier</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
                <i className="fas fa-key mr-2" />
                API Key (Optional)
              </label>
              <input
                type="password"
                value={whatsapp.api_key}
                onChange={(e) => setWhatsapp(s => ({ ...s, api_key: e.target.value }))}
                placeholder="Leave blank if not required"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">
                <i className="fas fa-phone mr-2" />
                Test Phone Number
              </label>
              <input
                type="text"
                value={whatsapp.test_phone}
                onChange={(e) => setWhatsapp(s => ({ ...s, test_phone: e.target.value }))}
                placeholder="628123456789"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Include country code (e.g., 628123456789)</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTest}
                disabled={testing || !whatsapp.api_url}
                className="flex-1 py-3 bg-blue-50 text-blue-500 rounded-xl font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {testing ? 'Sending...' : 'Send Test Message'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-primary text-white dark:bg-primary-600 rounded-xl font-semibold hover:bg-primary/90 dark:hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <div className="text-base font-semibold text-dark">Email Notifications</div>
                <div className="text-sm text-gray-400 mt-0.5">Enable email notifications via SMTP</div>
              </div>
              <button
                onClick={() => setEmail(s => ({ ...s, enabled: !s.enabled }))}
                className={`px-5 py-2 rounded-full text-sm font-semibold ${
                  email.enabled ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {email.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={email.smtp_host}
                  onChange={(e) => setEmail(s => ({ ...s, smtp_host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={email.smtp_port}
                  onChange={(e) => setEmail(s => ({ ...s, smtp_port: parseInt(e.target.value) }))}
                  placeholder="587"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                id="smtp_secure"
                checked={email.smtp_secure}
                onChange={(e) => setEmail(s => ({ ...s, smtp_secure: e.target.checked }))}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="smtp_secure" className="text-sm text-dark">
                Use SSL/TLS (Secure Connection)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">SMTP Username</label>
              <input
                type="text"
                value={email.smtp_user}
                onChange={(e) => setEmail(s => ({ ...s, smtp_user: e.target.value }))}
                placeholder="you@gmail.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">SMTP Password</label>
              <input
                type="password"
                value={email.smtp_pass}
                onChange={(e) => setEmail(s => ({ ...s, smtp_pass: e.target.value }))}
                placeholder="App Password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">For Gmail: Use App Password, not main password</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">From Email</label>
              <input
                type="text"
                value={email.smtp_from}
                onChange={(e) => setEmail(s => ({ ...s, smtp_from: e.target.value }))}
                placeholder="VPN Access <you@gmail.com>"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTest}
                disabled={testing || !email.smtp_host}
                className="flex-1 py-3 bg-blue-50 text-blue-500 rounded-xl font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-primary text-white dark:bg-primary-600 rounded-xl font-semibold hover:bg-primary/90 dark:hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <div className="text-base font-semibold text-dark">Billing System</div>
                <div className="text-sm text-gray-400 mt-0.5">Enable/disable billing functionality</div>
              </div>
              <button
                onClick={() => setBilling(s => ({ ...s, billing_enabled: !s.billing_enabled }))}
                className={`px-5 py-2 rounded-full text-sm font-semibold ${
                  billing.billing_enabled ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {billing.billing_enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Currency</label>
              <select
                value={billing.currency}
                onChange={(e) => setBilling(s => ({ ...s, currency: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="IDR">IDR - Indonesian Rupiah</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Min Top-up</label>
                <input
                  type="number"
                  value={billing.min_topup}
                  onChange={(e) => setBilling(s => ({ ...s, min_topup: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Max Top-up</label>
                <input
                  type="number"
                  value={billing.max_topup}
                  onChange={(e) => setBilling(s => ({ ...s, max_topup: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                id="auto_renewal"
                checked={billing.auto_renewal_enabled}
                onChange={(e) => setBilling(s => ({ ...s, auto_renewal_enabled: e.target.checked }))}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="auto_renewal" className="text-sm text-dark">
                Enable Auto-Renewal System
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Low Balance Alert (Days)</label>
              <input
                type="number"
                value={billing.low_balance_days}
                onChange={(e) => setBilling(s => ({ ...s, low_balance_days: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Alert user when balance is low X days before expiry</p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-primary text-white dark:bg-primary-600 rounded-xl font-semibold hover:bg-primary/90 dark:hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-base font-semibold text-dark">Payment Methods</div>
                <div className="text-sm text-gray-400 mt-0.5">Manage bank accounts and QR codes</div>
              </div>
              <button
                onClick={handleAddBank}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <i className="fas fa-plus mr-2" />
                Add Bank
              </button>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-2 block">🏦</span>
                <div className="text-sm text-gray-400">No bank accounts configured</div>
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((bank, index) => (
                  <div
                    key={bank.id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-dark">{bank.bank}</span>
                        {bank.active === false && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{bank.account_number}</div>
                      <div className="text-xs text-gray-400">{bank.account_name}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBank(bank)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBank(bank.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
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

        {activeTab === 'notifications' && (
          <div className="space-y-5">
            <div className="text-sm text-gray-400 mb-4">
              Configure which notifications to send and via which channels
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">WhatsApp Notifications</div>
                  <div className="text-xs text-gray-400">Send notifications via WhatsApp</div>
                </div>
                <button
                  onClick={() => setNotifications(s => ({ ...s, whatsapp_enabled: !s.whatsapp_enabled }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    notifications.whatsapp_enabled ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {notifications.whatsapp_enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">Email Notifications</div>
                  <div className="text-xs text-gray-400">Send notifications via Email</div>
                </div>
                <button
                  onClick={() => setNotifications(s => ({ ...s, email_enabled: !s.email_enabled }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    notifications.email_enabled ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {notifications.email_enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">Low Balance Alert</div>
                  <div className="text-xs text-gray-400">Alert when balance is insufficient</div>
                </div>
                <button
                  onClick={() => setNotifications(s => ({ ...s, low_balance_alert: !s.low_balance_alert }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    notifications.low_balance_alert ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {notifications.low_balance_alert ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">Expiring Soon Alert</div>
                  <div className="text-xs text-gray-400">Alert before subscription expires</div>
                </div>
                <button
                  onClick={() => setNotifications(s => ({ ...s, expiring_soon_alert: !s.expiring_soon_alert }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    notifications.expiring_soon_alert ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {notifications.expiring_soon_alert ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">Payment Approved Alert</div>
                  <div className="text-xs text-gray-400">Notify when payment approved</div>
                </div>
                <button
                  onClick={() => setNotifications(s => ({ ...s, payment_approved_alert: !s.payment_approved_alert }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    notifications.payment_approved_alert ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {notifications.payment_approved_alert ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-dark">Payment Rejected Alert</div>
                  <div className="text-xs text-gray-400">Notify when payment rejected</div>
                </div>
                <button
                  onClick={() => setNotifications(s => ({ ...s, payment_rejected_alert: !s.payment_rejected_alert }))}
                  className={`px-4 py-2 rounded-full text-xs font-semibold ${
                    notifications.payment_rejected_alert ? 'bg-success text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {notifications.payment_rejected_alert ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-primary text-white dark:bg-primary-600 rounded-xl font-semibold hover:bg-primary/90 dark:hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">App Name</label>
              <input
                type="text"
                value={general.app_name}
                onChange={(e) => setGeneral(s => ({ ...s, app_name: e.target.value }))}
                placeholder="VPN Access Manager"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">App URL</label>
              <input
                type="url"
                value={general.app_url}
                onChange={(e) => setGeneral(s => ({ ...s, app_url: e.target.value }))}
                placeholder="http://localhost:3001"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Support Email</label>
              <input
                type="email"
                value={general.support_email}
                onChange={(e) => setGeneral(s => ({ ...s, support_email: e.target.value }))}
                placeholder="support@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={general.maintenance_mode}
                onChange={(e) => setGeneral(s => ({ ...s, maintenance_mode: e.target.checked }))}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="maintenance_mode" className="text-sm text-dark">
                Maintenance Mode (Show maintenance page to users)
              </label>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 bg-primary text-white dark:bg-primary-600 rounded-xl font-semibold hover:bg-primary/90 dark:hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBankModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-dark">
                  {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
                </h2>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="text-gray-400 hover:text-dark text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Bank Name</label>
                <input
                  type="text"
                  value={bankForm.bank}
                  onChange={(e) => setBankForm(s => ({ ...s, bank: e.target.value }))}
                  placeholder="e.g., BCA, Mandiri, BNI"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Account Number</label>
                <input
                  type="text"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm(s => ({ ...s, account_number: e.target.value }))}
                  placeholder="e.g., 1234567890"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Account Name</label>
                <input
                  type="text"
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm(s => ({ ...s, account_name: e.target.value }))}
                  placeholder="e.g., PT VPN Access"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">Description</label>
                <textarea
                  value={bankForm.description}
                  onChange={(e) => setBankForm(s => ({ ...s, description: e.target.value }))}
                  placeholder="Payment instructions or notes"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 uppercase mb-2">QR Code URL</label>
                <input
                  type="text"
                  value={bankForm.qr_code_url}
                  onChange={(e) => setBankForm(s => ({ ...s, qr_code_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-dark text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="bank_active"
                  checked={bankForm.active}
                  onChange={(e) => setBankForm(s => ({ ...s, active: e.target.checked }))}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="bank_active" className="text-sm text-dark">
                  Active (show to users)
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
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
                  {loading ? 'Saving...' : (editingBank ? 'Update' : 'Add')} Bank
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
