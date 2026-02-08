import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LinearSidebar from './LinearSidebar';
import LinearHeader from './LinearHeader';
import Footer from '../Footer';

interface LinearLayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentMode: string;
}

const LinearLayout: React.FC<LinearLayoutProps> = ({
  children,
  darkMode,
  onToggleDarkMode,
  currentMode
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousDarkMode = useRef(darkMode);

  // Detectar cambio de tema y activar animación
  useEffect(() => {
    if (previousDarkMode.current !== darkMode) {
      setIsTransitioning(true);
      previousDarkMode.current = darkMode;
      
      // Desactivar después de la animación
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
      
      return () => clearTimeout(timer);
    }
  }, [darkMode]);

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-500 ease-in-out">
      
      {/* Overlay de transición con efecto de onda */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Círculo expansivo desde el centro superior derecho */}
            <motion.div
              className={`absolute rounded-full ${
                darkMode 
                  ? 'bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900' 
                  : 'bg-gradient-to-br from-yellow-200 via-white to-orange-100'
              }`}
              style={{ 
                top: '32px', 
                right: '120px',
                transformOrigin: 'center'
              }}
              initial={{ 
                width: 0, 
                height: 0,
                opacity: 0.8
              }}
              animate={{ 
                width: '300vmax', 
                height: '300vmax',
                x: '-50%',
                y: '-50%',
                opacity: [0.8, 0.6, 0]
              }}
              transition={{ 
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1]
              }}
            />

            {/* Partículas decorativas */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-2 h-2 rounded-full ${
                  darkMode ? 'bg-indigo-400' : 'bg-yellow-400'
                }`}
                style={{
                  top: '32px',
                  right: '120px',
                }}
                initial={{ 
                  scale: 0,
                  opacity: 1
                }}
                animate={{ 
                  scale: [0, 1.5, 0],
                  opacity: [1, 0.8, 0],
                  x: Math.cos((i * 30) * Math.PI / 180) * 100,
                  y: Math.sin((i * 30) * Math.PI / 180) * 100,
                }}
                transition={{ 
                  duration: 0.5,
                  delay: i * 0.02,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-screen">
        
        {/* Sidebar con transición suave */}
        <motion.div 
          className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-50 dark:bg-gray-800 border-r border-gray-200/50 dark:border-gray-700/50`}
          animate={{ 
            width: sidebarCollapsed ? 64 : 256,
            backgroundColor: darkMode ? 'rgb(31, 41, 55)' : 'rgb(248, 250, 252)'
          }}
          transition={{ 
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <LinearSidebar 
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <LinearHeader
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            currentMode={currentMode}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Content con transición */}
          <motion.main 
            className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900"
            animate={{
              backgroundColor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(241, 245, 249)'
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-full">
              {children}
            </div>
          </motion.main>

          {/* Footer */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 transition-colors duration-500">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinearLayout;
