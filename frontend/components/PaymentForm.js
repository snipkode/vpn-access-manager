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
}) {
  const { showNotification } = useUIStore();
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [amount, setAmount] = useState(defaultAmount || (mode === 'topup' ? 50000 : plans[0]?.price || 50000));
  const [selectedPlan, setSelectedPlan] = useState(mode === 'plan' && plans[0]?.id ? plans[0].id : null);
  const [bankFrom, setBankFrom] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [notes, setNotes] = useState('');

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
    }
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

      // Create form data
      const formData = new FormData();
      formData.append('amount', amount.toString());
      
      // Add plan info if in plan mode
      if (mode === 'plan' && selectedPlan) {
        formData.append('plan', selectedPlan);
      }
      
      formData.append('bank_from', bankFrom);
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
      setBankFrom('');
      setTransferDate('');
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
      {/* Plan Selection (only for plan mode) */}
      {mode === 'plan' && plans.length > 0 && (
        <div>
          <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
            Pilih Paket
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanChange(plan.id)}
                className={`cursor-pointer rounded-lg sm:rounded-xl p-2.5 sm:p-3.5 border-2 transition-all duration-200 ${
                  selectedPlan === plan.id
                    ? 'border-[#007AFF] bg-[#007AFF]/10 dark:bg-[#007AFF]/20 shadow-lg shadow-[#007AFF]/20'
                    : 'border-gray-200 dark:border-[#38383A] bg-gray-50 dark:bg-[#2C2C2E] hover:border-[#007AFF]/50'
                }`}
              >
                <div className="text-[12px] sm:text-[13px] font-semibold text-dark dark:text-white mb-1">{plan.label}</div>
                <div className="text-lg sm:text-xl font-bold text-[#007AFF] mb-0.5 sm:mb-1 tracking-tight">
                  {formatCurrency(plan.price)}
                </div>
                <div className="text-[9px] sm:text-[11px] text-gray-400 dark:text-gray-500 font-medium">{plan.duration_days} hari</div>
                {selectedPlan === plan.id && (
                  <div className="mt-1 sm:mt-1.5 text-[8px] sm:text-[10px] text-[#007AFF] font-bold uppercase tracking-wide">
                    <Icon name="check_circle" size="small" variant="round" /> Terpilih
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          Nominal {mode === 'topup' ? 'Top Up' : 'Pembayaran'} (IDR)
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
          Minimal: {formatCurrency(mode === 'topup' ? 10000 : (plans.find(p => p.id === selectedPlan)?.price || 10000))}
        </p>
      </div>

      {/* Bank From */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">
          <Icon name="account_balance" variant="round" size="small" className="text-[#007AFF] mr-1 sm:mr-1.5" />
          Bank / E-Wallet Pengirim
        </label>
        <input
          type="text"
          value={bankFrom}
          onChange={(e) => setBankFrom(e.target.value)}
          placeholder="BCA, Mandiri, GoPay, OVO, dll"
          className="w-full px-3 sm:px-4 py-[10px] sm:py-[12px] bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-lg sm:rounded-xl text-dark dark:text-white text-[14px] sm:text-[15px] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-500"
          required
        />
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
