import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Edit2, ArchiveRestore, Paperclip, FileText, Trash2, Plus } from 'lucide-react';
import type { TimelineActivity } from '../../services/timelineTypes';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface TimelineActivityModalProps {
  isOpen: boolean;
  activity: TimelineActivity | null;
  isEditing: boolean;
  onClose: () => void;
  onStartEdit: (activity: TimelineActivity) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onUnarchive: (id: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editingActivity: Partial<TimelineActivity>;
  setEditingActivity: (activity: Partial<TimelineActivity>) => void;
  formatDate: (date: string) => string;
  getPriorityColor: (priority: string) => any;
  assignmentInput: string;
  setAssignmentInput: (value: string) => void;
  showAssignmentSuggestions: boolean;
  setShowAssignmentSuggestions: (show: boolean) => void;
  assignmentSuggestions: string[];
  handleAddAssignment: (name?: string) => void;
}

const TimelineActivityModal: React.FC<TimelineActivityModalProps> = ({
  isOpen,
  activity,
  isEditing,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSave,
  onUnarchive,
  onFileUpload,
  editingActivity,
  setEditingActivity,
  formatDate,
  getPriorityColor,
  assignmentInput,
  setAssignmentInput,
  showAssignmentSuggestions,
  setShowAssignmentSuggestions,
  assignmentSuggestions,
  handleAddAssignment
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !activity) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors duration-300 bg-black/20 dark:bg-black/80"
          onClick={() => {
            if (!isEditing) onClose();
          }}
        >
          <motion.div
            layoutId={`card-${activity.id}`}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border relative transition-colors duration-300 bg-white dark:bg-[#1e293b] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
          >
            {/* Background Gradient Animation */}
            <motion.div
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
            </motion.div>
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 border-b transition-colors duration-300 bg-gray-50/80 dark:bg-white/5 border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 p-0.5 shadow-lg"
                    >
                      <div className="w-full h-full rounded-2xl flex items-center justify-center transition-colors duration-300 bg-white dark:bg-[#0f172a]">
                        <Calendar className="w-7 h-7 transition-colors duration-300 text-gray-700 dark:text-white" />
                      </div>
                    </motion.div>
                    <div>
                      <motion.h2 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="text-2xl font-light tracking-wide transition-colors duration-300 text-gray-900 dark:text-white"
                      >
                        {isEditing ? 'Editar Actividad' : 'Detalle de Actividad'}
                      </motion.h2>
                      {!isEditing && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm mt-1 transition-colors duration-300 text-gray-500 dark:text-white/60"
                        >
                          {formatDate(activity.due_date)}
                        </motion.p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => onStartEdit(activity)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/60"
                      >
                        <Edit2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isEditing) onCancelEdit();
                        onClose();
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/40"
                    >
                      <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                <div className="space-y-8">
                  
                  {/* Main Info */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">Información Principal</h4>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5 block">Título</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingActivity.title || ''}
                            onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-white/50 dark:focus:bg-white/10 transition-all text-sm text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="text-lg text-gray-900 dark:text-white leading-relaxed">{activity.title}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5 block">Descripción</label>
                        {isEditing ? (
                          <textarea
                            value={editingActivity.description || ''}
                            onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-white/50 dark:focus:bg-white/10 transition-all text-sm text-gray-900 dark:text-white resize-none"
                          />
                        ) : (
                          <p className="text-gray-600 dark:text-white/70 text-sm leading-relaxed">
                            {activity.description || 'Sin descripción'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details & Priority */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">Detalles</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5 block">Fecha Compromiso</label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editingActivity.due_date || ''}
                            onChange={(e) => setEditingActivity({ ...editingActivity, due_date: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 text-sm text-gray-900 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-800 dark:text-white/80 text-sm">{formatDate(activity.due_date)}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5 block">Prioridad</label>
                        {isEditing ? (
                          <select
                            value={editingActivity.priority || 'media'}
                            onChange={(e) => setEditingActivity({ ...editingActivity, priority: e.target.value as any })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 text-sm text-gray-900 dark:text-white"
                          >
                            <option value="baja" className="text-black">Baja</option>
                            <option value="media" className="text-black">Media</option>
                            <option value="alta" className="text-black">Alta</option>
                            <option value="critica" className="text-black">Crítica</option>
                          </select>
                        ) : (
                          <div 
                            className="px-3 py-1 rounded-lg text-xs font-medium inline-block capitalize border"
                            style={{
                              backgroundColor: getPriorityColor(activity.priority).bgColor,
                              borderColor: getPriorityColor(activity.priority).borderColor,
                            }}
                          >
                            <span className="text-gray-700 dark:text-white">
                                {getPriorityColor(activity.priority).label}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5 block">Estado</label>
                        {isEditing ? (
                          <label className="flex items-center space-x-3 cursor-pointer mt-1">
                            <input
                              type="checkbox"
                              checked={editingActivity.realizado || false}
                              onChange={(e) => setEditingActivity({ ...editingActivity, realizado: e.target.checked })}
                              className="sr-only"
                            />
                            <div className={`w-10 h-6 rounded-full transition-colors duration-300 relative ${editingActivity.realizado ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'}`}>
                              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${editingActivity.realizado ? 'translate-x-4' : ''}`} />
                            </div>
                            <span className="text-sm text-gray-700 dark:text-white/80">{editingActivity.realizado ? 'Completado' : 'Pendiente'}</span>
                          </label>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${activity.realizado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="text-gray-700 dark:text-white/80 text-sm capitalize">{activity.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">Asignación</h4>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          {(editingActivity.asignado_a || []).map((name, idx) => (
                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 text-sm flex items-center gap-2 border border-gray-200 dark:border-white/10">
                              {name}
                              <button 
                                onClick={() => {
                                  const newAssignees = (editingActivity.asignado_a || []).filter((_, i) => i !== idx);
                                  setEditingActivity({ ...editingActivity, asignado_a: newAssignees });
                                }}
                                className="hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <div className="relative">
                            <input
                              type="text"
                              value={assignmentInput}
                              onChange={(e) => setAssignmentInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddAssignment();
                                }
                              }}
                              onFocus={() => {
                                if (assignmentInput.length > 0) setShowAssignmentSuggestions(true);
                              }}
                              placeholder="Agregar persona..."
                              className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm border border-gray-200 dark:border-white/10 focus:outline-none focus:border-purple-500/50 w-40"
                            />
                            {showAssignmentSuggestions && assignmentSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                                {assignmentSuggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleAddAssignment(s)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-white/80 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white block"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        (activity.asignado_a && activity.asignado_a.length > 0) ? (
                          activity.asignado_a.map((name, idx) => (
                            <span key={idx} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 text-sm border border-gray-200 dark:border-white/10">
                              {name}
                            </span>
                          ))
                        ) : <span className="text-gray-400 dark:text-white/40 text-sm italic">Sin asignados</span>
                      )}
                    </div>
                  </div>

                  {/* Attachments (Modern Redesign) */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">Archivos Adjuntos</h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Attachments List */}
                      {(isEditing ? (editingActivity.attachments || []) : (activity.attachments || [])).map((file, index) => (
                        <div key={index} className="group relative rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden aspect-video flex flex-col items-center justify-center hover:border-gray-300 dark:hover:border-white/30 transition-all">
                          {file.type === 'image' ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-white/60 group-hover:text-gray-700 dark:group-hover:text-white transition-colors">
                              <FileText className="w-8 h-8" />
                              <span className="text-xs truncate max-w-[90%] px-2">{file.name}</span>
                            </div>
                          )}
                          
                          {/* Actions Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                              title="Ver archivo"
                            >
                              <Paperclip className="w-4 h-4" />
                            </a>
                            {isEditing && (
                              <button
                                onClick={() => {
                                  const current = editingActivity.attachments || [];
                                  setEditingActivity({
                                    ...editingActivity,
                                    attachments: current.filter((_, i) => i !== index)
                                  });
                                }}
                                className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Upload Button (Editing Only) */}
                      {isEditing && (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-400 dark:hover:border-white/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 aspect-video group"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 text-gray-500 dark:text-white/60 group-hover:text-gray-700 dark:group-hover:text-white" />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-white/40 group-hover:text-gray-700 dark:group-hover:text-white/70">Subir archivo</span>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={onFileUpload}
                            accept="image/*,application/pdf"
                          />
                        </div>
                      )}
                      
                      {/* Empty State */}
                      {!isEditing && (!activity.attachments || activity.attachments.length === 0) && (
                        <div className="col-span-full py-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                          <Paperclip className="w-8 h-8 text-gray-300 dark:text-white/20 mx-auto mb-2" />
                          <p className="text-sm text-gray-400 dark:text-white/40">No hay archivos adjuntos</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-gray-200 dark:border-white/5 flex justify-between items-center relative z-10 bg-gray-50/80 dark:bg-black/30">
                {activity.archivado && !isEditing && (
                  <button
                    onClick={() => {
                      onUnarchive(activity.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors text-sm font-medium"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Desarchivar
                  </button>
                )}
                <div className="flex justify-end gap-3 ml-auto">
                  {isEditing ? (
                    <>
                      <button
                        onClick={onCancelEdit}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={onSave}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl hover:from-purple-600 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/25"
                      >
                        Guardar Cambios
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TimelineActivityModal;