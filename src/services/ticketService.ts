// ============================================
// SERVICIO DE TICKETS DE SOPORTE
// ============================================
// Fecha: 2026-01-20
// Autor: AI Division

import { analysisSupabase } from '../config/analysisSupabase';
import { supabaseSystemUI } from '../config/supabaseSystemUI';

// ============================================
// TIPOS
// ============================================

export type TicketType = 'reporte_falla' | 'requerimiento';
export type TicketStatus = 'abierto' | 'en_progreso' | 'pendiente_info' | 'resuelto' | 'cerrado' | 'cancelado';
export type TicketPriority = 'baja' | 'normal' | 'alta' | 'urgente';

export type RequirementCategory = 
  | 'reasignacion_prospectos'
  | 'cambio_roles'
  | 'bloquear_usuario'
  | 'anadir_funciones'
  | 'mejorar_funciones'
  | 'otro';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  type: TicketType;
  category: string | null;
  subcategory: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  title: string;
  description: string;
  app_version: string | null;
  user_agent: string | null;
  current_module: string | null;
  prospecto_id: string | null;
  prospecto_nombre: string | null;
  session_details: Record<string, any> | null;
  screenshot_url: string | null;
  screenshot_base64: string | null;
  form_data: Record<string, any> | null;
  log_id: string | null; // ✅ NUEVO: ID del log del que se creó el ticket
  reporter_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_role: string | null;
  assigned_to: string | null;
  assigned_to_role: string | null; // Rol al que está asignado (admin, administrador_operativo, coordinador)
  assigned_at: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

// Roles disponibles para asignación de tickets
export type AssignableRole = 'admin' | 'administrador_operativo' | 'coordinador';

export const ASSIGNABLE_ROLES: { value: AssignableRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Administradores', color: 'from-red-500 to-rose-600' },
  { value: 'administrador_operativo', label: 'Admins Operativos', color: 'from-purple-500 to-violet-600' },
  { value: 'coordinador', label: 'Coordinadores de Calidad', color: 'from-blue-500 to-indigo-600' }
];

