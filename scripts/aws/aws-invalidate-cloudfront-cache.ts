#!/usr/bin/env tsx
/**
 * Script para invalidar caché de CloudFront
 * Útil cuando se actualiza CSP u otros headers
 */

import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

const cloudfrontClient = new CloudFrontClient({ region: 'us-east-1' });

const DISTRIBUTION_ID = 'E19ZID7TVR08JG';

async function main() {
  console.log('🔄 Invalidando caché de CloudFront\n');
  console.log('============================================================\n');

  try {
    console.log('📋 Creando invalidación...');
    
    const invalidation = await cloudfrontClient.send(
      new CreateInvalidationCommand({
        DistributionId: DISTRIBUTION_ID,
        InvalidationBatch: {
          Paths: {
            Quantity: 1,
            Items: ['/*'], // Invalidar todo
          },
          CallerReference: `csp-update-${Date.now()}`,
        },
      })
    );

    console.log('✅ Invalidación creada exitosamente\n');
    console.log('📋 Detalles:');
    console.log(`   Invalidation ID: ${invalidation.Invalidation?.Id}`);
    console.log(`   Status: ${invalidation.Invalidation?.Status}`);
    console.log(`   Paths: /* (todos los archivos)\n`);
    console.log('⏳ Tiempo estimado:');
    console.log('   - Invalidación completa: 3-5 minutos');
    console.log('   - Los cambios de CSP deberían verse inmediatamente después\n');
    console.log('🔗 Link directo:');
    console.log(`   https://console.aws.amazon.com/cloudfront/v3/home#/distributions/${DISTRIBUTION_ID}/invalidations\n`);
    console.log('💡 Nota:');
    console.log('   - También puedes hacer hard refresh en el navegador (Ctrl+Shift+R o Cmd+Shift+R)');
    console.log('   - O limpiar caché del navegador para forzar descarga de nuevos headers\n');
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.$metadata) {
      console.error('   Request ID:', error.$metadata.requestId);
      console.error('   HTTP Status:', error.$metadata.httpStatusCode);
    }
    process.exit(1);
  }
}

main();
