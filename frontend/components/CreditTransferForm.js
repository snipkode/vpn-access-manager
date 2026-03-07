import { useState } from 'react';
import { useUIStore } from '../store';
import { creditAPI, formatCurrency } from '../lib/api';
import Icon from './ui/Icon';

/**
 * Credit Transfer Form - Transfer credit to another user
 */
export default function CreditTransferForm({ onSuccess }) {
  const { showNotification } = useUIStore();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    recipient_email: '',
    amount: '',
    notes: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate
      if (!formData.recipient_email) {
        throw new Error('Email penerima wajib diisi');
      }

      if (!formData.amount || parseInt(formData.amount) <= 0) {
        throw new Error('Nominal transfer harus lebih dari 0');
      }

      // Submit transfer
      await creditAPI.transfer({
        to_user_email: formData.recipient_email,
        amount: parseInt(formData.amount),
        description: 'Credit transfer',
        notes: formData.notes || '',
      });

      showNotification('✅ Transfer berhasil!', 'success');

      // Reset form
      setFormData({
        recipient_email: '',
        amount: '',
        notes: '',
      });

      // Callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showNotification(error.message || 'Transfer gagal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Recipient Email */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Email Penerima
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Icon name="email" variant="round" size="small" className="w-5 h-5" />
          </div>
          <input
            type="email"
            name="recipient_email"
            value={formData.recipient_email}
            onChange={handleChange}
            placeholder="user@example.com"
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            required
          />
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Nominal Transfer
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-bold">
            Rp
          </div>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="50000"
            min="1000"
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            required
          />
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
          Minimal transfer: Rp 1,000
        </p>
      </div>

      {/* Notes (Optional) */}
      <div>
        <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Catatan (Opsional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Tambahkan pesan..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#38383A] rounded-xl text-dark dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
          submitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]'
        }`}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Icon name="send" variant="round" size="small" className="w-4 h-4" />
            <span>Transfer Credit</span>
          </>
        )}
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3.5 mt-4">
        <div className="flex items-start gap-2.5">
          <div className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</div>
          <div className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold mb-1">Info Transfer:</p>
            <ul className="space-y-1 text-[10px]">
              <li>• Credit akan langsung ditransfer ke penerima</li>
              <li>• Pastikan email penerima sudah benar</li>
              <li>• Transfer tidak dapat dibatalkan</li>
              <li>Minimal transfer: Rp 1,000</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
}
