import React, { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex h-screen">
        
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 bg-slate-50 dark:bg-gray-800 border-r border-gray-200/50 dark:border-gray-700/50`}>
          <LinearSidebar 
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <LinearHeader
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            currentMode={currentMode}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Content */}
          <main className="flex-1 overflow-auto bg-slate-100 dark:bg-gray-900">
            <div className="h-full">
              {children}
            </div>
          </main>

          {/* Footer */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinearLayout;
