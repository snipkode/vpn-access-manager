import PropTypes from 'prop-types';

/**
 * StatCard - Display statistics with icon, value, and label
 * 
 * @param {string} label - Stat label
 * @param {string|number} value - Stat value
 * @param {string} icon - Icon (emoji or component)
 * @param {string} color - Text color class
 * @param {string} bg - Background color class
 * @param {boolean} highlight - Highlight border
 * @param {string} className - Additional classes
 * 
 * @example
 * <StatCard 
 *   label="Total Referrals" 
 *   value={10} 
 *   icon="👥" 
 *   color="text-blue-500"
 *   bg="bg-blue-50"
 * />
 */
export default function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'text-dark', 
  bg = 'bg-gray-50',
  highlight = false,
  className = '',
  ...props 
}) {
  return (
    <div 
      className={`
        bg-white dark:bg-[#1C1C1E] 
        rounded-2xl p-4 sm:p-5 
        shadow-sm border-2 
        ${highlight ? 'border-[#007AFF]' : 'border-gray-100 dark:border-[#38383A]'}
        transition-all duration-200
        hover:shadow-md
        ${className}
      `}
      {...props}
    >
      {/* Icon */}
      <div className={`${bg} w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors dark:bg-opacity-20`}>
        {typeof icon === 'string' ? (
          <span className="text-2xl sm:text-3xl">{icon}</span>
        ) : (
          icon
        )}
      </div>
      
      {/* Value */}
      <div className={`text-2xl sm:text-3xl font-bold ${color} mb-1 tracking-tight`}>
        {value}
      </div>
      
      {/* Label */}
      <div className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  color: PropTypes.string,
  bg: PropTypes.string,
  highlight: PropTypes.bool,
  className: PropTypes.string,
};
