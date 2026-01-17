/**
 * ============================================
 * EDGE FUNCTION: TRIGGER MANUAL PROXY
 * ============================================
 * 
 * Proxy seguro para programar/actualizar/eliminar llamadas manuales
 * Inserta directamente en llamadas_programadas (el Cron Job las ejecuta)
 * 
 * Acciones soportadas:
 * - INSERT: Crear nueva llamada programada
 * - UPDATE: Actualizar llamada existente
 * - DELETE: Eliminar llamada programada
 * 
 * Fecha: 17 Enero 2026
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticación JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.substring(7);
    
    // Validar JWT con Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener payload del request
    const payload = await req.json();
    const { 
      action, 
      prospecto_id, 
      user_id,
      justificacion,
      scheduled_timestamp,
      schedule_type,
      customer_phone,
      customer_name,
      conversation_id,
      llamada_programada_id 
    } = payload;

    console.log(`📞 [trigger-manual-proxy] Acción: ${action} para prospecto: ${prospecto_id} (user: ${user.email})`);

    let result;

    switch (action) {
      case 'INSERT': {
        // Insertar nueva llamada programada
        const { data, error } = await supabase
          .from('llamadas_programadas')
          .insert({
            prospecto: prospecto_id,
            programada_por: user_id || user.id,
            motivo: justificacion || 'Llamada programada desde UI',
            fecha_programada: scheduled_timestamp,
            estatus: 'programada',
            telefono_cliente: customer_phone,
            nombre_cliente: customer_name,
            conversation_id: conversation_id,
            tipo_programacion: schedule_type, // 'now' o 'scheduled'
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) {
          console.error(`❌ [trigger-manual-proxy] Error INSERT:`, error);
          throw new Error(`Error al programar llamada: ${error.message}`);
        }

        result = { 
          success: true, 
          message: 'Llamada programada exitosamente',
          llamada_id: data?.id 
        };
        console.log(`✅ [trigger-manual-proxy] Llamada programada creada: ${data?.id}`);
        break;
      }

      case 'UPDATE': {
        if (!llamada_programada_id) {
          throw new Error('llamada_programada_id es requerido para UPDATE');
        }

        const { error } = await supabase
          .from('llamadas_programadas')
          .update({
            motivo: justificacion,
            fecha_programada: scheduled_timestamp,
            telefono_cliente: customer_phone,
            nombre_cliente: customer_name,
            updated_at: new Date().toISOString(),
            actualizada_por: user_id || user.id
          })
          .eq('id', llamada_programada_id);

        if (error) {
          console.error(`❌ [trigger-manual-proxy] Error UPDATE:`, error);
          throw new Error(`Error al actualizar llamada: ${error.message}`);
        }

        result = { 
          success: true, 
          message: 'Llamada actualizada exitosamente',
          llamada_id: llamada_programada_id 
        };
        console.log(`✅ [trigger-manual-proxy] Llamada actualizada: ${llamada_programada_id}`);
        break;
      }

      case 'DELETE': {
        if (!llamada_programada_id) {
          throw new Error('llamada_programada_id es requerido para DELETE');
        }

        // Marcar como cancelada en lugar de eliminar (para auditoría)
        const { error } = await supabase
          .from('llamadas_programadas')
          .update({
            estatus: 'cancelada',
            updated_at: new Date().toISOString(),
            cancelada_por: user_id || user.id
          })
          .eq('id', llamada_programada_id);

        if (error) {
          console.error(`❌ [trigger-manual-proxy] Error DELETE:`, error);
          throw new Error(`Error al cancelar llamada: ${error.message}`);
        }

        result = { 
          success: true, 
          message: 'Llamada cancelada exitosamente',
          llamada_id: llamada_programada_id 
        };
        console.log(`✅ [trigger-manual-proxy] Llamada cancelada: ${llamada_programada_id}`);
        break;
      }

      default:
        throw new Error(`Acción no soportada: ${action}. Use INSERT, UPDATE o DELETE.`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error en trigger-manual-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
