/**
 * ============================================
 * DASHBOARD OPERATIVO
 * ============================================
 * 
 * Dashboard centralizado con 4 módulos principales:
 * 1. Prospectos Nuevos
 * 2. Últimas Conversaciones
 * 3. Llamadas Activas
 * 4. Llamadas Programadas
 * 
 * Características:
 * - Cuadrícula responsiva configurable
 * - Sistema de preferencias en localStorage
 * - Suscripciones realtime
 * - Modales reutilizados de módulos existentes
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ProspectosNuevosWidget } from './widgets/ProspectosNuevosWidget';
import { ConversacionesWidget } from './widgets/ConversacionesWidget';
import { LlamadasActivasWidget } from './widgets/LlamadasActivasWidget';
import { LlamadasProgramadasWidget } from './widgets/LlamadasProgramadasWidget';
import { DashboardConfigModal } from './DashboardConfigModal';

// ============================================
// TIPOS E INTERFACES
// ============================================

export type WidgetType = 'prospectos' | 'conversaciones' | 'llamadas-activas' | 'llamadas-programadas';

export interface WidgetConfig {
  id: WidgetType;
  title: string;
  visible: boolean;
  size: 'normal' | 'double-horizontal' | 'double-vertical';
  order: number;
}

export type { WidgetConfig };

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'prospectos', title: 'Prospectos Nuevos', visible: true, size: 'normal', order: 0 },
  { id: 'conversaciones', title: 'Últimas Conversaciones', visible: true, size: 'normal', order: 1 },
  { id: 'llamadas-activas', title: 'Llamadas Activas', visible: true, size: 'normal', order: 2 },
  { id: 'llamadas-programadas', title: 'Llamadas Programadas', visible: true, size: 'normal', order: 3 },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const OperativeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Cargar preferencias desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('operative-dashboard-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWidgets(parsed);
      } catch (error) {
        console.error('Error cargando configuración del dashboard:', error);
      }
    }
  }, []);

  // Guardar preferencias en localStorage
  useEffect(() => {
    localStorage.setItem('operative-dashboard-config', JSON.stringify(widgets));
  }, [widgets]);

  // Widgets visibles ordenados
  const visibleWidgets = useMemo(() => {
    return widgets
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order);
  }, [widgets]);

  // Actualizar configuración de widget
  const updateWidgetConfig = (widgetId: WidgetType, updates: Partial<WidgetConfig>) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    ));
  };

  // Toggle visibilidad de widget
  const toggleWidgetVisibility = (widgetId: WidgetType) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
  };

  // Cambiar tamaño de widget
  const changeWidgetSize = (widgetId: WidgetType, newSize: WidgetConfig['size']) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, size: newSize } : w
    ));
  };

  // Calcular clases de grid según tamaño
  const getGridClasses = (size: WidgetConfig['size']) => {
    switch (size) {
      case 'double-horizontal':
        return 'col-span-2';
      case 'double-vertical':
        return 'col-span-1 row-span-2';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div className="w-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden" style={{ height: 'calc(100vh - 128px)', maxHeight: 'calc(100vh - 128px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Operativo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Vista centralizada de prospectos, conversaciones y llamadas
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Configurar</span>
        </motion.button>
      </div>

      {/* Contenido - Cuadrícula responsiva */}
      <div className="flex-1 p-4 md:p-6 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
          <AnimatePresence mode="popLayout">
            {visibleWidgets.map((widget, index) => (
              <motion.div
                key={widget.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={getGridClasses(widget.size)}
              >
                {widget.id === 'prospectos' && (
                  <ProspectosNuevosWidget userId={user?.id} />
                )}
                {widget.id === 'conversaciones' && (
                  <ConversacionesWidget userId={user?.id} />
                )}
                {widget.id === 'llamadas-activas' && (
                  <LlamadasActivasWidget userId={user?.id} />
                )}
                {widget.id === 'llamadas-programadas' && (
                  <LlamadasProgramadasWidget userId={user?.id} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal de Configuración */}
      <DashboardConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        widgets={widgets}
        onUpdateWidget={updateWidgetConfig}
        onToggleVisibility={toggleWidgetVisibility}
        onChangeSize={changeWidgetSize}
      />
    </div>
  );
};

