/**
 * Pagination Component
 * Reusable pagination controls for tables
 */

export function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  size = 'md'
}) {
  if (totalPages <= 1) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
      {showItemsPerPage && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange?.(parseInt(e.target.value))}
            className={`border border-gray-300 rounded-lg ${sizeClasses[size]} focus:ring-2 focus:ring-primary focus:border-transparent`}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600">entries</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} ({totalItems} items)
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`${sizeClasses[size]} rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="First page"
        >
          ⏮️
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${sizeClasses[size]} rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Previous page"
        >
          ◀️
        </button>

        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className={`${sizeClasses[size]} text-gray-400`}
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`${sizeClasses[size]} rounded-lg border transition-colors ${
                page === currentPage
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${sizeClasses[size]} rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Next page"
        >
          ▶️
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`${sizeClasses[size]} rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          title="Last page"
        >
          ⏭️
        </button>
      </div>
    </div>
  );
}

/**
 * Search Input Component
 */
export function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  size = 'md',
  className = ''
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base'
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${sizeClasses[size]} pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Table Header with Sort
 */
export function SortableHeader({ column, sortConfig, onSort, className = '' }) {
  const isSorted = sortConfig?.key === column.key;
  const sortDirection = sortConfig?.direction;

  const baseClasses = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase";
  const sortableClasses = column.sortable 
    ? "cursor-pointer hover:bg-gray-100 transition-colors" 
    : "";

  if (!column.sortable) {
    return (
      <th className={`${baseClasses} ${className}`}>
        {column.label}
      </th>
    );
  }

  return (
    <th
      className={`${baseClasses} ${sortableClasses} ${className}`}
      onClick={() => onSort(column.key)}
    >
      <div className="flex items-center gap-1">
        {column.label}
        <span className={`transition-opacity ${isSorted ? 'opacity-100' : 'opacity-30'}`}>
          {isSorted && sortDirection === 'desc' ? '🔽' : '🔼'}
        </span>
      </div>
    </th>
  );
}

/**
 * Empty State Component
 */
export function EmptyState({ icon = '📦', message, description }) {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="text-4xl mb-2">{icon}</div>
      {message && <p className="font-medium">{message}</p>}
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}
