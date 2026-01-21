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
 * - Verificación de permisos por widget (v2.2.0)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';
import { ProspectosNuevosWidget } from './widgets/ProspectosNuevosWidget';
import { ConversacionesWidget } from './widgets/ConversacionesWidget';
import { LlamadasActivasWidget } from './widgets/LlamadasActivasWidget';
import { LlamadasProgramadasWidget } from './widgets/LlamadasProgramadasWidget';
import { DashboardConfigModal } from './DashboardConfigModal';

// ============================================
// MAPEO DE PERMISOS POR WIDGET
// ============================================
// Define qué módulo/acción se requiere para ver cada widget
// Esto permite control granular desde el sistema de permisos

interface WidgetPermissionConfig {
  moduleId: string;  // ID del módulo asociado
  fallbackRoles?: string[];  // Roles que siempre tienen acceso (retrocompatibilidad)
}

const WIDGET_PERMISSIONS: Record<string, WidgetPermissionConfig> = {
  'prospectos': {
    moduleId: 'prospectos',
    fallbackRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo']
  },
  'conversaciones': {
    moduleId: 'live-chat',
    fallbackRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo']
  },
  'llamadas-activas': {
    moduleId: 'live-monitor',
    fallbackRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo', 'evaluador']
  },
  'llamadas-programadas': {
    moduleId: 'scheduled-calls',
    fallbackRoles: ['admin', 'administrador_operativo', 'coordinador', 'ejecutivo']
  }
};

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
  { id: 'prospectos', title: 'Prospectos Nuevos', visible: true, size: 'double-vertical', order: 0 },
  { id: 'conversaciones', title: 'Últimas Conversaciones', visible: true, size: 'double-vertical', order: 1 },
  { id: 'llamadas-activas', title: 'Llamadas Activas', visible: true, size: 'double-horizontal', order: 2 },
  { id: 'llamadas-programadas', title: 'Llamadas Programadas', visible: true, size: 'double-horizontal', order: 3 },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const OperativeDashboard: React.FC = () => {
  const { user, canAccessModule } = useAuth();
  
  // ============================================
  // MODO NINJA: Usar usuario efectivo para filtros de widgets
  // ============================================
  const { isNinjaMode, effectiveUser } = useNinjaAwarePermissions();
  const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id;
  
  // Configuración fija - siempre usar DEFAULT_WIDGETS
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Escuchar evento para abrir modal de configuración desde el header
  useEffect(() => {
    const handleOpenConfig = () => {
      setShowConfigModal(true);
    };
    window.addEventListener('open-dashboard-config', handleOpenConfig);
    return () => {
      window.removeEventListener('open-dashboard-config', handleOpenConfig);
    };
  }, []);

  // ============================================
  // VERIFICACIÓN DE PERMISOS POR WIDGET
  // ============================================
  // Determina si el usuario actual puede ver un widget específico
  // Primero verifica permisos del nuevo sistema, si no, usa fallback por rol
  
  const canViewWidget = useMemo(() => {
    const checkPermission = (widgetId: string): boolean => {
      const permConfig = WIDGET_PERMISSIONS[widgetId];
      if (!permConfig) return true; // Sin configuración = visible para todos
      
      // Verificar acceso al módulo asociado usando el sistema existente
      const hasModuleAccess = canAccessModule(permConfig.moduleId);
      if (hasModuleAccess) return true;
      
      // Fallback: verificar por rol (retrocompatibilidad)
      if (permConfig.fallbackRoles && user?.role_name) {
        return permConfig.fallbackRoles.includes(user.role_name);
      }
      
      return false;
    };

    // Crear mapa de permisos para cada widget
    return new Map<string, boolean>(
      DEFAULT_WIDGETS.map(w => [w.id, checkPermission(w.id)])
    );
  }, [user?.role_name, canAccessModule]);

  // Widgets visibles ordenados - ahora también filtra por permisos
  const visibleWidgets = useMemo(() => {
    return widgets
      .filter(w => w.visible && canViewWidget.get(w.id) !== false)
      .sort((a, b) => a.order - b.order);
  }, [widgets, canViewWidget]);

  // Actualizar configuración de widget (solo visibilidad, tamaño es fijo)
  const updateWidgetConfig = (widgetId: WidgetType, updates: Partial<WidgetConfig>) => {
    // No permitir cambios de tamaño, solo visibilidad y orden
    const allowedUpdates = { ...updates };
    if ('size' in allowedUpdates) {
      delete allowedUpdates.size; // Ignorar cambios de tamaño
    }
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, ...allowedUpdates } : w
    ));
  };

  // Toggle visibilidad de widget
  const toggleWidgetVisibility = (widgetId: WidgetType) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
  };

  // Cambiar tamaño de widget (deshabilitado - configuración fija)
  const changeWidgetSize = (widgetId: WidgetType, newSize: WidgetConfig['size']) => {
    // No hacer nada - configuración fija
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
      {/* Header - Botón movido al Header global */}

      {/* Contenido - Cuadrícula responsiva */}
      <div className="flex-1 p-4 md:p-6 min-h-0 overflow-hidden">
        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full lg:grid-cols-[1.625fr_1.625fr_0.75fr_0.75fr]" 
          style={{ 
            gridAutoRows: 'minmax(0, 1fr)'
          }}
        >
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
                {/* ⚠️ MODO NINJA: Pasar queryUserId para filtrar datos según usuario suplantado */}
                {widget.id === 'prospectos' && (
                  <ProspectosNuevosWidget userId={queryUserId} />
                )}
                {widget.id === 'conversaciones' && (
                  <ConversacionesWidget userId={queryUserId} />
                )}
                {widget.id === 'llamadas-activas' && (
                  <LlamadasActivasWidget userId={queryUserId} />
                )}
                {widget.id === 'llamadas-programadas' && (
                  <LlamadasProgramadasWidget userId={queryUserId} />
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

