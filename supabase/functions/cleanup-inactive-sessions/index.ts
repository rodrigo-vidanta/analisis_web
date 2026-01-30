/**
 * ============================================
 * CLEANUP INACTIVE SESSIONS - EDGE FUNCTION
 * ============================================
 * 
 * Limpia sesiones inactivas y actualiza is_operativo automáticamente.
 * 
 * Esta función debe ejecutarse periódicamente (cada 1 minuto) via Cron Job.
 * 
 * Criterios de limpieza:
 * - Sesiones expiradas (expires_at < NOW())
 * - Sesiones inactivas > 2 minutos (last_activity < NOW() - 2 minutos)
 * 
 * Acciones:
 * 1. Elimina sesiones que cumplen criterios
 * 2. Actualiza is_operativo = false para usuarios sin sesión activa
 * 
 * Deploy:
 * supabase functions deploy cleanup-inactive-sessions --no-verify-jwt
 * 
 * Configurar Cron (Supabase Dashboard > Database > Extensions > pg_cron):
 * SELECT cron.schedule(
 *   'cleanup-inactive-sessions',
 *   '* * * * *',
 *   $$SELECT net.http_post(
 *     url := 'https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions',
 *     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
 *     body := '{}'::jsonb
 *   )$$
 * );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente de Supabase con service_role para operaciones admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('🧹 Iniciando limpieza de sesiones inactivas...');

    // Llamar a la función RPC que limpia sesiones
    const { data: deletedCount, error: cleanupError } = await supabase
      .rpc('cleanup_inactive_sessions');

    if (cleanupError) {
      console.error('❌ Error en cleanup:', cleanupError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: cleanupError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Limpieza completada: ${deletedCount} sesiones eliminadas`);

    // Obtener estadísticas actuales
    const { data: stats, error: statsError } = await supabase
      .from('active_sessions')
      .select('user_id', { count: 'exact', head: true });

    const activeSessions = stats ? (stats as any).count || 0 : 0;

    return new Response(
      JSON.stringify({
        success: true,
        deleted_sessions: deletedCount,
        active_sessions: activeSessions,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Excepción en cleanup-inactive-sessions:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
