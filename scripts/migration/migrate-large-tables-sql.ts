/**
 * Script TypeScript para migrar tablas grandes sin saturar contexto
 * Ejecuta migraciones en lotes y guarda progreso
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SYSTEM_UI_SUPABASE_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
const SYSTEM_UI_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';
const PQNC_AI_SUPABASE_URL = process.env.VITE_PQNC_AI_SUPABASE_URL || '';
const PQNC_AI_SERVICE_KEY = process.env.VITE_PQNC_AI_SUPABASE_SERVICE_KEY || '';

const supabaseSystemUI = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SERVICE_KEY);
const supabasePqncAI = createClient(PQNC_AI_SUPABASE_URL, PQNC_AI_SERVICE_KEY);

const BATCH_SIZE = 500; // Procesar en lotes de 500 registros

interface MigrationProgress {
  table: string;
  totalRecords: number;
  migratedRecords: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  lastError?: string;
}

/**
 * Migra una tabla grande en lotes sin saturar memoria
 */
async function migrateLargeTable(
  tableName: string,
  onProgress?: (progress: MigrationProgress) => void
): Promise<void> {
  console.log(`\n🔄 Iniciando migración de ${tableName}...`);

  // Obtener conteo total
  const { count, error: countError } = await supabaseSystemUI
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`Error contando registros en ${tableName}: ${countError.message}`);
  }

  const totalRecords = count || 0;
  console.log(`📊 Total de registros: ${totalRecords}`);

  if (totalRecords === 0) {
    console.log(`⏭️  Tabla ${tableName} está vacía, saltando...`);
    return;
  }

  let offset = 0;
  let migratedCount = 0;

  while (offset < totalRecords) {
    const limit = Math.min(BATCH_SIZE, totalRecords - offset);
    
    console.log(`📦 Procesando lote: ${offset + 1}-${offset + limit} de ${totalRecords}`);

    // Obtener lote de datos
    const { data: batch, error: fetchError } = await supabaseSystemUI
      .from(tableName)
      .select('*')
      .range(offset, offset + limit - 1);

    if (fetchError) {
      throw new Error(`Error obteniendo datos de ${tableName}: ${fetchError.message}`);
    }

    if (!batch || batch.length === 0) {
      break;
    }

    // Insertar lote en pqnc_ai
    const { error: insertError } = await supabasePqncAI
      .from(tableName)
      .upsert(batch, { onConflict: 'id' });

    if (insertError) {
      // Si hay error de conflicto, intentar insertar uno por uno
      console.log(`⚠️  Error en lote, insertando individualmente...`);
      
      for (const record of batch) {
        const { error: singleError } = await supabasePqncAI
          .from(tableName)
          .upsert(record, { onConflict: 'id' });
        
        if (singleError) {
          console.error(`❌ Error insertando registro ${record.id}:`, singleError.message);
        } else {
          migratedCount++;
        }
      }
    } else {
      migratedCount += batch.length;
    }

    // Reportar progreso
    if (onProgress) {
      onProgress({
        table: tableName,
        totalRecords,
        migratedRecords: migratedCount,
        status: offset + limit >= totalRecords ? 'completed' : 'in_progress',
      });
    }

    offset += limit;
    console.log(`✅ Progreso: ${migratedCount}/${totalRecords} (${Math.round((migratedCount / totalRecords) * 100)}%)`);
  }

  console.log(`✅ Migración de ${tableName} completada: ${migratedCount}/${totalRecords} registros`);
}

/**
 * Migra todas las tablas grandes
 */
async function migrateAllLargeTables() {
  const largeTables = [
    'paraphrase_logs',           // 2545 registros
    'whatsapp_conversation_labels', // 286 registros
    'assignment_logs',          // 265 registros
    'prospect_assignments',      // 185 registros
    'user_permission_groups',    // 121 registros
  ];

  const progressFile = path.join(__dirname, 'migration-progress.json');
  let progress: MigrationProgress[] = [];

  // Cargar progreso previo si existe
  if (fs.existsSync(progressFile)) {
    progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  }

  for (const table of largeTables) {
    const existingProgress = progress.find(p => p.table === table);
    
    // Si ya está completada, saltar
    if (existingProgress?.status === 'completed') {
      console.log(`⏭️  ${table} ya migrada, saltando...`);
      continue;
    }

    try {
      await migrateLargeTable(table, (prog) => {
        // Actualizar progreso
        const index = progress.findIndex(p => p.table === table);
        if (index >= 0) {
          progress[index] = prog;
        } else {
          progress.push(prog);
        }
        
        // Guardar progreso
        fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
      });
    } catch (error: any) {
      console.error(`❌ Error migrando ${table}:`, error.message);
      
      const index = progress.findIndex(p => p.table === table);
      if (index >= 0) {
        progress[index].status = 'failed';
        progress[index].lastError = error.message;
      } else {
        progress.push({
          table,
          totalRecords: 0,
          migratedRecords: 0,
          status: 'failed',
          lastError: error.message,
        });
      }
      
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    }
  }

  console.log('\n✅ Migración de tablas grandes completada');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateAllLargeTables()
    .then(() => {
      console.log('\n🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

export { migrateLargeTable, migrateAllLargeTables };
