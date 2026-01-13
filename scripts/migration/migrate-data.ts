/**
 * ============================================
 * SCRIPT DE MIGRACIÓN DE DATOS
 * system_ui → pqnc_ai
 * ============================================
 * 
 * Este script migra datos desde system_ui a pqnc_ai
 * Ejecutar con: npx tsx scripts/migration/migrate-data.ts
 * 
 * REQUISITOS:
 * - Variables de entorno configuradas para ambas bases de datos
 * - Backup completo realizado antes de ejecutar
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de conexiones
const SYSTEM_UI_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || 'https://zbylezfyagwrxoecioup.supabase.co';
const SYSTEM_UI_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';

const PQNC_AI_URL = process.env.VITE_PQNC_AI_SUPABASE_URL || 'https://glsmifhkoaifvaegsozd.supabase.co';
const PQNC_AI_SERVICE_KEY = process.env.VITE_PQNC_AI_SUPABASE_SERVICE_KEY || '';

// Crear clientes
const systemUI = createClient(SYSTEM_UI_URL, SYSTEM_UI_SERVICE_KEY);
const pqncAI = createClient(PQNC_AI_URL, PQNC_AI_SERVICE_KEY);

// ============================================
// FUNCIONES DE MIGRACIÓN
// ============================================

/**
 * Migrar user_notifications a user_notifications_legacy
 */
async function migrateUserNotifications() {
  console.log('📦 Migrando user_notifications → user_notifications_legacy...');
  
  try {
    // Obtener datos de system_ui
    const { data, error } = await systemUI
      .from('user_notifications')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo datos de system_ui:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No hay datos para migrar');
      return true;
    }

    console.log(`📊 Encontrados ${data.length} registros para migrar`);

    // Insertar en pqnc_ai (user_notifications_legacy)
    const { error: insertError } = await pqncAI
      .from('user_notifications_legacy')
      .insert(data);

    if (insertError) {
      console.error('❌ Error insertando datos en pqnc_ai:', insertError);
      return false;
    }

    console.log(`✅ Migrados ${data.length} registros exitosamente`);
    return true;
  } catch (error) {
    console.error('❌ Error en migrateUserNotifications:', error);
    return false;
  }
}

/**
 * Merge de api_auth_tokens (sobrescribir duplicados con system_ui)
 */
async function mergeApiAuthTokens() {
  console.log('📦 Haciendo merge de api_auth_tokens...');
  
  try {
    // Obtener datos de system_ui
    const { data: systemUIData, error: systemUIError } = await systemUI
      .from('api_auth_tokens')
      .select('*');

    if (systemUIError) {
      console.error('❌ Error obteniendo datos de system_ui:', systemUIError);
      return false;
    }

    if (!systemUIData || systemUIData.length === 0) {
      console.log('⚠️ No hay datos para migrar');
      return true;
    }

    console.log(`📊 Encontrados ${systemUIData.length} registros en system_ui`);

    // Obtener datos existentes en pqnc_ai
    const { data: pqncAIData } = await pqncAI
      .from('api_auth_tokens')
      .select('id');

    const existingIds = new Set(pqncAIData?.map(r => r.id) || []);
    console.log(`📊 Encontrados ${existingIds.size} registros existentes en pqnc_ai`);

    // Separar en updates e inserts
    const toUpdate = systemUIData.filter(r => existingIds.has(r.id));
    const toInsert = systemUIData.filter(r => !existingIds.has(r.id));

    console.log(`📊 Actualizando ${toUpdate.length} registros`);
    console.log(`📊 Insertando ${toInsert.length} registros nuevos`);

    // Actualizar existentes
    if (toUpdate.length > 0) {
      for (const record of toUpdate) {
        const { error } = await pqncAI
          .from('api_auth_tokens')
          .update(record)
          .eq('id', record.id);

        if (error) {
          console.error(`❌ Error actualizando registro ${record.id}:`, error);
        }
      }
    }

    // Insertar nuevos
    if (toInsert.length > 0) {
      const { error: insertError } = await pqncAI
        .from('api_auth_tokens')
        .insert(toInsert);

      if (insertError) {
        console.error('❌ Error insertando nuevos registros:', insertError);
        return false;
      }
    }

    console.log('✅ Merge de api_auth_tokens completado');
    return true;
  } catch (error) {
    console.error('❌ Error en mergeApiAuthTokens:', error);
    return false;
  }
}

