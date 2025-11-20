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
      // Asegurar que archivado tenga valor por defecto
      return (data || []).map(activity => ({
        ...activity,
        archivado: activity.archivado ?? false
      }));
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error al cargar actividades');
      return [];
    }
  }

  // Crear nueva actividad
  async createActivity(activity: Omit<TimelineActivity, 'id' | 'created_at' | 'updated_at'>): Promise<TimelineActivity | null> {
    try {
      const { data, error } = await supabase
        .from('timeline_activities')
        .insert([activity])
        .select()
        .single();

      if (error) throw error;
      toast.success('Actividad creada exitosamente');
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Error al crear actividad');
      return null;
    }
  }

  // Crear múltiples actividades
  async createActivities(activities: Omit<TimelineActivity, 'id' | 'created_at' | 'updated_at'>[]): Promise<TimelineActivity[]> {
    try {
      // Validar que todas las actividades tengan user_id
      if (activities.length === 0) return [];
      
      const userId = activities[0].user_id;
      if (!userId) {
        throw new Error('user_id es requerido para crear actividades');
      }

      // Intentar usar función RPC primero (si existe)
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
            metadata: a.metadata || {}
          })),
          p_user_id: userId
        });

        if (error) throw error;
        toast.success(`${activities.length} actividades creadas exitosamente`);
        return data || [];
      } catch (rpcError: any) {
        // Si la función RPC no existe (error 42883), usar método directo
        if (rpcError?.code === '42883' || rpcError?.message?.includes('function') || rpcError?.message?.includes('does not exist')) {
          console.warn('⚠️ Función RPC no encontrada, usando método directo');
          
          // Método directo: usar cliente admin para evitar problemas de RLS
          const results: TimelineActivity[] = [];
          for (const activity of activities) {
            // Asegurar que los campos nuevos tengan valores por defecto
            const activityToInsert = {
              ...activity,
              asignado_a: activity.asignado_a || [],
              realizado: activity.realizado !== undefined ? activity.realizado : false,
              archivado: activity.archivado !== undefined ? activity.archivado : false,
              priority: activity.priority || 'media'
            };
            
            const { data, error } = await supabaseSystemUIAdmin
              .from('timeline_activities')
              .insert([activityToInsert])
              .select()
              .single();

            if (error) {
              console.error('Error insertando actividad:', error);
              throw error;
            }
            
            if (data) results.push(data);
          }

          toast.success(`${results.length} actividades creadas exitosamente`);
          return results;
        }
        throw rpcError;
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
      
      // Usar admin client para evitar problemas de RLS
      const { data, error } = await supabaseSystemUIAdmin
        .from('timeline_activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error en update:', error);
        throw error;
      }
      
      console.log('✅ Actividad actualizada exitosamente:', data);
      toast.success('Actividad actualizada');
      return data;
    } catch (error) {
      console.error('❌ Error updating activity:', error);
      toast.error('Error al actualizar actividad');
      return null;
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
      
      // Detectar si la respuesta está truncada por max_tokens
      let isTruncated = false;
      if (Array.isArray(data) && data.length > 0 && data[0].stop_reason === 'max_tokens') {
        isTruncated = true;
        console.warn('⚠️ Respuesta truncada por max_tokens, intentando extraer actividades válidas...');
      } else if (data.stop_reason === 'max_tokens') {
        isTruncated = true;
        console.warn('⚠️ Respuesta truncada por max_tokens, intentando extraer actividades válidas...');
      }
      
      // Manejar respuesta de Anthropic API (formato de mensaje como objeto único)
      if (data && typeof data === 'object' && data.content && Array.isArray(data.content)) {
        // Formato Anthropic: { content: [{ type: "text", text: "..." }] }
        const textContent = data.content.find((c: any) => c.type === 'text')?.text;
        if (textContent) {
          try {
            console.log('📝 Texto extraído:', textContent.substring(0, 200));
            
            // Intentar parsear el JSON directamente
            let parsed = JSON.parse(textContent);
            console.log('✅ JSON parseado:', parsed);
            
            if (Array.isArray(parsed.activities)) {
              console.log('✅ Actividades encontradas:', parsed.activities.length);
              return parsed.activities;
            } else if (Array.isArray(parsed)) {
              console.log('✅ Array directo encontrado:', parsed.length);
              return parsed;
            }
          } catch (parseError: any) {
            console.warn('⚠️ Error parsing JSON, intentando reparar...', parseError.message);
            
            // Intentar reparar JSON truncado o con problemas
            try {
              // Buscar el inicio del JSON (debe empezar con { o [)
              let jsonStart = textContent.indexOf('{');
              if (jsonStart === -1) jsonStart = textContent.indexOf('[');
              
              if (jsonStart === -1) {
                throw new Error('No se encontró inicio de JSON válido');
              }
              
              // Extraer desde el inicio del JSON
              let jsonText = textContent.substring(jsonStart);
              
              // Intentar encontrar el final del JSON válido
              // Buscar el último objeto completo dentro del array de actividades
              let braceCount = 0;
              let bracketCount = 0;
              let lastValidIndex = -1;
              let inString = false;
              let escapeNext = false;
              
              // Buscar el array de actividades
              const activitiesStart = jsonText.indexOf('"activities"');
              if (activitiesStart === -1) {
                throw new Error('No se encontró el array de actividades');
              }
              
              // Encontrar el inicio del array [
              let arrayStart = jsonText.indexOf('[', activitiesStart);
              if (arrayStart === -1) {
                throw new Error('No se encontró el inicio del array');
              }
              
              // Contar desde el inicio del array
              bracketCount = 1; // Ya encontramos el [
              braceCount = 0;
              
              for (let i = arrayStart + 1; i < jsonText.length; i++) {
                const char = jsonText[i];
                
                // Manejar strings y escapes
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                
                if (char === '"' && !escapeNext) {
                  inString = !inString;
                  continue;
                }
                
                if (inString) continue;
                
                // Contar llaves y corchetes fuera de strings
                if (char === '{') braceCount++;
                if (char === '}') {
                  braceCount--;
                  // Si cerramos un objeto y estamos en el nivel del array, guardar posición
                  if (braceCount === 0 && bracketCount === 1) {
                    lastValidIndex = i;
                  }
                }
                if (char === '[') bracketCount++;
                if (char === ']') {
                  bracketCount--;
                  // Si cerramos el array principal, guardar posición
                  if (bracketCount === 0 && braceCount === 0) {
                    lastValidIndex = i;
                    break;
                  }
                }
              }
              
              // Si encontramos un punto válido, construir JSON válido
              if (lastValidIndex > 0) {
                // Extraer desde el inicio hasta el último objeto completo de actividad
                const jsonStart = jsonText.indexOf('{');
                const jsonUntilLastObject = jsonText.substring(jsonStart, lastValidIndex + 1);
                
                // Buscar el inicio del array de actividades para construir correctamente
                const activitiesKeyPos = jsonUntilLastObject.indexOf('"activities"');
                const arrayStartPos = jsonUntilLastObject.indexOf('[', activitiesKeyPos);
                
                if (arrayStartPos > 0) {
                  // Construir JSON válido: inicio + array con objetos completos + cierre
                  const beforeActivities = jsonUntilLastObject.substring(0, arrayStartPos + 1);
                  const activitiesContent = jsonUntilLastObject.substring(arrayStartPos + 1);
                  
                  // Construir JSON completo
                  jsonText = beforeActivities + activitiesContent + '\n  ]\n}';
                } else {
                  // Fallback: agregar cierre básico
                  jsonText = jsonUntilLastObject + '\n  ]\n}';
                }
                
                console.log('🔧 JSON truncado reparado, longitud:', jsonText.length);
                
                // Intentar parsear el JSON reparado
                const parsed = JSON.parse(jsonText);
                
                if (Array.isArray(parsed.activities)) {
                  console.log(`✅ Actividades encontradas (JSON reparado): ${parsed.activities.length}`);
                  return parsed.activities;
                } else if (Array.isArray(parsed)) {
                  console.log(`✅ Array directo encontrado (JSON reparado): ${parsed.length}`);
                  return parsed;
                }
              } else {
                // Si no encontramos un punto válido, intentar extraer objetos individuales
                console.warn('⚠️ No se pudo encontrar punto válido, intentando extraer objetos individuales...');
                // Buscar todos los objetos completos usando regex
                const activityMatches = jsonText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                if (activityMatches && activityMatches.length > 0) {
                  const validActivities = activityMatches
                    .map(match => {
                      try {
                        return JSON.parse(match);
                      } catch {
                        return null;
                      }
                    })
                    .filter(activity => activity && activity.title && activity.due_date);
                  
                  if (validActivities.length > 0) {
                    console.log(`✅ Extraídas ${validActivities.length} actividades válidas de objetos individuales`);
                    return validActivities;
                  }
                }
              }
              
              // Intentar parsear el JSON reparado
              const parsed = JSON.parse(jsonText);
              
              if (Array.isArray(parsed.activities)) {
                console.log('✅ Actividades encontradas (JSON reparado):', parsed.activities.length);
                return parsed.activities;
              } else if (Array.isArray(parsed)) {
                console.log('✅ Array directo encontrado (JSON reparado):', parsed.length);
                return parsed;
              }
            } catch (repairError) {
              console.error('❌ Error parsing JSON from Anthropic response:', parseError);
              console.error('📝 Texto completo:', textContent.substring(0, 1000));
              console.error('❌ No se pudo reparar el JSON:', repairError);
              throw new Error('Error al parsear respuesta del LLM: JSON inválido o truncado');
            }
          }
        } else {
          console.warn('⚠️ No se encontró contenido de texto en la respuesta');
        }
      }
      
      // Manejar respuesta de Anthropic API (formato de mensaje como array)
      if (Array.isArray(data) && data.length > 0 && data[0].content) {
        // Formato Anthropic: [{ content: [{ type: "text", text: "..." }] }]
        const textContent = data[0].content.find((c: any) => c.type === 'text')?.text;
        if (textContent) {
          try {
            console.log('📝 Texto extraído (array):', textContent.substring(0, 200));
            const parsed = JSON.parse(textContent);
            console.log('✅ JSON parseado:', parsed);
            
            if (Array.isArray(parsed.activities)) {
              console.log('✅ Actividades encontradas:', parsed.activities.length);
              return parsed.activities;
            } else if (Array.isArray(parsed)) {
              console.log('✅ Array directo encontrado:', parsed.length);
              return parsed;
            }
          } catch (parseError: any) {
            console.warn('⚠️ Error parsing JSON (array format), intentando reparar...', parseError.message);
            
            // Intentar reparar JSON truncado (mismo método que arriba)
            try {
              let jsonStart = textContent.indexOf('{');
              if (jsonStart === -1) jsonStart = textContent.indexOf('[');
              
              if (jsonStart === -1) {
                throw new Error('No se encontró inicio de JSON válido');
              }
              
              let jsonText = textContent.substring(jsonStart);
              let braceCount = 0;
              let bracketCount = 0;
              let lastValidIndex = -1;
              
              for (let i = 0; i < jsonText.length; i++) {
                if (jsonText[i] === '{') braceCount++;
                if (jsonText[i] === '}') braceCount--;
                if (jsonText[i] === '[') bracketCount++;
                if (jsonText[i] === ']') bracketCount--;
                
                if (braceCount === 0 && bracketCount === 0 && i > 0) {
                  lastValidIndex = i;
                }
              }
              
              if (lastValidIndex > 0) {
                jsonText = jsonText.substring(0, lastValidIndex + 1);
                console.log('🔧 JSON truncado reparado (array format), longitud:', jsonText.length);
              }
              
              const parsed = JSON.parse(jsonText);
              
              if (Array.isArray(parsed.activities)) {
                console.log('✅ Actividades encontradas (JSON reparado):', parsed.activities.length);
                return parsed.activities;
              } else if (Array.isArray(parsed)) {
                console.log('✅ Array directo encontrado (JSON reparado):', parsed.length);
                return parsed;
              }
            } catch (repairError) {
              console.error('❌ Error parsing JSON from Anthropic response:', parseError);
              console.error('📝 Texto completo:', textContent.substring(0, 1000));
              console.error('❌ No se pudo reparar el JSON:', repairError);
              throw new Error('Error al parsear respuesta del LLM: JSON inválido o truncado');
            }
          }
        }
      }
      
      // Formato directo: { activities: [...] }
      if (Array.isArray(data.activities)) {
        console.log('✅ Actividades en formato directo:', data.activities.length);
        return data.activities;
      }
      
      // Formato array directo: [...]
      if (Array.isArray(data)) {
        console.log('✅ Array directo:', data.length);
        return data;
      }
      
      console.error('❌ Formato de respuesta inválido. Data recibida:', data);
      throw new Error('Formato de respuesta inválido');
    } catch (error) {
      console.error('Error processing with LLM:', error);
      toast.error('Error al procesar actividades con IA');
      throw error;
    }
  }

  // Verificar duplicados comparando con actividades existentes
  async checkDuplicates(
    activities: ProcessedActivity[],
    userId: string
  ): Promise<DuplicateCheck[]> {
    try {
      // Obtener actividades existentes del usuario
      const existingActivities = await this.getActivities(userId);

      return activities.map((activity) => {
        // Buscar por título exacto
        const exactMatch = existingActivities.find(
          (existing) => existing.title.toLowerCase().trim() === activity.title.toLowerCase().trim()
        );

        if (exactMatch) {
          // Si la fecha es diferente, es una actualización potencial
          const existingDate = new Date(exactMatch.due_date).toISOString().split('T')[0];
          const newDate = new Date(activity.due_date).toISOString().split('T')[0];

          if (existingDate !== newDate) {
            return {
              activity,
              isDuplicate: true,
              existingId: exactMatch.id,
              isUpdate: true,
              reason: `Actividad existente con fecha diferente (${existingDate} → ${newDate})`,
            };
          }

          return {
            activity,
            isDuplicate: true,
            existingId: exactMatch.id,
            isUpdate: false,
            reason: 'Actividad duplicada exacta',
          };
        }

        // Buscar por similitud de título (títulos muy similares)
        const similarMatch = existingActivities.find((existing) => {
          const existingTitle = existing.title.toLowerCase().trim();
          const newTitle = activity.title.toLowerCase().trim();
          
          // Si uno contiene al otro o viceversa (con al menos 80% de similitud)
          return (
            existingTitle.includes(newTitle) ||
            newTitle.includes(existingTitle) ||
            this.calculateSimilarity(existingTitle, newTitle) > 0.8
          );
        });

        if (similarMatch) {
          return {
            activity,
            isDuplicate: true,
            existingId: similarMatch.id,
            isUpdate: false,
            reason: 'Actividad similar encontrada',
          };
        }

        return {
          activity,
          isDuplicate: false,
        };
      });
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return activities.map((activity) => ({
        activity,
        isDuplicate: false,
      }));
    }
  }

  // Calcular similitud entre dos strings (algoritmo simple de Levenshtein)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const timelineService = new TimelineService();
