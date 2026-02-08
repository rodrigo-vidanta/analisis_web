#!/usr/bin/env node
/**
 * Genera thumbnails WebP para todas las imagenes del catalogo.
 *
 * Uso:
 *   node scripts/generate-thumbnails.cjs
 *
 * Requiere:
 *   - sharp (npm install --save-dev sharp)
 *   - .env.local con VITE_EDGE_FUNCTIONS_URL y VITE_ANALYSIS_SUPABASE_ANON_KEY
 *
 * Resultado:
 *   - Thumbnails WebP de 300px en public/thumbnails/{hash}.webp
 *   - Manifiesto en public/thumbnails/manifest.json
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ============================================
// CONFIG
// ============================================

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_QUALITY = 75;
const BATCH_SIZE = 5;       // URLs por request a batch-sign-urls (max 10)
const DOWNLOAD_CONCURRENT = 3; // Descargas simultaneas
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'thumbnails');
const ENV_FILE = path.join(__dirname, '..', '.env.local');

// ============================================
// UTILS
// ============================================

function loadEnv() {
  const content = fs.readFileSync(ENV_FILE, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBaseName(filename) {
  return filename.replace(/\.[^.]+$/, '');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Generador de Thumbnails PQNC ===\n');

  const env = loadEnv();
  const edgeFunctionsUrl = env.VITE_EDGE_FUNCTIONS_URL;
  const anonKey = env.VITE_ANALYSIS_SUPABASE_ANON_KEY;
  const serviceKey = env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

  if (!edgeFunctionsUrl || !anonKey) {
    console.error('ERROR: Falta VITE_EDGE_FUNCTIONS_URL o VITE_ANALYSIS_SUPABASE_ANON_KEY en .env.local');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Query DB via Supabase REST API (service key for RLS bypass)
  console.log('Consultando content_management...');
  const dbResponse = await fetch(
    `${edgeFunctionsUrl}/rest/v1/content_management?tipo_contenido=eq.imagen&select=id,nombre_archivo,bucket&order=nombre_archivo`,
    {
      headers: {
        'apikey': serviceKey || anonKey,
        'Authorization': `Bearer ${serviceKey || anonKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!dbResponse.ok) {
    console.error('ERROR al consultar BD:', dbResponse.status, await dbResponse.text());
    process.exit(1);
  }

  const images = await dbResponse.json();
  const validImages = images.filter(img => img.bucket && img.nombre_archivo);
  console.log(`Encontradas ${validImages.length} imagenes con bucket valido.`);

  // Filtrar ya procesadas
  const toProcess = validImages.filter(img => {
    const baseName = getBaseName(img.nombre_archivo);
    const outPath = path.join(OUTPUT_DIR, `${baseName}.webp`);
    return !fs.existsSync(outPath);
  });

  const alreadyDone = validImages.length - toProcess.length;
  console.log(`${alreadyDone} ya tienen thumbnail, ${toProcess.length} por procesar.\n`);

  if (toProcess.length === 0) {
    console.log('Todos los thumbnails ya existen.');
    generateManifest(validImages);
    return;
  }

  // Procesar en batches usando batch-sign-urls Edge Function
  let success = 0;
  let failed = 0;
  const failedItems = [];
  const batchSignUrl = `${edgeFunctionsUrl}/functions/v1/batch-sign-urls`;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    // 1. Obtener signed URLs en batch
    let signedUrls;
    try {
      const urlResponse = await fetch(batchSignUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: batch.map(img => ({ filename: img.nombre_archivo, bucket: img.bucket }))
        })
      });

      if (!urlResponse.ok) {
        const errText = await urlResponse.text();
        throw new Error(`batch-sign-urls ${urlResponse.status}: ${errText}`);
      }

      const data = await urlResponse.json();
      signedUrls = data.urls;
    } catch (err) {
      console.error(`\n  BATCH ERROR (${i}-${i + batch.length}): ${err.message}`);
      failed += batch.length;
      batch.forEach(img => failedItems.push(img.nombre_archivo));
      continue;
    }

    // 2. Descargar y generar thumbnails en paralelo
    const downloadResults = await Promise.allSettled(
      signedUrls.map((urlInfo, idx) => {
        if (!urlInfo.url) return Promise.reject(new Error('No signed URL'));
        return downloadAndResize(batch[idx], urlInfo.url);
      })
    );

    for (let j = 0; j < downloadResults.length; j++) {
      const result = downloadResults[j];
      const img = batch[j];
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
        failedItems.push(img.nombre_archivo);
        const reason = result.status === 'rejected' ? result.reason?.message : 'returned false';
        if (failed <= 10) console.error(`\n  FAIL: ${img.nombre_archivo} - ${reason}`);
      }
    }

    const total = Math.min(i + BATCH_SIZE, toProcess.length);
    process.stdout.write(`\r  Progreso: ${total}/${toProcess.length} (${success} ok, ${failed} fail)`);

    // Delay entre batches
    if (i + BATCH_SIZE < toProcess.length) {
      await sleep(300);
    }
  }

  console.log(`\n\nResultado: ${success} thumbnails generados, ${failed} fallidos.`);

  if (failedItems.length > 0 && failedItems.length <= 20) {
    console.log('\nFallidos:');
    failedItems.forEach(f => console.log(`  - ${f}`));
  } else if (failedItems.length > 20) {
    console.log(`\n${failedItems.length} fallidos (mostrando primeros 20):`);
    failedItems.slice(0, 20).forEach(f => console.log(`  - ${f}`));
  }

  generateManifest(validImages);
  console.log('\nListo!');
}

async function downloadAndResize(img, signedUrl) {
  const baseName = getBaseName(img.nombre_archivo);
  const outPath = path.join(OUTPUT_DIR, `${baseName}.webp`);

  const imgResponse = await fetch(signedUrl);
  if (!imgResponse.ok) {
    throw new Error(`Download ${imgResponse.status}`);
  }

  const buffer = Buffer.from(await imgResponse.arrayBuffer());

  await sharp(buffer)
    .resize(THUMBNAIL_WIDTH, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toFile(outPath);

  return true;
}

function generateManifest(allImages) {
  const manifest = {};
  let found = 0;

  for (const img of allImages) {
    if (!img.nombre_archivo) continue;
    const baseName = getBaseName(img.nombre_archivo);
    const outPath = path.join(OUTPUT_DIR, `${baseName}.webp`);

    if (fs.existsSync(outPath)) {
      const stats = fs.statSync(outPath);
      manifest[img.nombre_archivo] = {
        thumbnail: `${baseName}.webp`,
        size: stats.size,
        id: img.id
      };
      found++;
    }
  }

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifiesto generado: ${found} entradas en ${manifestPath}`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
