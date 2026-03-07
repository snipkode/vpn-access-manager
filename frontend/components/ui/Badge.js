import PropTypes from 'prop-types';

/**
 * Badge - Status indicator badge
 * 
 * @param {string} status - Status type (pending, approved, rejected, etc.)
 * @param {string} variant - Variant style (solid, outline, soft)
 * @param {string} size - Size (small, medium, large)
 * @param {string} className - Additional classes
 * 
 * @example
 * <Badge status="approved" />
 * <Badge status="pending" variant="outline" size="large" />
 */
export default function Badge({ 
  status = 'default', 
  variant = 'soft',
  size = 'medium',
  className = '',
  children,
  ...props 
}) {
  // Status configurations
  const statusConfig = {
    pending: {
      soft: 'bg-[#FF9500]/10 text-[#FF9500] dark:bg-[#FF9500]/20',
      solid: 'bg-[#FF9500] text-white',
      outline: 'border-2 border-[#FF9500] text-[#FF9500]',
    },
    approved: {
      soft: 'bg-[#34C759]/10 text-[#34C759] dark:bg-[#34C759]/20',
      solid: 'bg-[#34C759] text-white',
      outline: 'border-2 border-[#34C759] text-[#34C759]',
    },
    rejected: {
      soft: 'bg-[#FF3B30]/10 text-[#FF3B30] dark:bg-[#FF3B30]/20',
      solid: 'bg-[#FF3B30] text-white',
      outline: 'border-2 border-[#FF3B30] text-[#FF3B30]',
    },
    blocked: {
      soft: 'bg-[#AF52DE]/10 text-[#AF52DE] dark:bg-[#AF52DE]/20',
      solid: 'bg-[#AF52DE] text-white',
      outline: 'border-2 border-[#AF52DE] text-[#AF52DE]',
    },
    active: {
      soft: 'bg-[#34C759]/10 text-[#34C759] dark:bg-[#34C759]/20',
      solid: 'bg-[#34C759] text-white',
      outline: 'border-2 border-[#34C759] text-[#34C759]',
    },
    inactive: {
      soft: 'bg-gray-400/10 text-gray-400 dark:bg-gray-400/20',
      solid: 'bg-gray-400 text-white',
      outline: 'border-2 border-gray-400 text-gray-400',
    },
    default: {
      soft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      solid: 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-white',
      outline: 'border-2 border-gray-300 text-gray-600',
    },
  };

  // Size configurations
  const sizeConfig = {
    small: 'px-2 py-0.5 text-[9px]',
    medium: 'px-3 py-1 text-[11px]',
    large: 'px-4 py-1.5 text-[13px]',
  };

  const config = statusConfig[status] || statusConfig.default;
  const sizeClass = sizeConfig[size];

  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-full font-bold uppercase tracking-wider
        transition-all duration-200
        ${config[variant]}
        ${sizeClass}
        ${className}
      `}
      {...props}
    >
      {children || status}
    </span>
  );
}

Badge.propTypes = {
  status: PropTypes.oneOf(['pending', 'approved', 'rejected', 'blocked', 'active', 'inactive', 'default']),
  variant: PropTypes.oneOf(['soft', 'solid', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
  children: PropTypes.node,
};
