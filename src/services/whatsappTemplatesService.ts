import { analysisSupabase } from '../config/analysisSupabase';
import type {
  VariableMapping,
  WhatsAppTemplateComponent,
  WhatsAppTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TableField,
  TableSchema,
} from '../types/whatsappTemplates';

/**
 * ============================================
 * SERVICIO DE PLANTILLAS WHATSAPP
 * ============================================
 * 
 * Gestión completa de plantillas de WhatsApp para uChat
 * Incluye CRUD, sincronización con uChat y vinculación dinámica de variables
 */

// Re-exportar tipos para compatibilidad
export type {
  VariableMapping,
  WhatsAppTemplateComponent,
  WhatsAppTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TableField,
  TableSchema,
} from '../types/whatsappTemplates';

// ============================================
// CONFIGURACIÓN DEL WEBHOOK
// ============================================

const WEBHOOK_BASE_URL = 'https://primary-dev-d75a.up.railway.app';
const WEBHOOK_AUTH_TOKEN = 'wFRpkQv4cdmAg976dzEfTDML86vVlGLZmBUIMgftO0rkwhfJHkzVRuQa51W0tXTV';

// ============================================
// SERVICIO PRINCIPAL
// ============================================

class WhatsAppTemplatesService {
  /**
   * Obtener todas las plantillas (solo las no eliminadas)
   */
  async getAllTemplates(): Promise<WhatsAppTemplate[]> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_templates')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      // Si el campo is_deleted no existe, intentar con is_active = true como fallback
      if (error.code === '42703' || error.message?.includes('is_deleted')) {
        console.warn('Campo is_deleted no encontrado, usando is_active como filtro');
        const { data: fallbackData, error: fallbackError } = await analysisSupabase
          .from('whatsapp_templates')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      throw error;
    }
    return data || [];
  }

  /**
   * Obtener una plantilla por ID
   */
  async getTemplateById(id: string): Promise<WhatsAppTemplate | null> {
    const { data, error } = await analysisSupabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    return data;
  }

  /**
   * Generar ejemplos dummy para los components según las variables encontradas
   */
  private generateDummyExamples(components: WhatsAppTemplateComponent[]): WhatsAppTemplateComponent[] {
    return components.map(component => {
      if (component.type === 'BODY' && component.text) {
        // Extraer variables del texto
        const variables = this.extractVariables(component.text);
        
        // Generar ejemplos dummy para cada variable
        const dummyValues: string[] = [];
        variables.forEach((varNum, index) => {
          // Valores dummy según el número de variable
          const dummyData = [
            'Juan',
            'María',
            'Carlos',
            'Ana',
            'Pedro',
            'Laura',
            'Roberto',
            'Sofía',
            'Miguel',
            'Carmen'
          ];
          dummyValues.push(dummyData[index % dummyData.length] || `Ejemplo${varNum}`);
        });
        
        // Formato requerido: body_text es un array de arrays (una fila por cada ejemplo)
        // Cada fila contiene los valores de las variables en orden
        return {
          ...component,
          example: {
            body_text: [dummyValues]
          }
        };
      } else if (component.type === 'HEADER' && component.format === 'TEXT' && component.text) {
        // Para headers de texto, generar ejemplo dummy
        const variables = this.extractVariables(component.text);
        const dummyValues: string[] = [];
        variables.forEach((varNum, index) => {
          const dummyData = ['Ejemplo', 'Demo', 'Test'];
          dummyValues.push(dummyData[index % dummyData.length] || `Ejemplo${varNum}`);
        });
        
        return {
          ...component,
          example: {
            header_text: dummyValues
          }
        };
      }
      
      return component;
    });
  }

  /**
   * Obtener datos completos de audiencias por sus IDs
   */
  private async getAudiencesByIds(audienceIds: string[]): Promise<any[]> {
    if (!audienceIds || audienceIds.length === 0) return [];
    
    try {
      const { data, error } = await analysisSupabase
        .from('whatsapp_audiences')
        .select('*')
        .in('id', audienceIds);
      
      if (error) {
        console.error('Error obteniendo audiencias:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error obteniendo audiencias:', error);
      return [];
    }
  }

  /**
   * Llamar al webhook para crear template en uChat
   */
  private async createTemplateInUChat(input: CreateTemplateInput): Promise<any> {
    try {
      // Generar ejemplos dummy para los components
      const componentsWithExamples = this.generateDummyExamples(input.components);
      
      // Obtener datos completos de las audiencias seleccionadas
      const audienceIds = input.classification?.audience_ids || [];
      const audiences = await this.getAudiencesByIds(audienceIds);
      
      const payload = {
        name: input.name,
        language: input.language,
        category: input.category,
        components: componentsWithExamples,
        description: input.description || undefined,
        // Array de IDs de audiencias para referencia
        audience_ids: audienceIds,
        // Array separado con datos completos de las audiencias
        audiences: audiences.map(aud => ({
          id: aud.id,
          nombre: aud.nombre,
          descripcion: aud.descripcion,
          etapa: aud.etapa,
          destino: aud.destino,
          estado_civil: aud.estado_civil,
          tipo_audiencia: aud.tipo_audiencia,
          preferencia_entretenimiento: aud.preferencia_entretenimiento,
          prospectos_count: aud.prospectos_count,
        })),
      };

      console.log('📤 Enviando plantilla con audiencias:', {
        name: payload.name,
        audience_ids: payload.audience_ids,
        audiences_count: payload.audiences.length,
      });

      // Crear AbortController para timeout de 15 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 segundos

      try {
        const response = await fetch(`${WEBHOOK_BASE_URL}/webhook/whatsapp-templates`, {
          method: 'POST',
          headers: {
            'Auth': WEBHOOK_AUTH_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        let result;
        
        try {
          result = JSON.parse(responseText);
        } catch {
          // Si el response es 400, crear un error específico
          if (response.status === 400) {
            const error = new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
            (error as any).status = 400;
            throw error;
          }
          throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
        }

        // Si el response es 400, crear un error específico
        if (response.status === 400) {
          const error = new Error(result.error || result.message || `Error ${response.status}`);
          (error as any).status = 400;
          throw error;
        }

        if (!response.ok || !result.success) {
          const error = new Error(result.error || result.message || `Error ${response.status}`);
          if (response.status === 400) {
            (error as any).status = 400;
          }
          throw error;
        }

        return result.data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Si es un error de abort (timeout)
        if (fetchError.name === 'AbortError') {
          const timeoutError = new Error('La solicitud tardó demasiado tiempo. Por favor, intente nuevamente.');
          (timeoutError as any).status = 408; // Request Timeout
          throw timeoutError;
        }
        
        // Re-lanzar el error si ya tiene status 400
        if (fetchError.status === 400) {
          throw fetchError;
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Error creando template en uChat:', error);
      throw error;
    }
  }

  /**
   * Crear una nueva plantilla (solo a través del webhook)
   * El webhook maneja tanto uChat como la base de datos
   */
  async createTemplate(input: CreateTemplateInput): Promise<WhatsAppTemplate> {
    // Crear a través del webhook (maneja uChat y BD)
    const uchatData = await this.createTemplateInUChat(input);
    console.log('✅ Template creado a través del webhook:', uchatData);
    
    // El webhook devuelve los datos completos de la plantilla
    // Incluir variable_mappings en la respuesta si no vienen del webhook
    return {
      ...uchatData,
      variable_mappings: input.variable_mappings || [],
    } as WhatsAppTemplate;
  }

  /**
   * Obtener template desde uChat por ID
   */
  private async getTemplateFromUChat(templateId: string): Promise<any | null> {
    try {
      const response = await fetch(
        `${WEBHOOK_BASE_URL}/webhook/whatsapp-templates?id=${templateId}`,
        {
          method: 'POST',
          headers: {
            'Auth': WEBHOOK_AUTH_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      const responseText = await response.text();
      
      // Si no existe (404), retornar null
      if (response.status === 404 || !responseText.trim()) {
        return null;
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
      }

      if (!response.ok || !result.success) {
        // Si el error indica que no existe, retornar null
        if (response.status === 404 || result.error?.includes('not found') || result.error?.includes('no existe')) {
          return null;
        }
        throw new Error(result.error || result.message || `Error ${response.status}`);
      }

      return result.data;
    } catch (error: any) {
      // Si es un error 404 o similar, retornar null (no existe)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return null;
      }
      console.error('Error obteniendo template desde uChat:', error);
      throw error;
    }
  }

  /**
   * Llamar al webhook para actualizar template en uChat
   */
  private async updateTemplateInUChat(templateId: string, input: UpdateTemplateInput): Promise<any> {
    try {
      const response = await fetch(
        `${WEBHOOK_BASE_URL}/webhook/whatsapp-templates?id=${templateId}`,
        {
          method: 'POST',
          headers: {
            'Auth': WEBHOOK_AUTH_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        }
      );

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || `Error ${response.status}`);
      }

      return result.data;
    } catch (error: any) {
      console.error('Error actualizando template en uChat:', error);
      throw error;
    }
  }

  /**
   * Actualizar una plantilla (solo a través del webhook)
   * El webhook maneja tanto uChat como la base de datos
   */
  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<WhatsAppTemplate> {
    // Obtener template actual para verificar si está sincronizado
    const currentTemplate = await this.getTemplateById(id);
    if (!currentTemplate) {
      throw new Error('Template no encontrado');
    }

    // Si tiene components, generar ejemplos dummy
    let updatePayload = { ...input };
    if (input.components) {
      const componentsWithExamples = this.generateDummyExamples(input.components);
      updatePayload = { ...input, components: componentsWithExamples };
    }

    // Manejar sincronización con uChat
    let uchatData = null;

    if (!currentTemplate.uchat_synced) {
      // Si NO está sincronizado, primero verificar si existe en uChat
      console.log('🔍 Template no sincronizado, verificando si existe en uChat...');
      const existingTemplate = await this.getTemplateFromUChat(id);
      
      if (existingTemplate) {
        // Existe en uChat, actualizar
        console.log('✅ Template encontrado en uChat, actualizando...');
        uchatData = await this.updateTemplateInUChat(id, updatePayload);
        console.log('✅ Template actualizado a través del webhook');
      } else {
        // No existe en uChat, crear como nueva
        console.log('➕ Template no existe en uChat, creando como nueva...');
        // Preparar payload para creación (necesita name, language, category, components)
        const createPayload: CreateTemplateInput = {
          name: currentTemplate.name,
          language: currentTemplate.language,
          category: currentTemplate.category,
          components: updatePayload.components || currentTemplate.components,
          description: updatePayload.description || currentTemplate.description || undefined,
        };
        
        uchatData = await this.createTemplateInUChat(createPayload);
        console.log('✅ Template creado a través del webhook');
      }
    } else {
      // Ya está sincronizado, solo actualizar
      uchatData = await this.updateTemplateInUChat(id, updatePayload);
      console.log('✅ Template actualizado a través del webhook');
    }

    // El webhook devuelve los datos completos de la plantilla actualizada
    // Preservar variable_mappings si no vienen del webhook
    return {
      ...uchatData,
      variable_mappings: input.variable_mappings !== undefined ? input.variable_mappings : currentTemplate.variable_mappings,
    } as WhatsAppTemplate;
  }

  /**
   * Llamar al webhook para eliminar template en uChat (soft delete)
   */
  private async deleteTemplateInUChat(templateId: string): Promise<any> {
    try {
      const url = `${WEBHOOK_BASE_URL}/webhook/whatsapp-templates?id=${templateId}`;
      const payload = { _method: 'DELETE' };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Auth': WEBHOOK_AUTH_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Error parseando respuesta:', parseError);
        throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
      }

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || `Error ${response.status}`;
        console.error('❌ Error en respuesta del webhook:', errorMsg);
        throw new Error(errorMsg);
      }

      return result.data;
    } catch (error: any) {
      console.error('❌ Error eliminando template en uChat:', error);
      throw error;
    }
  }

  /**
   * Eliminar una plantilla (solo a través del webhook - soft delete)
   * El webhook maneja tanto uChat como la base de datos
   */
  async deleteTemplate(id: string): Promise<void> {
    // Obtener template actual para verificar si está sincronizado
    const currentTemplate = await this.getTemplateById(id);
    
    if (!currentTemplate) {
      throw new Error('Plantilla no encontrada');
    }

    // Siempre intentar eliminar a través del webhook primero
    // El webhook maneja tanto uChat como la base de datos
    try {
      await this.deleteTemplateInUChat(id);
    } catch (error: any) {
      console.warn('⚠️ Error eliminando a través del webhook, intentando fallback:', error);
      
      // Si falla el webhook, hacer soft delete en BD local como fallback
      // Marcar como eliminado usando is_deleted si existe, sino is_active = false
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Intentar usar is_deleted primero, si no existe usar is_active
      try {
        const { error: updateError } = await analysisSupabase
          .from('whatsapp_templates')
          .update({
            is_deleted: true,
            ...updateData,
          })
          .eq('id', id);

        if (updateError) {
          // Si is_deleted no existe, usar is_active como fallback
          const { error: fallbackError } = await analysisSupabase
            .from('whatsapp_templates')
            .update({
              is_active: false,
              ...updateData,
            })
            .eq('id', id);

          if (fallbackError) throw fallbackError;
          console.log('✅ Template marcado como inactivo en BD local (fallback)');
        } else {
          console.log('✅ Template marcado como eliminado en BD local (fallback)');
        }
      } catch (fallbackError: any) {
        console.error('❌ Error en fallback de eliminación:', fallbackError);
        // Re-lanzar el error original del webhook si el fallback también falla
        throw error;
      }
    }
  }

  /**
   * Activar/Desactivar una plantilla
   * Solo actualiza en base de datos local (control de UI, no afecta uChat)
   */
  async toggleTemplateActive(id: string, isActive: boolean): Promise<WhatsAppTemplate> {
    try {
      console.log(`🔄 Cambiando estado de plantilla ${id} a ${isActive ? 'activa' : 'inactiva'} (solo BD local)`);
      
      const { data, error } = await analysisSupabase
        .from('whatsapp_templates')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ Estado de plantilla ${id} actualizado en BD local`);
      return data;
    } catch (error: any) {
      console.error(`Error cambiando estado de plantilla ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtener esquemas de tablas disponibles para variables
   */
  async getAvailableTableSchemas(): Promise<TableSchema[]> {
    const schemas: TableSchema[] = [];

    // Variables predefinidas del sistema
    schemas.push({
      table_name: 'system',
      display_name: 'Variables del Sistema',
      fields: [
        { name: 'fecha_actual', type: 'date', display_name: 'Fecha Actual' },
        { name: 'fecha_personalizada', type: 'date', display_name: 'Fecha Personalizada' },
        { name: 'hora_actual', type: 'time', display_name: 'Hora Actual' },
        { name: 'hora_personalizada', type: 'time', display_name: 'Hora Personalizada' },
        { name: 'ejecutivo_nombre', type: 'string', display_name: 'Nombre del Ejecutivo' },
      ],
    });

    // Esquema de prospectos
    schemas.push({
      table_name: 'prospectos',
      display_name: 'Prospectos',
      fields: [
        { name: 'nombre_completo', type: 'string', display_name: 'Nombre Completo' },
        { name: 'nombre', type: 'string', display_name: 'Nombre' },
        { name: 'apellido_paterno', type: 'string', display_name: 'Apellido Paterno' },
        { name: 'apellido_materno', type: 'string', display_name: 'Apellido Materno' },
        { name: 'nombre_whatsapp', type: 'string', display_name: 'Nombre WhatsApp' },
        { name: 'whatsapp', type: 'string', display_name: 'Número WhatsApp' },
        { name: 'telefono_principal', type: 'string', display_name: 'Teléfono Principal' },
        { name: 'email', type: 'string', display_name: 'Email' },
        { name: 'titulo', type: 'string', display_name: 'Título' },
        { name: 'ciudad_residencia', type: 'string', display_name: 'Ciudad de Residencia' },
        { name: 'edad', type: 'number', display_name: 'Edad' },
        { name: 'estado_civil', type: 'string', display_name: 'Estado Civil' },
        { name: 'destino_preferencia', type: 'array', display_name: 'Destinos Preferidos' },
        { name: 'tamano_grupo', type: 'number', display_name: 'Tamaño del Grupo' },
        { name: 'cantidad_menores', type: 'number', display_name: 'Cantidad de Menores' },
        { name: 'viaja_con', type: 'string', display_name: 'Viaja Con' },
        { name: 'asesor_asignado', type: 'string', display_name: 'Asesor Asignado' },
      ],
    });

    // Esquema de destinos
    schemas.push({
      table_name: 'destinos',
      display_name: 'Destinos',
      fields: [
        { name: 'nombre', type: 'string', display_name: 'Nombre del Destino' },
        { name: 'nombre_anterior', type: 'string', display_name: 'Nombre Anterior' },
        { name: 'descripcion', type: 'string', display_name: 'Descripción' },
        { name: 'estado', type: 'string', display_name: 'Estado' },
        { name: 'aeropuerto_cercano', type: 'string', display_name: 'Aeropuerto Cercano' },
        { name: 'clima', type: 'string', display_name: 'Clima' },
        { name: 'mejor_epoca_visitar', type: 'string', display_name: 'Mejor Época para Visitar' },
      ],
    });

    // Esquema de resorts
    schemas.push({
      table_name: 'resorts',
      display_name: 'Resorts',
      fields: [
        { name: 'nombre', type: 'string', display_name: 'Nombre del Resort' },
        { name: 'nombre_completo', type: 'string', display_name: 'Nombre Completo' },
        { name: 'categoria', type: 'string', display_name: 'Categoría' },
        { name: 'descripcion', type: 'string', display_name: 'Descripción' },
        { name: 'direccion', type: 'string', display_name: 'Dirección' },
        { name: 'telefono', type: 'string', display_name: 'Teléfono' },
        { name: 'habitaciones_total', type: 'number', display_name: 'Total de Habitaciones' },
        { name: 'playa_km', type: 'number', display_name: 'Kilómetros de Playa' },
        { name: 'albercas', type: 'number', display_name: 'Número de Albercas' },
        { name: 'restaurantes', type: 'number', display_name: 'Número de Restaurantes' },
        { name: 'campo_golf_nombre', type: 'string', display_name: 'Nombre del Campo de Golf' },
      ],
    });

    // Esquema de discovery (llamadas_ventas) - Datos del prospecto obtenidos en llamadas
    schemas.push({
      table_name: 'llamadas_ventas',
      display_name: 'Discovery (Llamadas)',
      fields: [
        // Datos directos de la tabla
        { name: 'composicion_familiar_numero', type: 'number', display_name: 'Composición Familiar (Número)' },
        { name: 'destino_preferido', type: 'string', display_name: 'Destino Preferido' },
        { name: 'preferencia_vacaciones', type: 'string', display_name: 'Preferencia de Vacaciones' },
        { name: 'numero_noches', type: 'number', display_name: 'Número de Noches' },
        { name: 'mes_preferencia', type: 'string', display_name: 'Mes de Preferencia' },
        { name: 'estado_civil', type: 'string', display_name: 'Estado Civil' },
        { name: 'edad', type: 'number', display_name: 'Edad' },
        { name: 'propuesta_economica_ofrecida', type: 'string', display_name: 'Propuesta Económica' },
        { name: 'habitacion_ofertada', type: 'string', display_name: 'Habitación Ofertada' },
        { name: 'resort_ofertado', type: 'string', display_name: 'Resort Ofertado' },
        { name: 'resumen_llamada', type: 'string', display_name: 'Resumen de Llamada' },
        // Datos anidados en datos_proceso (JSONB)
        { name: 'datos_proceso.numero_personas', type: 'number', display_name: 'Número de Personas (Discovery)' },
        { name: 'datos_proceso.duracion_estancia_noches', type: 'number', display_name: 'Duración de Estancia (Noches)' },
        { name: 'datos_proceso.discovery_completo', type: 'boolean', display_name: 'Discovery Completo' },
        { name: 'datos_proceso.metodo_pago_discutido', type: 'string', display_name: 'Método de Pago Discutido' },
      ],
    });

    return schemas;
  }

  /**
   * Obtener valores para variables predefinidas del sistema
   */
  getSystemVariableValue(fieldName: string, customValue?: string, ejecutivoNombre?: string): string {
    const now = new Date();
    
    switch (fieldName) {
      case 'fecha_actual':
        // Formato: "11 de abril" (sin año)
        return now.toLocaleDateString('es-MX', { 
          month: 'long', 
          day: 'numeric' 
        });
      case 'fecha_personalizada':
        // Formatear fecha personalizada en formato "11 de abril" (sin año)
        if (customValue && customValue.trim() !== '') {
          // customValue viene en formato "YYYY-MM-DD" del input date
          console.log('🔧 getSystemVariableValue - fecha_personalizada recibida:', customValue);
          const customDate = new Date(customValue + 'T00:00:00'); // Agregar hora para evitar problemas de zona horaria
          console.log('🔧 Fecha parseada:', customDate, 'isValid:', !isNaN(customDate.getTime()));
          if (!isNaN(customDate.getTime())) {
            const formatted = customDate.toLocaleDateString('es-MX', { 
              month: 'long', 
              day: 'numeric' 
            });
            console.log('🔧 Fecha formateada:', formatted);
            return formatted;
          }
        }
        console.log('⚠️ fecha_personalizada sin valor válido, retornando placeholder');
        return '{{fecha_por_usuario}}';
      case 'hora_actual':
        // Formato: "4:30pm"
        return now.toLocaleTimeString('es-MX', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      case 'hora_personalizada':
        // Formatear hora personalizada en formato "4:30pm"
        if (customValue) {
          // customValue viene en formato "HH:MM" (24 horas)
          const [hours, minutes] = customValue.split(':');
          const hour = parseInt(hours, 10);
          const minute = parseInt(minutes, 10);
          const date = new Date();
          date.setHours(hour);
          date.setMinutes(minute);
          return date.toLocaleTimeString('es-MX', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        }
        return '{{hora_por_usuario}}';
      case 'ejecutivo_nombre':
        // Mostrar nombre completo del ejecutivo (ej: "Vanessa Gonzalez")
        return ejecutivoNombre || '[Ejecutivo]';
      default:
        return customValue || '';
    }
  }

  /**
   * Obtener lista de destinos disponibles
   */
  async getDestinos(): Promise<Array<{ id: string; nombre: string }>> {
    try {
      const { data, error } = await analysisSupabase
        .from('destinos')
        .select('id, nombre')
        .eq('is_active', true)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo destinos:', error);
      return [];
    }
  }

  /**
   * Obtener lista de resorts disponibles por destino
   */
  async getResortsByDestino(destinoId: string): Promise<Array<{ id: string; nombre: string; nombre_completo: string }>> {
    try {
      const { data, error } = await analysisSupabase
        .from('resorts')
        .select('id, nombre, nombre_completo')
        .eq('destino_id', destinoId)
        .eq('is_active', true)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo resorts:', error);
      return [];
    }
  }

  /**
   * Extraer variables de un texto de plantilla
   */
  extractVariables(text: string): number[] {
    const regex = /\{\{(\d+)\}\}/g;
    const variables: number[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(text)) !== null) {
      const num = parseInt(match[1], 10);
      if (!variables.includes(num)) {
        variables.push(num);
      }
    }
    
    return variables.sort((a, b) => a - b);
  }

  /**
   * Validar que todas las variables tengan mapeos (excluyendo variables del sistema)
   */
  validateVariableMappings(
    components: WhatsAppTemplateComponent[],
    mappings: VariableMapping[],
    systemVariableNumbers: number[] = []
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const variables: number[] = [];

    // Extraer todas las variables de los componentes
    components.forEach(component => {
      if (component.text) {
        const vars = this.extractVariables(component.text);
        vars.forEach(v => {
          // Excluir variables del sistema (identificadas por números o por mapeo)
          const isSystemVar = systemVariableNumbers.includes(v) || 
                             mappings.find(m => m.variable_number === v && m.table_name === 'system');
          if (!variables.includes(v) && !isSystemVar) {
            variables.push(v);
          }
        });
      }
    });

    // Verificar que cada variable dinámica tenga un mapeo
    variables.forEach(variable => {
      const mapping = mappings.find(m => m.variable_number === variable);
      if (!mapping) {
        errors.push(`La variable {{${variable}}} no tiene un mapeo asignado`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtener datos de ejemplo de una tabla específica
   * Soporta campos anidados JSONB usando notación de punto (ej: "datos_proceso.numero_personas")
   */
  async getTableExampleData(tableName: string, fieldName: string): Promise<string | null> {
    try {
      // Verificar si es un campo anidado (JSONB)
      const isNestedField = fieldName.includes('.');
      
      let selectField = fieldName;
      let nestedPath: string[] = [];
      
      if (isNestedField) {
        // Para campos anidados como "datos_proceso.numero_personas"
        const parts = fieldName.split('.');
        selectField = parts[0]; // "datos_proceso"
        nestedPath = parts.slice(1); // ["numero_personas"]
      }
      
      // Para llamadas_ventas, buscar un registro con datos más completos
      let query;
      if (tableName === 'llamadas_ventas') {
        // Intentar obtener un registro con datos de discovery más completos
        query = analysisSupabase
          .from(tableName)
          .select(selectField)
          .not(isNestedField ? selectField : fieldName, 'is', null)
          .limit(5);
      } else {
        query = analysisSupabase.from(tableName).select(selectField).limit(1);
      }
      
      const { data, error } = await query;
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      // Para llamadas_ventas, buscar el primer registro con valor no nulo
      let value: any = null;
      
      for (const record of data) {
        let recordValue = record[selectField];
        
        // Si es campo anidado, navegar la estructura JSONB
        if (isNestedField && recordValue && typeof recordValue === 'object') {
          for (const key of nestedPath) {
            recordValue = recordValue?.[key];
          }
        }
        
        if (recordValue !== null && recordValue !== undefined) {
          value = recordValue;
          break;
        }
      }
      
      if (value === null || value === undefined) {
        return null;
      }
      
      // Convertir a string si es necesario
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      
      if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
      }
      
      return String(value);
    } catch (error) {
      console.error(`Error obteniendo ejemplo de ${tableName}.${fieldName}:`, error);
      return null;
    }
  }

  /**
   * Generar ejemplo de plantilla con valores reales de la base de datos
   */
  async generateExample(
    template: WhatsAppTemplate, 
    customVariables?: Record<number, string>,
    ejecutivoNombre?: string
  ): Promise<string> {
    let example = '';
    
    // Crear un mapa de valores de ejemplo para cada variable
    const exampleValues: Record<number, string> = {};
    
    // Extraer todas las variables del texto
    const allVariablesInText: number[] = [];
    template.components.forEach(component => {
      if (component.text) {
        const vars = this.extractVariables(component.text);
        vars.forEach(v => {
          if (!allVariablesInText.includes(v)) {
            allVariablesInText.push(v);
          }
        });
      }
    });

    // PRIMERO: Usar valores de customVariables si están disponibles (ya vienen formateados desde ReactivateConversationModal)
    if (customVariables) {
      Object.keys(customVariables).forEach(key => {
        const varNum = parseInt(key, 10);
        if (customVariables[varNum] && customVariables[varNum].trim() !== '') {
          exampleValues[varNum] = customVariables[varNum];
          console.log('✅ Usando customVariable para variable', varNum, ':', customVariables[varNum]);
        }
      });
    }
    
    // Segundo: procesar variables del sistema que están en el texto pero pueden no estar mapeadas
    const systemVariableMappings = (template.variable_mappings || []).filter(m => m.table_name === 'system');
    
    // Procesar todas las variables del sistema encontradas en el texto
    allVariablesInText.forEach(varNum => {
      // Si ya tiene un valor (de customVariables), no sobrescribir
      if (exampleValues[varNum]) {
        console.log('⏭️ Variable', varNum, 'ya tiene valor, omitiendo procesamiento del sistema');
        return;
      }
      
      // Buscar si tiene mapeo de sistema
      const systemMapping = systemVariableMappings.find(m => m.variable_number === varNum);
      if (systemMapping) {
        // Solo usar custom_value del mapping si no hay valor en customVariables
        console.log('🔄 Procesando variable del sistema', varNum, 'con field_name:', systemMapping.field_name);
        exampleValues[varNum] = this.getSystemVariableValue(
          systemMapping.field_name,
          systemMapping.custom_value,
          ejecutivoNombre
        );
      }
    });
    
    // Obtener valores reales de la base de datos para cada mapeo
    if (template.variable_mappings && template.variable_mappings.length > 0) {
      await Promise.all(
        template.variable_mappings.map(async (mapping) => {
          // Si ya tiene valor (de customVariables o sistema), no procesar de nuevo
          if (exampleValues[mapping.variable_number]) {
            console.log('⏭️ Mapping', mapping.variable_number, 'ya tiene valor, omitiendo');
            return;
          }
          
          // Si es variable del sistema, ya se procesó arriba (o debería estar en customVariables)
          if (mapping.table_name === 'system') {
            console.log('⏭️ Mapping', mapping.variable_number, 'es del sistema, omitiendo procesamiento de BD');
            return;
          }

          // Obtener valores de tablas
          const exampleValue = await this.getTableExampleData(
            mapping.table_name,
            mapping.field_name
          );
          
          if (exampleValue) {
            exampleValues[mapping.variable_number] = exampleValue;
          } else {
            // Valores por defecto si no hay datos
            const defaults: Record<string, Record<string, string>> = {
              prospectos: {
                nombre: 'Juan',
                nombre_completo: 'Juan Pérez',
                apellido_paterno: 'Pérez',
                apellido_materno: 'García',
                nombre_whatsapp: 'Juan Pérez',
                whatsapp: '+521234567890',
                telefono_principal: '+521234567890',
                email: 'juan@example.com',
                ciudad_residencia: 'Ciudad de México',
                edad: '35',
                estado_civil: 'Casado',
                destino_preferencia: 'Riviera Maya, Los Cabos',
                tamano_grupo: '4',
                cantidad_menores: '2',
                viaja_con: 'Familia',
                asesor_asignado: 'María González',
              },
              destinos: {
                nombre: 'Nuevo Nayarit',
                nombre_anterior: 'Nuevo Vallarta',
                descripcion: 'Destino de playa en la Riviera Nayarit',
                estado: 'Nayarit',
                aeropuerto_cercano: 'Aeropuerto Internacional de Puerto Vallarta',
                clima: 'Tropical',
                mejor_epoca_visitar: 'Octubre - Mayo',
              },
              resorts: {
                nombre: 'The Grand Mayan',
                nombre_completo: 'The Grand Mayan Nuevo Vallarta',
                categoria: 'The Grand Mayan',
                descripcion: 'Resort de lujo con vistas al océano',
                direccion: 'Blvd. Nuevo Vallarta',
                telefono: '+52 322 123 4567',
                habitaciones_total: '500',
                playa_km: '2',
                albercas: '12',
                restaurantes: '8',
                campo_golf_nombre: 'Nayar Golf Course',
              },
              llamadas_ventas: {
                // Datos directos de la tabla
                composicion_familiar_numero: '4',
                destino_preferido: 'Riviera Maya',
                preferencia_vacaciones: 'Mixto (descanso y entretenimiento)',
                numero_noches: '7',
                mes_preferencia: 'Diciembre',
                estado_civil: 'Casado(a)',
                edad: '38',
                propuesta_economica_ofrecida: '$2,500 USD (pago inicial)',
                habitacion_ofertada: 'Suite Master',
                resort_ofertado: 'Grand Mayan Riviera Maya',
                resumen_llamada: 'Cliente interesado en vacaciones familiares',
                // Campos anidados de datos_proceso
                'datos_proceso.numero_personas': '4',
                'datos_proceso.duracion_estancia_noches': '7',
                'datos_proceso.discovery_completo': 'Sí',
                'datos_proceso.metodo_pago_discutido': 'Tarjeta de crédito',
              },
            };
            
            const defaultValue = defaults[mapping.table_name]?.[mapping.field_name] || `[${mapping.display_name}]`;
            exampleValues[mapping.variable_number] = defaultValue;
          }
        })
      );
    }
    
    // Reemplazar variables en los componentes
    template.components.forEach(component => {
      if (component.text) {
        let text = component.text;
        
        // Reemplazar todas las variables con sus valores de ejemplo
        // Ordenar por número descendente para evitar problemas con reemplazos parciales
        const sortedVarNums = Object.keys(exampleValues)
          .map(n => parseInt(n, 10))
          .sort((a, b) => b - a);
        
        sortedVarNums.forEach(varNum => {
          const value = exampleValues[varNum];
          if (value) {
            // Reemplazar todas las ocurrencias de esta variable
            text = text.replace(
              new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'),
              value
            );
          }
        });
        
        example += text + '\n';
      }
    });
    
    return example.trim();
  }

  /**
   * Sincronizar todas las plantillas desde uChat hacia la base de datos
   */
  async syncTemplatesFromUChat(): Promise<{ synced: number; templates: any[] }> {
    try {
      console.log('🔄 Llamando al webhook de sincronización global...');
      const response = await fetch(
        `${WEBHOOK_BASE_URL}/webhook/whatsapp-templates?action=sync`,
        {
          method: 'POST',
          headers: {
            'Auth': WEBHOOK_AUTH_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      const responseText = await response.text();
      console.log('📥 Respuesta raw del webhook:', responseText);
      
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Error del servidor (${response.status}): ${responseText || response.statusText}`);
      }

      console.log('📦 Resultado parseado:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || `Error ${response.status}`);
      }

      // Manejar diferentes formatos de respuesta
      const data = result.data;
      
      // Si data tiene la estructura esperada { synced, templates }
      if (data && typeof data.synced === 'number' && Array.isArray(data.templates)) {
        console.log(`✅ Sincronización exitosa: ${data.synced} plantilla(s)`);
        return data;
      }
      
      // Si data es un array de templates
      if (Array.isArray(data)) {
        console.log(`✅ Sincronización exitosa: ${data.length} plantilla(s)`);
        return {
          synced: data.length,
          templates: data
        };
      }
      
      // Si data es un objeto individual (template único)
      if (data && typeof data === 'object' && data.id) {
        console.log(`✅ Sincronización exitosa: 1 plantilla`);
        return {
          synced: 1,
          templates: [data]
        };
      }
      
      // Formato desconocido, intentar devolver lo que venga
      console.warn('⚠️ Formato de respuesta desconocido, devolviendo estructura por defecto');
      return {
        synced: 1,
        templates: data ? [data] : []
      };
    } catch (error: any) {
      console.error('❌ Error sincronizando templates desde uChat:', error);
      throw error;
    }
  }

  /**
   * Sincronizar una plantilla individual desde uChat hacia la base de datos
   * Obtiene la plantilla desde uChat y la actualiza en la BD local
   * Preserva los variable_mappings existentes
   */
  async syncSingleTemplateFromUChat(templateId: string): Promise<WhatsAppTemplate> {
    try {
      console.log(`🔄 Sincronizando plantilla individual desde uChat: ${templateId}`);
      
      // Obtener la plantilla actual de la BD para preservar variable_mappings
      const currentTemplate = await this.getTemplateById(templateId);
      if (!currentTemplate) {
        throw new Error('Plantilla no encontrada en la base de datos local');
      }
      
      // Obtener la plantilla desde uChat a través del webhook
      const uchatTemplate = await this.getTemplateFromUChat(templateId);
      
      if (!uchatTemplate) {
        throw new Error('Plantilla no encontrada en uChat');
      }

      // Actualizar en la base de datos local, preservando variable_mappings
      const { data, error } = await analysisSupabase
        .from('whatsapp_templates')
        .update({
          name: uchatTemplate.name,
          language: uchatTemplate.language,
          category: uchatTemplate.category,
          components: uchatTemplate.components,
          status: uchatTemplate.status,
          rejection_reason: uchatTemplate.rejection_reason || null,
          uchat_synced: true,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Preservar variable_mappings existentes
          variable_mappings: currentTemplate.variable_mappings || [],
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ Plantilla ${templateId} sincronizada exitosamente`);
      return data;
    } catch (error: any) {
      console.error(`Error sincronizando plantilla individual ${templateId}:`, error);
      throw error;
    }
  }
}

export const whatsappTemplatesService = new WhatsAppTemplatesService();
