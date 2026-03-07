import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Tabs - Responsive tab component with mobile optimization
 *
 * @param {array} items - Tab items [{id, label, icon?}]
 * @param {string} activeTab - Active tab ID
 * @param {function} onChange - Tab change handler
 * @param {string} variant - Tab variant (default, pills, underline)
 * @param {string} size - Tab size (small, medium, large)
 * @param {string} className - Additional classes
 *
 * @example
 * <Tabs
 *   items={[{id: 'all', label: 'All'}, {id: 'pending', label: 'Pending'}]}
 *   activeTab={activeTab}
 *   onChange={setActiveTab}
 * />
 */
export default function Tabs({
  items,
  activeTab,
  onChange,
  variant = 'default',
  size = 'medium',
  className = '',
  scrollable = true,
  ...props
}) {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);

  // Auto-scroll to active tab on change
  useEffect(() => {
    if (scrollable && scrollContainerRef.current && activeTabRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeTabRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      // Center the active tab
      const scrollLeft = activeTab.offsetLeft - (containerRect.width / 2) + (tabRect.width / 2);
      
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [activeTab, scrollable]);

  // Size configurations
  const sizeConfig = {
    small: {
      tab: 'px-3 sm:px-4 py-2.5 sm:py-2 text-[12px] sm:text-[13px]',
      gap: 'gap-1.5 sm:gap-2',
      radius: 'rounded-xl',
      min_width: 'min-w-fit',
    },
    medium: {
      tab: 'px-4 sm:px-5 py-2.5 sm:py-3 text-[13px] sm:text-[14px]',
      gap: 'gap-2',
      radius: 'rounded-xl',
      min_width: 'min-w-fit',
    },
    large: {
      tab: 'px-5 sm:px-6 py-3 sm:py-3.5 text-[14px] sm:text-[15px]',
      gap: 'gap-2',
      radius: 'rounded-2xl',
      min_width: 'min-w-fit',
    },
  };

  // Variant configurations
  const variantConfig = {
    default: {
      container: 'bg-gray-100/80 dark:bg-[#2C2C2E]/80 backdrop-blur-sm p-1 rounded-xl',
      active: 'bg-white dark:bg-[#1C1C1E] text-dark dark:text-white shadow-sm shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
      inactive: 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-[#38383A]/50',
    },
    pills: {
      container: 'bg-transparent',
      active: 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25',
      inactive: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2E]',
    },
    underline: {
      container: 'bg-transparent border-b border-gray-200 dark:border-[#38383A] p-0',
      active: 'text-[#007AFF] border-b-2 border-[#007AFF]',
      inactive: 'text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-dark dark:hover:text-white',
    },
  };

  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];

  return (
    <div
      ref={scrollContainerRef}
      className={`
        ${variants.container}
        ${sizes.gap}
        ${className}
        flex items-center
        ${scrollable ? 'overflow-x-auto overflow-y-hidden scrollbar-hide' : 'overflow-hidden'}
        ${sizes.min_width}
        scroll-smooth
        flex-nowrap
      `}
      style={{
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.id}
          ref={activeTab === item.id ? activeTabRef : null}
          onClick={() => onChange(item.id)}
          className={`
            flex items-center gap-1.5 sm:gap-2
            font-semibold
            whitespace-nowrap
            flex-shrink-0
            transition-all duration-200 ease-out
            ${sizes.tab}
            ${variant !== 'underline' ? sizes.radius : ''}
            ${activeTab === item.id ? variants.active : variants.inactive}
            ${scrollable ? 'first:ml-1 last:mr-1' : ''}
            active:scale-[0.98]
          `}
        >
          {item.icon && (
            <span className="flex-shrink-0">
              {item.icon}
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

Tabs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['default', 'pills', 'underline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};

/**
 * Tabs Content - Content area for tabs
 */
export function TabsContent({ activeTab, value, children, className = '', ...props }) {
  if (activeTab !== value) return null;

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

Tabs.Content = TabsContent;
