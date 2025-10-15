// ============================================
// SERVICIO PARA LIVE MONITOR
// Gestión de prospectos, agentes y transferencias
// ============================================

import { analysisSupabase } from '../config/analysisSupabase';

// Tipos para llamadas de ventas (tabla principal)
export interface SalesCall {
  call_id: string;
  fecha_llamada: string;
  duracion_segundos: number;
  es_venta_exitosa: boolean;
  nivel_interes: any;
  probabilidad_cierre: number;
  costo_total: number;
  tipo_llamada: any;
  oferta_presentada: boolean;
  precio_ofertado: any;
  requiere_seguimiento: boolean;
  datos_llamada: any;
  datos_proceso: any;
  datos_objeciones: any;
  prospecto: string; // UUID del prospecto
  audio_ruta_bucket: any;
  // Nuevas columnas para control VAPI
  monitor_url?: string;
  control_url?: string;
  transport_url?: string; // Nueva: WebSocket Transport de alta calidad
  call_sid?: string;
  transport?: string;
  provider?: string;
  account_sid?: string;
  call_status?: 'activa' | 'transferida' | 'colgada' | 'perdida' | 'exitosa';
}

// Tipo combinado para el Live Monitor (llamada + datos del prospecto)
export interface LiveCallData {
  // Datos de la llamada (tabla llamadas_ventas)
  call_id: string;
  call_status: 'activa' | 'transferida' | 'colgada' | 'perdida' | 'exitosa';
  fecha_llamada: string;
  monitor_url?: string;
  control_url?: string;
  transport_url?: string; // WebSocket Transport de alta calidad
  call_sid?: string;
  provider?: string;
  account_sid?: string;
  duracion_segundos: number;
  nivel_interes: any;
  datos_llamada: any;
  audio_ruta_bucket?: string;
  
  // Datos del prospecto (tabla prospectos)
  prospecto_id: string;
  nombre_completo: string | null;
  nombre_whatsapp: string;
  whatsapp: string;
  etapa: string;
  temperatura_prospecto?: 'frio' | 'tibio' | 'caliente';
  observaciones?: string;
  tamano_grupo?: number;
  destino_preferencia?: string[];
  ciudad_residencia?: string;
  email?: string;
  edad?: number;
  viaja_con?: string;
  cantidad_menores?: number;
  updated_at: string;
  
  // Campos adicionales para el modal
  estado_civil?: string;
  interes_principal?: string;
  campana_origen?: string;
  es_venta_exitosa?: boolean;
  precio_ofertado?: string;
  tipo_llamada?: string;
  oferta_presentada?: boolean;
  requiere_seguimiento?: boolean;
  costo_total?: string;
  probabilidad_cierre?: string;
  
  // Campos de feedback
  tiene_feedback?: boolean;
  feedback_resultado?: string;
  feedback_comentarios?: string;
  feedback_user_email?: string;
  feedback_fecha?: string;
}

// Mantener interfaz Prospect para compatibilidad
export interface Prospect {
  id: string;
  nombre_completo: string | null;
  nombre_whatsapp: string;
  whatsapp: string;
  etapa: string;
  temperatura_prospecto?: 'frio' | 'tibio' | 'caliente';
  checkpoint_transferencia?: string;
  agente_asignado?: string;
  status_transferencia?: 'pendiente' | 'transferida' | 'completada';
  updated_at: string;
  observaciones?: string;
  tamano_grupo?: number;
  destino_preferencia?: string[];
  feedback_agente?: string;
  resultado_transferencia?: string;
  fecha_transferencia?: string;
  llamada_activa?: boolean;
}

export interface Agent {
  id: string;
  agent_name: string;
  agent_email: string;
  is_active: boolean;
  total_calls_handled: number;
  current_position?: number;
  last_call_time?: string;
}

export interface FeedbackData {
  call_id: string;
  prospect_id: string;
  user_email: string; // Usuario logueado que da el feedback
  resultado: 'contestada' | 'perdida' | 'transferida' | 'problemas_tecnicos';
  comentarios: string;
  fecha_feedback: string;
}

