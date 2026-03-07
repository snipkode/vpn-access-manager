/**
 * Reusable Stat Card Component
 * @param {string} label - Card label
 * @param {number|string} value - Card value
 * @param {string} color - Text color class (e.g., 'text-primary')
 * @param {string} bg - Background color class (e.g., 'bg-blue-50')
 * @param {ReactNode} icon - Optional custom icon (defaults to #)
 * @param {boolean} highlight - Optional highlight state
 */
export default function StatCard({ label, value, color, bg, icon = '#', highlight = false }) {
  return (
    <div className={`bg-white rounded-xl p-3 sm:p-5 shadow-sm border transition-all ${
      highlight
        ? 'border-primary shadow-md ring-2 ring-primary/20'
        : 'border-gray-100 shadow-sm'
    }`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`${bg} w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <div className={`text-lg sm:text-xl font-bold ${color}`}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-lg sm:text-2xl font-bold ${color} truncate`}>{value}</div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">{label}</div>
        </div>
      </div>
    </div>
  );
}
