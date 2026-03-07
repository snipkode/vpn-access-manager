import PropTypes from 'prop-types';
import Button from './Button';

/**
 * EmptyState - Empty state component for lists and tables
 * 
 * @param {string} icon - Icon (emoji)
 * @param {string} title - Title text
 * @param {string} description - Description text
 * @param {node} action - Action button/component
 * @param {string} className - Additional classes
 * 
 * @example
 * <EmptyState 
 *   icon="📭"
 *   title="No items yet"
 *   description="Items you add will appear here"
 *   action={<Button>Add Item</Button>}
 * />
 */
export default function EmptyState({ 
  icon = '📭',
  title,
  description,
  action,
  className = '',
  ...props 
}) {
  return (
    <div 
      className={`
        bg-[#F2F2F7] dark:bg-[#1C1C1E] 
        rounded-2xl p-8 sm:p-12 
        text-center
        ${className}
      `}
      {...props}
    >
      {/* Icon */}
      <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">
        {icon}
      </div>
      
      {/* Title */}
      {title && (
        <h3 className="text-[15px] sm:text-[17px] font-semibold text-dark dark:text-white mb-1 tracking-tight">
          {title}
        </h3>
      )}
      
      {/* Description */}
      {description && (
        <p className="text-[13px] sm:text-sm text-gray-400 dark:text-gray-500 font-medium mb-4 sm:mb-6">
          {description}
        </p>
      )}
      
      {/* Action */}
      {action && (
        <div className="flex justify-center gap-2 sm:gap-3">
          {action}
        </div>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
};

/**
 * EmptyState with Button Helper
 */
export function EmptyStateWithButton({ 
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonVariant = 'primary',
  buttonSize = 'medium',
  ...props 
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        <Button 
          variant={buttonVariant}
          size={buttonSize}
          onClick={onButtonClick}
        >
          {buttonText}
        </Button>
      }
      {...props}
    />
  );
}

EmptyState.WithButton = EmptyStateWithButton;
