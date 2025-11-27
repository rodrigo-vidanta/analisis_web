import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, MoreVertical, ArchiveRestore, Plus, Paperclip } from 'lucide-react';
import type { TimelineActivity } from '../../services/timelineTypes';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Función auxiliar para combinar clases
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface TimelineCardProps {
  activity: TimelineActivity;
  index: number;
  isSubtask?: boolean;
  isSelected: boolean;
  isDragging: boolean;
  onClick: (activity: TimelineActivity, e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, activityId: string) => void;
  onMouseDown: (e: React.MouseEvent, activityId: string) => void;
  onTouchStart: (e: React.TouchEvent, activityId: string) => void;
  onToggleSelection: (activityId: string) => void;
  onUnarchive?: (activityId: string) => void;
  onAddSubtask?: (parentId: string) => void;
  getPriorityColor: (priority: string) => any;
  showArchivedView?: boolean;
  alignment?: 'left' | 'right';
  isMain?: boolean;
  width?: string;
  hideDot?: boolean;
  className?: string;
}

const TimelineCard: React.FC<TimelineCardProps> = memo(({
  activity,
  index,
  isSubtask = false,
  isSelected,
  onClick,
  onContextMenu,
  onToggleSelection,
  onUnarchive,
  onAddSubtask,
  getPriorityColor,
  showArchivedView = false,
  alignment = 'right',
  isMain = false,
  width,
  hideDot = false,
  className
}) => {
  // Diseño para vista archivada (simplificado, lista plana)
  if (showArchivedView) {
    return (
      <motion.div
        layoutId={`card-${activity.id}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={(e) => onClick(activity, e)}
        className={cn("group relative mb-4 pl-8 cursor-pointer", className)}
      >
        {/* Línea conectora */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 group-hover:bg-slate-300 dark:group-hover:bg-white/20 transition-colors">
           <div className="absolute top-6 -left-[5px] w-2.5 h-2.5 rounded-full bg-slate-50 dark:bg-gray-800 border border-slate-300 dark:border-white/30 group-hover:border-slate-400 dark:group-hover:border-white/60 transition-colors" />
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 shadow-sm dark:shadow-none">
           <div className="flex justify-between items-start">
              <div>
                 <h3 className="text-sm font-medium text-slate-500 dark:text-white/70 line-through">{activity.title}</h3>
                 <p className="text-xs text-slate-400 dark:text-white/40 mt-1">{new Date(activity.due_date).toLocaleDateString()}</p>
              </div>
              {onUnarchive && (
                <button onClick={(e) => { e.stopPropagation(); onUnarchive(activity.id); }} className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">
                   <ArchiveRestore className="w-4 h-4" />
                </button>
              )}
           </div>
        </div>
      </motion.div>
    );
  }

  // Diseño "Spine" / Eje Central
  const isLeft = alignment === 'left';
  const priorityColor = getPriorityColor(activity.priority);

  // Lógica de posición del punto
  let dotClass = "left-1/2 -translate-x-1/2"; 
  if (isMain) {
    dotClass = "right-[-32px] translate-x-1/2"; 
  } else if (isSubtask && width) {
    dotClass = "left-[-32px] -translate-x-1/2"; 
  } else if (alignment === 'right' && width === 'w-full') {
    // Caso general para layout "todo a la derecha"
    dotClass = "left-[-32px] -translate-x-1/2";
  }

  return (
    <motion.div
      layoutId={`card-${activity.id}`}
      initial={{ opacity: 0, y: 20, x: isLeft ? 20 : -20 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className={cn(
        `relative flex w-full mb-8 group`,
        isLeft ? 'justify-end text-right' : 'justify-start text-left',
        className
      )}
    >
      {/* Punto central en el eje */}
      {!hideDot && (
        <div className={cn(
          "absolute top-6 w-4 h-4 rounded-full border-2 z-20 transition-all duration-500",
          dotClass,
          "bg-slate-50 dark:bg-[#0f172a]", // Fondo del punto
          isSelected 
            ? "border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] scale-125" // Azul neón seleccionado
            : activity.realizado 
              ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
              : activity.priority === 'critica' 
                ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                : "border-slate-300 dark:border-white/20 group-hover:border-cyan-400 dark:group-hover:border-cyan-400 group-hover:shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:scale-125" // Hover azul neón
        )} />
      )}

      {/* Tarjeta de Cristal */}
      <div 
        onClick={(e) => onClick(activity, e)}
        onContextMenu={(e) => onContextMenu(e, activity.id)}
        className={cn(
          "relative p-6 rounded-3xl backdrop-blur-xl border transition-all duration-500 cursor-pointer hover:shadow-2xl hover:-translate-y-1",
          width ? width : "w-[45%]",
          isSelected 
             ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]" // Cyan theme for selected
             : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none"
        )}
      >
         {/* Decoración Gradient en Hover */}
         <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-100/50 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

         {/* Header Card */}
         <div className={cn("flex items-start gap-4", isLeft ? 'flex-row-reverse' : 'flex-row')}>
            {/* Checkbox Action */}
            <button
               onClick={(e) => { e.stopPropagation(); onToggleSelection(activity.id); }}
               className={cn(
                 "mt-1 p-1 rounded-full transition-all duration-300 hover:scale-110",
                 activity.realizado 
                   ? "text-emerald-500 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-400/10" 
                   : "text-slate-300 dark:text-white/20 hover:text-cyan-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/10"
               )}
            >
               {isSelected ? <CheckCircle2 className="w-6 h-6 text-cyan-400" /> :
                activity.realizado ? <CheckCircle2 className="w-6 h-6" /> : 
                <Circle className="w-6 h-6" />}
            </button>

            <div className="flex-1 min-w-0">
               <h3 className={cn(
                 "text-lg font-semibold tracking-tight leading-tight mb-2",
                 activity.realizado 
                   ? "text-slate-400 dark:text-white/40 line-through decoration-slate-300 dark:decoration-white/20" 
                   : "text-slate-800 dark:text-white"
               )}>
                  {activity.title}
               </h3>
               
               {activity.description && (
                  <p className={cn(
                    "text-sm font-light leading-relaxed line-clamp-2 mb-4",
                    activity.realizado 
                      ? "text-slate-400 dark:text-white/20" 
                      : "text-slate-600 dark:text-white/60"
                  )}>
                     {activity.description}
                  </p>
               )}

               {/* Meta Tags Row */}
               <div className={cn("flex flex-wrap items-center gap-2", isLeft ? 'justify-end' : 'justify-start')}>
                  {/* Priority Badge */}
                  <span 
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md"
                    style={{
                      backgroundColor: priorityColor.bgColor,
                      borderColor: priorityColor.borderColor,
                      color: priorityColor.textColor || 'inherit', 
                    }}
                  >
                    <span className="text-slate-700 dark:text-white">{activity.priority}</span>
                  </span>

                  {/* Attachments Indicator */}
                  {activity.attachments && activity.attachments.length > 0 && (
                     <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-white/50">
                        <Paperclip className="w-3 h-3" />
                        {activity.attachments.length}
                     </div>
                  )}

                  {/* Assignees Avatars */}
                  {activity.asignado_a && activity.asignado_a.length > 0 && (
                     <div className="flex -space-x-2">
                        {activity.asignado_a.slice(0, 3).map((name, i) => (
                           <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-900 border border-white dark:border-white/10 flex items-center justify-center text-[9px] text-slate-700 dark:text-white/90 shadow-sm z-10 cursor-help" title={name}>
                              {name.charAt(0).toUpperCase()}
                           </div>
                        ))}
                        {activity.asignado_a.length > 3 && (
                           <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[9px] text-slate-500 dark:text-white/50 z-0" title={`${activity.asignado_a.length - 3} más`}>
                              +{activity.asignado_a.length - 3}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Hover Actions */}
         <div className={cn("absolute top-4 flex flex-col gap-2 transition-all duration-300 opacity-0 group-hover:opacity-100 z-30 pointer-events-auto", isLeft ? 'left-4' : 'right-4')}>
            <button
               onClick={(e) => onContextMenu(e, activity.id)}
               className="p-2 rounded-full bg-slate-200/80 dark:bg-black/40 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-black/60 backdrop-blur-sm shadow-lg"
               title="Más opciones"
            >
               <MoreVertical className="w-4 h-4" />
            </button>
            {!activity.realizado && onAddSubtask && (
               <button
                  onClick={(e) => { e.stopPropagation(); onAddSubtask(activity.id); }}
                  className="p-2 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/40 backdrop-blur-sm shadow-lg"
                  title="Añadir Subtarea"
               >
                  <Plus className="w-4 h-4" />
               </button>
            )}
         </div>
      </div>
    </motion.div>
  );
});

export default TimelineCard;