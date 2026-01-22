import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  /** Counts precalculados por día en formato { "YYYY-MM-DD": { total, programadas, ejecutadas } } */
  callCounts?: Record<string, { total: number; programadas: number; ejecutadas: number }>;
  /** Callback cuando cambia el mes visible (para cargar counts) */
  onMonthChange?: (year: number, month: number) => void;
}

/**
 * Convierte componentes año/mes/día a string YYYY-MM-DD.
 * Usar para fechas del calendario que ya representan el día correcto.
 */
const componentsToDateString = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  selectedDate,
  onDateSelect,
  callCounts = {},
  onMonthChange
}) => {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('scheduled-calls-calendar-pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  }));
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  const isVisible = isPinned || isHovered;

  // Persistir estado del calendario
  useEffect(() => {
    localStorage.setItem('scheduled-calls-calendar-pinned', isPinned.toString());
  }, [isPinned]);

  // Notificar al padre solo en carga inicial
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (!initialLoadRef.current && onMonthChange) {
      initialLoadRef.current = true;
      onMonthChange(displayedMonth.year, displayedMonth.month);
    }
  }, []);

  // Navegación de meses - notifica al padre directamente
  const goToPreviousMonth = () => {
    const newMonth = displayedMonth.month - 1;
    const newYear = newMonth < 0 ? displayedMonth.year - 1 : displayedMonth.year;
    const finalMonth = newMonth < 0 ? 11 : newMonth;
    
    setDisplayedMonth({ year: newYear, month: finalMonth });
    if (onMonthChange) {
      onMonthChange(newYear, finalMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = displayedMonth.month + 1;
    const newYear = newMonth > 11 ? displayedMonth.year + 1 : displayedMonth.year;
    const finalMonth = newMonth > 11 ? 0 : newMonth;
    
    setDisplayedMonth({ year: newYear, month: finalMonth });
    if (onMonthChange) {
      onMonthChange(newYear, finalMonth);
    }
  };

  const goToToday = () => {
    const now = new Date();
    const newYear = now.getFullYear();
    const newMonth = now.getMonth();
    
    setDisplayedMonth({ year: newYear, month: newMonth });
    if (onMonthChange) {
      onMonthChange(newYear, newMonth);
    }
  };

  // Obtener días del mes
  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, date: null });
    }

    // Días del mes - usar componentes directamente (el calendario representa días en Guadalajara)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = componentsToDateString(year, month, day);
      days.push({ day, date: dateString });
    }

    return days;
  };

  // Obtener count de llamadas para una fecha (desde los counts precalculados)
  const getCallsForDate = (dateString: string) => {
    return callCounts[dateString]?.total || 0;
  };

  // Verificar si es hoy - compara con fecha actual local
  const isToday = (dateString: string) => {
    const now = new Date();
    const todayString = componentsToDateString(now.getFullYear(), now.getMonth(), now.getDate());
    return dateString === todayString;
  };

  // Verificar si está seleccionado - compara con fecha seleccionada
  const isSelected = (dateString: string) => {
    // selectedDate viene del click en el calendario, ya tiene año/mes/día correctos
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    const selectedString = componentsToDateString(selectedYear, selectedMonth, selectedDay);
    return dateString === selectedString;
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Obtener días del mes actual
  const currentDays = getDaysInMonth(displayedMonth.year, displayedMonth.month);

  return (
    <motion.div
      className="flex flex-col flex-shrink-0 relative transition-all duration-300 h-full z-30 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      initial={{ width: 20 }}
      animate={{ width: isVisible ? 320 : 20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Indicador de calendario cuando está colapsado */}
      <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col items-center pt-24 gap-4 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="h-32 w-0.5 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap" style={{ transform: 'rotate(-90deg)' }}>
          Calendario
        </span>
        <div className="h-32 w-0.5 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors" />
      </div>

      {/* Contenido del calendario */}
      <div className={`flex-1 relative overflow-hidden pt-24 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Botón de pin */}
        <button
          onClick={() => setIsPinned(!isPinned)}
          className={`absolute top-6 right-4 p-2 rounded-lg transition-all duration-200 ${
            isPinned
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={isPinned ? 'Desanclar calendario' : 'Anclar calendario'}
        >
          <div className={`w-2 h-2 rounded-full ${isPinned ? 'bg-blue-600 dark:bg-blue-400' : 'border border-current'}`} />
        </button>

        {/* Calendario con navegación */}
        <div
          ref={calendarScrollRef}
          className="h-full overflow-y-auto px-4 pl-8 pt-4 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Header con navegación de mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={goToToday}
              className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Ir a hoy"
            >
              {monthNames[displayedMonth.month]} {displayedMonth.year}
            </button>
            
            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium py-1 text-gray-500 dark:text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {currentDays.map((dayData, dayIndex) => {
              if (dayData.day === 0) {
                return <div key={`empty-${dayIndex}`} className="aspect-square" />;
              }

              const callsCount = dayData.date ? getCallsForDate(dayData.date) : 0;
              const isTodayDate = dayData.date ? isToday(dayData.date) : false;
              const isSelectedDate = dayData.date ? isSelected(dayData.date) : false;

              const hasCalls = callsCount > 0;

              return (
                <button
                  key={dayData.date || `empty-${dayIndex}`}
                  onClick={() => {
                    if (dayData.date) {
                      // FIX: Crear Date con componentes locales, NO con string ISO
                      const [year, month, day] = dayData.date.split('-').map(Number);
                      onDateSelect(new Date(year, month - 1, day));
                    }
                  }}
                  className={`aspect-square relative rounded-lg transition-all duration-200 text-xs font-medium ${
                    isSelectedDate
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : isTodayDate
                      ? hasCalls
                        ? 'bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-800 dark:text-blue-200 font-semibold border border-blue-300 dark:border-blue-700'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                      : hasCalls
                      ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-gray-800 dark:text-gray-200 border border-blue-200 dark:border-blue-800 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="relative z-10">{dayData.day}</span>
                  {hasCalls && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={`absolute bottom-0 right-0 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-[7px] font-bold shadow-sm translate-x-1/2 translate-y-1/2 ${
                        isSelectedDate
                          ? 'bg-white text-blue-600'
                          : isTodayDate
                          ? 'bg-blue-600 dark:bg-blue-500 text-white'
                          : 'bg-blue-500 dark:bg-blue-400 text-white'
                      }`}
                    >
                                {callsCount > 99 ? '99+' : callsCount}
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

