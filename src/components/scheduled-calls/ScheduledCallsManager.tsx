import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, Clock, Eye, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { scheduledCallsService, type ScheduledCall } from '../../services/scheduledCallsService';
import { CalendarSidebar } from './CalendarSidebar';
import { DailyView } from './views/DailyView';
import { WeeklyView } from './views/WeeklyView';
import { ProspectoSidebar } from './ProspectoSidebar';

type ViewMode = 'daily' | 'weekly';

interface ScheduledCallsManagerProps {
  onNavigateToLiveChat?: (prospectoId: string) => void;
}

const ScheduledCallsManager: React.FC<ScheduledCallsManagerProps> = ({ onNavigateToLiveChat }) => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState<ScheduledCall | null>(null);
  const [prospectoSidebarOpen, setProspectoSidebarOpen] = useState(false);
  const [selectedProspectoIdForSidebar, setSelectedProspectoIdForSidebar] = useState<string>('');
  const [calendarWidth, setCalendarWidth] = useState(320);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCalls();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadCalls();
    }
  }, [searchTerm, user?.id]);

  // Actualización automática silenciosa cada 60 segundos
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      loadCallsSilent();
    }, 60000); // 60 segundos
    
    return () => clearInterval(interval);
  }, [user?.id, searchTerm]);

  // Observer para el ancho del calendario
  useEffect(() => {
    if (!calendarRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCalendarWidth(entry.contentRect.width);
      }
    });

    observer.observe(calendarRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const loadCalls = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const filters = {
        search: searchTerm || undefined,
        estatus: 'all' as const
      };
      const data = await scheduledCallsService.getScheduledCalls(user.id, filters);
      setCalls(data);
    } catch (error) {
      console.error('Error loading scheduled calls:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carga silenciosa sin mostrar loading ni causar rerenders visibles
  const loadCallsSilent = async () => {
    if (!user?.id) return;
    
    try {
      const filters = {
        search: searchTerm || undefined,
        estatus: 'all' as const
      };
      const data = await scheduledCallsService.getScheduledCalls(user.id, filters);
      // Actualizar solo si hay cambios reales para evitar rerenders innecesarios
      setCalls(prevCalls => {
        // Comparar por IDs para detectar cambios reales
        const prevIds = new Set(prevCalls.map(c => c.id));
        const newIds = new Set(data.map(c => c.id));
        
        // Si los IDs son diferentes, hay cambios
        if (prevIds.size !== newIds.size || 
            [...prevIds].some(id => !newIds.has(id)) ||
            [...newIds].some(id => !prevIds.has(id))) {
          return data;
        }
        
        // Si los IDs son iguales, comparar contenido
        const hasChanges = prevCalls.some((prevCall, index) => {
          const newCall = data[index];
          if (!newCall) return true;
          return prevCall.estatus !== newCall.estatus ||
                 prevCall.fecha_programada !== newCall.fecha_programada ||
                 prevCall.justificacion_llamada !== newCall.justificacion_llamada;
        });
        
        return hasChanges ? data : prevCalls;
      });
    } catch (error) {
      // Silenciar errores en actualización automática
    }
  };

  // Función para sincronización manual
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadCalls();
    setIsRefreshing(false);
  };

  const statistics = {
    total: calls.length,
    programadas: calls.filter(c => c.estatus === 'programada').length,
    ejecutadas: calls.filter(c => c.estatus === 'ejecutada').length,
    canceladas: calls.filter(c => c.estatus === 'cancelada').length,
    proximas: calls.filter(c => {
      if (c.estatus !== 'programada') return false;
      const callDate = new Date(c.fecha_programada);
      const now = new Date();
      const diffHours = (callDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    }).length
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleNavigateToProspect = (prospectoId: string) => {
    setSelectedProspectoIdForSidebar(prospectoId);
    setProspectoSidebarOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex items-center justify-between mb-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Llamadas Programadas
            </h1>
            <p className="text-sm font-light tracking-wide text-gray-600 dark:text-gray-400 mt-1">
              <span className="font-semibold text-gray-900 dark:text-white">Total: <span className="font-bold">{statistics.total}</span></span>
              <span className="ml-4 font-semibold text-gray-900 dark:text-white">Programadas: <span className="font-bold">{statistics.programadas}</span></span>
              <span className="ml-4 font-semibold text-gray-900 dark:text-white">Ejecutadas: <span className="font-bold">{statistics.ejecutadas}</span></span>
              <span className="ml-4 font-semibold text-gray-900 dark:text-white">Canceladas: <span className="font-bold">{statistics.canceladas}</span></span>
              {statistics.proximas > 0 && (
                <span className="ml-4 font-semibold text-gray-900 dark:text-white">Próximas 24h: <span className="font-bold">{statistics.proximas}</span></span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Botón de sincronización discreto */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sincronizar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* View Mode Selector */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Diaria
                </div>
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'weekly'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Semanal
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content - Flex with Calendar and View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Sidebar - Scrollable */}
        <div ref={calendarRef} className="flex-shrink-0 h-full">
          <CalendarSidebar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            scheduledCalls={calls}
          />
        </div>

        {/* View Area - Fixed, Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .main-content-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="main-content-scroll flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Cargando llamadas programadas...</p>
                </div>
              </div>
            ) : viewMode === 'daily' ? (
              <DailyView
                calls={calls}
                selectedDate={selectedDate}
                onCallClick={setSelectedCall}
                onDateChange={setSelectedDate}
                showNavigation={false}
              />
            ) : (
              <WeeklyView
                calls={calls}
                selectedDate={selectedDate}
                onCallClick={setSelectedCall}
              />
            )}
          </div>

          {/* Navigation Buttons - Fixed, only for daily view */}
          {viewMode === 'daily' && (
            <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3">
              <button
                onClick={handlePreviousDay}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Día anterior"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={handleNextDay}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Día siguiente"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Call Detail Modal */}
      <AnimatePresence>
        {selectedCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
            onClick={() => setSelectedCall(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Detalle de Llamada Programada
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedCall.prospecto_nombre}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Fecha Programada
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(selectedCall.fecha_programada).toLocaleString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Estatus
                    </label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCall.estatus === 'programada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      selectedCall.estatus === 'ejecutada' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      selectedCall.estatus === 'cancelada' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}>
                      {selectedCall.estatus}
                    </span>
                  </div>

                  {selectedCall.justificacion_llamada && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Justificación
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        {selectedCall.justificacion_llamada}
                      </div>
                    </div>
                  )}

                  {(selectedCall.coordinacion_nombre || selectedCall.ejecutivo_nombre) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Asignación
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedCall.coordinacion_nombre && (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm">
                            {selectedCall.coordinacion_nombre}
                          </span>
                        )}
                        {selectedCall.ejecutivo_nombre && (
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                            {selectedCall.ejecutivo_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCall.prospecto_whatsapp && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        WhatsApp
                      </label>
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {selectedCall.prospecto_whatsapp}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    handleNavigateToProspect(selectedCall.prospecto);
                    setSelectedCall(null);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Prospecto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prospect Sidebar */}
      <ProspectoSidebar
        prospectoId={selectedProspectoIdForSidebar}
        isOpen={prospectoSidebarOpen}
        onClose={() => setProspectoSidebarOpen(false)}
        onNavigateToLiveChat={onNavigateToLiveChat}
      />
    </div>
  );
};

export default ScheduledCallsManager;

