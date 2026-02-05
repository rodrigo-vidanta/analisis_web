#!/usr/bin/env tsx
/**
 * Script para agregar Google Cloud Storage al CSP
 * Soluciona violaciones de CSP para archivos multimedia en storage.googleapis.com
 */

import { CloudFrontClient, GetResponseHeadersPolicyCommand, UpdateResponseHeadersPolicyCommand } from '@aws-sdk/client-cloudfront';

const cloudfrontClient = new CloudFrontClient({ region: 'us-east-1' });

const POLICY_ID = 'b1ffe080-f1e6-45f0-b740-9e83df9b5c19';
const POLICY_NAME = 'security-headers-policy';

// Hashes SHA256 de scripts inline permitidos
const INLINE_SCRIPT_HASH_1 = 'sha256-pVK79yYfKa9U7TSo8KVdFI4XECxZEYEBPNNk9NTR4qI=';
const INLINE_SCRIPT_HASH_2 = 'sha256-i9rPagNzgj87Rm/3ucIGL/9yZf9fDw1qalOjFAL1tc0=';

async function main() {
  console.log('🔒 Actualizando CSP: Agregando Google Cloud Storage\n');
  console.log('============================================================\n');

  try {
    // Paso 1: Obtener policy actual
    console.log('📋 Paso 1: Obteniendo policy actual...');
    const currentPolicy = await cloudfrontClient.send(
      new GetResponseHeadersPolicyCommand({
        Id: POLICY_ID,
      })
    );

    if (!currentPolicy.ResponseHeadersPolicy) {
      throw new Error('Policy no encontrada');
    }

    const currentETag = currentPolicy.ETag;
    const currentCSP = currentPolicy.ResponseHeadersPolicy.ResponseHeadersPolicyConfig?.SecurityHeadersConfig?.ContentSecurityPolicy?.ContentSecurityPolicy || '';
    
    console.log(`✅ Policy obtenida: ${POLICY_ID}`);
    console.log(`   ETag: ${currentETag?.substring(0, 20)}...\n`);

    // Paso 2: Crear CSP actualizado con Google Cloud Storage
    console.log('📋 Paso 2: Creando CSP actualizado...');
    
    // CSP actualizado con Google Cloud Storage en media-src
    const updatedCSP = [
      "default-src 'self'",
      `script-src 'self' '${INLINE_SCRIPT_HASH_1}' '${INLINE_SCRIPT_HASH_2}' https://*.supabase.co https://*.vidavacations.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' https://storage.vapi.ai https://storage.googleapis.com https://*.googleapis.com https://*.supabase.co blob:",
      "connect-src 'self' https://*.supabase.co https://glsmifhkoaifvaegsozd.supabase.co https://*.vidavacations.com https://api.ipify.org https://function-bun-dev-6d8e.up.railway.app wss://*.supabase.co wss://*.vapi.ai",
      "frame-src 'self' https://*.supabase.co"
    ].join('; ');

    console.log('✅ CSP actualizado creado:');
    console.log(`   - Agregado: https://storage.googleapis.com a media-src`);
    console.log(`   - Agregado: https://*.googleapis.com a media-src (para subdominios)\n`);

    // Paso 3: Actualizar policy
    console.log('📋 Paso 3: Actualizando Response Headers Policy...');
    
    const updatedConfig = {
      ...currentPolicy.ResponseHeadersPolicy.ResponseHeadersPolicyConfig!,
      SecurityHeadersConfig: {
        ...currentPolicy.ResponseHeadersPolicy.ResponseHeadersPolicyConfig!.SecurityHeadersConfig,
        ContentSecurityPolicy: {
          Override: true,
          ContentSecurityPolicy: updatedCSP,
        },
      },
    };

    const updateResponse = await cloudfrontClient.send(
      new UpdateResponseHeadersPolicyCommand({
        Id: POLICY_ID,
        IfMatch: currentETag,
        ResponseHeadersPolicyConfig: updatedConfig,
      })
    );

    console.log(`✅ Policy actualizada exitosamente\n`);

    // Paso 4: Resumen
    console.log('============================================================\n');
    console.log('✅ ACTUALIZACIÓN COMPLETADA\n');
    console.log('📋 Cambios Aplicados:');
    console.log(`   ✅ Agregado https://storage.googleapis.com a media-src`);
    console.log(`   ✅ Agregado https://*.googleapis.com a media-src\n`);
    console.log('🔒 Archivos Multimedia Permitidos:');
    console.log('   ✅ storage.vapi.ai');
    console.log('   ✅ storage.googleapis.com (Google Cloud Storage)');
    console.log('   ✅ *.googleapis.com (subdominios de Google)');
    console.log('   ✅ *.supabase.co');
    console.log('   ✅ blob: (URLs blob locales)\n');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Los cambios pueden tardar 15-20 minutos en propagarse');
    console.log('   - Los archivos multimedia de WhatsApp ahora deberían cargar correctamente\n');
    console.log('🔗 Link directo:');
    console.log(`   https://console.aws.amazon.com/cloudfront/v3/home#/policies/response-headers/${POLICY_ID}\n`);
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.$metadata) {
      console.error('   Request ID:', error.$metadata.requestId);
      console.error('   HTTP Status:', error.$metadata.httpStatusCode);
    }
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