export interface UserForAssignment {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  avatar_url?: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateTicketData {
  type: TicketType;
  title: string;
  description: string;
  category?: string;
  subcategory?: string;
  priority?: TicketPriority;
  app_version?: string;
  user_agent?: string;
  current_module?: string;
  prospecto_id?: string;
  prospecto_nombre?: string;
  session_details?: Record<string, any>;
  screenshot_url?: string;
  screenshot_base64?: string;
  form_data?: Record<string, any>;
  reporter_id: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_role?: string;
}

// ============================================
// CATEGORÍAS Y SUBCATEGORÍAS DE REQUERIMIENTOS
// ============================================

export const REQUIREMENT_CATEGORIES: Record<RequirementCategory, {
  label: string;
  description: string;
  subcategories: { value: string; label: string; questions?: { field: string; label: string; type: 'text' | 'select' | 'textarea'; options?: string[] }[] }[];
}> = {
  reasignacion_prospectos: {
    label: 'Reasignación de Prospectos',
    description: 'Solicitar cambio de asignación de uno o más prospectos',
    subcategories: [
      { 
        value: 'cambio_ejecutivo', 
        label: 'Cambiar ejecutivo asignado',
        questions: [
          { field: 'prospecto_ids', label: 'IDs de prospectos (separados por coma)', type: 'textarea' },
          { field: 'motivo', label: 'Motivo del cambio', type: 'select', options: ['Ausencia del ejecutivo', 'Cambio de territorio', 'Solicitud del cliente', 'Rendimiento', 'Otro'] },
          { field: 'ejecutivo_destino', label: 'Nombre del ejecutivo destino (si conoce)', type: 'text' },
          { field: 'urgencia', label: 'Urgencia', type: 'select', options: ['Normal', 'Urgente - Hay cita pendiente', 'Muy urgente - Cliente esperando'] }
        ]
      },
      { 
        value: 'cambio_coordinacion', 
        label: 'Mover a otra coordinación',
        questions: [
          { field: 'prospecto_ids', label: 'IDs de prospectos (separados por coma)', type: 'textarea' },
          { field: 'coordinacion_destino', label: 'Coordinación destino', type: 'text' },
          { field: 'motivo', label: 'Motivo del cambio', type: 'textarea' }
        ]
      },
      { 
        value: 'desasignacion', 
        label: 'Quitar asignación actual',
        questions: [
          { field: 'prospecto_ids', label: 'IDs de prospectos (separados por coma)', type: 'textarea' },
          { field: 'motivo', label: 'Motivo', type: 'textarea' }
        ]
      }
    ]
  },
  cambio_roles: {
    label: 'Cambio de Roles',
    description: 'Solicitar cambio de rol o permisos para un usuario',
    subcategories: [
      { 
        value: 'promocion', 
        label: 'Promoción de rol',
        questions: [
          { field: 'usuario_email', label: 'Email del usuario', type: 'text' },
          { field: 'rol_actual', label: 'Rol actual', type: 'text' },
          { field: 'rol_solicitado', label: 'Rol solicitado', type: 'select', options: ['Coordinador', 'Supervisor', 'Administrador Operativo'] },
          { field: 'justificacion', label: 'Justificación', type: 'textarea' }
        ]
      },
      { 
        value: 'agregar_permisos', 
        label: 'Agregar permisos adicionales',
        questions: [
          { field: 'usuario_email', label: 'Email del usuario', type: 'text' },
          { field: 'permisos_solicitados', label: '¿Qué permisos necesita?', type: 'textarea' },
          { field: 'motivo', label: 'Motivo de la solicitud', type: 'textarea' }
        ]
      },
      { 
        value: 'cambio_coordinacion_usuario', 
        label: 'Cambiar coordinación asignada',
        questions: [
          { field: 'usuario_email', label: 'Email del usuario', type: 'text' },
          { field: 'coordinacion_actual', label: 'Coordinación actual', type: 'text' },
          { field: 'coordinacion_nueva', label: 'Nueva coordinación', type: 'text' },
          { field: 'motivo', label: 'Motivo', type: 'textarea' }
        ]
      }
    ]
  },
  bloquear_usuario: {
    label: 'Bloquear Usuario',
    description: 'Solicitar bloqueo temporal o permanente de un usuario',
    subcategories: [
      { 
        value: 'bloqueo_temporal', 
        label: 'Bloqueo temporal',
        questions: [
          { field: 'usuario_email', label: 'Email del usuario a bloquear', type: 'text' },
          { field: 'duracion', label: 'Duración del bloqueo', type: 'select', options: ['1 día', '3 días', '1 semana', '2 semanas', '1 mes'] },
          { field: 'motivo', label: 'Motivo del bloqueo', type: 'textarea' },
          { field: 'requiere_respaldo', label: '¿Se requiere asignar respaldo?', type: 'select', options: ['Sí', 'No'] }
        ]
      },
      { 
        value: 'bloqueo_permanente', 
        label: 'Bloqueo permanente (baja)',
        questions: [
          { field: 'usuario_email', label: 'Email del usuario', type: 'text' },
          { field: 'motivo', label: 'Motivo de la baja', type: 'textarea' },
          { field: 'reasignar_prospectos', label: '¿A quién reasignar sus prospectos?', type: 'text' }
        ]
      },
      { 
        value: 'desbloqueo', 
        label: 'Solicitar desbloqueo',
        questions: [
          { field: 'usuario_email', label: 'Email del usuario', type: 'text' },
          { field: 'motivo_desbloqueo', label: 'Motivo del desbloqueo', type: 'textarea' }
        ]
      }
    ]
  },
  anadir_funciones: {
    label: 'Añadir Funciones',
    description: 'Solicitar nuevas funcionalidades para el sistema',
    subcategories: [
      { 
        value: 'nueva_funcionalidad', 
        label: 'Nueva funcionalidad completa',
        questions: [
          { field: 'modulo_afectado', label: '¿En qué módulo iría?', type: 'select', options: ['Dashboard', 'Prospectos', 'WhatsApp', 'Llamadas', 'Reportes', 'Administración', 'Nuevo módulo'] },
          { field: 'descripcion_funcionalidad', label: 'Descripción detallada de la funcionalidad', type: 'textarea' },
          { field: 'problema_resuelve', label: '¿Qué problema resuelve?', type: 'textarea' },
          { field: 'usuarios_beneficiados', label: '¿Qué roles se beneficiarían?', type: 'text' },
          { field: 'prioridad_negocio', label: 'Prioridad para el negocio', type: 'select', options: ['Crítica', 'Alta', 'Media', 'Baja'] }
        ]
      },
      { 
        value: 'integracion', 
        label: 'Integración con otro sistema',
        questions: [
          { field: 'sistema_externo', label: 'Sistema a integrar', type: 'text' },
          { field: 'tipo_integracion', label: 'Tipo de integración', type: 'select', options: ['Sincronización de datos', 'Notificaciones', 'Autenticación', 'Otro'] },
          { field: 'descripcion', label: 'Descripción de la integración', type: 'textarea' }
        ]
      },
      { 
        value: 'reporte', 
        label: 'Nuevo reporte o dashboard',
        questions: [
          { field: 'nombre_reporte', label: 'Nombre del reporte', type: 'text' },
          { field: 'metricas', label: '¿Qué métricas debe mostrar?', type: 'textarea' },
          { field: 'frecuencia', label: 'Frecuencia de uso', type: 'select', options: ['Diario', 'Semanal', 'Mensual', 'Ocasional'] },
          { field: 'exportable', label: '¿Debe ser exportable?', type: 'select', options: ['Sí, Excel', 'Sí, PDF', 'Sí, ambos', 'No necesario'] }
        ]
      }
    ]
  },
  mejorar_funciones: {
    label: 'Mejorar Funciones Existentes',
    description: 'Solicitar mejoras a funcionalidades actuales',
    subcategories: [
      { 
        value: 'mejora_rendimiento', 
        label: 'Mejora de rendimiento',
        questions: [
          { field: 'funcion_afectada', label: '¿Qué función es lenta?', type: 'text' },
          { field: 'tiempo_actual', label: 'Tiempo actual aproximado', type: 'text' },
          { field: 'tiempo_esperado', label: 'Tiempo esperado', type: 'text' },
          { field: 'impacto', label: '¿Cómo impacta en tu trabajo?', type: 'textarea' }
        ]
      },
      { 
        value: 'mejora_ux', 
        label: 'Mejora de usabilidad',
        questions: [
          { field: 'area_mejorar', label: '¿Qué área del sistema?', type: 'text' },
          { field: 'problema_actual', label: '¿Cuál es el problema actual?', type: 'textarea' },
          { field: 'sugerencia', label: '¿Cómo te gustaría que funcionara?', type: 'textarea' }
        ]
      },
      { 
        value: 'mejora_visual', 
        label: 'Mejora visual',
        questions: [
          { field: 'elemento', label: '¿Qué elemento visual?', type: 'text' },
          { field: 'problema', label: '¿Cuál es el problema?', type: 'textarea' },
          { field: 'sugerencia', label: 'Sugerencia de mejora', type: 'textarea' }
        ]
      }
    ]
  },
  otro: {
    label: 'Otro',
    description: 'Cualquier otro tipo de requerimiento',
    subcategories: [
      { 
        value: 'consulta', 
        label: 'Consulta general',
        questions: [
          { field: 'consulta', label: 'Describe tu consulta', type: 'textarea' }
        ]
      },
      { 
        value: 'capacitacion', 
        label: 'Solicitar capacitación',
        questions: [
          { field: 'tema', label: 'Tema de capacitación', type: 'text' },
          { field: 'participantes', label: '¿Cuántas personas participarían?', type: 'text' },
          { field: 'urgencia', label: 'Urgencia', type: 'select', options: ['Puede esperar', 'Pronto', 'Urgente'] }
        ]
      },
      { 
        value: 'otro_general', 
        label: 'Otro (especificar)',
        questions: [
          { field: 'descripcion', label: 'Describe tu requerimiento', type: 'textarea' }
        ]
      }
    ]
  }
};

// ============================================
// SERVICIO
// ============================================

class TicketService {
  // Crear un nuevo ticket
  async createTicket(data: CreateTicketData): Promise<{ ticket: SupportTicket | null; error: string | null }> {
    try {
      const { data: ticket, error } = await analysisSupabase
        .from('support_tickets')
        .insert({
          type: data.type,
          title: data.title,
          description: data.description,
          category: data.category || null,
          subcategory: data.subcategory || null,
          priority: data.priority || 'normal',
          app_version: data.app_version || null,
          user_agent: data.user_agent || null,
          current_module: data.current_module || null,
          prospecto_id: data.prospecto_id || null,
          prospecto_nombre: data.prospecto_nombre || null,
          session_details: data.session_details || null,
          screenshot_url: data.screenshot_url || null,
          screenshot_base64: data.screenshot_base64 || null,
          form_data: data.form_data || null,
          reporter_id: data.reporter_id,
          reporter_name: data.reporter_name || null,
          reporter_email: data.reporter_email || null,
          reporter_role: data.reporter_role || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket:', error);
        return { ticket: null, error: error.message };
      }

      return { ticket: ticket as SupportTicket, error: null };
    } catch (err) {
      console.error('Error in createTicket:', err);
      return { ticket: null, error: 'Error al crear el ticket' };
    }
  }

  // Obtener tickets del usuario actual
  async getMyTickets(userId: string): Promise<{ tickets: SupportTicket[]; error: string | null }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_tickets')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
        return { tickets: [], error: error.message };
      }

