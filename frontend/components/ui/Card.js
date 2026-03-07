import PropTypes from 'prop-types';

/**
 * Card - Container card component
 * 
 * @param {node} children - Card content
 * @param {string} variant - Variant style (default, outlined, filled, gradient)
 * @param {string} size - Size (small, medium, large)
 * @param {boolean} hoverable - Enable hover effect
 * @param {function} onClick - Click handler
 * @param {string} className - Additional classes
 * 
 * @example
 * <Card>Content</Card>
 * <Card variant="outlined" hoverable onClick={handleClick}>Clickable Card</Card>
 */
export default function Card({ 
  children, 
  variant = 'default',
  size = 'medium',
  hoverable = false,
  onClick,
  className = '',
  ...props 
}) {
  // Variant configurations
  const variantConfig = {
    default: 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-[#38383A] shadow-sm',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-[#38383A]',
    filled: 'bg-gray-50 dark:bg-[#2C2C2E] border-gray-100 dark:border-[#38383A]',
    gradient: 'bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10 border-[#007AFF]/20',
  };

  // Size configurations
  const sizeConfig = {
    small: 'p-3 sm:p-4 rounded-xl',
    medium: 'p-4 sm:p-5 sm:p-6 rounded-2xl',
    large: 'p-5 sm:p-6 sm:p-8 rounded-3xl',
  };

  return (
    <div
      className={`
        border transition-all duration-200
        ${variantConfig[variant]}
        ${sizeConfig[size]}
        ${hoverable ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'outlined', 'filled', 'gradient']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  hoverable: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

/**
 * CardHeader - Card header section
 */
export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * CardTitle - Card title
 */
export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-[17px] sm:text-lg font-bold text-dark dark:text-white ${className}`} {...props}>
      {children}
    </h3>
  );
}

/**
 * CardDescription - Card description
 */
export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-[13px] sm:text-sm text-gray-500 dark:text-gray-400 mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

/**
 * CardContent - Card content section
 */
export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * CardFooter - Card footer section
 */
export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-[#38383A] ${className}`} {...props}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
