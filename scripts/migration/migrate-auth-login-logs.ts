/**
 * Script para migrar auth_login_logs de system_ui a pqnc_ai
 * Ejecuta la migración sin mostrar datos en consola
 */

import { createClient } from '@supabase/supabase-js';

const SYSTEM_UI_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
const SYSTEM_UI_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';
const PQNC_AI_URL = process.env.VITE_ANALYSIS_SUPABASE_URL || '';
const PQNC_AI_SERVICE_KEY = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY || '';

if (!SYSTEM_UI_URL || !SYSTEM_UI_SERVICE_KEY || !PQNC_AI_URL || !PQNC_AI_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const systemUI = createClient(SYSTEM_UI_URL, SYSTEM_UI_SERVICE_KEY);
const pqncAI = createClient(PQNC_AI_URL, PQNC_AI_SERVICE_KEY);

async function migrateAuthLoginLogs() {
  console.log('🔄 Iniciando migración de auth_login_logs...');
  
  try {
    // Obtener conteo total
    const { count } = await systemUI
      .from('auth_login_logs')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de registros a migrar: ${count}`);
    
    if (!count || count === 0) {
      console.log('✅ No hay registros para migrar');
      return;
    }
    
    const BATCH_SIZE = 1000;
    let migrated = 0;
    let offset = 0;
    
    while (offset < count) {
      // Obtener lote desde system_ui
      const { data, error } = await systemUI
        .from('auth_login_logs')
        .select('*')
        .order('created_at', { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);
      
      if (error) {
        console.error(`❌ Error obteniendo datos:`, error.message);
        break;
      }
      
      if (!data || data.length === 0) {
        break;
      }
      
      // Preparar datos para inserción, manejando foreign keys
      const recordsToInsert = await Promise.all(
        data.map(async (record) => {
          // Verificar si user_id existe en pqnc_ai
          let userId = record.user_id;
          if (userId) {
            const { data: userExists } = await pqncAI
              .from('auth_users')
              .select('id')
              .eq('id', userId)
              .single();
            
            if (!userExists) {
              userId = null;
            }
          }
          
          // Verificar si session_token existe en pqnc_ai
          let sessionToken = record.session_token;
          if (sessionToken) {
            const { data: sessionExists } = await pqncAI
              .from('auth_sessions')
              .select('session_token')
              .eq('session_token', sessionToken)
              .single();
            
            if (!sessionExists) {
              sessionToken = null;
            }
          }
          
          return {
            id: record.id,
            user_id: userId,
            email: record.email,
            session_token: sessionToken,
            ip_address: record.ip_address,
            user_agent: record.user_agent,
            device_type: record.device_type,
            browser: record.browser,
            browser_version: record.browser_version,
            os: record.os,
            os_version: record.os_version,
            login_status: record.login_status,
            failure_reason: record.failure_reason,
            login_method: record.login_method,
            location_country: record.location_country,
            location_city: record.location_city,
            is_suspicious: record.is_suspicious,
            suspicious_reasons: record.suspicious_reasons,
            created_at: record.created_at,
            expires_at: record.expires_at,
            last_activity: record.last_activity,
          };
        })
      );
      
      // Insertar en pqnc_ai
      const { error: insertError } = await pqncAI
        .from('auth_login_logs')
        .upsert(recordsToInsert, { onConflict: 'id', ignoreDuplicates: true });
      
      if (insertError) {
        console.error(`❌ Error insertando lote ${offset}-${offset + BATCH_SIZE}:`, insertError.message);
      } else {
        migrated += recordsToInsert.length;
        console.log(`✅ Migrados ${migrated}/${count} registros`);
      }
      
      offset += BATCH_SIZE;
    }
    
    console.log(`✅ Migración completada: ${migrated} registros migrados`);
    
  } catch (error: any) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
}

migrateAuthLoginLogs();
