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
    <div className={`bg-white rounded-xl p-5 shadow-sm border transition-all ${
      highlight 
        ? 'border-primary shadow-md ring-2 ring-primary/20' 
        : 'border-gray-100 shadow-sm'
    }`}>
      <div className={`${bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
        <div className={`text-xl font-bold ${color}`}>{icon}</div>
      </div>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-gray-400 font-medium">{label}</div>
    </div>
  );
}
