import { useState, useMemo } from 'react';
import { usePagination, useSearch, useSort } from './hooks/usePagination.js';

/**
 * Table Skeleton Loader
 */
function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="py-4 px-4">
              <div className="h-4 bg-gray-200 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/**
 * Reusable Pagination Component
 */
function Pagination({ currentPage, totalPages, onPageChange, totalItems, startIndex, endIndex }) {
  if (totalPages <= 1) return null;

  // Smart pagination - show limited range for many pages
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift('...');
    if (currentPage + delta < totalPages - 1) range.push('...');
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-500">
          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
          <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          {pageNumbers.map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-w-[40px] ${
                  page === currentPage
                    ? 'bg-primary text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Empty State Component
 */
function EmptyState({ colSpan, icon = '📭', message = 'No data found' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="text-gray-400">
          <span className="text-4xl mb-2 block">{icon}</span>
          <div className="text-sm font-medium">{message}</div>
        </div>
      </td>
    </tr>
  );
}

/**
 * Search Input Component
 */
function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`p-4 border-b border-gray-100 bg-white ${className}`}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Sort Icon Component
 */
function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg className="w-3 h-3 ml-1 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
      </svg>
    );
  }
  return direction === 'asc' ? (
    <svg className="w-3 h-3 ml-1 text-primary" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414 6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-3 h-3 ml-1 text-primary" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 13.586 12.293 10.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

/**
 * Bulk Actions Bar
 */
function BulkActionsBar({ selectedCount, actions, onClear }) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between">
      <div className="text-sm text-blue-700">
        <span className="font-semibold">{selectedCount}</span> item(s) selected
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${action.className || 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * Mobile Card View - Compact Design
 */
function MobileCardView({ data, columns, renderCard, onRowClick }) {
  if (renderCard) {
    return (
      <div className="space-y-2 p-3">
        {data.map((item, index) => (
          <div key={item.id || index} onClick={() => onRowClick?.(item)}>
            {renderCard(item)}
          </div>
        ))}
      </div>
    );
  }

  // Default compact card render
  return (
    <div className="space-y-2 p-3">
      {data.map((item, index) => (
        <div
          key={item.id || index}
          className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
          onClick={() => onRowClick?.(item)}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              {columns.slice(0, 2).map((column) => (
                <div key={column.key} className="mb-1.5 last:mb-0">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    {column.label}
                  </div>
                  <div className="text-sm font-medium text-dark truncate">
                    {column.render ? column.render(item) : item[column.key]}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end gap-2">
              {columns.slice(2).map((column) => (
                <div key={column.key}>
                  {column.render ? column.render(item) : item[column.key]}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Responsive Table Wrapper
 */
function ResponsiveTableWrapper({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="min-w-full">
        {children}
      </div>
    </div>
  );
}

/**
 * Enhanced DataTable Component with Pagination, Search, Sort & Bulk Actions
 * 
 * @param {Array} columns - Column definitions: [{ key, label, className, render, sortable }]
 * @param {Array} data - Array of data objects
 * @param {number} itemsPerPage - Items per page (default: 10)
 * @param {string} emptyMessage - Message when no data
 * @param {string} emptyIcon - Icon for empty state
 * @param {ReactNode} headerContent - Optional content above table
 * @param {boolean} searchable - Enable search functionality
 * @param {Array} searchKeys - Specific keys to search (or all if empty)
 * @param {string} searchPlaceholder - Search input placeholder
 * @param {boolean} sortable - Enable column sorting
 * @param {boolean} serverSide - Enable server-side pagination
 * @param {number} totalItems - Total items from server (for serverSide)
 * @param {boolean} loading - Loading state
 * @param {Array} bulkActions - Bulk action buttons: [{ label, action, className }]
 * @param {boolean} mobileCardView - Show cards instead of table on mobile
 * @param {Function} renderCard - Custom card renderer for mobile
 * @param {Function} onRowClick - Callback when row/card is clicked
 * @param {Function} onSearch - Server-side search callback
 * @param {Function} onSort - Server-side sort callback
 * @param {Function} onPageChange - Server-side page change callback
 */
export default function DataTable({
  columns,
  data = [],
  itemsPerPage = 10,
  emptyMessage = 'No data found',
  emptyIcon = '📭',
  headerContent = null,
  searchable = false,
  searchKeys = [],
  searchPlaceholder = 'Search...',
  sortable = false,
  serverSide = false,
  totalItems,
  loading = false,
  bulkActions = [],
  mobileCardView = false,
  renderCard = null,
  onRowClick = null,
  onSearch,
  onSort,
  onPageChange,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Client-side search
  const searchedData = useSearch(data, searchKeys, searchTerm);
  
  // Client-side sort
  const sortedData = useSort(searchedData, sortable ? sortConfig : null);

  // Pagination
  const pagination = usePagination(sortedData, itemsPerPage, serverSide, totalItems);

  // Handle search change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  // Handle sort
  const handleSort = (key) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    onSort?.(key, direction);
  };

  // Handle row selection for bulk actions
  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === pagination.currentPageData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pagination.currentPageData.map(item => item.id)));
    }
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {headerContent}
        <ResponsiveTableWrapper>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {columns.map((column) => (
                  <th key={column.key} className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <TableSkeleton rows={5} columns={columns.length} />
          </table>
        </ResponsiveTableWrapper>
      </div>
    );
  }

  // Mobile card view - always use cards on mobile via CSS
  const showMobileView = mobileCardView;

  if (showMobileView) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {headerContent}
        {bulkActions.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedRows.size}
            actions={bulkActions}
            onClear={() => setSelectedRows(new Set())}
          />
        )}
        {searchable && (
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
        {pagination.currentPageData.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <span className="text-4xl mb-2 block">{emptyIcon}</span>
            <div className="text-sm font-medium">{emptyMessage}</div>
          </div>
        ) : (
          <MobileCardView
            data={pagination.currentPageData}
            columns={columns}
            renderCard={renderCard}
            onRowClick={onRowClick}
          />
        )}
        <Pagination {...pagination} onPageChange={pagination.goToPage} />
      </div>
    );
  }

  // Desktop table view with responsive wrapper
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {headerContent}

      {bulkActions.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedRows.size}
          actions={bulkActions}
          onClear={() => setSelectedRows(new Set())}
        />
      )}

      {searchable && (
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={searchPlaceholder}
        />
      )}

      <ResponsiveTableWrapper>
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {bulkActions.length > 0 && (
                <th className="py-4 px-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === pagination.currentPageData.length && pagination.currentPageData.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                    column.className || ''
                  } ${sortable && column.sortable !== false ? 'cursor-pointer hover:text-gray-600' : ''}`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {sortable && column.sortable !== false && <SortIcon direction={sortConfig.key === column.key ? sortConfig.direction : null} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagination.currentPageData.length === 0 ? (
              <EmptyState
                colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)}
                icon={emptyIcon}
                message={emptyMessage}
              />
            ) : (
              pagination.currentPageData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedRows.has(row.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {bulkActions.length > 0 && (
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`py-4 px-4 ${column.className || ''}`}
                      onClick={() => column.key === 'actions' ? null : onRowClick?.(row)}
                    >
                      {column.render
                        ? column.render(row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTableWrapper>

      <Pagination {...pagination} onPageChange={pagination.goToPage} />
    </div>
  );
}
