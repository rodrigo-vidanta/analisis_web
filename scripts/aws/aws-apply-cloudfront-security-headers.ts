#!/usr/bin/env tsx
/**
 * Script para aplicar Response Headers Policy de seguridad a CloudFront
 * Incluye: CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy
 */

import { CloudFrontClient, CreateResponseHeadersPolicyCommand, GetDistributionConfigCommand, UpdateDistributionCommand, ListResponseHeadersPoliciesCommand, GetResponseHeadersPolicyCommand } from '@aws-sdk/client-cloudfront';

const cloudfrontClient = new CloudFrontClient({ region: 'us-east-1' }); // CloudFront siempre usa us-east-1

const DISTRIBUTION_ID = 'E19ZID7TVR08JG';
const POLICY_NAME = 'security-headers-policy';

async function main() {
  console.log('🔒 Aplicando Response Headers Policy de Seguridad a CloudFront\n');
  console.log('============================================================\n');

  try {
    // Paso 1: Verificar si la policy ya existe
    console.log('📋 Paso 1: Verificando si la policy ya existe...');
    const listPolicies = await cloudfrontClient.send(
      new ListResponseHeadersPoliciesCommand({
        Type: 'custom',
      })
    );

    let policyId: string | undefined;
    let policyETag: string | undefined;

    if (listPolicies.ResponseHeadersPolicyList?.Items) {
      const existingPolicy = listPolicies.ResponseHeadersPolicyList.Items.find(
        (p) => p.ResponseHeadersPolicy?.ResponseHeadersPolicyConfig?.Name === POLICY_NAME
      );

      if (existingPolicy?.ResponseHeadersPolicy) {
        policyId = existingPolicy.ResponseHeadersPolicy.Id;
        policyETag = existingPolicy.ResponseHeadersPolicy.ResponseHeadersPolicyConfig?.Name;
        console.log(`✅ Policy existente encontrada: ${policyId}`);
        
        // Obtener detalles completos
        const policyDetails = await cloudfrontClient.send(
          new GetResponseHeadersPolicyCommand({
            Id: policyId,
          })
        );
        policyETag = policyDetails.ETag;
        console.log(`✅ ETag obtenido: ${policyETag?.substring(0, 20)}...\n`);
      }
    }

    // Paso 2: Crear o actualizar la policy
    if (!policyId) {
      console.log('📋 Paso 2: Creando nueva Response Headers Policy...');
      
      const createPolicyResponse = await cloudfrontClient.send(
        new CreateResponseHeadersPolicyCommand({
          ResponseHeadersPolicyConfig: {
            Name: POLICY_NAME,
            Comment: 'Security headers policy: CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy',
            SecurityHeadersConfig: {
              ContentSecurityPolicy: {
                ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.vidavacations.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://glsmifhkoaifvaegsozd.supabase.co https://*.vidavacations.com wss://*.supabase.co wss://*.vapi.ai; frame-src 'self' https://*.supabase.co;",
                Override: true,
              },
              StrictTransportSecurity: {
                AccessControlMaxAgeSec: 31536000, // 1 año
                IncludeSubdomains: true,
                Override: true,
              },
              FrameOptions: {
                FrameOption: 'DENY', // o 'SAMEORIGIN' según necesidad
                Override: true,
              },
              XSSProtection: {
                ModeBlock: true,
                Protection: true,
                ReportUri: undefined,
                Override: true,
              },
              ReferrerPolicy: {
                ReferrerPolicy: 'strict-origin-when-cross-origin',
                Override: true,
              },
            },
          },
        })
      );

      if (!createPolicyResponse.ResponseHeadersPolicy?.Id) {
        throw new Error('Error al crear la Response Headers Policy');
      }

      policyId = createPolicyResponse.ResponseHeadersPolicy.Id;
      console.log(`✅ Policy creada exitosamente:`);
      console.log(`   ID: ${policyId}`);
      console.log(`   ETag: ${createPolicyResponse.ETag?.substring(0, 20)}...\n`);
    } else {
      console.log('📋 Paso 2: Usando policy existente\n');
    }

    // Paso 3: Obtener configuración actual de la distribución
    console.log('📋 Paso 3: Obteniendo configuración de CloudFront Distribution...');
    const distConfig = await cloudfrontClient.send(
      new GetDistributionConfigCommand({
        Id: DISTRIBUTION_ID,
      })
    );

    if (!distConfig.DistributionConfig) {
      throw new Error('No se pudo obtener la configuración de la distribución');
    }

    const currentETag = distConfig.ETag;
    const config = distConfig.DistributionConfig;

    console.log(`✅ Configuración obtenida`);
    console.log(`   ETag actual: ${currentETag?.substring(0, 20)}...\n`);

    // Paso 4: Asociar la policy a la distribución
    console.log('📋 Paso 4: Asociando Response Headers Policy a CloudFront...');

    // Actualizar configuración con la Response Headers Policy
    const updatedConfig = {
      ...config,
      DefaultCacheBehavior: {
        ...config.DefaultCacheBehavior,
        ResponseHeadersPolicyId: policyId,
      },
      // Si hay CacheBehaviors, también actualizarlos
      CacheBehaviors: config.CacheBehaviors?.Items?.map((behavior) => ({
        ...behavior,
        ResponseHeadersPolicyId: policyId,
      })),
    };

    const updateResponse = await cloudfrontClient.send(
      new UpdateDistributionCommand({
        Id: DISTRIBUTION_ID,
        DistributionConfig: updatedConfig,
        IfMatch: currentETag,
      })
    );

    console.log(`✅ Response Headers Policy asociada exitosamente\n`);

    // Paso 5: Resumen
    console.log('============================================================\n');
    console.log('✅ CONFIGURACIÓN COMPLETADA\n');
    console.log('📋 Resumen:');
    console.log(`   Distribution ID: ${DISTRIBUTION_ID}`);
    console.log(`   Policy ID: ${policyId}`);
    console.log(`   Policy Name: ${POLICY_NAME}\n`);
    console.log('🔒 Headers de Seguridad Aplicados:');
    console.log('   ✅ Content-Security-Policy');
    console.log('   ✅ Strict-Transport-Security (HSTS)');
    console.log('   ✅ X-Frame-Options: DENY');
    console.log('   ✅ X-XSS-Protection');
    console.log('   ✅ Referrer-Policy: strict-origin-when-cross-origin\n');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Los cambios pueden tardar 15-20 minutos en propagarse');
    console.log('   - La distribución estará en estado "InProgress" durante la actualización');
    console.log('   - Puedes verificar el estado en AWS Console\n');
    console.log('🔗 Link directo:');
    console.log(`   https://console.aws.amazon.com/cloudfront/v3/home#/distributions/${DISTRIBUTION_ID}\n`);
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
