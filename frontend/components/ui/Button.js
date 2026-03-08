import PropTypes from 'prop-types';

/**
 * Button - Interactive button component
 *
 * @param {node} children - Button content
 * @param {function} onClick - Click handler
 * @param {string} variant - Variant style (primary, secondary, danger, ghost, outline)
 * @param {string} size - Size (small, medium, large)
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state
 * @param {boolean} rateLimited - Rate limited state (shows countdown)
 * @param {number} countdown - Countdown seconds to display when rate limited
 * @param {node} icon - Icon component
 * @param {boolean} fullWidth - Full width button
 * @param {string} className - Additional classes
 *
 * @example
 * <Button onClick={handleClick}>Click Me</Button>
 * <Button variant="danger" loading>Loading</Button>
 * <Button icon={<FaHome />}>With Icon</Button>
 * <Button rateLimited countdown={30}>Rate Limited</Button>
 */
export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  rateLimited = false,
  countdown = 0,
  icon,
  fullWidth = false,
  className = '',
  ...props
}) {
  // Variant configurations
  const variantConfig = {
    primary: 'bg-[#007AFF] text-white hover:bg-[#007AFF]/90 active:scale-[0.98] shadow-lg shadow-[#007AFF]/30',
    secondary: 'bg-gray-100 dark:bg-[#2C2C2E] text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-[#38383A] active:scale-[0.98]',
    success: 'bg-[#34C759] text-white hover:bg-[#34C759]/90 active:scale-[0.98] shadow-lg shadow-[#34C759]/30',
    danger: 'bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90 active:scale-[0.98] shadow-lg shadow-[#FF3B30]/30',
    ghost: 'bg-transparent text-[#007AFF] hover:bg-[#007AFF]/10 active:scale-[0.98]',
    outline: 'bg-transparent border-2 border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/10 active:scale-[0.98]',
  };

  // Size configurations
  const sizeConfig = {
    small: 'px-3 py-1.5 text-[13px] rounded-lg gap-1.5',
    medium: 'px-4 sm:px-5 py-[12px] sm:py-[14px] text-[15px] sm:text-[17px] rounded-xl sm:rounded-2xl gap-2 sm:gap-2.5',
    large: 'px-6 py-[14px] sm:py-[18px] text-[17px] rounded-2xl gap-2.5',
  };

  // Rate limited state overrides
  const isRateLimited = rateLimited && countdown > 0;
  const isDisabled = disabled || loading || isRateLimited;

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isRateLimited ? 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-400 dark:text-gray-500' : variantConfig[variant]}
        ${sizeConfig[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && (
        <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      )}

      {/* Rate Limited Countdown */}
      {isRateLimited && (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
          <span className="tabular-nums font-mono">{countdown}s</span>
        </span>
      )}

      {/* Icon */}
      {icon && !loading && !isRateLimited && (
        <span className={children ? '' : ''}>
          {icon}
        </span>
      )}

      {/* Children */}
      {children && !isRateLimited && children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'ghost', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  rateLimited: PropTypes.bool,
  countdown: PropTypes.number,
  icon: PropTypes.node,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * ButtonGroup - Group of buttons
 */
export function ButtonGroup({ children, className = '', vertical = false, ...props }) {
  return (
    <div 
      className={`flex ${vertical ? 'flex-col gap-2' : 'flex-row gap-2 sm:gap-3'} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

Button.Group = ButtonGroup;