class LiveMonitorService {
  
  // ============================================
  // GESTIÓN DE LLAMADAS ACTIVAS (TABLA PRINCIPAL)
  // ============================================
  
  /**
   * Obtener llamadas recientes (activas + finalizadas) desde llamadas_ventas con datos del prospecto
   */
  async getActiveCalls(): Promise<LiveCallData[]> {
    try {
      console.log('🔍 [DEBUG] Iniciando getActiveCalls...');
      console.log('🔍 [DEBUG] URL Supabase:', 'https://glsmifhkoaifvaegsozd.supabase.co');
      
      // Selección mínima segura de columnas (evitar errores por columnas inexistentes)
      let { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select(`
          call_id,
          call_status,
          fecha_llamada,
          monitor_url,
          control_url,
          call_sid,
          provider,
          account_sid,
          duracion_segundos,
          nivel_interes,
          datos_llamada,
          audio_ruta_bucket,
          prospecto,
          checkpoint_venta_actual,
          conversacion_completa
        `)
        .order('fecha_llamada', { ascending: false })
        .limit(50);

      console.log('🔍 [DEBUG] Respuesta inicial:', { data, error, count: data?.length || 0 });

      // Fallback ultraseguro si fallara por cualquier metadata
      if (error) {
        console.warn('⚠️ Reintentando getActiveCalls con selección ultra mínima por error:', error);
        const fallback = await analysisSupabase
          .from('llamadas_ventas')
          .select(`call_id, call_status, fecha_llamada, prospecto`)
          .order('fecha_llamada', { ascending: false })
          .limit(50);
        data = fallback.data || [];
        error = fallback.error || null;
        console.log('🔍 [DEBUG] Respuesta fallback:', { data, error, count: data?.length || 0 });
        if (fallback.error) {
          console.error('❌ Error también en fallback getActiveCalls:', fallback.error);
          return [];
        }
      }

      if (!data || data.length === 0) {
        console.log('🔍 [DEBUG] No hay datos en llamadas_ventas');
        console.log('🔍 [DEBUG] Esto puede ser porque:');
        console.log('  1. La tabla está vacía (sin llamadas registradas)');
        console.log('  2. RLS bloquea el acceso (necesita ser desactivado)');
        console.log('  3. El usuario anon no tiene permisos de lectura');
        console.log('🔍 [DEBUG] Para solucionarlo, ejecuta en el SQL Editor de Supabase:');
        console.log('  ALTER TABLE public.llamadas_ventas DISABLE ROW LEVEL SECURITY;');
        return [];
      }

      // Obtener datos de los prospectos relacionados (robusto ante errores)
      const prospectIds = data
        .map(call => call.prospecto)
        .filter(id => id !== null && id !== undefined);

      let prospectosData: any[] = [];
      if (prospectIds.length > 0) {
        const { data: pData, error: prospectError } = await analysisSupabase
          .from('prospectos')
          .select('*')
          .in('id', prospectIds as string[]);

        if (prospectError) {
          console.warn('⚠️ Continuando sin datos de prospectos por error:', prospectError);
        } else {
          prospectosData = pData || [];
        }
      } else {
        console.warn('⚠️ No hay IDs de prospectos válidos; se devolverán llamadas con datos mínimos');
      }

      // Combinar datos de llamadas con datos de prospectos
      const combinedData: LiveCallData[] = data.map(call => {
        const prospecto = prospectosData?.find(p => p.id === call.prospecto);
        
        return {
          // Datos de la llamada
          call_id: call.call_id,
          call_status: call.call_status || 'activa',
          fecha_llamada: call.fecha_llamada,
          monitor_url: call.monitor_url,
          control_url: call.control_url,
          transport_url: undefined, // Temporalmente undefined hasta agregar columna en BD
          call_sid: call.call_sid,
          provider: call.provider,
          account_sid: call.account_sid,
          duracion_segundos: call.duracion_segundos || 0,
          nivel_interes: call.nivel_interes,
          datos_llamada: call.datos_llamada,
          audio_ruta_bucket: call.audio_ruta_bucket,
          
          // Datos del prospecto
          prospecto_id: call.prospecto,
          nombre_completo: prospecto?.nombre_completo || null,
          nombre_whatsapp: prospecto?.nombre_whatsapp || 'Sin nombre',
          whatsapp: prospecto?.whatsapp || '',
          etapa: prospecto?.etapa || 'Desconocida',
          temperatura_prospecto: prospecto?.temperatura_prospecto,
          observaciones: prospecto?.observaciones,
          tamano_grupo: prospecto?.tamano_grupo,
          destino_preferencia: prospecto?.destino_preferencia,
          ciudad_residencia: prospecto?.ciudad_residencia,
          email: prospecto?.email,
          edad: prospecto?.edad,
          viaja_con: prospecto?.viaja_con,
          cantidad_menores: prospecto?.cantidad_menores,
          updated_at: prospecto?.updated_at || call.fecha_llamada,
          
          // Campos adicionales del prospecto
          estado_civil: prospecto?.estado_civil,
          interes_principal: prospecto?.interes_principal,
          campana_origen: prospecto?.campana_origen,
          
          // Campos adicionales de la llamada
          es_venta_exitosa: call.es_venta_exitosa,
          precio_ofertado: call.precio_ofertado,
          tipo_llamada: call.tipo_llamada,
          oferta_presentada: call.oferta_presentada,
          requiere_seguimiento: call.requiere_seguimiento,
          costo_total: call.costo_total,
          probabilidad_cierre: call.probabilidad_cierre,
          
          // Campos de feedback
          tiene_feedback: call.tiene_feedback,
          feedback_resultado: call.feedback_resultado,
          feedback_comentarios: call.feedback_comentarios,
          feedback_user_email: call.feedback_user_email,
          feedback_fecha: call.feedback_fecha,
          
          // Campos de checkpoint Kanban (dinámicos de llamadas_ventas)
          checkpoint_venta_actual: call.checkpoint_venta_actual,
          composicion_familiar_numero: call.composicion_familiar_numero,
          destino_preferido: call.destino_preferido,
          preferencia_vacaciones: call.preferencia_vacaciones,
          numero_noches: call.numero_noches,
          mes_preferencia: call.mes_preferencia,
          propuesta_economica_ofrecida: call.propuesta_economica_ofrecida,
          habitacion_ofertada: call.habitacion_ofertada,
          resort_ofertado: call.resort_ofertado,
          principales_objeciones: call.principales_objeciones,
          resumen_llamada: call.resumen_llamada,
          conversacion_completa: call.conversacion_completa
        };
      });

      // Log solo resumen, no detalle por llamada
      console.log(`✅ Llamadas cargadas: ${combinedData.length}`);
      
      // Debug: Log de primeras 3 llamadas para verificar datos
      if (combinedData.length > 0) {
        console.log('🔍 [DEBUG] Primeras 3 llamadas cargadas:');
        combinedData.slice(0, 3).forEach(call => {
          console.log(`  - ${call.call_id.slice(-8)}: ${call.call_status}, checkpoint: ${call.checkpoint_venta_actual}, prospecto: ${call.nombre_completo}`);
        });
      }
      
      return combinedData;
    } catch (error) {
      console.error('💥 Error en getActiveCalls:', error);
      return [];
    }
  }

  /**
   * Obtener prospectos activos (método legacy para compatibilidad)
   */
  async getActiveProspects(): Promise<Prospect[]> {
    try {
      const activeCalls = await this.getActiveCalls();
      
      // Convertir LiveCallData a Prospect para compatibilidad
      return activeCalls.map(call => ({
        id: call.prospecto_id,
        nombre_completo: call.nombre_completo,
        nombre_whatsapp: call.nombre_whatsapp,
        whatsapp: call.whatsapp,
        etapa: call.etapa,
        temperatura_prospecto: call.temperatura_prospecto,
        updated_at: call.updated_at,
        observaciones: call.observaciones,
        tamano_grupo: call.tamano_grupo,
        destino_preferencia: call.destino_preferencia,
        llamada_activa: true
      }));
    } catch (error) {
      console.error('💥 Error en getActiveProspects:', error);
      return [];
    }
  }

  /**
   * Obtener prospecto por ID
   */
  async getProspectById(id: string): Promise<Prospect | null> {
    try {
      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo prospecto:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('💥 Error en getProspectById:', error);
      return null;
    }
  }

  /**
   * Actualizar temperatura de prospecto
   */
  async updateProspectTemperature(id: string, temperatura: 'frio' | 'tibio' | 'caliente'): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('prospectos')
        .update({ 
          temperatura_prospecto: temperatura,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error actualizando temperatura:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('💥 Error en updateProspectTemperature:', error);
      return false;
    }
  }

  // ============================================
  // GESTIÓN DE AGENTES
  // ============================================

  /**
   * Obtener agentes activos
   */
  async getActiveAgents(): Promise<Agent[]> {
    // Por ahora usar datos demo hasta que se cree la tabla
    const agentsDemo: Agent[] = [
      { id: '1', agent_name: 'Carlos Mendoza', agent_email: 'carlos.mendoza@grupovidanta.com', is_active: true, total_calls_handled: 15 },
      { id: '2', agent_name: 'Ana Gutiérrez', agent_email: 'ana.gutierrez@grupovidanta.com', is_active: true, total_calls_handled: 12 },
      { id: '3', agent_name: 'Roberto Silva', agent_email: 'roberto.silva@grupovidanta.com', is_active: true, total_calls_handled: 18 },
      { id: '4', agent_name: 'María López', agent_email: 'maria.lopez@grupovidanta.com', is_active: true, total_calls_handled: 9 },
      { id: '5', agent_name: 'Diego Ramírez', agent_email: 'diego.ramirez@grupovidanta.com', is_active: true, total_calls_handled: 21 }
    ];

    return agentsDemo;
  }

  /**
   * Seleccionar próximo agente aleatoriamente
   */
  async selectNextAgent(): Promise<Agent | null> {
    try {
      const agents = await this.getActiveAgents();
      const activeAgents = agents.filter(agent => agent.is_active);
      
      if (activeAgents.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * activeAgents.length);
      return activeAgents[randomIndex];
    } catch (error) {
      console.error('💥 Error en selectNextAgent:', error);
      return null;
    }
  }

  // ============================================
  // CONTROL REAL DE LLAMADAS VAPI
  // ============================================

  /**
   * Transferir llamada usando API real de VAPI
   */
  async transferCall(callId: string, phoneNumber: string, extension?: string, message?: string): Promise<boolean> {
    try {
      // Obtener control_url de la base de datos
      const { data: callData, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select('control_url')
        .eq('call_id', callId)
        .single();

      if (error || !callData?.control_url) {
        console.error('❌ No se encontró control_url para la llamada:', callId);
        return false;
      }

      const transferData = {
        type: "transferCall",
        destination: {
          type: "number",
          number: phoneNumber,
          ...(extension && { extension })
        },
        ...(message && { 
          message,
          description: "TRANSFERENCIA CONTEXTUAL CON MENSAJE PERSONALIZADO"
        })
      };

      console.log('🔄 Transfiriendo llamada:', callId);
      console.log('📞 Número destino:', phoneNumber);
      console.log('💬 Mensaje:', message);

      const response = await fetch(callData.control_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });

      if (response.ok) {
        // Actualizar estado en la base de datos
        await this.updateCallStatus(callId, 'transferida');
        console.log('✅ Llamada transferida exitosamente');
        return true;
      } else {
        console.error('❌ Error en transferencia:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('💥 Error transfiriendo llamada:', error);
      return false;
    }
  }

  /**
   * Terminar llamada usando API real de VAPI
   */
  async endCall(callId: string): Promise<boolean> {
    try {
      // Obtener control_url de la base de datos
      const { data: callData, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select('control_url')
        .eq('call_id', callId)
        .single();

      if (error || !callData?.control_url) {
        console.error('❌ No se encontró control_url para la llamada:', callId);
        return false;
      }

      const endCallData = {
        type: "end-call"
      };

      console.log('🔚 Terminando llamada:', callId);

      const response = await fetch(callData.control_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endCallData)
      });

      if (response.ok) {
        // Actualizar estado en la base de datos
        await this.updateCallStatus(callId, 'colgada');
        console.log('✅ Llamada terminada exitosamente');
        return true;
      } else {
        console.error('❌ Error terminando llamada:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('💥 Error terminando llamada:', error);
      return false;
    }
  }

  /**
   * Actualizar estado de llamada en la base de datos
   */
  async updateCallStatus(callId: string, status: 'activa' | 'transferida' | 'colgada' | 'perdida' | 'exitosa'): Promise<boolean> {
    try {
      const updateData: any = { 
        call_status: status,
        updated_at: new Date().toISOString()
      };
      
      // Si la llamada se marca como finalizada, actualizar timestamp de finalización
      if (status !== 'activa') {
        updateData.fecha_llamada = new Date().toISOString();
        
        // Si es exitosa, marcar también como venta exitosa
        if (status === 'exitosa') {
          updateData.es_venta_exitosa = true;
        }
      }

      const { error } = await analysisSupabase
        .from('llamadas_ventas')
        .update(updateData)
        .eq('call_id', callId);

      if (error) {
        console.error('❌ Error actualizando estado de llamada:', error);
        return false;
      }

      console.log(`✅ Estado de llamada actualizado: ${callId} → ${status}`);
      
      // Limpiar URLs si la llamada terminó (ya no son válidas)
      if (status !== 'activa') {
        await this.clearCallUrls(callId);
      }

      return true;
    } catch (error) {
      console.error('💥 Error en updateCallStatus:', error);
      return false;
    }
  }

  /**
   * Limpiar URLs de llamada terminada
   */
  async clearCallUrls(callId: string): Promise<boolean> {
    try {
      const { error } = await analysisSupabase
        .from('llamadas_ventas')
        .update({ 
          monitor_url: null,
          control_url: null
        })
        .eq('call_id', callId);

      if (error) {
        console.error('❌ Error limpiando URLs:', error);
        return false;
      }

      console.log(`🧹 URLs limpiadas para llamada finalizada: ${callId}`);
      return true;
    } catch (error) {
      console.error('💥 Error en clearCallUrls:', error);
      return false;
    }
  }

  /**
   * Actualizar URLs de control y monitor desde webhook de VAPI
   */
  async updateCallUrls(callId: string, monitorUrl: string, controlUrl: string, callSid?: string, accountSid?: string): Promise<boolean> {
    try {
      const updateData: any = {
        monitor_url: monitorUrl,
        control_url: controlUrl,
        call_status: 'activa',
        updated_at: new Date().toISOString()
      };

      if (callSid) updateData.call_sid = callSid;
      if (accountSid) updateData.account_sid = accountSid;

      const { error } = await analysisSupabase
        .from('llamadas_ventas')
        .update(updateData)
        .eq('call_id', callId);

      if (error) {
        console.error('❌ Error actualizando URLs de llamada:', error);
        return false;
      }

      console.log(`✅ URLs actualizadas para llamada: ${callId}`);
      console.log(`  Monitor: ${monitorUrl}`);
      console.log(`  Control: ${controlUrl}`);
      return true;
    } catch (error) {
      console.error('💥 Error en updateCallUrls:', error);
      return false;
    }
  }

  /**
   * Crear o actualizar registro de llamada desde webhook de VAPI
   */
  async upsertCallFromWebhook(callData: {
    call_id: string;
    prospect_id: string;
    monitor_url: string;
    control_url: string;
    call_sid?: string;
    transport?: string;
    provider?: string;
    account_sid?: string;
  }): Promise<boolean> {
    try {
      const { data: existing } = await analysisSupabase
        .from('llamadas_ventas')
        .select('call_id')
        .eq('call_id', callData.call_id)
        .single();

      if (existing) {
        // Actualizar registro existente
        return await this.updateCallUrls(
          callData.call_id,
          callData.monitor_url,
          callData.control_url,
          callData.call_sid,
          callData.account_sid
        );
      } else {
        // Crear nuevo registro
        const { error } = await analysisSupabase
          .from('llamadas_ventas')
          .insert({
            call_id: callData.call_id,
            prospecto: callData.prospect_id,
            monitor_url: callData.monitor_url,
            control_url: callData.control_url,
            call_sid: callData.call_sid,
            transport: callData.transport || 'twilio',
            provider: callData.provider || 'twilio',
            account_sid: callData.account_sid,
            call_status: 'activa',
            fecha_llamada: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            duracion_segundos: 0,
            es_venta_exitosa: false,
            probabilidad_cierre: 0,
            costo_total: 0,
            oferta_presentada: false,
            requiere_seguimiento: false
          });

        if (error) {
          console.error('❌ Error creando registro de llamada:', error);
          return false;
        }

        console.log(`✅ Registro de llamada creado: ${callData.call_id}`);
        return true;
      }
    } catch (error) {
      console.error('💥 Error en upsertCallFromWebhook:', error);
      return false;
    }
  }

  /**
   * Crear conexión WebSocket para escuchar audio de llamada usando URL de la BD
   */
  async createAudioWebSocket(callId: string, onMessage: (audioData: ArrayBuffer) => void): Promise<WebSocket | null> {
    try {
      // Obtener monitor_url de la base de datos
      const { data: callData, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select('monitor_url')
        .eq('call_id', callId)
        .single();

      if (error || !callData?.monitor_url) {
        console.error('❌ No se encontró monitor_url para la llamada:', callId);
        return null;
      }

      const wsUrl = callData.monitor_url;
      console.log('🎧 Conectando WebSocket de audio:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket de audio conectado');
      };
      
      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Audio PCM crudo
          onMessage(event.data);
        } else {
          console.log('📝 Mensaje WebSocket:', event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket de audio desconectado');
      };
      
      return ws;
    } catch (error) {
      console.error('💥 Error creando WebSocket:', error);
      return null;
    }
  }

  /**
   * Enviar susurro a IA para transferencia (método legacy)
   */
  async sendWhisperToAI(prospectId: string, whisperMessage: string, agentEmail: string): Promise<boolean> {
    // Buscar la llamada activa para este prospecto
    const activeCalls = await this.getActiveCalls();
    const activeCall = activeCalls.find(call => call.prospecto_id === prospectId);
    
    if (!activeCall) {
      console.error('❌ No se encontró llamada activa para el prospecto:', prospectId);
      return false;
    }
    
    // Usar la nueva función de transferencia real
    return await this.transferCall(
      activeCall.call_id, 
      '+523222264000', // Número por defecto
      '60973', // Extensión por defecto
      whisperMessage
    );
  }

  /**
   * Marcar prospecto como transferido (usando solo campos existentes)
   */
  async markAsTransferred(prospectId: string, agentEmail: string, checkpoint: string): Promise<boolean> {
    try {
      // Usar campos que sabemos que existen
      const transferInfo = `[TRANSFERIDO] Agente: ${agentEmail} | Checkpoint: ${checkpoint} | ${new Date().toLocaleString()}`;
      
      const { error } = await analysisSupabase
        .from('prospectos')
        .update({
          etapa: 'Transferido',
          observaciones: transferInfo,
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectId);

      if (error) {
        console.error('❌ Error marcando como transferido:', error);
        return false;
      }

      console.log('✅ Prospecto marcado como transferido');
      return true;
    } catch (error) {
      console.error('💥 Error en markAsTransferred:', error);
      return false;
    }
  }

  /**
   * Guardar feedback por llamada usando columnas específicas
   */
  async saveFeedback(feedbackData: FeedbackData): Promise<boolean> {
    try {
      // Actualizar la llamada con las nuevas columnas de feedback
      const { error: callError } = await analysisSupabase
        .from('llamadas_ventas')
        .update({
          feedback_resultado: feedbackData.resultado,
          feedback_comentarios: feedbackData.comentarios,
          feedback_user_email: feedbackData.user_email,
          feedback_fecha: feedbackData.fecha_feedback,
          tiene_feedback: true,
          call_status: feedbackData.resultado === 'contestada' ? 'exitosa' : 'perdida'
        })
        .eq('call_id', feedbackData.call_id);

      if (callError) {
        console.error('❌ Error actualizando llamada con feedback:', callError);
        return false;
      }

      // También actualizar el prospecto para compatibilidad
      const feedbackText = `[CALL_FEEDBACK ${feedbackData.call_id}] ${feedbackData.resultado.toUpperCase()}: ${feedbackData.comentarios} | Usuario: ${feedbackData.user_email} | Fecha: ${feedbackData.fecha_feedback}`;
      
      const { error: prospectError } = await analysisSupabase
        .from('prospectos')
        .update({
          observaciones: feedbackText,
          etapa: 'Finalizado',
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackData.prospect_id);

      if (prospectError) {
        console.log('⚠️ Advertencia actualizando prospecto:', prospectError);
      }

      console.log('✅ Feedback guardado exitosamente en llamadas_ventas');
      return true;
    } catch (error) {
      console.error('💥 Error en saveFeedback:', error);
      return false;
    }
  }

  /**
   * Obtener historial de transferencias (últimas 24 horas)
   */
  async getTransferHistory(): Promise<Prospect[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .eq('status_transferencia', 'completada')
        .gte('fecha_transferencia', yesterday.toISOString())
        .order('fecha_transferencia', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error obteniendo historial:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error en getTransferHistory:', error);
      return [];
    }
  }

  /**
   * Obtener historial de llamadas de las últimas 24 horas (todos los estados)
   */
  async getCallHistory24h(): Promise<LiveCallData[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .select(`
          call_id,
          call_status,
          fecha_llamada,
          monitor_url,
          control_url,
          call_sid,
          provider,
          duracion_segundos,
          nivel_interes,
          datos_llamada,
          prospecto
        `)
        .not('call_status', 'eq', 'activa')
        .gte('fecha_llamada', yesterday.toISOString())
        .order('fecha_llamada', { ascending: false })
        .limit(200);

      if (error) {
        console.error('❌ Error obteniendo historial de 24h:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Obtener datos de los prospectos relacionados
      const prospectIds = data.map(call => call.prospecto).filter(id => id !== null && id !== undefined);
      
      if (prospectIds.length === 0) {
        console.warn('⚠️ No hay IDs de prospectos válidos');
        return [];
      }

      const { data: prospectosData, error: prospectError } = await analysisSupabase
        .from('prospectos')
        .select('*')
        .in('id', prospectIds);

      if (prospectError) {
        console.error('❌ Error obteniendo datos de prospectos para historial:', prospectError);
        return [];
      }

      // Combinar datos de llamadas con datos de prospectos
      const combinedData: LiveCallData[] = data.map(call => {
        const prospecto = prospectosData?.find(p => p.id === call.prospecto);
        
        return {
          // Datos de la llamada
          call_id: call.call_id,
          call_status: call.call_status || 'exitosa',
          fecha_llamada: call.fecha_llamada,
          monitor_url: call.monitor_url,
          control_url: call.control_url,
          call_sid: call.call_sid,
          provider: call.provider,
          duracion_segundos: call.duracion_segundos || 0,
          nivel_interes: call.nivel_interes,
          datos_llamada: call.datos_llamada,
          
          // Datos del prospecto
          prospecto_id: call.prospecto,
          nombre_completo: prospecto?.nombre_completo || null,
          nombre_whatsapp: prospecto?.nombre_whatsapp || 'Sin nombre',
          whatsapp: prospecto?.whatsapp || '',
          etapa: prospecto?.etapa || 'Finalizado',
          temperatura_prospecto: prospecto?.temperatura_prospecto,
          observaciones: prospecto?.observaciones,
          tamano_grupo: prospecto?.tamano_grupo,
          destino_preferencia: prospecto?.destino_preferencia,
          ciudad_residencia: prospecto?.ciudad_residencia,
          email: prospecto?.email,
          edad: prospecto?.edad,
          viaja_con: prospecto?.viaja_con,
          cantidad_menores: prospecto?.cantidad_menores,
          updated_at: prospecto?.updated_at || call.fecha_llamada
        };
      });

      console.log(`✅ Historial cargado: ${combinedData.length} llamadas de las últimas 24h`);
      return combinedData;
    } catch (error) {
      console.error('💥 Error en getCallHistory24h:', error);
      return [];
    }
  }

  // ============================================
  // DATOS DE PRUEBA Y DEBUGGING
  // ============================================

  /**
   * Crear datos de prueba si la tabla está vacía (solo para debugging)
   */
  async createTestDataIfEmpty(): Promise<void> {
    try {
      console.log('🔍 [DEBUG] Intentando crear datos de prueba...');
      
      // Crear algunos registros de prueba
      const testCalls = [
        {
          call_id: `test_call_${Date.now()}_1`,
          call_status: 'activa',
          fecha_llamada: new Date().toISOString(),
          prospecto: null, // Sin prospecto por ahora
          duracion_segundos: 0,
          monitor_url: 'wss://test.monitor.url/1',
          control_url: 'https://test.control.url/1'
        },
        {
          call_id: `test_call_${Date.now()}_2`,
          call_status: 'finalizada',
          fecha_llamada: new Date(Date.now() - 300000).toISOString(), // 5 min ago
          prospecto: null,
          duracion_segundos: 180,
          audio_ruta_bucket: 'test/audio/path.mp3'
        },
        {
          call_id: `test_call_${Date.now()}_3`,
          call_status: 'perdida',
          fecha_llamada: new Date(Date.now() - 600000).toISOString(), // 10 min ago
          prospecto: null,
          duracion_segundos: 0
        }
      ];

      const { data, error } = await analysisSupabase
        .from('llamadas_ventas')
        .insert(testCalls)
        .select();

      if (error) {
        console.error('❌ Error creando datos de prueba:', error);
      } else {
        console.log('✅ Datos de prueba creados:', data?.length || 0);
      }
    } catch (error) {
      console.error('💥 Error en createTestDataIfEmpty:', error);
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Mapear etapa a checkpoint
   */
  mapEtapaToCheckpoint(etapa: string): string {
    const mapping: Record<string, string> = {
      'Validando si es miembro': 'saludo_continuacion',
      'En seguimiento': 'conexion_emocional',
      'Interesado': 'introduccion_paraiso',
      'Negociando': 'presentacion_oferta',
      'Procesando pago': 'proceso_pago'
    };

    return mapping[etapa] || 'saludo_continuacion';
  }

  /**
   * Obtener temperatura basada en etapa y observaciones
   */
  inferTemperature(prospect: Prospect): 'frio' | 'tibio' | 'caliente' {
    if (prospect.temperatura_prospecto) {
      return prospect.temperatura_prospecto;
    }

    // Inferir basado en etapa
    switch (prospect.etapa) {
      case 'Interesado':
      case 'Negociando':
        return 'caliente';
      case 'En seguimiento':
        return 'tibio';
      default:
        return 'frio';
    }
  }

  /**
   * Formatear tiempo transcurrido
   */
  getTimeElapsed(updatedAt: string): string {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  }
}

// Exportar instancia singleton
export const liveMonitorService = new LiveMonitorService();
export default liveMonitorService;
