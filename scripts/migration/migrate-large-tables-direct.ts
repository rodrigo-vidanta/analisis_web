/**
 * Script para migrar tablas grandes usando ambos clientes de Supabase
 * Conecta directamente a ambas bases de datos sin necesidad de dblink/postgres_fdw
 * 
 * USO:
 * npx tsx scripts/migration/migrate-large-tables-direct.ts
 * 
 * REQUISITOS:
 * - Variables de entorno configuradas en .env:
 *   - VITE_SYSTEM_UI_SUPABASE_URL
 *   - VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY
 *   - VITE_PQNC_AI_SUPABASE_URL (o VITE_PQNC_SUPABASE_URL)
 *   - VITE_PQNC_AI_SUPABASE_SERVICE_KEY (o VITE_PQNC_SUPABASE_SERVICE_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });
dotenv.config();

const SYSTEM_UI_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
const SYSTEM_UI_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';
const PQNC_AI_URL = process.env.VITE_PQNC_AI_SUPABASE_URL || process.env.VITE_PQNC_SUPABASE_URL || '';
const PQNC_AI_KEY = process.env.VITE_PQNC_AI_SUPABASE_SERVICE_KEY || process.env.VITE_PQNC_SUPABASE_SERVICE_KEY || '';

if (!SYSTEM_UI_URL || !SYSTEM_UI_KEY || !PQNC_AI_URL || !PQNC_AI_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Requeridas:');
  console.error('  - VITE_SYSTEM_UI_SUPABASE_URL');
  console.error('  - VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY');
  console.error('  - VITE_PQNC_AI_SUPABASE_URL o VITE_PQNC_SUPABASE_URL');
  console.error('  - VITE_PQNC_AI_SUPABASE_SERVICE_KEY o VITE_PQNC_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabaseSystemUI = createClient(SYSTEM_UI_URL, SYSTEM_UI_KEY);
const supabasePqncAI = createClient(PQNC_AI_URL, PQNC_AI_KEY);

const BATCH_SIZE = 500;

interface MigrationResult {
  table: string;
  total: number;
  migrated: number;
  errors: number;
}

/**
 * Migra una tabla grande en lotes
 */
async function migrateLargeTable(
  tableName: string,
  columns: string[],
  onConflict?: 'ignore' | 'update'
): Promise<MigrationResult> {
  console.log(`\n🔄 Migrando tabla: ${tableName}`);

  const result: MigrationResult = {
    table: tableName,
    total: 0,
    migrated: 0,
    errors: 0,
  };

  try {
    // Obtener conteo total
    const { count, error: countError } = await supabaseSystemUI
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error(`❌ Error contando registros:`, countError);
      result.errors = 1;
      return result;
    }

    result.total = count || 0;
    console.log(`📊 Total de registros: ${result.total}`);

    if (result.total === 0) {
      console.log(`⏭️  Tabla vacía, saltando...`);
      return result;
    }

    let offset = 0;
    let hasMore = true;

    while (hasMore && offset < result.total) {
      const limit = Math.min(BATCH_SIZE, result.total - offset);
      console.log(`  📦 Procesando lote: ${offset + 1}-${offset + limit} de ${result.total}`);

      // Obtener lote desde system_ui
      const { data: batch, error: fetchError } = await supabaseSystemUI
        .from(tableName)
        .select(columns.join(', '))
        .range(offset, offset + limit - 1);

      if (fetchError) {
        console.error(`❌ Error obteniendo datos:`, fetchError);
        result.errors += limit;
        offset += limit;
        continue;
      }

      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }

      // Insertar en pqnc_ai
      const { data: inserted, error: insertError } = await supabasePqncAI
        .from(tableName)
        .upsert(batch, { onConflict: 'id' })
        .select();

      if (insertError) {
        console.error(`❌ Error insertando lote:`, insertError.message);
        // Intentar insertar uno por uno para identificar problemas
        for (const record of batch) {
          const { error: singleError } = await supabasePqncAI
            .from(tableName)
            .upsert(record, { onConflict: 'id' });

          if (singleError) {
            console.error(`  ❌ Error insertando registro ${record.id}:`, singleError.message);
            result.errors++;
          } else {
            result.migrated++;
          }
        }
      } else {
        result.migrated += inserted?.length || 0;
        console.log(`  ✅ Insertados ${inserted?.length || 0} registros`);
      }

      offset += limit;
    }

    console.log(`✅ ${tableName}: ${result.migrated}/${result.total} migrados (${result.errors} errores)`);
    return result;
  } catch (error) {
    console.error(`❌ Error migrando ${tableName}:`, error);
    result.errors = result.total;
    return result;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando migración de tablas grandes...\n');

  const results: MigrationResult[] = [];

  // 1. prospect_assignments (185 registros)
  results.push(await migrateLargeTable('prospect_assignments', [
    'id', 'prospect_id', 'coordinacion_id', 'ejecutivo_id',
    'assigned_at', 'assigned_by', 'assignment_type', 'assignment_reason',
    'unassigned_at', 'is_active', 'created_at', 'updated_at'
  ], 'update'));

  // 2. assignment_logs (265 registros)
  results.push(await migrateLargeTable('assignment_logs', [
    'id', 'prospect_id', 'coordinacion_id', 'ejecutivo_id',
    'action', 'assigned_by', 'reason', 'metadata', 'created_at'
  ]));

  // 3. whatsapp_conversation_labels (286 registros)
  results.push(await migrateLargeTable('whatsapp_conversation_labels', [
    'id', 'prospecto_id', 'label_id', 'label_type', 'shadow_cell',
    'added_by', 'added_at', 'assigned_by_role', 'assigned_by_coordinacion_id'
  ], 'update'));

  // 4. paraphrase_logs (2,545 registros)
  results.push(await migrateLargeTable('paraphrase_logs', [
    'id', 'user_id', 'user_email', 'input_text', 'option1', 'option2',
    'output_selected', 'selected_option_number', 'has_moderation_warning',
    'warning_id', 'conversation_id', 'prospect_id', 'model_used',
    'processing_time_ms', 'created_at'
  ]));

  // Resumen
  console.log('\n📊 RESUMEN DE MIGRACIÓN:');
  console.log('=' .repeat(60));
  let totalMigrated = 0;
  let totalErrors = 0;
  let totalRecords = 0;

  results.forEach(r => {
    console.log(`${r.table.padEnd(35)} ${String(r.migrated).padStart(6)}/${String(r.total).padStart(6)} (${r.errors} errores)`);
    totalMigrated += r.migrated;
    totalErrors += r.errors;
    totalRecords += r.total;
  });

  console.log('=' .repeat(60));
  console.log(`Total: ${totalMigrated}/${totalRecords} migrados (${totalErrors} errores)`);

  if (totalErrors === 0) {
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);
  } else {
    console.log('\n⚠️  Migración completada con errores');
    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
