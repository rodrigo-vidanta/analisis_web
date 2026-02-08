import { motion } from 'framer-motion';
import { MEDIA_TABS } from './constants';
import type { MediaSidebarProps } from './types';

function MediaSidebar({ activeTab, onTabChange }: MediaSidebarProps) {
  return (
    <div className="w-52 flex-shrink-0 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col py-4">
      {/* Header */}
      <div className="px-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Multimedia
        </h3>
      </div>

      {/* Tab items */}
      <nav className="flex-1 space-y-1 px-2">
        {MEDIA_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : tab.available
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
                    : 'text-gray-400 dark:text-gray-600 hover:bg-white/40 dark:hover:bg-gray-800/40'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <TabIcon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                isActive
                  ? 'text-blue-500'
                  : tab.available
                    ? 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    : 'text-gray-300 dark:text-gray-600'
              }`} />

              <span className={`text-sm font-medium truncate ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : tab.available
                    ? ''
                    : 'text-gray-400 dark:text-gray-600'
              }`}>
                {tab.label}
              </span>

              {/* "Pronto" badge for unavailable tabs */}
              {!tab.available && (
                <span className="ml-auto text-[10px] font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                  Pronto
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export { MediaSidebar };
