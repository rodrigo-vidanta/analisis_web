// ============================================
// SERVICIO PARA TIMELINE DE DIRECCIÓN
// ============================================

import { supabaseSystemUI as supabase, supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import toast from 'react-hot-toast';
import type { TimelineActivity, ProcessedActivity, DuplicateCheck } from './timelineTypes';

// Re-exportar tipos para compatibilidad
export type { TimelineActivity, ProcessedActivity, DuplicateCheck } from './timelineTypes';

class TimelineService {
  // Obtener todas las actividades del usuario
  async getActivities(userId: string): Promise<TimelineActivity[]> {
    try {
      const { data, error } = await supabase
        .from('timeline_activities')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });

      if (error) throw error;
      
      // Mapear datos y extraer parent_id, tags y attachments de metadata
      const activities = (data || []).map(activity => ({
        ...activity,
        archivado: activity.archivado ?? false,
        parent_id: activity.metadata?.parent_id || null,
        tags: activity.metadata?.tags || [],
        attachments: activity.metadata?.attachments || [],
        subtasks: [] // Inicializar array de subtareas
      }));

      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error al cargar actividades');
      return [];
    }
  }

  // Crear nueva actividad
  async createActivity(activity: Omit<TimelineActivity, 'id' | 'created_at' | 'updated_at'>): Promise<TimelineActivity | null> {
    try {
      // Preparar metadata con parent_id, tags y attachments
      const metadata = { ...activity.metadata };
      if (activity.parent_id) metadata.parent_id = activity.parent_id;
      if (activity.tags) metadata.tags = activity.tags;
      if (activity.attachments) metadata.attachments = activity.attachments;

      const activityToInsert = {
        ...activity,
        metadata
      };
      // Eliminar propiedades virtuales del objeto raíz
      delete (activityToInsert as any).parent_id;
      delete (activityToInsert as any).subtasks;
      delete (activityToInsert as any).tags;
      delete (activityToInsert as any).attachments;

      const { data, error } = await supabase
        .from('timeline_activities')
        .insert([activityToInsert])
        .select()
        .single();

      if (error) throw error;
      
      // Restaurar propiedades en la respuesta
      const result = {
        ...data,
        parent_id: data.metadata?.parent_id || null,
        tags: data.metadata?.tags || [],
        attachments: data.metadata?.attachments || [],
        subtasks: []
      };

      toast.success('Actividad creada exitosamente');
      return result;
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Error al crear actividad');
      return null;
    }
  }

  // Crear múltiples actividades con soporte robusto para subtareas
  async createActivities(activities: (Omit<TimelineActivity, 'id' | 'created_at' | 'updated_at'> & { subtasks?: any[] })[]): Promise<TimelineActivity[]> {
    try {
      if (activities.length === 0) return [];
      
      const userId = activities[0].user_id;
      if (!userId) throw new Error('user_id es requerido para crear actividades');

      // Detectar si hay subtareas para decidir estrategia
      const hasSubtasks = activities.some(a => a.subtasks && Array.isArray(a.subtasks) && a.subtasks.length > 0);

      // Si hay subtareas, usamos inserción secuencial manual para garantizar integridad referencial (padre -> hijo)
      // Si NO hay subtareas, podemos intentar optimizar con RPC o batch insert
      if (hasSubtasks) {
        console.log('⚡️ Detectadas subtareas, usando inserción secuencial para garantizar jerarquía...');
        const results: TimelineActivity[] = [];

        for (const activity of activities) {
          // 1. Preparar padre
          const metadata = { ...activity.metadata };
          if (activity.tags) metadata.tags = activity.tags;
          if (activity.attachments) metadata.attachments = activity.attachments;
          // parent_id vendría en metadata si es una actividad raíz que ya es hija de otra (caso raro en batch root)
          
          const activityToInsert = {
            title: activity.title,
            description: activity.description || null,
            due_date: activity.due_date,
            status: activity.status || 'pending',
            priority: activity.priority || 'media',
            asignado_a: activity.asignado_a || [],
            realizado: activity.realizado || false,
            archivado: activity.archivado || false,
            user_id: userId,
            metadata: metadata
          };
            
          // 2. Insertar padre
            const { data: parentData, error: parentError } = await supabaseSystemUIAdmin
              .from('timeline_activities')
            .insert([activityToInsert])
              .select()
              .single();

          if (parentError) throw parentError;
            
            if (parentData) {
              const parent = {
                ...parentData,
                parent_id: parentData.metadata?.parent_id || null,
              tags: parentData.metadata?.tags || [],
              attachments: parentData.metadata?.attachments || [],
                subtasks: []
              };
              results.push(parent);

            // 3. Insertar subtareas si existen
            if (activity.subtasks && activity.subtasks.length > 0) {
              const subtasksToInsert = activity.subtasks.map(sub => {
                const subMetadata = { ...sub.metadata, parent_id: parentData.id };
                if (sub.tags) subMetadata.tags = sub.tags;
                
                return {
                  user_id: userId,
                  title: sub.title,
                  description: sub.description || null,
                  due_date: sub.due_date || parentData.due_date, // Heredar fecha por defecto
                  status: 'pending',
                  priority: sub.priority || 'media',
                  asignado_a: sub.asignado_a || [],
                  realizado: false,
                  archivado: false,
                  metadata: subMetadata
                };
              });

                const { data: subtasksData, error: subtasksError } = await supabaseSystemUIAdmin
                  .from('timeline_activities')
                  .insert(subtasksToInsert)
                  .select();

                if (subtasksError) {
                  console.error('Error insertando subtareas:', subtasksError);
                } else if (subtasksData) {
                // Agregar al resultado plano (o anidado si se prefiere, pero el frontend usa lista plana)
                  const createdSubtasks = subtasksData.map(st => ({
                    ...st,
                    parent_id: parentData.id,
                  tags: st.metadata?.tags || [],
                  attachments: st.metadata?.attachments || [],
                    subtasks: []
                  }));
                  results.push(...createdSubtasks);
                }
              }
            }
          }
        toast.success(`${results.length} actividades creadas correctamente`);
        return results;
      } else {
        // Estrategia optimizada para actividades planas (sin subtareas)
        // Intentamos RPC primero
        try {
          const { data, error } = await supabase.rpc('create_timeline_activities', {
            p_activities: activities.map(a => ({
              title: a.title,
              description: a.description || null,
              due_date: a.due_date,
              status: a.status || 'pending',
              priority: a.priority || 'media',
              asignado_a: a.asignado_a || [],
              realizado: a.realizado || false,
              archivado: a.archivado || false,
              metadata: { 
                ...a.metadata,
                tags: a.tags || [],
                attachments: a.attachments || []
              }
            })),
            p_user_id: userId
          });

          if (error) throw error;
          
          const results = (data || []).map((item: any) => ({
            ...item,
            parent_id: item.metadata?.parent_id || null,
            tags: item.metadata?.tags || [],
            attachments: item.metadata?.attachments || [],
            subtasks: []
          }));

          toast.success(`${results.length} actividades creadas`);
          return results;

        } catch (rpcError: any) {
          // Fallback a batch insert directo
          console.warn('⚠️ RPC falló o no existe, usando batch insert directo');
          const batchData = activities.map(a => ({
            user_id: userId,
            title: a.title,
            description: a.description || null,
            due_date: a.due_date,
            status: a.status || 'pending',
            priority: a.priority || 'media',
            asignado_a: a.asignado_a || [],
            realizado: a.realizado || false,
            archivado: a.archivado || false,
            metadata: { 
              ...a.metadata,
              tags: a.tags || [],
              attachments: a.attachments || []
            }
          }));

          const { data, error } = await supabaseSystemUIAdmin
            .from('timeline_activities')
            .insert(batchData)
            .select();

          if (error) throw error;

          const results = (data || []).map((item: any) => ({
            ...item,
            parent_id: item.metadata?.parent_id || null,
            tags: item.metadata?.tags || [],
            attachments: item.metadata?.attachments || [],
            subtasks: []
          }));

          toast.success(`${results.length} actividades creadas`);
          return results;
        }
      }
    } catch (error) {
      console.error('Error creating activities:', error);
      toast.error('Error al crear actividades');
      return [];
    }
  }

  // Actualizar actividad
  async updateActivity(id: string, updates: Partial<TimelineActivity>): Promise<TimelineActivity | null> {
    try {
      console.log('📝 Actualizando actividad:', { id, updates });
      
      const updatesToApply: any = { ...updates };
      
      // Gestión de metadata (merge inteligente)
      if (updates.parent_id !== undefined || updates.tags !== undefined || updates.attachments !== undefined || updates.metadata) {
        const { data: current } = await supabaseSystemUIAdmin
          .from('timeline_activities')
          .select('metadata')
          .eq('id', id)
          .single();
          
        const currentMetadata = current?.metadata || {};
        const newMetadata = { ...currentMetadata, ...(updates.metadata || {}) };

        if (updates.parent_id !== undefined) newMetadata.parent_id = updates.parent_id;
        if (updates.tags !== undefined) newMetadata.tags = updates.tags;
        if (updates.attachments !== undefined) newMetadata.attachments = updates.attachments;

        updatesToApply.metadata = newMetadata;
        
        // Limpiar propiedades virtuales
        delete updatesToApply.parent_id;
        delete updatesToApply.tags;
        delete updatesToApply.attachments;
      }
      
      delete updatesToApply.subtasks; // No enviar subtasks a BD

      const { data, error } = await supabaseSystemUIAdmin
        .from('timeline_activities')
        .update(updatesToApply)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const result = {
        ...data,
        parent_id: data.metadata?.parent_id || null,
        tags: data.metadata?.tags || [],
        attachments: data.metadata?.attachments || [],
        subtasks: []
      };
      
      return result;
    } catch (error) {
      console.error('❌ Error updating activity:', error);
      toast.error('Error al actualizar actividad');
      return null;
    }
  }

  // Actualizar fecha de actividad con lógica en cascada
  async updateActivityDate(id: string, newDate: string, userId: string): Promise<boolean> {
    try {
      const { data: current, error: fetchError } = await supabaseSystemUIAdmin
        .from('timeline_activities')
        .select('*')
        .eq('id', id)
        .single();
        
      if (fetchError || !current) throw fetchError || new Error('Activity not found');

      const oldDateStr = current.due_date;
      if (oldDateStr === newDate) return true;

      const parentId = current.metadata?.parent_id;

      // Caso 1: Es subtarea -> Promocionar a principal (desvincular del padre)
      if (parentId) {
        console.log('Promoviendo subtarea a tarea principal por cambio de fecha');
        await this.updateActivity(id, {
           due_date: newDate,
           parent_id: null // Setear a null para quitar del padre
        });
        return true;
      }

      // Caso 2: Es tarea principal -> Actualizar fecha y mover hijos en cascada
      const oldDate = new Date(oldDateStr);
      const targetDate = new Date(newDate);
      const diffTime = targetDate.getTime() - oldDate.getTime();
      
      // Actualizar padre
      await this.updateActivity(id, { due_date: newDate });

      // Buscar hijos y actualizar
      const { data: children } = await supabaseSystemUIAdmin
        .from('timeline_activities')
        .select('*')
        .eq('user_id', userId)
        .contains('metadata', { parent_id: id });

      if (children && children.length > 0) {
        console.log(`Actualizando ${children.length} subtareas en cascada`);
        await Promise.all(children.map(child => {
          const childOldDate = new Date(child.due_date);
          const childNewDate = new Date(childOldDate.getTime() + diffTime);
          const childNewDateStr = childNewDate.toISOString().split('T')[0];
          
          return this.updateActivity(child.id, { due_date: childNewDateStr });
        }));
      }

      return true;
    } catch (error) {
      console.error('Error updating activity date:', error);
      toast.error('Error al actualizar fecha en cascada');
      return false;
    }
  }

  // Eliminar actividad
  async deleteActivity(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('timeline_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Actividad eliminada');
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Error al eliminar actividad');
      return false;
    }
  }

  // Subir archivo a storage
  async uploadFile(file: File, path: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('system_ui')
        .upload(path, file, {
          upsert: true
        });
            
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('system_ui')
        .getPublicUrl(data.path);
            
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
      return null;
    }
  }

  // Procesar texto con LLM vía N8N
  async processActivitiesWithLLM(text: string): Promise<ProcessedActivity[]> {
    try {
      const response = await fetch('https://primary-dev-d75a.up.railway.app/webhook/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Respuesta recibida del webhook:', JSON.stringify(data).substring(0, 500));
      
      // Estrategia de parseo resiliente
      let activities: any[] = [];

      // Intento 1: Propiedad 'activities' directa
      if (Array.isArray(data.activities)) {
        activities = data.activities;
      } 
      // Intento 2: Array directo
      else if (Array.isArray(data)) {
        activities = data;
      }
      // Intento 3: Estructura de mensaje de Anthropic (content array)
      else if (data.content && Array.isArray(data.content)) {
        const textContent = data.content.find((c: any) => c.type === 'text')?.text;
        if (textContent) activities = this.tryParseAndRepairJson(textContent) || [];
      }
      // Intento 4: Estructura de mensaje Anthropic en array
      else if (Array.isArray(data) && data.length > 0 && data[0].content) {
        const textContent = data[0].content.find((c: any) => c.type === 'text')?.text;
        if (textContent) activities = this.tryParseAndRepairJson(textContent) || [];
      }

      if (activities.length > 0) {
        console.log(`✅ ${activities.length} actividades extraídas correctamente`);
        return activities;
      }

      throw new Error('No se pudieron extraer actividades del formato recibido');
    } catch (error) {
      console.error('Error processing with LLM:', error);
      toast.error('Error al procesar actividades con IA');
      throw error;
    }
  }

  // Helper para reparar y parsear JSON
  private tryParseAndRepairJson(textContent: string): any[] | null {
      try {
        // Intentar parseo directo primero
        try {
            const parsed = JSON.parse(textContent);
            if (Array.isArray(parsed.activities)) return parsed.activities;
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { /* Fallo silencioso, intentar reparación */ }

        // Buscar inicio de JSON
        let jsonStart = textContent.indexOf('{');
        if (jsonStart === -1) jsonStart = textContent.indexOf('[');
        if (jsonStart === -1) return null;
        
        let jsonText = textContent.substring(jsonStart);
        
        // Reparación básica de array truncado
        // Buscar el último '}' o ']' válido
        let lastBrace = jsonText.lastIndexOf('}');
        let lastBracket = jsonText.lastIndexOf(']');
        
        // Si parece cortado, intentamos cerrarlo
        if (lastBrace > -1 && lastBracket === -1) {
            // Probablemente un objeto abierto o un array de objetos abierto
            jsonText = jsonText.substring(0, lastBrace + 1) + ']'; // Intento ingenuo
        }

        // Regex fallback: Extraer objetos individuales válidos
        const activityMatches = jsonText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (activityMatches && activityMatches.length > 0) {
            const valid = activityMatches
                .map(m => { try { return JSON.parse(m); } catch { return null; }})
                .filter(a => a && a.title && a.due_date); // Validar campos mínimos
            if (valid.length > 0) return valid;
        }
        
        return null;
      } catch (e) {
        console.error('Error in JSON repair:', e);
        return null;
      }
  }

  // Verificar duplicados
  async checkDuplicates(activities: ProcessedActivity[], userId: string): Promise<DuplicateCheck[]> {
    try {
      const existingActivities = await this.getActivities(userId);

      return activities.map((activity) => {
        const exactMatch = existingActivities.find(
          (existing) => existing.title.toLowerCase().trim() === activity.title.toLowerCase().trim()
        );

        if (exactMatch) {
          const existingDate = new Date(exactMatch.due_date).toISOString().split('T')[0];
          const newDate = new Date(activity.due_date).toISOString().split('T')[0];

          if (existingDate !== newDate) {
            return {
              activity,
              isDuplicate: true,
              existingId: exactMatch.id,
              isUpdate: true,
              reason: `Actualización de fecha (${existingDate} → ${newDate})`,
            };
          }

          return {
            activity,
            isDuplicate: true,
            existingId: exactMatch.id,
            isUpdate: false,
            reason: 'Duplicado exacto',
          };
        }

        return { activity, isDuplicate: false };
      });
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return activities.map((activity) => ({ activity, isDuplicate: false }));
    }
  }
}

export const timelineService = new TimelineService();
