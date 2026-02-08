import { motion } from 'framer-motion';
import { Construction, Sparkles } from 'lucide-react';
import type { MediaTabId } from './types';
import { MEDIA_TABS } from './constants';

interface UnderConstructionTabProps {
  tabId: MediaTabId;
}

function UnderConstructionTab({ tabId }: UnderConstructionTabProps) {
  const tab = MEDIA_TABS.find(t => t.id === tabId);
  const TabIcon = tab?.icon || Construction;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-sm"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 mb-6 shadow-lg"
        >
          <TabIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </motion.div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Proximamente
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          {tab?.description || 'Estamos trabajando en esta funcionalidad.'}
        </p>

        {/* Decorative badge */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full border border-blue-100 dark:border-blue-800/30"
        >
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            En desarrollo
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export { UnderConstructionTab };
