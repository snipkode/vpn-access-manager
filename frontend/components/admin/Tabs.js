/**
 * Reusable Tabs Component - Responsive
 * @param {Array} tabs - Array of { id, label, icon? } objects
 * @param {string} activeTab - Currently active tab ID
 * @param {function} onTabChange - Callback when tab changes
 * @param {boolean} scrollable - Enable horizontal scroll on mobile (default: true)
 * @param {string} variant - 'default' | 'compact' | 'minimal'
 * @param {string} className - Additional CSS classes
 * @param {function} renderTab - Custom render function for tab content
 */
export default function Tabs({ 
  tabs, 
  activeTab, 
  onTabChange,
  scrollable = true,
  variant = 'default',
  className = '',
  renderTab = null
}) {
  const sizeClasses = {
    default: 'px-4 py-2.5 text-sm font-medium',
    compact: 'px-3 py-2 text-xs font-medium',
    minimal: 'px-2 py-1.5 text-xs font-semibold',
  };

  return (
    <div className={`bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 ${className}`}>
      {/* Mobile: Scrollable with no-wrap | Desktop: Wrap */}
      <div 
        className={`
          flex gap-1
          ${scrollable ? 'overflow-x-auto md:overflow-visible scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400' : 'flex-wrap'}
        `}
        style={{ 
          scrollbarWidth: 'thin',
          msOverflowStyle: 'none'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 min-w-fit
              ${sizeClasses[variant]}
              rounded-lg transition-all whitespace-nowrap
              ${
                activeTab === tab.id
                  ? 'bg-primary text-white dark:bg-primary-600 shadow-md'
                  : 'text-gray-500 hover:bg-gray-100'
              }
            `}
          >
            {renderTab ? renderTab(tab) : (
              <>
                {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
                {tab.label}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
