/**
 * Server-side Pagination Controls
 */

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../../../types/pqncTypes';

interface PQNCPaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PQNCPagination: React.FC<PQNCPaginationProps> = ({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRecords);

  // Generate page numbers to show
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  if (totalRecords === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3
                    border-t border-neutral-200 dark:border-neutral-700
                    bg-neutral-50/50 dark:bg-neutral-800/50">
      {/* Info */}
      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          Mostrando <span className="font-medium text-neutral-700 dark:text-neutral-200">{from}-{to}</span> de{' '}
          <span className="font-medium text-neutral-700 dark:text-neutral-200">{totalRecords.toLocaleString()}</span>
        </span>
        <span className="hidden sm:inline text-neutral-300 dark:text-neutral-600">|</span>
        <div className="hidden sm:flex items-center gap-1.5">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600
                       rounded px-1.5 py-0.5 text-xs text-neutral-700 dark:text-neutral-200
                       focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400
                     hover:bg-neutral-100 dark:hover:bg-neutral-700
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400
                     hover:bg-neutral-100 dark:hover:bg-neutral-700
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-neutral-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-colors
                ${p === page
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400
                     hover:bg-neutral-100 dark:hover:bg-neutral-700
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 rounded-md text-neutral-500 dark:text-neutral-400
                     hover:bg-neutral-100 dark:hover:bg-neutral-700
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PQNCPagination;
