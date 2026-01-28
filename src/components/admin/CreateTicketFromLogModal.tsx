// ============================================
// MODAL PARA CREAR TICKET DESDE LOG
// ============================================
// Permite crear tickets de soporte pre-rellenados desde logs del sistema
// Los tickets se crean como usuario "system" sin generar notificaciones iniciales

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Users, User as UserIcon, X, ExternalLink } from 'lucide-react';
import { ticketService, ASSIGNABLE_ROLES, type AssignableRole, type UserForAssignment, type SupportTicket } from '../../services/ticketService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { ErrorLog } from '../../services/logMonitorService';

interface CreateTicketFromLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logData: ErrorLog;
}

// ID del usuario system
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

// Mapeo de severidad a prioridad
const mapSeverityToPriority = (severidad: string): 'baja' | 'normal' | 'alta' | 'urgente' => {
  switch (severidad) {
    case 'critica': return 'urgente';
    case 'alta': return 'alta';
    case 'media': return 'normal';
    case 'baja': return 'baja';
    default: return 'normal';
  }
};

const CreateTicketFromLogModal: React.FC<CreateTicketFromLogModalProps> = ({ isOpen, onClose, logData }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'role' | 'user'>('role');
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('admin');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<UserForAssignment[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [existingTicket, setExistingTicket] = useState<{
    ticketId: string;
    ticketNumber: string;
    ticketStatus: string;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(true);

  // Cargar usuarios cuando se selecciona asignación a usuario
  useEffect(() => {
    if (assignmentType === 'user') {
      loadUsers(selectedRole);
    }
  }, [assignmentType, selectedRole]);

  // Verificar si el log ya tiene ticket asociado
  useEffect(() => {
    if (isOpen && logData) {
      checkForExistingTicket();
    }
  }, [isOpen, logData]);

  const checkForExistingTicket = async () => {
    setCheckingDuplicate(true);
    try {
      const { hasTicket, ticketId, ticketNumber, ticketStatus } = await ticketService.checkLogHasTicket(logData.id);
      
      if (hasTicket && ticketId && ticketNumber && ticketStatus) {
        setExistingTicket({ ticketId, ticketNumber, ticketStatus });
        toast.error('Este log ya tiene un ticket asociado', {
          icon: '⚠️',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Error checking for duplicate:', error);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const loadUsers = async (role: AssignableRole) => {
    setLoadingUsers(true);
    try {
      const { users } = await ticketService.getUsersByRole(role);
      setAvailableUsers(users);
      if (users.length > 0) {
        setSelectedUserId(users[0].id);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validar asignación
    if (assignmentType === 'user' && !selectedUserId) {
      toast.error('Selecciona un usuario');
      return;
    }

    // Verificar duplicado nuevamente antes de crear
    if (existingTicket) {
      toast.error(`Este log ya tiene el ticket ${existingTicket.ticketNumber}`, {
        icon: '⚠️'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Construir descripción estructurada con toda la información del log
      const buildStructuredDescription = (): string => {
        const sections: string[] = [];
        const divider = '─'.repeat(80);
        const sectionDivider = '═'.repeat(80);

        // Header
        sections.push(sectionDivider);
        sections.push('REPORTE DE ERROR DEL SISTEMA');
        sections.push(sectionDivider);
        sections.push('');

        // 1. Información del Error
        sections.push('1. INFORMACIÓN DEL ERROR');
        sections.push(divider);
        sections.push(`   Tipo:           ${logData.tipo.toUpperCase()}`);
        sections.push(`   Subtipo:        ${logData.subtipo}`);
        sections.push(`   Severidad:      ${logData.severidad.toUpperCase()}`);
        sections.push(`   Ambiente:       ${logData.ambiente.charAt(0).toUpperCase() + logData.ambiente.slice(1)}`);
        sections.push(`   Timestamp:      ${new Date(logData.timestamp).toLocaleString('es-MX', {
          timeZone: 'America/Mexico_City',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })} CST`);
        if (logData.workflow_id) sections.push(`   Workflow ID:    ${logData.workflow_id}`);
        if (logData.execution_id) sections.push(`   Execution ID:   ${logData.execution_id}`);
        if (logData.prospecto_id) sections.push(`   Prospecto ID:   ${logData.prospecto_id}`);
        if (logData.whatsapp) sections.push(`   WhatsApp:       ${logData.whatsapp}`);
        sections.push('');

        // 2. Descripción
        if (logData.descripcion) {
          sections.push('2. DESCRIPCIÓN');
          sections.push(divider);
          sections.push(logData.descripcion);
          sections.push('');
        }

        // 3. Mensaje del Error
        sections.push(`${logData.descripcion ? '3' : '2'}. DETALLE DEL ERROR`);
        sections.push(divider);
        if (typeof logData.mensaje === 'string') {
          sections.push(logData.mensaje);
        } else {
          sections.push(JSON.stringify(logData.mensaje, null, 2));
        }
        sections.push('');

        // 4. Anotaciones (si existen)
        if (logData.annotations && logData.annotations.length > 0) {
          const sectionNum = logData.descripcion ? '4' : '3';
          sections.push(`${sectionNum}. ANOTACIONES TÉCNICAS`);
          sections.push(divider);
          logData.annotations.forEach((annotation, index) => {
            const date = new Date(annotation.created_at).toLocaleString('es-MX', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Mexico_City',
              hour12: false
            });
            sections.push(`   [${index + 1}] ${annotation.annotation_text}`);
            sections.push(`       Autor: ${annotation.created_by || 'Usuario'} | Fecha: ${date}`);
            sections.push('');
          });
        }

        // 5. Análisis de IA (si existe)
        if (logData.ai_analysis && logData.ai_analysis.status === 'completed') {
          let sectionNum = logData.descripcion ? 4 : 3;
          if (logData.annotations && logData.annotations.length > 0) sectionNum++;
          
          sections.push(`${sectionNum}. ANÁLISIS AUTOMATIZADO`);
          sections.push(divider);
          
          if (logData.ai_analysis.analysis_summary) {
            sections.push('   Resumen del Análisis:');
            sections.push(`   ${logData.ai_analysis.analysis_summary}`);
            sections.push('');
          }
          
          if (logData.ai_analysis.analysis_text) {
            sections.push('   Análisis Detallado:');
            const analysisLines = logData.ai_analysis.analysis_text.split('\n');
            analysisLines.forEach(line => sections.push(`   ${line}`));
            sections.push('');
          }
          
          if (logData.ai_analysis.suggested_fix) {
            sections.push('   Solución Propuesta:');
            const fixLines = logData.ai_analysis.suggested_fix.split('\n');
            fixLines.forEach(line => sections.push(`   ${line}`));
            sections.push('');
          }
          
          sections.push(`   Nivel de Confianza: ${logData.ai_analysis.confidence_score}%`);
          sections.push(`   Modelo Utilizado:   ${logData.ai_analysis.model_used}`);
          sections.push(`   Fecha de Análisis:  ${new Date(logData.ai_analysis.completed_at || logData.ai_analysis.created_at).toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Mexico_City',
            hour12: false
          })}`);
          sections.push('');
        }

        // 6. Etiquetas (si existen)
        if (logData.tags && logData.tags.length > 0) {
          sections.push('ETIQUETAS');
          sections.push(divider);
          sections.push(`   ${logData.tags.map(tag => tag.tag_name.toUpperCase()).join(' | ')}`);
          sections.push('');
        }

        // Footer
        sections.push(sectionDivider);
        sections.push('FIN DEL REPORTE');
        sections.push(sectionDivider);

        return sections.join('\n');
      };

      // Crear ticket usando el método system
      const { ticket, error } = await ticketService.createSystemTicket(
        {
          type: 'reporte_falla',
          title: `Error ${logData.subtipo} - ${logData.severidad.toUpperCase()}`,
          description: buildStructuredDescription(), // ✅ Descripción estructurada completa
          category: logData.tipo,
          subcategory: logData.subtipo,
          priority: mapSeverityToPriority(logData.severidad),
          reporter_id: SYSTEM_USER_ID,
          reporter_name: 'Sistema Automático',
          reporter_email: 'system@internal',
          reporter_role: 'system',
          form_data: {
            log_id: logData.id,
            log_timestamp: logData.timestamp,
            ambiente: logData.ambiente,
            workflow_id: logData.workflow_id,
            execution_id: logData.execution_id,
            prospecto_id: logData.prospecto_id,
            whatsapp: logData.whatsapp,
            mensaje_completo: logData.mensaje,
            descripcion_original: logData.descripcion,
            has_annotations: logData.annotations && logData.annotations.length > 0,
            has_ai_analysis: !!logData.ai_analysis,
            tags: logData.tags?.map(t => t.tag_name) || [],
            source: 'log_monitor'
          }
        },
        assignmentType === 'user' ? selectedUserId : undefined,
        assignmentType === 'role' ? selectedRole : undefined,
        logData.id // ✅ Pasar log_id
      );

      if (error) {
        toast.error(error);
        return;
      }

      setCreatedTicket(ticket);
      toast.success('Ticket creado desde log', {
        icon: '✅',
        duration: 4000
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreatedTicket(null);
    setShowTicketDetail(false);
    setExistingTicket(null);
    setCheckingDuplicate(true);
    onClose();
  };

  const handleViewTicket = () => {
    setShowTicketDetail(true);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="create-ticket-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[60]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Crear Ticket desde Log
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Log ID: {logData.id.substring(0, 8)}...
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {checkingDuplicate ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Verificando si ya existe ticket...</p>
                  </div>
                </div>
              ) : existingTicket ? (
                <div className="space-y-4">
                  {/* Alerta de ticket existente */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                          Ticket ya existente
                        </h4>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                          Este log ya tiene un ticket asociado. No se pueden crear tickets duplicados.
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            {existingTicket.ticketNumber}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            existingTicket.ticketStatus === 'abierto' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                            existingTicket.ticketStatus === 'en_progreso' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
                            existingTicket.ticketStatus === 'resuelto' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {existingTicket.ticketStatus === 'abierto' ? 'Abierto' :
                             existingTicket.ticketStatus === 'en_progreso' ? 'En Progreso' :
                             existingTicket.ticketStatus === 'resuelto' ? 'Resuelto' :
                             existingTicket.ticketStatus === 'cerrado' ? 'Cerrado' : existingTicket.ticketStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="space-y-6">
                {/* Preview del Ticket */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Información del Ticket
                    </h4>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Título</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Error {logData.subtipo} - {logData.severidad.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {logData.descripcion || (typeof logData.mensaje === 'string' ? logData.mensaje.substring(0, 200) : JSON.stringify(logData.mensaje).substring(0, 200))}...
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prioridad</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          mapSeverityToPriority(logData.severidad) === 'urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                          mapSeverityToPriority(logData.severidad) === 'alta' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
                          mapSeverityToPriority(logData.severidad) === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {mapSeverityToPriority(logData.severidad)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo</p>
                        <p className="text-xs text-gray-900 dark:text-white">{logData.tipo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reporter</p>
                        <p className="text-xs text-gray-900 dark:text-white">Sistema</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asignación */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Asignación
                    </h4>
                  </div>

                  {/* Toggle: Grupo vs Usuario */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => setAssignmentType('role')}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        assignmentType === 'role'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">Asignar a Grupo</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setAssignmentType('user')}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                        assignmentType === 'user'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <UserIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Asignar a Usuario</span>
                      </div>
                    </button>
                  </div>

                  {/* Selector de Rol */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                      {assignmentType === 'role' ? 'Grupo' : 'Rol del Usuario'}
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as AssignableRole)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                    >
                      {ASSIGNABLE_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de Usuario (solo si assignmentType === 'user') */}
                  {assignmentType === 'user' && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                        Usuario Específico
                      </label>
                      {loadingUsers ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                          Cargando usuarios...
                        </div>
                      ) : availableUsers.length > 0 ? (
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200"
                        >
                          {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                          No hay usuarios disponibles en este rol
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end space-x-3">
              {checkingDuplicate ? (
                <button
                  disabled
                  className="px-5 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-xl cursor-not-allowed"
                >
                  Verificando...
                </button>
              ) : existingTicket ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                >
                  Cerrar
                </motion.button>
              ) : createdTicket ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleViewTicket}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Ticket
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                  >
                    Cerrar
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting || (assignmentType === 'user' && !selectedUserId)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Ticket'}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Detalle del Ticket Creado */}
      {showTicketDetail && createdTicket && (
        <motion.div
          key="ticket-detail-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[70]"
          onClick={() => setShowTicketDetail(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      {createdTicket.ticket_number}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      createdTicket.priority === 'urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                      createdTicket.priority === 'alta' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
                      createdTicket.priority === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {createdTicket.priority}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                    {createdTicket.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Creado desde log del sistema
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTicketDetail(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-8 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <div className="space-y-6">
                {/* Descripción */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</h4>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {createdTicket.description}
                  </p>
                </div>

                {/* Información del Ticket */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      createdTicket.status === 'abierto' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                      createdTicket.status === 'en_progreso' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
                      createdTicket.status === 'resuelto' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {createdTicket.status === 'abierto' ? 'Abierto' :
                       createdTicket.status === 'en_progreso' ? 'En Progreso' :
                       createdTicket.status === 'resuelto' ? 'Resuelto' :
                       createdTicket.status === 'cerrado' ? 'Cerrado' : createdTicket.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reporter</p>
                    <p className="text-sm text-gray-900 dark:text-white">{createdTicket.reporter_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Categoría</p>
                    <p className="text-sm text-gray-900 dark:text-white">{createdTicket.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subcategoría</p>
                    <p className="text-sm text-gray-900 dark:text-white">{createdTicket.subcategory || 'N/A'}</p>
                  </div>
                </div>

                {/* Metadata del Log */}
                {createdTicket.form_data && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Metadata del Log</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                        {JSON.stringify(createdTicket.form_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowTicketDetail(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200"
              >
                Cerrar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateTicketFromLogModal;