/**
 * Merge de api_auth_tokens_history
 */
async function mergeApiAuthTokensHistory() {
  console.log('📦 Haciendo merge de api_auth_tokens_history...');
  
  try {
    const { data: systemUIData, error: systemUIError } = await systemUI
      .from('api_auth_tokens_history')
      .select('*');

    if (systemUIError) {
      console.error('❌ Error obteniendo datos de system_ui:', systemUIError);
      return false;
    }

    if (!systemUIData || systemUIData.length === 0) {
      console.log('⚠️ No hay datos para migrar');
      return true;
    }

    console.log(`📊 Encontrados ${systemUIData.length} registros`);

    const { data: pqncAIData } = await pqncAI
      .from('api_auth_tokens_history')
      .select('id');

    const existingIds = new Set(pqncAIData?.map(r => r.id) || []);

    const toUpdate = systemUIData.filter(r => existingIds.has(r.id));
    const toInsert = systemUIData.filter(r => !existingIds.has(r.id));

    // Actualizar existentes
    if (toUpdate.length > 0) {
      for (const record of toUpdate) {
        const { error } = await pqncAI
          .from('api_auth_tokens_history')
          .update(record)
          .eq('id', record.id);

        if (error) {
          console.error(`❌ Error actualizando registro ${record.id}:`, error);
        }
      }
    }

    // Insertar nuevos
    if (toInsert.length > 0) {
      const { error: insertError } = await pqncAI
        .from('api_auth_tokens_history')
        .insert(toInsert);

      if (insertError) {
        console.error('❌ Error insertando nuevos registros:', insertError);
        return false;
      }
    }

    console.log('✅ Merge de api_auth_tokens_history completado');
    return true;
  } catch (error) {
    console.error('❌ Error en mergeApiAuthTokensHistory:', error);
    return false;
  }
}

/**
 * Migrar admin_messages (estructuras idénticas)
 */
async function migrateAdminMessages() {
  console.log('📦 Migrando admin_messages...');
  
  try {
    const { data, error } = await systemUI
      .from('admin_messages')
      .select('*');

    if (error) {
      console.error('❌ Error obteniendo datos:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No hay datos para migrar');
      return true;
    }

    console.log(`📊 Encontrados ${data.length} registros`);

    // Insertar con ON CONFLICT DO NOTHING
    const { error: insertError } = await pqncAI
      .from('admin_messages')
      .upsert(data, { onConflict: 'id', ignoreDuplicates: true });

    if (insertError) {
      console.error('❌ Error insertando datos:', insertError);
      return false;
    }

    console.log(`✅ Migrados ${data.length} registros`);
    return true;
  } catch (error) {
    console.error('❌ Error en migrateAdminMessages:', error);
    return false;
  }
}

/**
 * Migrar content_moderation_warnings (estructuras idénticas)
 */
async function migrateContentModerationWarnings() {
  console.log('📦 Migrando content_moderation_warnings...');
  
  try {
    const { data, error } = await systemUI
      .from('content_moderation_warnings')
      .select('*');

    if (error) {
      console.error('❌ Error obteniendo datos:', error);
      return false;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No hay datos para migrar');
      return true;
    }

    console.log(`📊 Encontrados ${data.length} registros`);

    const { error: insertError } = await pqncAI
      .from('content_moderation_warnings')
      .upsert(data, { onConflict: 'id', ignoreDuplicates: true });

    if (insertError) {
      console.error('❌ Error insertando datos:', insertError);
      return false;
    }

    console.log(`✅ Migrados ${data.length} registros`);
    return true;
  } catch (error) {
    console.error('❌ Error en migrateContentModerationWarnings:', error);
    return false;
  }
}

