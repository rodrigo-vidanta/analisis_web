/**
 * ============================================
 * COMPONENTE BASE: TABS
 * ============================================
 * 
 * Sistema de pestañas homologado con el diseño corporativo.
 * Usa tokens de diseño para colores y animaciones.
 * 
 * Características:
 * - Animación de indicador deslizante
 * - Keyboard navigation (arrows, home, end)
 * - Variantes: default, underline, pills
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_DURATIONS, RADIUS } from '../../styles/tokens';

// ============================================
// TIPOS
// ============================================

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type TabsVariant = 'default' | 'underline' | 'pills';

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: TabsVariant;
  className?: string;
}

// ============================================
// COMPONENTE
// ============================================

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className = '',
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Actualizar posición del indicador cuando cambia el tab activo
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      });
    }
  }, [activeTab, tabs]);

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    // Saltar tabs disabled
    while (tabs[newIndex]?.disabled) {
      if (e.key === 'ArrowLeft' || e.key === 'End') {
        newIndex = newIndex > 0 ? newIndex - 1 : tabs.length - 1;
      } else {
        newIndex = newIndex < tabs.length - 1 ? newIndex + 1 : 0;
      }
    }

    onChange(tabs[newIndex].id);
    tabRefs.current[tabs[newIndex].id]?.focus();
  };

  // Estilos según variante
  const containerStyles = {
    default: 'bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg',
    underline: 'border-b border-neutral-200 dark:border-neutral-700',
    pills: 'space-x-2',
  };

  const getTabStyles = (tab: Tab, isActive: boolean) => {
    switch (variant) {
      case 'default':
        return `
          px-4 py-2 rounded-md text-sm font-medium transition-all
          ${isActive 
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `;
      
      case 'underline':
        return `
          px-4 py-2 text-sm font-medium transition-all relative
          ${isActive 
            ? 'text-primary-600 dark:text-primary-400' 
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `;
      
      case 'pills':
        return `
          px-4 py-2 rounded-full text-sm font-medium transition-all
          ${isActive 
            ? 'bg-primary-500 text-white shadow-sm' 
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }
          ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `;
      
      default:
        return '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`flex ${containerStyles[variant]}`}
        role="tablist"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[tab.id] = el)}
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-disabled={tab.disabled}
            tabIndex={tab.id === activeTab ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={getTabStyles(tab, tab.id === activeTab)}
          >
            {tab.icon && (
              <span className="mr-2 inline-flex">
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        ))}

        {/* Indicador deslizante (solo para variant underline) */}
        {variant === 'underline' && (
          <motion.div
            className="absolute bottom-0 h-0.5 bg-primary-500"
            initial={false}
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Tabs;

