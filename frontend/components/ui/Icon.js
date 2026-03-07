import PropTypes from 'prop-types';

/**
 * Icon - Google Material Icons component
 * 
 * @param {string} name - Icon name (e.g., "home", "search", "person")
 * @param {string} variant - Icon variant (filled, outlined, round, sharp)
 * @param {string} size - Icon size (small, medium, large, or custom number)
 * @param {string} color - Icon color
 * @param {string} className - Additional classes
 * @param {function} onClick - Click handler
 * 
 * @example
 * <Icon name="home" />
 * <Icon name="search" variant="outlined" size="large" />
 * <Icon name="favorite" color="red" onClick={handleClick} />
 */
export default function Icon({ 
  name, 
  variant = 'round',
  size = 'medium',
  color,
  className = '',
  onClick,
  ...props 
}) {
  // Size configurations with balanced responsive scaling
  const sizeConfig = {
    small: 'text-[14px] sm:text-[16px]',
    medium: 'text-[18px] sm:text-[20px]',
    large: 'text-[20px] sm:text-[24px]',
    xl: 'text-[24px] sm:text-[32px]',
    xxl: 'text-[32px] sm:text-[48px]',
  };

  // Variant to font family mapping
  const variantMap = {
    filled: 'material-icons',
    outlined: 'material-icons-outlined',
    round: 'material-icons-round',
    sharp: 'material-icons-sharp',
  };

  const sizeClass = typeof size === 'number' ? '' : sizeConfig[size];
  const inlineStyle = typeof size === 'number' ? { fontSize: `${size}px` } : {};

  if (color) {
    inlineStyle.color = color;
  }

  return (
    <span
      className={`
        ${variantMap[variant]}
        ${sizeClass}
        ${className}
        leading-none
        inline-flex
        items-center
        justify-center
      `}
      style={inlineStyle}
      onClick={onClick}
      {...props}
    >
      {name}
    </span>
  );
}

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['filled', 'outlined', 'round', 'sharp']),
  size: PropTypes.oneOfType([
    PropTypes.oneOf(['small', 'medium', 'large', 'xl', 'xxl']),
    PropTypes.number,
  ]),
  color: PropTypes.string,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

/**
 * Icon Button - Button with icon
 */
export function IconButton({ 
  name, 
  variant = 'round',
  size = 'medium',
  color,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  ...props 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        w-10 h-10 sm:w-11 sm:h-11
        rounded-full
        bg-gray-100 dark:bg-[#2C2C2E]
        border border-gray-200 dark:border-[#38383A]
        transition-all duration-200
        hover:scale-110 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon 
          name={name} 
          variant={variant} 
          size={size} 
          color={color}
        />
      )}
    </button>
  );
}

Icon.Button = IconButton;
