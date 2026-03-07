import { useState, useEffect, useMemo } from 'react';

/**
 * Custom Hook - Pagination Logic
 */
export function usePagination(data, itemsPerPage = 10, serverSide = false, totalItems) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = serverSide 
    ? Math.ceil((totalItems || 0) / itemsPerPage)
    : Math.ceil(data.length / itemsPerPage);

  // Reset to page 1 when data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data, totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    if (serverSide) return data;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, serverSide]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  return {
    currentPage,
    totalPages,
    currentPageData: paginatedData,
    startIndex,
    endIndex,
    totalItems: serverSide ? totalItems : data.length,
    goToPage: (page) => setCurrentPage(page),
    nextPage: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
    prevPage: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
    setPage: setCurrentPage,
  };
}

/**
 * Custom Hook - Search/Filter Logic
 */
export function useSearch(data, searchKeys = [], searchTerm) {
  return useMemo(() => {
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase().trim();
    return data.filter(item => {
      if (searchKeys.length === 0) {
        // Search all values
        return Object.values(item).some(val => 
          String(val).toLowerCase().includes(term)
        );
      }
      // Search specific keys
      return searchKeys.some(key => {
        const value = item[key];
        return value && String(value).toLowerCase().includes(term);
      });
    });
  }, [data, searchKeys, searchTerm]);
}

/**
 * Custom Hook - Sort Logic
 */
export function useSort(data, sortConfig) {
  return useMemo(() => {
    if (!sortConfig || !sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const { key, direction } = sortConfig;
    const sorted = [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (direction === 'asc') {
        return aStr.localeCompare(bStr, 'en');
      }
      return bStr.localeCompare(aStr, 'en');
    });

    return direction === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortConfig]);
}