      return { tickets: data as SupportTicket[], error: null };
    } catch (err) {
      console.error('Error in getMyTickets:', err);
      return { tickets: [], error: 'Error al obtener tickets' };
    }
  }

  // Obtener todos los tickets (para admins)
  async getAllTickets(filters?: {
    status?: TicketStatus[];
    type?: TicketType;
    priority?: TicketPriority[];
    assignedTo?: string;
  }): Promise<{ tickets: SupportTicket[]; error: string | null }> {
    try {
      let query = analysisSupabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all tickets:', error);
        return { tickets: [], error: error.message };
      }

      return { tickets: data as SupportTicket[], error: null };
    } catch (err) {
      console.error('Error in getAllTickets:', err);
      return { tickets: [], error: 'Error al obtener tickets' };
    }
  }

  // Obtener un ticket por ID
  async getTicketById(ticketId: string): Promise<{ ticket: SupportTicket | null; error: string | null }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('Error fetching ticket:', error);
        return { ticket: null, error: error.message };
      }

      return { ticket: data as SupportTicket, error: null };
    } catch (err) {
      console.error('Error in getTicketById:', err);
      return { ticket: null, error: 'Error al obtener ticket' };
    }
  }

  // Actualizar estado del ticket
  async updateTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
    userId: string,
    userName: string,
    notes?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Obtener estado actual
      const { ticket } = await this.getTicketById(ticketId);
      if (!ticket) {
        return { success: false, error: 'Ticket no encontrado' };
      }

      const oldStatus = ticket.status;

      // Actualizar ticket
      const updateData: Partial<SupportTicket> = { status: newStatus };
      if (newStatus === 'resuelto') {
        updateData.resolved_at = new Date().toISOString();
      }
      if (newStatus === 'cerrado' || newStatus === 'cancelado') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error: updateError } = await analysisSupabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Registrar en historial
      await this.addHistoryEntry(ticketId, userId, userName, 'status_change', oldStatus, newStatus, notes);

      return { success: true, error: null };
    } catch (err) {
      console.error('Error in updateTicketStatus:', err);
      return { success: false, error: 'Error al actualizar estado' };
    }
  }

  // Asignar ticket a un usuario específico
  async assignTicket(
    ticketId: string,
    assignedTo: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase
        .from('support_tickets')
        .update({
          assigned_to: assignedTo,
          assigned_to_role: null, // Limpiar asignación por rol
          assigned_at: new Date().toISOString(),
          assigned_by: assignedBy,
          status: 'en_progreso'
        })
        .eq('id', ticketId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Registrar en historial
      await this.addHistoryEntry(ticketId, assignedBy, assignedByName, 'assignment_user', null, assignedTo);

      return { success: true, error: null };
    } catch (err) {
      console.error('Error in assignTicket:', err);
      return { success: false, error: 'Error al asignar ticket' };
    }
  }

  // Asignar ticket a un grupo de roles
  async assignTicketToRole(
    ticketId: string,
    role: string,
    assignedBy: string,
    assignedByName: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase
        .from('support_tickets')
        .update({
          assigned_to: null, // Limpiar asignación a usuario específico
          assigned_to_role: role,
          assigned_at: new Date().toISOString(),
          assigned_by: assignedBy,
          status: 'en_progreso'
        })
        .eq('id', ticketId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Registrar en historial
      await this.addHistoryEntry(ticketId, assignedBy, assignedByName, 'assignment_role', null, role);

      return { success: true, error: null };
    } catch (err) {
      console.error('Error in assignTicketToRole:', err);
      return { success: false, error: 'Error al asignar ticket al grupo' };
    }
  }

  // Quitar asignación del ticket
  async unassignTicket(
    ticketId: string,
    unassignedBy: string,
    unassignedByName: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase
        .from('support_tickets')
        .update({
          assigned_to: null,
          assigned_to_role: null,
          assigned_at: null,
          assigned_by: null
        })
        .eq('id', ticketId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Registrar en historial
      await this.addHistoryEntry(ticketId, unassignedBy, unassignedByName, 'unassignment', null, null);

      return { success: true, error: null };
    } catch (err) {
      console.error('Error in unassignTicket:', err);
      return { success: false, error: 'Error al quitar asignación' };
    }
  }

  // Obtener usuarios por rol para asignación
  // Usa user_profiles_v2 que lee de auth.users (arquitectura nativa Supabase Auth)
  async getUsersByRole(role: string): Promise<{ users: UserForAssignment[]; error: string | null }> {
    try {
      // user_profiles_v2 NO tiene avatar_url (está en tabla separada user_avatars)
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('id, full_name, email, role_name')
        .eq('role_name', role)
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Error fetching users by role:', error);
        return { users: [], error: error.message };
      }

      return { 
        users: (data || []).map(u => ({
          id: u.id,
          full_name: u.full_name || u.email?.split('@')[0] || 'Sin nombre',
          email: u.email,
          role_name: u.role_name
        })), 
        error: null 
      };
    } catch (err) {
      console.error('Error in getUsersByRole:', err);
      return { users: [], error: 'Error al obtener usuarios' };
    }
  }

  // Obtener nombre de usuario asignado
  async getAssignedUserName(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseSystemUI
        .from('user_profiles_v2')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (error || !data) return null;
      return data.full_name || data.email?.split('@')[0] || null;
    } catch {
      return null;
    }
  }

  // Agregar comentario
  async addComment(
    ticketId: string,
    userId: string,
    userName: string,
    userRole: string,
    content: string,
    isInternal: boolean = false
  ): Promise<{ comment: TicketComment | null; error: string | null }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_ticket_comments')
        .insert({
          ticket_id: ticketId,
          user_id: userId,
          user_name: userName,
          user_role: userRole,
          content,
          is_internal: isInternal
        })
        .select()
        .single();

      if (error) {
        return { comment: null, error: error.message };
      }

      return { comment: data as TicketComment, error: null };
    } catch (err) {
      console.error('Error in addComment:', err);
      return { comment: null, error: 'Error al agregar comentario' };
    }
  }

  // Obtener comentarios de un ticket
  async getTicketComments(ticketId: string): Promise<{ comments: TicketComment[]; error: string | null }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        return { comments: [], error: error.message };
      }

      return { comments: data as TicketComment[], error: null };
    } catch (err) {
      console.error('Error in getTicketComments:', err);
      return { comments: [], error: 'Error al obtener comentarios' };
    }
  }

  // Obtener historial de un ticket
  async getTicketHistory(ticketId: string): Promise<{ history: TicketHistory[]; error: string | null }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        return { history: [], error: error.message };
      }

      return { history: data as TicketHistory[], error: null };
    } catch (err) {
      console.error('Error in getTicketHistory:', err);
      return { history: [], error: 'Error al obtener historial' };
    }
  }

  // Agregar entrada al historial
  private async addHistoryEntry(
    ticketId: string,
    userId: string,
    userName: string,
    action: string,
    oldValue: string | null,
    newValue: string | null,
    notes?: string
  ): Promise<void> {
    try {
      await analysisSupabase.from('support_ticket_history').insert({
        ticket_id: ticketId,
        user_id: userId,
        user_name: userName,
        action,
        old_value: oldValue,
        new_value: newValue,
        notes: notes || null
      });
    } catch (err) {
      console.error('Error adding history entry:', err);
    }
  }

  // Obtener conteo de tickets por estado
  async getTicketStats(): Promise<{ 
    stats: Record<TicketStatus, number>; 
    total: number;
    error: string | null 
  }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_tickets')
        .select('status');

      if (error) {
        return { 
          stats: { abierto: 0, en_progreso: 0, pendiente_info: 0, resuelto: 0, cerrado: 0, cancelado: 0 }, 
          total: 0, 
          error: error.message 
        };
      }

      const stats: Record<TicketStatus, number> = {
        abierto: 0,
        en_progreso: 0,
        pendiente_info: 0,
        resuelto: 0,
        cerrado: 0,
        cancelado: 0
      };

      data.forEach((ticket: { status: TicketStatus }) => {
        stats[ticket.status]++;
      });

      return { stats, total: data.length, error: null };
    } catch (err) {
      console.error('Error in getTicketStats:', err);
      return { 
        stats: { abierto: 0, en_progreso: 0, pendiente_info: 0, resuelto: 0, cerrado: 0, cancelado: 0 }, 
        total: 0, 
        error: 'Error al obtener estadísticas' 
      };
    }
  }

  // ============================================
  // NOTIFICACIONES EN TIEMPO REAL
  // ============================================

  // Obtener conteo de notificaciones no leídas
  async getUnreadNotificationCount(userId: string): Promise<{ count: number; error: string | null }> {
    try {
      const { count, error } = await analysisSupabase
        .from('support_ticket_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        return { count: 0, error: error.message };
      }

      return { count: count || 0, error: null };
    } catch (err) {
      console.error('Error getting notification count:', err);
      return { count: 0, error: 'Error al obtener notificaciones' };
    }
  }

  // Obtener notificaciones no leídas
  async getUnreadNotifications(userId: string): Promise<{ 
    notifications: Array<{
      id: string;
      user_id: string;
      ticket_id: string;
      type: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }>; 
    error: string | null 
  }> {
    try {
      const { data, error } = await analysisSupabase
        .from('support_ticket_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return { notifications: [], error: error.message };
      }

      return { notifications: data || [], error: null };
    } catch (err) {
      console.error('Error getting notifications:', err);
      return { notifications: [], error: 'Error al obtener notificaciones' };
    }
  }

  // Marcar notificación como leída
  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase
        .from('support_ticket_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return { success: false, error: 'Error al marcar como leída' };
    }
  }

  // Marcar todas las notificaciones de un ticket como leídas
  async markTicketNotificationsAsRead(userId: string, ticketId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase
        .from('support_ticket_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('ticket_id', ticketId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error marking ticket notifications as read:', err);
      return { success: false, error: 'Error al marcar notificaciones como leídas' };
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase
        .from('support_ticket_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return { success: false, error: 'Error al marcar todas como leídas' };
    }
  }

  // Suscribirse a notificaciones en tiempo real
  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    const channel = analysisSupabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  }

  // Desuscribirse de notificaciones
  unsubscribeFromNotifications(channel: any) {
    if (channel) {
      analysisSupabase.removeChannel(channel);
    }
  }

  // ============================================
  // SISTEMA DE BADGES (NUEVO/MENSAJE)
  // ============================================

  /**
   * Marcar ticket como visto por el usuario actual
   */
  async markTicketAsViewed(ticketId: string, userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await analysisSupabase.rpc('mark_ticket_viewed', {
        ticket_id_param: ticketId,
        user_id_param: userId
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, error: null };
    } catch (err) {
      console.error('Error marking ticket as viewed:', err);
      return { success: false, error: 'Error al marcar como visto' };
    }
  }

  /**
   * Obtener tickets con información de badges (nuevo/mensaje)
   */
  async getTicketsWithBadges(userId: string): Promise<{ 
    tickets: (SupportTicket & { 
      hasNewBadge: boolean; 
      hasMessageBadge: boolean;
      unreadCount: number;
    })[]; 
    error: string | null 
  }> {
    try {
      const { data: tickets, error: ticketsError } = await analysisSupabase
        .from('support_tickets')
        .select(`
          *,
          views:support_ticket_views!support_ticket_views_ticket_id_fkey(
            last_viewed_at,
            last_comment_read_at,
            user_id
          ),
          notifications:support_ticket_notifications(
            id,
            is_read,
            user_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (ticketsError) {
        return { tickets: [], error: ticketsError.message };
      }
      
      const ticketsWithBadges = (tickets || []).map(ticket => {
        const userView = (ticket.views as any)?.find((v: any) => v.user_id === userId);
        const userNotifications = ((ticket.notifications as any) || []).filter((n: any) => n.user_id === userId);
        const unreadCount = userNotifications.filter((n: any) => !n.is_read).length;
        
        // Badge "Nuevo": No ha sido visto por este usuario
        const hasNewBadge = !userView;
        
        // Badge "Mensaje": Hay comentarios nuevos desde la última vez que se vio
        const hasMessageBadge = userView && 
                                ticket.last_comment_at && 
                                ticket.last_comment_by !== userId &&
                                new Date(ticket.last_comment_at) > new Date(userView.last_comment_read_at || 0);
        
        // Eliminar propiedades temporales
        const { views, notifications, ...ticketData } = ticket;
        
        return {
          ...ticketData as SupportTicket,
          hasNewBadge,
          hasMessageBadge,
          unreadCount
        };
      });
      
      return { tickets: ticketsWithBadges, error: null };
    } catch (err) {
      console.error('Error getting tickets with badges:', err);
      return { tickets: [], error: 'Error al obtener tickets' };
    }
  }

  /**
   * Crear ticket como usuario system (sin notificaciones iniciales)
   * Los tickets system se crean pre-asignados para evitar notificaciones masivas
   * Usa RPC con SECURITY DEFINER para bypassear RLS
   */
  async createSystemTicket(
    data: CreateTicketData,
    assignedTo?: string,
    assignedToRole?: string,
    logId?: string
  ): Promise<{ ticket: SupportTicket | null; error: string | null }> {
    try {
      const { data: ticketData, error } = await analysisSupabase
        .rpc('create_system_ticket', {
          p_type: data.type,
          p_title: data.title,
          p_description: data.description,
          p_category: data.category || null,
          p_subcategory: data.subcategory || null,
          p_priority: data.priority || 'normal',
          p_form_data: data.form_data || null,
          p_assigned_to: assignedTo || null,
          p_assigned_to_role: assignedToRole || null,
          p_log_id: logId || null
        });

      if (error) {
        console.error('Error creating system ticket via RPC:', error);
        return { ticket: null, error: error.message };
      }

      // La función retorna JSONB directamente
      return { ticket: ticketData as SupportTicket, error: null };
    } catch (err) {
      console.error('Error in createSystemTicket:', err);
      return { ticket: null, error: 'Error al crear el ticket' };
    }
  }

  /**
   * Verificar si un log ya tiene un ticket asociado
   */
  async checkLogHasTicket(logId: string): Promise<{
    hasTicket: boolean;
    ticketId?: string;
    ticketNumber?: string;
    ticketStatus?: string;
    error: string | null;
  }> {
    try {
      const { data, error } = await analysisSupabase
        .rpc('check_log_has_ticket', { p_log_id: logId })
        .single();

      if (error) {
        console.error('Error checking log ticket:', error);
        return { hasTicket: false, error: error.message };
      }

      return {
        hasTicket: data.has_ticket,
        ticketId: data.ticket_id,
        ticketNumber: data.ticket_number,
        ticketStatus: data.ticket_status,
        error: null
      };
    } catch (err) {
      console.error('Error in checkLogHasTicket:', err);
      return { hasTicket: false, error: 'Error al verificar ticket' };
    }
  }
}

export const ticketService = new TicketService();
export default ticketService;
