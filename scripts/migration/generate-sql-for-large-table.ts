/**
 * Genera scripts SQL para migrar tablas grandes
 * Los scripts se guardan en archivos y se ejecutan directamente sin mostrar contenido
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SYSTEM_UI_SUPABASE_URL = process.env.VITE_SYSTEM_UI_SUPABASE_URL || '';
const SYSTEM_UI_SERVICE_KEY = process.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || '';

const supabaseSystemUI = createClient(SYSTEM_UI_SUPABASE_URL, SYSTEM_UI_SERVICE_KEY);

const BATCH_SIZE = 1000; // Generar INSERTs en lotes de 1000

/**
 * Genera script SQL para migrar una tabla grande
 * El script se guarda en un archivo y puede ejecutarse directamente
 */
async function generateSQLForTable(tableName: string): Promise<string> {
  console.log(`\n📝 Generando SQL para ${tableName}...`);

  // Obtener conteo total
  const { count } = await supabaseSystemUI
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  const totalRecords = count || 0;
  console.log(`📊 Total de registros: ${totalRecords}`);

  if (totalRecords === 0) {
    return `-- Tabla ${tableName} está vacía\n`;
  }

  const outputDir = path.join(__dirname, 'generated-sql');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sqlFile = path.join(outputDir, `migrate_${tableName}.sql`);
  const stream = fs.createWriteStream(sqlFile);

  // Escribir header del script
  stream.write(`-- Script SQL generado para migrar ${tableName}\n`);
  stream.write(`-- Total de registros: ${totalRecords}\n`);
  stream.write(`-- Generado: ${new Date().toISOString()}\n\n`);
  stream.write(`-- Ejecutar este script directamente en pqnc_ai\n\n`);

  let offset = 0;
  let batchNumber = 0;

  while (offset < totalRecords) {
    const limit = Math.min(BATCH_SIZE, totalRecords - offset);
    batchNumber++;

    console.log(`📦 Generando lote ${batchNumber}: ${offset + 1}-${offset + limit}`);

    // Obtener lote de datos
    const { data: batch, error } = await supabaseSystemUI
      .from(tableName)
      .select('*')
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Error obteniendo datos: ${error.message}`);
    }

    if (!batch || batch.length === 0) {
      break;
    }

    // Generar INSERT SQL para el lote
    stream.write(`-- Lote ${batchNumber}: registros ${offset + 1}-${offset + limit}\n`);
    stream.write(`INSERT INTO ${tableName} (`);
    
    // Obtener columnas del primer registro
    const columns = Object.keys(batch[0]);
    stream.write(columns.join(', '));
    stream.write(`) VALUES\n`);

    // Generar VALUES para cada registro
    const values = batch.map((record, idx) => {
      const recordValues = columns.map(col => {
        const value = record[col];
        if (value === null || value === undefined) {
          return 'NULL';
        }
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'boolean') {
          return value ? 'true' : 'false';
        }
        if (typeof value === 'object') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
        }
        return String(value);
      });
      
      return `  (${values.join(', ')})${idx < batch.length - 1 ? ',' : ''}`;
    });

    stream.write(values.join('\n'));
    stream.write(`\nON CONFLICT (id) DO UPDATE SET\n`);
    
    // Generar UPDATE SET para columnas (excluyendo id)
    const updateColumns = columns.filter(col => col !== 'id');
    stream.write(updateColumns.map(col => `  ${col} = EXCLUDED.${col}`).join(',\n'));
    stream.write(`;\n\n`);

    offset += limit;
  }

  stream.end();
  console.log(`✅ SQL generado: ${sqlFile}`);

  return sqlFile;
}

/**
 * Genera scripts SQL para todas las tablas grandes
 */
async function generateSQLForAllLargeTables() {
  const largeTables = [
    'paraphrase_logs',
    'whatsapp_conversation_labels',
    'assignment_logs',
    'prospect_assignments',
    'user_permission_groups',
  ];

  for (const table of largeTables) {
    try {
      await generateSQLForTable(table);
    } catch (error: any) {
      console.error(`❌ Error generando SQL para ${table}:`, error.message);
    }
  }

  console.log('\n✅ Generación de scripts SQL completada');
  console.log('📁 Scripts guardados en: scripts/migration/generated-sql/');
  console.log('💡 Ejecutar los scripts directamente en pqnc_ai usando psql o el cliente SQL');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateSQLForAllLargeTables()
    .then(() => {
      console.log('\n🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

export { generateSQLForTable, generateSQLForAllLargeTables };
