import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';
import { scheduledCallsService, type ScheduledCall } from '../../services/scheduledCallsService';
import { CalendarSidebar } from './CalendarSidebar';
import { DailyView } from './views/DailyView';
import { WeeklyView } from './views/WeeklyView';
import { ProspectoSidebar } from '../prospectos/ProspectosManager';
import { CallDetailModalSidebar } from '../chat/CallDetailModalSidebar';
import { createPortal } from 'react-dom';
import { ManualCallModal } from '../shared/ManualCallModal';
import { analysisSupabase } from '../../config/analysisSupabase';
import { classifyCallStatus, type CallStatusGranular } from '../../services/callStatusClassifier';
import toast from 'react-hot-toast';

type ViewMode = 'daily' | 'weekly';

interface ScheduledCallsManagerProps {
  onNavigateToLiveChat?: (prospectoId: string) => void;
}

const ScheduledCallsManager: React.FC<ScheduledCallsManagerProps> = ({ onNavigateToLiveChat }) => {
  const { user } = useAuth();
  
  // ============================================
  // MODO NINJA: Usar usuario efectivo para filtros
  // ============================================
  const { isNinjaMode, effectiveUser } = useNinjaAwarePermissions();
  const queryUserId = isNinjaMode && effectiveUser ? effectiveUser.id : user?.id;
  
  // ============================================
  // ESTADO OPTIMIZADO: Separar counts del calendario de las llamadas del día
  // ============================================
  const [dayCalls, setDayCalls] = useState<ScheduledCall[]>([]); // Llamadas del día seleccionado
  const [calendarCounts, setCalendarCounts] = useState<Record<string, { total: number; programadas: number; ejecutadas: number }>>({}); // Counts para calendario
  const [currentMonth, setCurrentMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [prospectoSidebarOpen, setProspectoSidebarOpen] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCallForSchedule, setSelectedCallForSchedule] = useState<ScheduledCall | null>(null);
  const [selectedProspectoIdDynamics, setSelectedProspectoIdDynamics] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Estados para el modal de detalle de llamada
  const [callDetailModalOpen, setCallDetailModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // ============================================
  // CARGA INICIAL: Counts del mes + llamadas del día actual
  // ============================================
  const initialLoadDone = useRef(false);
  
  useEffect(() => {
    if (queryUserId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      loadCalendarCounts(currentMonth.year, currentMonth.month);
      loadDayCalls(selectedDate);
    }
  }, [queryUserId]);

  // Cuando cambia el día seleccionado o el modo de vista, cargar llamadas
  const prevSelectedDate = useRef(selectedDate);
  const prevViewMode = useRef(viewMode);
  
  useEffect(() => {
    if (!queryUserId || !initialLoadDone.current) return;
    
    // Solo recargar si realmente cambió la fecha o el modo
    const dateChanged = prevSelectedDate.current.getTime() !== selectedDate.getTime();
    const modeChanged = prevViewMode.current !== viewMode;
    
    if (dateChanged || modeChanged) {
      prevSelectedDate.current = selectedDate;
      prevViewMode.current = viewMode;
      loadDayCalls(selectedDate);
    }
  }, [selectedDate, viewMode, queryUserId]);

  // Cuando cambia el searchTerm, recargar las llamadas
  const prevSearchTerm = useRef(searchTerm);
  
  useEffect(() => {
    if (!queryUserId || !initialLoadDone.current) return;
    
    if (prevSearchTerm.current !== searchTerm) {
      prevSearchTerm.current = searchTerm;
      if (searchTerm) {
        loadDayCallsWithSearch(selectedDate, searchTerm);
      } else {
        loadDayCalls(selectedDate);
      }
    }
  }, [searchTerm]);

  // Actualización automática silenciosa cada 60 segundos
  useEffect(() => {
    if (!queryUserId) return;
    
    const interval = setInterval(() => {
      loadDayCallsSilent(selectedDate);
    }, 60000); // 60 segundos
    
    return () => clearInterval(interval);
  }, [queryUserId, selectedDate]);

  // Cargar counts del calendario para un mes específico (optimizado)
  const loadCalendarCounts = async (year: number, month: number) => {
    if (!queryUserId) return;
    
    try {
      const counts = await scheduledCallsService.getCallsCountByMonth(queryUserId, year, month);
      setCalendarCounts(counts);
    } catch (error) {
      console.error('Error loading calendar counts:', error);
    }
  };

  // Cargar llamadas de un día específico (optimizado)
  const loadDayCalls = async (date: Date, mode: ViewMode = viewMode) => {
    if (!queryUserId) return;
    
    setLoadingDay(true);
    setLoading(true);
    try {
      const data = mode === 'weekly' 
        ? await scheduledCallsService.getCallsByWeek(queryUserId, date)
        : await scheduledCallsService.getCallsByDate(queryUserId, date);
      setDayCalls(data);
    } catch (error) {
      console.error('Error loading day calls:', error);
    } finally {
      setLoadingDay(false);
      setLoading(false);
    }
  };

  // Cargar llamadas con filtro de búsqueda
  const loadDayCallsWithSearch = async (date: Date, search: string) => {
    if (!queryUserId) return;
    
    setLoadingDay(true);
    try {
      // Para búsqueda, cargar todas las llamadas y filtrar en frontend
      const filters = {
        search: search,
        estatus: 'all' as const
      };
      const data = await scheduledCallsService.getScheduledCalls(queryUserId, filters);
      setDayCalls(data);
    } catch (error) {
      console.error('Error loading calls with search:', error);
    } finally {
      setLoadingDay(false);
    }
  };

  // Carga silenciosa sin mostrar loading
  const loadDayCallsSilent = async (date: Date, mode: ViewMode = viewMode) => {
    if (!queryUserId) return;
    
    try {
      const data = mode === 'weekly'
        ? await scheduledCallsService.getCallsByWeek(queryUserId, date)
        : await scheduledCallsService.getCallsByDate(queryUserId, date);
      
      // Actualizar solo si hay cambios reales
      setDayCalls(prevCalls => {
        const prevIds = new Set(prevCalls.map(c => c.id));
        const newIds = new Set(data.map(c => c.id));
        
        if (prevIds.size !== newIds.size || 
            [...prevIds].some(id => !newIds.has(id)) ||
            [...newIds].some(id => !prevIds.has(id))) {
          return data;
        }
        
        const hasChanges = prevCalls.some((prevCall, index) => {
          const newCall = data[index];
          if (!newCall) return true;
          return prevCall.estatus !== newCall.estatus ||
                 prevCall.fecha_programada !== newCall.fecha_programada;
        });
        
        return hasChanges ? data : prevCalls;
      });
    } catch (error) {
      // Silenciar errores
    }
  };

  // Función para sincronización manual
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadCalendarCounts(currentMonth.year, currentMonth.month),
      loadDayCalls(selectedDate)
    ]);
    setIsRefreshing(false);
  };

  // Callback cuando el calendario cambia de mes
  const handleMonthChange = (year: number, month: number) => {
    // Solo actualizar si realmente cambió
    if (currentMonth.year !== year || currentMonth.month !== month) {
      setCurrentMonth({ year, month });
      loadCalendarCounts(year, month);
    }
  };

  const statistics = {
    total: dayCalls.length,
    programadas: dayCalls.filter(c => c.estatus === 'programada').length,
    ejecutadas: dayCalls.filter(c => c.estatus === 'ejecutada').length,
    canceladas: dayCalls.filter(c => c.estatus === 'cancelada').length,
    proximas: dayCalls.filter(c => {
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
    // ⚠️ MODO NINJA: Usar queryUserId para verificar permisos como el usuario suplantado
    if (!queryUserId) {
      alert('Debes estar autenticado para ver los detalles del prospecto');
      return;
    }

    try {
      // Verificar permisos antes de cargar el prospecto
      const permissionsServiceModule = await import('../../services/permissionsService');
      const permissionCheck = await permissionsServiceModule.permissionsService.canUserAccessProspect(
        queryUserId,
        prospectoId
      );

      if (!permissionCheck.canAccess) {
        alert(permissionCheck.reason || 'No tienes permiso para acceder a este prospecto');
        return;
      }

      // Si tiene permisos, cargar el prospecto
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', prospectoId)
        .single();
      
      if (error) {
        console.error('Error cargando prospecto:', error);
        alert('Error al cargar los datos del prospecto');
        return;
      }
      
      setSelectedProspecto(data);
      setProspectoSidebarOpen(true);
    } catch (error) {
      console.error('Error cargando prospecto:', error);
      alert('Error al verificar permisos o cargar el prospecto');
    }
  };

  /**
   * Obtiene el id_dynamics del prospecto y abre el modal de programación
   * Busca en prospectos primero, luego en crm_data como fallback
   */
  const openScheduleModalWithProspecto = async (call: ScheduledCall) => {
    try {
      // Primero buscar en prospectos
      const { data: prospecto, error: prospectoError } = await analysisSupabase
        .from('prospectos')
        .select('id_dynamics')
        .eq('id', call.prospecto)
        .maybeSingle();
      
      let idDynamics = prospecto?.id_dynamics || null;

      // Si no tiene en prospectos, buscar en crm_data
      if (!idDynamics) {
        const { data: crmData, error: crmError } = await analysisSupabase
          .from('crm_data')
          .select('id_dynamics')
          .eq('prospecto_id', call.prospecto)
          .maybeSingle();
        
        if (crmError) {
          console.error('Error buscando id_dynamics en crm_data:', crmError);
        }
        
        idDynamics = crmData?.id_dynamics || null;
      }
      
      setSelectedProspectoIdDynamics(idDynamics);
      setSelectedCallForSchedule(call);
      setShowScheduleModal(true);
    } catch (error) {
      console.error('Error obteniendo id_dynamics:', error);
      // Abrir modal de todas formas, pasando null (el modal buscará automáticamente)
      setSelectedProspectoIdDynamics(null);
      setSelectedCallForSchedule(call);
      setShowScheduleModal(true);
    }
  };

  /**
   * Maneja el clic en una llamada programada/ejecutada
   * - Si está programada: abre modal de programación
   * - Si fue ejecutada y contestó (transferida/atendida): abre CallDetailModalSidebar
   * - Si fue ejecutada pero no contestó (buzón/no_contestada/perdida): abre modal de reprogramación
   */
  const handleCallClick = async (call: ScheduledCall) => {
    // Si está programada, abrir modal de programación
    if (call.estatus === 'programada' || call.estatus === 'cancelada') {
      await openScheduleModalWithProspecto(call);
      return;
    }
    
    // Si fue ejecutada, verificar el resultado real de la llamada
    if (call.estatus === 'ejecutada' || call.estatus === 'no_contesto' || call.estatus?.toLowerCase() === 'no contesto') {
      // Si tiene llamada_ejecutada, obtener el call_status real de llamadas_ventas
      if (call.llamada_ejecutada) {
        try {
          const { data: callData, error } = await analysisSupabase
            .from('llamadas_ventas')
            .select('call_id, call_status, duracion_segundos, audio_ruta_bucket, monitor_url, datos_llamada, fecha_llamada')
            .eq('call_id', call.llamada_ejecutada)
            .single();
          
          if (error || !callData) {
            // Si no se encuentra la llamada, abrir modal de reprogramación
            await openScheduleModalWithProspecto(call);
            return;
          }
          
          // Clasificar el estado real de la llamada
          const realStatus: CallStatusGranular = classifyCallStatus({
            call_id: callData.call_id,
            call_status: callData.call_status,
            fecha_llamada: callData.fecha_llamada,
            duracion_segundos: callData.duracion_segundos,
            audio_ruta_bucket: callData.audio_ruta_bucket,
            monitor_url: callData.monitor_url,
            datos_llamada: typeof callData.datos_llamada === 'string' 
              ? JSON.parse(callData.datos_llamada) 
              : callData.datos_llamada
          });
          
          // Si contestó (transferida o atendida), abrir detalle de llamada
          if (realStatus === 'transferida' || realStatus === 'atendida') {
            setSelectedCallId(call.llamada_ejecutada);
            setCallDetailModalOpen(true);
          } else {
            // Si no contestó (buzón, no_contestada, perdida), abrir modal de reprogramación
            await openScheduleModalWithProspecto(call);
          }
        } catch (error) {
          console.error('Error obteniendo estado de llamada:', error);
          // En caso de error, abrir modal de reprogramación
          await openScheduleModalWithProspecto(call);
        }
      } else {
        // Si no tiene llamada_ejecutada, abrir modal de reprogramación
        await openScheduleModalWithProspecto(call);
      }
    }
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
            callCounts={calendarCounts}
            onMonthChange={handleMonthChange}
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
                calls={dayCalls}
                selectedDate={selectedDate}
                onCallClick={handleCallClick}
                onProspectClick={handleNavigateToProspect}
                onDateChange={setSelectedDate}
                showNavigation={false}
                onCallDeleted={() => {
                  loadDayCalls(selectedDate);
                  loadCalendarCounts(currentMonth.year, currentMonth.month);
                }}
              />
            ) : (
              <WeeklyView
                calls={dayCalls}
                selectedDate={selectedDate}
                onCallClick={handleCallClick}
                onProspectClick={handleNavigateToProspect}
                onCallDeleted={() => {
                  loadDayCalls(selectedDate);
                  loadCalendarCounts(currentMonth.year, currentMonth.month);
                }}
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
            setSelectedProspectoIdDynamics(null);
          }}
          prospectoId={selectedCallForSchedule.prospecto}
          prospectoNombre={selectedCallForSchedule.prospecto_nombre}
          prospectoIdDynamics={selectedProspectoIdDynamics}
          onSuccess={() => {
            loadDayCalls(selectedDate);
            loadCalendarCounts(currentMonth.year, currentMonth.month);
            setShowScheduleModal(false);
            setSelectedCallForSchedule(null);
            setSelectedProspectoIdDynamics(null);
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
        onOpenCallDetail={(callId: string) => {
          setSelectedCallId(callId);
          setCallDetailModalOpen(true);
        }}
      />

      {/* 
        ============================================
        SIDEBAR DE DETALLE DE LLAMADA
        ============================================
        Z-INDEX: z-[240] (backdrop) / z-[250] (sidebar)
        - Configurado para aparecer ENCIMA del ProspectoSidebar (z-[190])
        - Comportamiento: CallDetailModalSidebar > ProspectoSidebar
        ============================================
      */}
      {createPortal(
        <CallDetailModalSidebar
          callId={selectedCallId}
          isOpen={callDetailModalOpen}
          onClose={() => {
            setCallDetailModalOpen(false);
            setSelectedCallId(null);
          }}
          allCallsWithAnalysis={[]}
          onProspectClick={(prospectId) => {
            // Abrir sidebar del prospecto si está disponible
            if (selectedProspecto?.id === prospectId) {
              // Ya está abierto
            }
          }}
          zIndexBackdrop="z-[240]"
          zIndexSidebar="z-[250]"
        />,
        document.body
      )}
    </div>
  );
};

export default ScheduledCallsManager;