/**
 * Migrar tabla genérica (para resto de tablas)
 */
async function migrateTable(tableName: string, useUpsert = false) {
  console.log(`📦 Migrando ${tableName}...`);
  
  try {
    const { data, error } = await systemUI
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`❌ Error obteniendo datos de ${tableName}:`, error);
      return false;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ No hay datos para migrar en ${tableName}`);
      return true;
    }

    console.log(`📊 Encontrados ${data.length} registros`);

    if (useUpsert) {
      const { error: insertError } = await pqncAI
        .from(tableName)
        .upsert(data, { onConflict: 'id', ignoreDuplicates: true });

      if (insertError) {
        console.error(`❌ Error insertando datos en ${tableName}:`, insertError);
        return false;
      }
    } else {
      const { error: insertError } = await pqncAI
        .from(tableName)
        .insert(data);

      if (insertError) {
        console.error(`❌ Error insertando datos en ${tableName}:`, insertError);
        return false;
      }
    }

    console.log(`✅ Migrados ${data.length} registros de ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error en migrateTable(${tableName}):`, error);
    return false;
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function main() {
  console.log('🚀 Iniciando migración de datos: system_ui → pqnc_ai\n');

  // Verificar conexiones
  console.log('🔍 Verificando conexiones...');
  console.log(`System UI: ${SYSTEM_UI_URL ? '✅' : '❌'}`);
  console.log(`PQNC AI: ${PQNC_AI_URL ? '✅' : '❌'}\n`);

  if (!SYSTEM_UI_SERVICE_KEY || !PQNC_AI_SERVICE_KEY) {
    console.error('❌ Faltan service keys en variables de entorno');
    process.exit(1);
  }

  const results: { table: string; success: boolean }[] = [];

  // Migrar tablas con conflictos primero
  console.log('='.repeat(60));
  console.log('FASE 1: Tablas con conflictos');
  console.log('='.repeat(60));
  
  results.push({ table: 'user_notifications_legacy', success: await migrateUserNotifications() });
  results.push({ table: 'api_auth_tokens', success: await mergeApiAuthTokens() });
  results.push({ table: 'api_auth_tokens_history', success: await mergeApiAuthTokensHistory() });
  results.push({ table: 'admin_messages', success: await migrateAdminMessages() });
  results.push({ table: 'content_moderation_warnings', success: await migrateContentModerationWarnings() });

  // Migrar resto de tablas
  console.log('\n' + '='.repeat(60));
  console.log('FASE 2: Resto de tablas');
  console.log('='.repeat(60));

  const tablesToMigrate = [
    'auth_users',
    'auth_roles',
    'auth_permissions',
    'auth_role_permissions',
    'auth_user_permissions',
    'auth_sessions',
    'auth_login_logs',
    'auth_user_coordinaciones',
    'coordinaciones',
    'coordinacion_statistics',
    'coordinador_coordinaciones_legacy',
    'permission_groups',
    'group_permissions',
    'user_permission_groups',
    'group_audit_log',
    'prospect_assignments',
    'prospect_assignment_logs',
    'assignment_logs',
    'api_tokens',
    'log_server_config',
    'aws_diagram_configs',
    'bot_pause_status',
    'uchat_bots',
    'uchat_conversations',
    'uchat_messages',
    'user_avatars',
    'user_warning_counters',
    'paraphrase_logs',
    'timeline_activities',
    'whatsapp_conversation_labels',
    'whatsapp_labels_custom',
    'whatsapp_labels_preset',
  ];

  for (const table of tablesToMigrate) {
    results.push({ table, success: await migrateTable(table, true) });
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN DE MIGRACIÓN');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Exitosas: ${successful}`);
  console.log(`❌ Fallidas: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Tablas con errores:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.table}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migración completada');
  console.log('='.repeat(60));
}

// Ejecutar
main().catch(console.error);
