import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  scheduledCalls: Array<{ fecha_programada: string }>;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  selectedDate,
  onDateSelect,
  scheduledCalls
}) => {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('scheduled-calls-calendar-pinned');
    return saved !== null ? saved === 'true' : true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  const isVisible = isPinned || isHovered;

  // Persistir estado del calendario
  useEffect(() => {
    localStorage.setItem('scheduled-calls-calendar-pinned', isPinned.toString());
  }, [isPinned]);

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

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      days.push({ day, date: dateString });
    }

    return days;
  };

  // Generar meses del calendario (3 meses: anterior, actual, siguiente)
  const generateCalendarMonths = () => {
    const months = [];
    const now = new Date();
    
    for (let i = -1; i <= 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth()
      });
    }
    
    return months;
  };

  // Contar llamadas por fecha
  const getCallsForDate = (dateString: string) => {
    return scheduledCalls.filter(call => {
      const callDate = new Date(call.fecha_programada).toISOString().split('T')[0];
      return callDate === dateString;
    }).length;
  };

  // Verificar si es hoy
  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  // Verificar si está seleccionado
  const isSelected = (dateString: string) => {
    const selected = selectedDate.toISOString().split('T')[0];
    return dateString === selected;
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const calendarMonths = generateCalendarMonths();

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

        {/* Scroll del calendario */}
        <div
          ref={calendarScrollRef}
          className="h-full overflow-y-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .calendar-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="calendar-scroll">
            <div className="px-4 pl-8 pt-4 pb-4 space-y-6">
              {calendarMonths.map((monthData, monthIndex) => {
                const days = getDaysInMonth(monthData.year, monthData.month);
                const monthKey = `${monthData.year}-${monthData.month}`;
                
                return (
                  <motion.div
                    key={monthKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: monthIndex * 0.05 }}
                    className="space-y-3"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wider px-1 text-gray-600 dark:text-gray-400">
                      {monthNames[monthData.month]} {monthData.year}
                    </h3>
                    
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
                      {days.map((dayData, dayIndex) => {
                        if (dayData.day === 0) {
                          return <div key={`empty-${dayIndex}`} className="aspect-square" />;
                        }

                        const callsCount = dayData.date ? getCallsForDate(dayData.date) : 0;
                        const isTodayDate = dayData.date ? isToday(dayData.date) : false;
                        const isSelectedDate = dayData.date ? isSelected(dayData.date) : false;

                        const hasCalls = callsCount > 0;
                        const maxDots = 5; // Máximo de puntitos visibles
                        const dotsToShow = Math.min(callsCount, maxDots);

                        return (
                          <button
                            key={dayData.date || `empty-${dayIndex}`}
                            onClick={() => {
                              if (dayData.date) {
                                onDateSelect(new Date(dayData.date));
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
                              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 flex-wrap max-w-full px-0.5">
                                {Array.from({ length: dotsToShow }).map((_, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`w-1 h-1 rounded-full flex-shrink-0 ${
                                      isSelectedDate
                                        ? 'bg-white'
                                        : isTodayDate
                                        ? 'bg-blue-600 dark:bg-blue-400'
                                        : 'bg-blue-500 dark:bg-blue-400'
                                    }`}
                                  />
                                ))}
                                {callsCount > maxDots && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: dotsToShow * 0.05 }}
                                    className={`text-[7px] font-bold ml-0.5 ${
                                      isSelectedDate
                                        ? 'text-white'
                                        : isTodayDate
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-blue-500 dark:text-blue-400'
                                    }`}
                                  >
                                    +{callsCount - maxDots}
                                  </motion.span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

