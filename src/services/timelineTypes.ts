// ============================================
// TIPOS PARA TIMELINE DE DIRECCIÓN
// ============================================

export interface TimelineActivity {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'baja' | 'media' | 'alta' | 'critica';
  asignado_a: string[]; // Array de nombres de personas asignadas (texto libre)
  realizado: boolean;
  archivado: boolean; // Nueva propiedad para archivar tareas
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ProcessedActivity {
  title: string;
  description?: string;
  due_date: string;
  priority?: 'baja' | 'media' | 'alta' | 'critica';
  asignado_a?: string[]; // Array de nombres o IDs de usuarios asignados
}

export interface DuplicateCheck {
  activity: ProcessedActivity;
  isDuplicate: boolean;
  existingId?: string;
  isUpdate?: boolean;
  reason?: string;
}

