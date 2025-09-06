import React from 'react';

interface ReloadButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

const ReloadButton: React.FC<ReloadButtonProps> = ({ 
  onClick, 
  loading = false, 
  className = '' 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
        bg-white dark:bg-slate-800 
        border border-slate-200 dark:border-slate-700
        text-slate-700 dark:text-slate-300
        hover:bg-slate-50 dark:hover:bg-slate-700
        hover:border-slate-300 dark:hover:border-slate-600
        hover:text-slate-900 dark:hover:text-slate-100
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        focus:ring-offset-white dark:focus:ring-offset-slate-900
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-sm hover:shadow-md
        ${className}
      `}
    >
      <div className="flex items-center space-x-2">
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${loading ? 'animate-spin' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        <span>{loading ? 'Cargando...' : 'Recargar'}</span>
      </div>
    </button>
  );
};

export default ReloadButton;
