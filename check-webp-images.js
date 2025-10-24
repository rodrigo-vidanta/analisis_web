// Script para listar todas las imágenes .webp en content_management
// Base de datos: pqnc_ia (analysisSupabase)

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// Configuración directa de Supabase Analysis (pqnc_ia)
const supabaseUrl = 'https://glsmifhkoaifvaegsozd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODY3ODcsImV4cCI6MjA2ODI2Mjc4N30.dLgxIZtue-mH-duc_4qZxVoDT1_ih_Ar4Aj3j6j042E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listWebpImages() {
  console.log('🔍 Buscando imágenes .webp en content_management...\n');

  try {
    // Query para buscar archivos .webp
    const { data, error } = await supabase
      .from('content_management')
      .select('id, nombre_archivo, nombre, bucket, destinos, resorts, created_at')
      .ilike('nombre_archivo', '%.webp')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al consultar:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('✅ No se encontraron imágenes .webp');
      return;
    }

    console.log(`📊 **Total de imágenes .webp encontradas: ${data.length}**\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Agrupar por bucket
    const byBucket = data.reduce((acc, img) => {
      const bucket = img.bucket || 'sin-bucket';
      if (!acc[bucket]) acc[bucket] = [];
      acc[bucket].push(img);
      return acc;
    }, {});

    // Mostrar por bucket
    for (const [bucket, images] of Object.entries(byBucket)) {
      console.log(`\n📦 **Bucket: ${bucket}** (${images.length} imágenes)\n`);
      console.log('─────────────────────────────────────────────────────────────\n');
      
      images.forEach((img, index) => {
        console.log(`${index + 1}. **${img.nombre_archivo}**`);
        console.log(`   - ID: ${img.id}`);
        console.log(`   - Nombre: ${img.nombre || 'Sin nombre'}`);
        console.log(`   - Destinos: ${img.destinos ? img.destinos.join(', ') : 'N/A'}`);
        console.log(`   - Resorts: ${img.resorts ? img.resorts.join(', ') : 'N/A'}`);
        console.log(`   - Creado: ${new Date(img.created_at).toLocaleString('es-MX')}`);
        console.log('');
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`\n✅ **RESUMEN:**`);
    console.log(`   - Total de imágenes .webp: ${data.length}`);
    console.log(`   - Buckets únicos: ${Object.keys(byBucket).length}`);
    console.log(`   - Distribución por bucket:`);
    
    for (const [bucket, images] of Object.entries(byBucket)) {
      console.log(`     • ${bucket}: ${images.length} imágenes`);
    }

    // Exportar listado completo a archivo
    const report = {
      fecha_reporte: new Date().toISOString(),
      total_imagenes_webp: data.length,
      buckets: byBucket,
      listado_completo: data
    };

    writeFileSync(
      'webp-images-report.json',
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    console.log('\n📄 **Reporte completo guardado en:** webp-images-report.json');

  } catch (err) {
    console.error('❌ Error inesperado:', err);
  }
}

// Ejecutar
listWebpImages();

