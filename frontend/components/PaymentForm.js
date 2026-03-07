import { useState } from 'react';
import { useUIStore } from '../store';
import { billingAPI, formatCurrency } from '../lib/api';
import Icon from './ui/Icon';

/**
 * Reusable Payment Form Component - iPhone Style Design
 * Supports: Top Up, Buy Plan, Custom Payment
 */
export default function PaymentForm({
  mode = 'topup', // 'topup' | 'plan' | 'custom'
  onSuccess,
  defaultAmount,
  plans = [],
  bankAccounts = [],
  onViewPlanDetails,
}) {
  const { showNotification } = useUIStore();
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);

  // Form state
  const [amount, setAmount] = useState(defaultAmount || (mode === 'topup' ? 50000 : plans[0]?.price || 50000));
  const [selectedPlan, setSelectedPlan] = useState(mode === 'plan' && plans[0]?.id ? plans[0].id : null);
  const [selectedBank, setSelectedBank] = useState(bankAccounts[0]?.id || '');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]); // Auto-set today
  const [notes, setNotes] = useState('');
  const [copiedBankId, setCopiedBankId] = useState(null);

  // Get today's date for min attribute
  const today = new Date().toISOString().split('T')[0];

  const handleCopyAccountNumber = async (bankId, accountNumber) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedBankId(bankId);
      showNotification('Nomor rekening berhasil disalin!', 'success');
      setTimeout(() => setCopiedBankId(null), 2000);
    } catch (error) {
      showNotification('Gagal menyalin nomor rekening', 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Hanya file JPEG, PNG, atau PDF yang diperbolehkan', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showNotification('Ukuran file maksimal 5MB', 'error');
        return;
      }

      setProofFile(file);
      setUploadProgress(100);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProofPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
      
      showNotification('✅ File berhasil diupload', 'success');
    }
  };

  const handlePlanChange = (planId) => {
    setSelectedPlan(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setAmount(plan.price);
      setSelectedPlanDetails(plan);
    }
  };

  const handleViewPlanDetails = (plan) => {
    if (onViewPlanDetails) {
      onViewPlanDetails(plan);
    } else {
      setSelectedPlanDetails(plan);
      setShowPlanDetails(true);
    }
  };

  // Helper to convert days to months/years
  const getDurationDisplay = (days) => {
    if (days >= 365 && days % 365 === 0) {
      const years = days / 365;
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (days >= 30 && days % 30 === 0) {
      const months = days / 30;
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  const handleBankChange = (bankId) => {
    setSelectedBank(bankId);
    setCopiedBankId(null); // Reset copy state when bank changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setUploadProgress(50);

    try {
      // Validate amount
      const minAmount = mode === 'topup' ? 10000 : (plans.find(p => p.id === selectedPlan)?.price || 10000);
      if (amount < minAmount) {
        throw new Error(`Nominal minimal ${formatCurrency(minAmount)}`);
      }

      // Validate transfer date
      if (!transferDate) {
        throw new Error('Tanggal transfer wajib diisi');
      }

      // Validate proof file
      if (!proofFile) {
        throw new Error('Bukti transfer wajib diupload');
      }

      // Get selected bank details
      const selectedBankDetails = bankAccounts.find(b => b.id === selectedBank);

      // Create form data
      const formData = new FormData();
      formData.append('amount', amount.toString());

      // Add plan info if in plan mode
      if (mode === 'plan' && selectedPlan) {
        formData.append('plan', selectedPlan);
      }

      formData.append('bank_from', selectedBankDetails?.bank || '');
      formData.append('transfer_date', transferDate);
      formData.append('notes', notes || '');
      formData.append('proof', proofFile);

      await billingAPI.submitPayment(formData);

      setUploadProgress(100);
      const successMessage = mode === 'topup'
        ? '✅ Top-up berhasil dikirim! Menunggu persetujuan admin.'
        : '✅ Pembayaran berhasil dikirim! Menunggu persetujuan admin.';

      showNotification(successMessage);

      // Reset form
      setProofFile(null);
      setProofPreview(null);
      setSelectedBank(bankAccounts[0]?.id || '');
      setTransferDate(new Date().toISOString().split('T')[0]); // Reset to today
      setNotes('');
      setAmount(defaultAmount || (mode === 'topup' ? 50000 : plans[0]?.price || 50000));
      if (mode === 'plan' && plans[0]) {
        setSelectedPlan(plans[0].id);
      }

      // Callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Plan Selection - Simple Square Cards */}
      {mode === 'plan' && plans.length > 0 && (
        <div>
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
            Pilih Paket
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {plans.map((plan) => {
              const durationDisplay = getDurationDisplay(plan.duration_days);
              
              return (
                <div
                  key={plan.id}
                  onClick={() => handlePlanChange(plan.id)}
                  className={`relative cursor-pointer rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 transition-all duration-200 ${
                    selectedPlan === plan.id
                      ? 'border-[#007AFF] bg-[#007AFF]/10 dark:bg-[#007AFF]/20 shadow-lg shadow-[#007AFF]/25'
                      : 'border-gray-200 dark:border-[#38383A] bg-gray-50 dark:bg-[#2C2C2E] hover:border-[#007AFF]/50'
                  }`}
                >
                  {/* Info Icon - Top Right Corner */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPlanDetails(plan);
                    }}
                    className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/80 dark:bg-[#2C2C2E]/80 flex items-center justify-center hover:bg-[#007AFF]/20 transition-colors group"
                  >
                    <Icon name="info" variant="round" size="small" className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-[#007AFF]" />
                  </button>
                  
                  {/* Plan Name */}
                  <div className="text-[12px] sm:text-[13px] font-bold text-dark dark:text-white mb-1.5 leading-tight pr-6">
                    {plan.label}
                  </div>
                  
                  {/* Duration Badge */}
                  <div className="inline-flex items-center gap-1 px-1.5 py-1 bg-[#007AFF]/10 dark:bg-[#007AFF]/20 rounded-md">
                    <Icon name="calendar_today" variant="round" size="small" className="text-[#007AFF] w-3 h-3" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#007AFF]">
                      {durationDisplay}
                    </span>
                  </div>
                  
                  {/* Selected Checkmark */}
                  {selectedPlan === plan.id && (
                    <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-5 h-5 bg-[#007AFF] rounded-full flex items-center justify-center shadow-md">
                      <Icon name="check" variant="round" size="small" className="text-white w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Amount - Only show for topup mode */}
      {mode === 'topup' && (
        <div>
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
            Nominal Top Up (IDR)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="w-full px-3 sm:px-4 py-[10px] sm:py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-lg sm:rounded-xl text-dark dark:text-white text-[14px] sm:text-[15px] font-semibold focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
            min="10000"
            step="10000"
            required
          />
          <p className="text-[9px] sm:text-[11px] text-gray-400 dark:text-gray-500 mt-1 sm:mt-1.5 font-medium">
            Minimal: {formatCurrency(10000)}
          </p>
        </div>
      )}

      {/* Bank Penerima - Dropdown with Account Number Display */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          <Icon name="account_balance" variant="round" size="small" className="text-[#007AFF] mr-1 sm:mr-1.5" />
          Bank / E-Wallet Penerima
        </label>
        <select
          value={selectedBank}
          onChange={(e) => handleBankChange(e.target.value)}
          className="w-full px-3 sm:px-4 py-[10px] sm:py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-lg sm:rounded-xl text-dark dark:text-white text-[14px] sm:text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all appearance-none cursor-pointer mb-2"
          required
        >
          {bankAccounts.length > 0 ? (
            bankAccounts.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.bank} - {bank.account_name}
              </option>
            ))
          ) : (
            <>
              <option value="BCA">BCA</option>
              <option value="Mandiri">Mandiri</option>
              <option value="BNI">BNI</option>
              <option value="BRI">BRI</option>
              <option value="GoPay">GoPay</option>
              <option value="OVO">OVO</option>
              <option value="DANA">DANA</option>
              <option value="ShopeePay">ShopeePay</option>
            </>
          )}
        </select>

        {/* Selected Bank Account Number with Copy */}
        {bankAccounts.length > 0 && selectedBank && (
          <div className="bg-gradient-to-br from-[#F2F2F7] dark:from-[#1C1C1E] to-white dark:to-[#2C2C2E] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-[#38383A] shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-white dark:bg-[#2C2C2E] rounded-lg sm:rounded-xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm flex-shrink-0">
                🏦
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] sm:text-[17px] font-bold text-dark dark:text-white tracking-tight truncate">
                  {bankAccounts.find(b => b.id === selectedBank)?.bank}
                </div>
                <div className="text-[12px] sm:text-[13px] text-gray-400 dark:text-gray-500 font-medium truncate">
                  {bankAccounts.find(b => b.id === selectedBank)?.account_name}
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#2C2C2E] rounded-md sm:rounded-xl p-2.5 sm:p-3 border border-gray-100 dark:border-[#38383A]">
              <div className="text-[9px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mb-1">Nomor Rekening</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-lg sm:text-2xl font-mono font-bold text-dark dark:text-white tracking-tight truncate">
                  {bankAccounts.find(b => b.id === selectedBank)?.account_number}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyAccountNumber(selectedBank, bankAccounts.find(b => b.id === selectedBank)?.account_number)}
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0 ${
                    copiedBankId === selectedBank
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 active:scale-95'
                  }`}
                >
                  {copiedBankId === selectedBank ? (
                    <>
                      <Icon name="check_circle" variant="round" size="small" className="w-4 h-4" />
                      <span className="hidden sm:inline">Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Icon name="content_copy" variant="round" size="small" className="w-4 h-4" />
                      <span className="hidden sm:inline">Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {bankAccounts.find(b => b.id === selectedBank)?.description && (
              <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mt-2 sm:mt-3">
                {bankAccounts.find(b => b.id === selectedBank)?.description}
              </p>
            )}
            {bankAccounts.find(b => b.id === selectedBank)?.qr_code_url && (
              <div className="mt-3 sm:mt-4 text-center">
                <div className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-2">Scan QR Code</div>
                <div className="inline-block bg-white dark:bg-white p-3 sm:p-4 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-300">
                  <img
                    src={bankAccounts.find(b => b.id === selectedBank)?.qr_code_url}
                    alt="QR Code"
                    className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] object-contain mx-auto"
                    loading="lazy"
                  />
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  Scan untuk transfer otomatis
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transfer Date */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          <Icon name="calendar_today" variant="round" size="small" className="text-[#007AFF] mr-1 sm:mr-1.5" />
          Tanggal Transfer
        </label>
        <input
          type="date"
          value={transferDate}
          onChange={(e) => setTransferDate(e.target.value)}
          min={today}
          className="w-full px-3 sm:px-4 py-[10px] sm:py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-lg sm:rounded-xl text-dark dark:text-white text-[14px] sm:text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all"
          required
        />
      </div>

      {/* Proof of Transfer */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          <Icon name="image" variant="round" size="small" className="text-[#007AFF] mr-1 sm:mr-1.5" />
          Bukti Transfer
        </label>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full px-3 sm:px-4 py-[10px] sm:py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-lg sm:rounded-xl text-dark dark:text-white text-[14px] sm:text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all file:mr-2 sm:file:mr-3 file:py-2 sm:file:py-2.5 file:px-2.5 sm:file:px-3 file:rounded-md file:border-0 file:text-[10px] sm:file:text-[11px] file:font-semibold file:bg-[#007AFF]/10 file:text-[#007AFF] hover:file:bg-[#007AFF]/20"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            required
          />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 sm:mt-2">
              <div className="h-1 bg-gray-200 dark:bg-[#38383A] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#007AFF] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <p className="text-[9px] sm:text-[11px] text-gray-400 dark:text-gray-500 mt-1 sm:mt-1.5 font-medium">
          Upload screenshot atau PDF (Maksimal 5MB)
        </p>

        {proofPreview && (
          <div className="mt-2.5 sm:mt-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-lg sm:rounded-xl p-2 sm:p-2.5 text-center border border-gray-100 dark:border-[#38383A]">
            <img
              src={proofPreview}
              alt="Proof preview"
              className="max-h-40 sm:max-h-48 mx-auto rounded-md sm:rounded-lg shadow-sm"
            />
          </div>
        )}

        {proofFile && !proofPreview && (
          <div className="mt-2.5 sm:mt-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 border border-gray-100 dark:border-[#38383A]">
            <Icon name="picture_as_pdf" variant="round" size="medium" className="text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-semibold text-dark dark:text-white truncate">{proofFile.name}</div>
              <div className="text-[9px] sm:text-[11px] text-gray-400 dark:text-gray-500">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <Icon name="check_circle" variant="round" size="medium" className="text-green-500 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          <Icon name="note_alt" variant="round" size="small" className="text-[#007AFF] mr-1 sm:mr-1.5" />
          Catatan (Opsional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan tambahan..."
          rows={3}
          className="w-full px-3 sm:px-4 py-[10px] sm:py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-lg sm:rounded-xl text-dark dark:text-white text-[14px] sm:text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all resize-none placeholder:text-gray-300 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-[12px] sm:py-[14px] bg-[#007AFF] text-white rounded-lg sm:rounded-xl font-semibold text-[14px] sm:text-[15px] tracking-tight hover:bg-[#007AFF]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007AFF]/30"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-1.5 sm:gap-2">
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Mengirim...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1.5 sm:gap-2">
            <Icon name="send" variant="round" size="small" />
            {mode === 'topup' ? 'Kirim Permintaan Top Up' : 'Kirim Pembayaran'}
          </span>
        )}
      </button>

      {/* Plan Details Modal */}
      {showPlanDetails && (
        <PlanDetailsModal 
          plan={selectedPlanDetails} 
          onClose={() => setShowPlanDetails(false)} 
        />
      )}
    </form>
  );
}

/**
 * Bank Accounts Display Component - iPhone Style
 */
export function BankAccountsDisplay({ bankAccounts = [] }) {
  if (!bankAccounts || bankAccounts.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 sm:mb-5">
      <h3 className="text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
        <Icon name="account_balance" variant="round" size="small" className="text-[#007AFF] mr-1 sm:mr-1.5" />
        Transfer Ke
      </h3>
      <div className="space-y-2 sm:space-y-3">
        {bankAccounts.map((bank) => (
          <div key={bank.id} className="bg-gradient-to-br from-[#F2F2F7] dark:from-[#1C1C1E] to-white dark:to-[#2C2C2E] rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-[#38383A] shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-white dark:bg-[#2C2C2E] rounded-lg sm:rounded-xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm flex-shrink-0">
                🏦
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] sm:text-[17px] font-bold text-dark dark:text-white tracking-tight truncate">{bank.bank}</div>
                <div className="text-[12px] sm:text-[13px] text-gray-400 dark:text-gray-500 font-medium truncate">{bank.account_name}</div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#2C2C2E] rounded-md sm:rounded-xl p-2.5 sm:p-3 mb-2 sm:mb-3 border border-gray-100 dark:border-[#38383A]">
              <div className="text-[9px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mb-1">Nomor Rekening</div>
              <div className="text-lg sm:text-2xl font-mono font-bold text-dark dark:text-white tracking-tight">{bank.account_number}</div>
            </div>
            {bank.description && (
              <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{bank.description}</p>
            )}
            {bank.qr_code_url && (
              <div className="mt-2.5 sm:mt-3 text-center bg-white dark:bg-[#2C2C2E] rounded-lg sm:rounded-xl p-2.5 sm:p-3 inline-block">
                <img
                  src={bank.qr_code_url}
                  alt="QR Code"
                  className="max-h-28 sm:max-h-36 mx-auto rounded-md sm:rounded-lg shadow-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Payment History Display Component - iPhone Style
 */
export function PaymentHistory({ payments = [], emptyMessage = 'Belum ada riwayat pembayaran' }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-lg sm:rounded-2xl p-6 sm:p-8 md:p-10 text-center">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">📭</div>
        <div className="text-[14px] sm:text-[15px] md:text-[17px] font-semibold text-dark dark:text-white mb-1 tracking-tight">{emptyMessage}</div>
        <div className="text-[12px] sm:text-[13px] text-gray-400 dark:text-gray-500 font-medium">Pembayaran yang dikirim akan muncul di sini</div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-2.5">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-[#38383A] rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-[#007AFF]/30 dark:hover:border-[#007AFF]/50 hover:shadow-md transition-all duration-200"
        >
          <div className="flex justify-between items-start mb-2 sm:mb-2.5">
            <div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#007AFF] tracking-tight">
                {formatCurrency(payment.amount)}
              </div>
              <div className="text-[10px] sm:text-[11px] md:text-[13px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                {payment.plan_label || payment.plan || 'Top Up'} • {payment.duration_days || 'N/A'} hari
              </div>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3 text-[10px] sm:text-[11px] md:text-[13px]">
            <div className="text-gray-400 dark:text-gray-500 font-medium truncate">
              <Icon name="account_balance" variant="round" size="small" className="text-[#007AFF] mr-1" />
              {payment.bank_from}
            </div>
            <div className="text-gray-400 dark:text-gray-500 font-medium">
              <Icon name="calendar_today" variant="round" size="small" className="text-[#007AFF] mr-1" />
              Transfer: {new Date(payment.transfer_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              <Icon name="schedule" variant="round" size="small" className="text-gray-400 mr-1" />
              Dikirim: {new Date(payment.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </div>
            {payment.admin_note && (
              <div className="col-span-2 bg-[#FFF3CD] dark:bg-[#FFF3CD]/20 border border-[#FFC107] dark:border-[#FFC107]/30 rounded-md sm:rounded-lg p-2 sm:p-2.5 md:p-3 mt-1.5 sm:mt-2">
                <div className="text-[10px] sm:text-[11px] md:text-[12px] text-[#856404] dark:text-[#FFC107] font-medium">
                  <Icon name="info" variant="round" size="small" className="mr-1" />
                  <strong>Catatan Admin:</strong> {payment.admin_note}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-[#FF9500]/10 text-[#FF9500] dark:bg-[#FF9500]/20',
    approved: 'bg-[#34C759]/10 text-[#34C759] dark:bg-[#34C759]/20',
    rejected: 'bg-[#FF3B30]/10 text-[#FF3B30] dark:bg-[#FF3B30]/20',
    blocked: 'bg-[#AF52DE]/10 text-[#AF52DE] dark:bg-[#AF52DE]/20',
  };

  return (
    <span
      className={`px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-md sm:rounded-full text-[8px] sm:text-[9px] md:text-[11px] font-bold uppercase tracking-wider ${
        styles[status] || 'bg-gray-400/10 text-gray-400'
      }`}
    >
      {status}
    </span>
  );
}

/**
 * Plan Details Modal - iPhone Style
 */
export function PlanDetailsModal({ plan, onClose }) {
  if (!plan) return null;

  const benefits = plan.benefits || [
    'Unlimited bandwidth',
    'High-speed VPN connection',
    'Multiple device support',
    '24/7 customer support',
  ];

  const durationDisplay = ((days) => {
    if (days >= 365 && days % 365 === 0) {
      const years = days / 365;
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (days >= 30 && days % 30 === 0) {
      const months = days / 30;
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  })(plan.duration_days);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-[24px] p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-dark dark:text-white tracking-tight">Plan Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center text-gray-400 hover:text-dark dark:hover:text-white transition-all hover:rotate-90"
          >
            <Icon name="close" variant="round" size="small" />
          </button>
        </div>

        {/* Plan Info */}
        <div className="bg-gradient-to-br from-[#007AFF]/10 to-[#007AFF]/5 dark:from-[#007AFF]/20 dark:to-[#007AFF]/5 rounded-2xl p-5 mb-6 border border-[#007AFF]/20">
          <div className="text-[13px] sm:text-sm font-semibold text-[#007AFF] uppercase tracking-wide mb-1">{plan.label}</div>
          <div className="text-3xl sm:text-4xl font-bold text-dark dark:text-white tracking-tight mb-3">
            {formatCurrency(plan.price)}
          </div>
          <div className="flex items-center gap-3 text-[13px] sm:text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Icon name="calendar_today" variant="round" size="small" />
              <span className="font-medium">{durationDisplay}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1.5">
              <Icon name="payments" variant="round" size="small" />
              <span className="font-medium">One-time payment</span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <h3 className="text-[13px] sm:text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">What's Included</h3>
          <div className="space-y-2.5">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name="check" variant="round" size="small" className="text-green-600 dark:text-green-400 w-3.5 h-3.5" />
                </div>
                <span className="text-[14px] sm:text-[15px] text-dark dark:text-white font-medium leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-[14px] px-4 bg-[#007AFF] hover:bg-[#0056CC] text-white text-[15px] font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-[#007AFF]/30"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
