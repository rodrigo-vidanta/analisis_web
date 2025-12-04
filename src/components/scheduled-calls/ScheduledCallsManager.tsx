import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { scheduledCallsService, type ScheduledCall } from '../../services/scheduledCallsService';
import { CalendarSidebar } from './CalendarSidebar';
import { DailyView } from './views/DailyView';
import { WeeklyView } from './views/WeeklyView';
import { ProspectoSidebar } from '../prospectos/ProspectosManager';
import { ManualCallModal } from '../shared/ManualCallModal';
import { analysisSupabase } from '../../config/analysisSupabase';

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
  const [prospectoSidebarOpen, setProspectoSidebarOpen] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCallForSchedule, setSelectedCallForSchedule] = useState<ScheduledCall | null>(null);
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

  const handleNavigateToProspect = async (prospectoId: string) => {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', prospectoId)
        .single();
      
      if (error) {
        console.error('Error cargando prospecto:', error);
        return;
      }
      
      setSelectedProspecto(data);
      setProspectoSidebarOpen(true);
    } catch (error) {
      console.error('Error cargando prospecto:', error);
    }
  };

  const handleOpenScheduleModal = (call: ScheduledCall) => {
    setSelectedCallForSchedule(call);
    setShowScheduleModal(true);
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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Total: <span className="font-bold">{statistics.total}</span></span>
              <span className="ml-3 font-semibold text-slate-700 dark:text-slate-300">Programadas: <span className="font-bold">{statistics.programadas}</span></span>
              <span className="ml-3 font-semibold text-slate-700 dark:text-slate-300">Ejecutadas: <span className="font-bold">{statistics.ejecutadas}</span></span>
              <span className="ml-3 font-semibold text-slate-700 dark:text-slate-300">Canceladas: <span className="font-bold">{statistics.canceladas}</span></span>
              {statistics.proximas > 0 && (
                <span className="ml-3 font-semibold text-slate-700 dark:text-slate-300">Próximas 24h: <span className="font-bold">{statistics.proximas}</span></span>
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
                onCallClick={handleOpenScheduleModal}
                onProspectClick={handleNavigateToProspect}
                onDateChange={setSelectedDate}
                showNavigation={false}
              />
            ) : (
              <WeeklyView
                calls={calls}
                selectedDate={selectedDate}
                onCallClick={handleOpenScheduleModal}
                onProspectClick={handleNavigateToProspect}
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

      {/* Modal de Programar/Reprogramar Llamada */}
      {selectedCallForSchedule && (
        <ManualCallModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedCallForSchedule(null);
          }}
          prospectoId={selectedCallForSchedule.prospecto}
          prospectoNombre={selectedCallForSchedule.prospecto_nombre}
          onSuccess={() => {
            loadCalls();
            setShowScheduleModal(false);
            setSelectedCallForSchedule(null);
          }}
        />
      )}

      {/* Prospect Sidebar */}
      <ProspectoSidebar
        prospecto={selectedProspecto}
        isOpen={prospectoSidebarOpen}
        onClose={() => {
          setProspectoSidebarOpen(false);
          setSelectedProspecto(null);
        }}
        onNavigateToLiveChat={onNavigateToLiveChat}
      />
    </div>
  );
};

export default ScheduledCallsManager;

