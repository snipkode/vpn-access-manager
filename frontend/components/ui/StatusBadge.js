/**
 * StatusBadge - Reusable status indicator
 * @param {string} status - Status value (pending, approved, rejected, blocked, etc.)
 * @param {object} customStyles - Optional custom style overrides
 */
export default function StatusBadge({ status, customStyles }) {
  const defaultStyles = {
    pending: 'bg-amber-50 text-amber-500',
    approved: 'bg-green-50 text-success',
    rejected: 'bg-red-50 text-red-500',
    blocked: 'bg-purple-50 text-purple-500',
    active: 'bg-green-50 text-success',
    disabled: 'bg-gray-50 text-gray-400',
    revoked: 'bg-red-50 text-red-500',
  };

  const styles = customStyles || defaultStyles;

  return (
    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
