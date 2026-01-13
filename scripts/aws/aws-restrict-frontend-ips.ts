#!/usr/bin/env tsx
/**
 * Script para restringir acceso al frontend CloudFront solo a IPs específicas
 * Usa AWS WAF para crear una whitelist de IPs permitidas
 */

import { WAFV2Client, CreateIPSetCommand, CreateWebACLCommand, AssociateWebACLCommand, GetWebACLCommand, ListIPSetsCommand, GetIPSetCommand, UpdateIPSetCommand, ListWebACLsCommand } from '@aws-sdk/client-wafv2';
import { CloudFrontClient, GetDistributionConfigCommand, UpdateDistributionCommand } from '@aws-sdk/client-cloudfront';

const wafClient = new WAFV2Client({ region: 'us-east-1' }); // WAF debe estar en us-east-1 para CloudFront
const cloudfrontClient = new CloudFrontClient({ region: 'us-east-1' });

// IPs permitidas con etiquetas/notas
const ALLOWED_IPS = [
  { ip: '189.203.238.35', label: 'Total Play' },
  { ip: '187.210.107.179', label: 'Telmex' },
  { ip: '189.178.124.238', label: 'IP del usuario 1' },
  { ip: '189.177.138.158', label: 'IP del usuario 2' },
  { ip: '189.203.97.130', label: 'drosales' },
  { ip: '187.144.0.73', label: 'oficinaIA' },
  { ip: '187.144.87.193', label: 'casa rodrigo' },
];

const CLOUDFRONT_DISTRIBUTION_ID = 'E19ZID7TVR08JG';
const IP_SET_NAME = 'frontend-allowed-ips';
const WEB_ACL_NAME = 'frontend-ip-restriction';

async function getOrCreateIPSet(): Promise<string> {
  console.log('📝 Verificando IP Set...');
  
  try {
    // Intentar listar IP Sets existentes
    const listResponse = await wafClient.send(new ListIPSetsCommand({
      Scope: 'CLOUDFRONT',
    }));

    const existingIPSet = listResponse.IPSets?.find(ipset => ipset.Name === IP_SET_NAME);
    
    if (existingIPSet && existingIPSet.ARN) {
      console.log(`✅ IP Set existente encontrado: ${existingIPSet.ARN}`);
      
      // Verificar que tenga las IPs correctas
      const ipSetDetails = await wafClient.send(new GetIPSetCommand({
        Scope: 'CLOUDFRONT',
        Id: existingIPSet.Id!,
        Name: IP_SET_NAME,
      }));

      const currentIPs = ipSetDetails.IPSet?.Addresses || [];
      const expectedIPs = ALLOWED_IPS.map(item => `${item.ip}/32`).sort();
      const currentIPsSorted = currentIPs.sort();

      if (JSON.stringify(currentIPsSorted) !== JSON.stringify(expectedIPs)) {
        console.log('⚠️  Las IPs en el IP Set no coinciden. Actualizando...');
        
        // Obtener el LockToken necesario para actualizar
        const lockToken = ipSetDetails.LockToken;
        if (!lockToken) {
          throw new Error('No se pudo obtener el LockToken para actualizar el IP Set');
        }

        // Actualizar el IP Set con las nuevas IPs
        await wafClient.send(new UpdateIPSetCommand({
          Scope: 'CLOUDFRONT',
          Id: existingIPSet.Id!,
          Name: IP_SET_NAME,
          Addresses: expectedIPs,
          LockToken: lockToken,
        }));

        console.log('✅ IP Set actualizado exitosamente');
        console.log(`   IPs actualizadas: ${ALLOWED_IPS.length}`);
        ALLOWED_IPS.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.ip} (${item.label})`);
        });
        
        // Esperar un momento para que AWS propague el cambio
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return existingIPSet.ARN;
      }

      console.log('✅ IP Set tiene las IPs correctas');
      return existingIPSet.ARN;
    }

    // Crear nuevo IP Set
    console.log('📝 Creando nuevo IP Set...');
    const ipSetResponse = await wafClient.send(new CreateIPSetCommand({
      Name: IP_SET_NAME,
      Scope: 'CLOUDFRONT',
      Description: 'IPs permitidas para acceder al frontend',
      Addresses: ALLOWED_IPS.map(item => `${item.ip}/32`),
      IPAddressVersion: 'IPV4',
    }));

    const ipSetArn = ipSetResponse.Summary?.ARN;
    if (!ipSetArn) {
      throw new Error('No se pudo obtener el ARN del IP Set');
    }

    console.log(`✅ IP Set creado: ${ipSetArn}`);
    
    // Esperar un momento para que AWS propague el recurso
    console.log('⏳ Esperando propagación del IP Set...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return ipSetArn;
  } catch (error: any) {
    if (error.name === 'WAFDuplicateItemException') {
      console.log('⚠️  El IP Set ya existe. Obteniendo detalles...');
      // Intentar obtener el IP Set existente
      const listResponse = await wafClient.send(new ListIPSetsCommand({
        Scope: 'CLOUDFRONT',
      }));
      const existingIPSet = listResponse.IPSets?.find(ipset => ipset.Name === IP_SET_NAME);
      if (existingIPSet?.ARN) {
        return existingIPSet.ARN;
      }
      throw new Error('IP Set ya existe pero no se pudo obtener su ARN');
    }
    throw error;
  }
}

async function createWebACL(ipSetArn: string): Promise<string> {
  console.log('🛡️  Creando Web ACL...');

  try {
    // Esperar un poco más para asegurar que el IP Set esté disponible
    await new Promise(resolve => setTimeout(resolve, 2000));

    const webAclResponse = await wafClient.send(new CreateWebACLCommand({
      Name: WEB_ACL_NAME,
      Scope: 'CLOUDFRONT',
      Description: 'Web ACL para restringir acceso al frontend solo a IPs permitidas',
      DefaultAction: {
        Block: {}, // Bloquear todo por defecto
      },
      Rules: [
        {
          Name: 'allow-listed-ips',
          Priority: 0,
          Statement: {
            IPSetReferenceStatement: {
              ARN: ipSetArn,
            },
          },
          Action: {
            Allow: {}, // Permitir solo las IPs en la lista
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'AllowListedIPs',
          },
        },
      ],
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: WEB_ACL_NAME,
      },
    }));

    const webAclArn = webAclResponse.Summary?.ARN;
    if (!webAclArn) {
      throw new Error('No se pudo obtener el ARN del Web ACL');
    }

    console.log(`✅ Web ACL creado: ${webAclArn}`);
    
    // Esperar un momento para que AWS propague el recurso
    console.log('⏳ Esperando propagación del Web ACL...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return webAclArn;
  } catch (error: any) {
    if (error.name === 'WAFDuplicateItemException') {
      console.log('⚠️  El Web ACL ya existe. Obteniendo ARN...');
      
      // Listar Web ACLs para obtener el ID
      const listResponse = await wafClient.send(new ListWebACLsCommand({
        Scope: 'CLOUDFRONT',
      }));
      
      const existingAcl = listResponse.WebACLs?.find(acl => acl.Name === WEB_ACL_NAME);
      
      if (existingAcl && existingAcl.ARN) {
        console.log(`✅ Web ACL existente encontrado: ${existingAcl.ARN}`);
        return existingAcl.ARN;
      }
      
      // Si no se encuentra en la lista, intentar obtenerlo directamente con el ID si lo tenemos
      throw new Error('Web ACL ya existe pero no se pudo obtener su ARN');
    }
    if (error.message?.includes('couldn\'t retrieve the resource')) {
      console.log('⚠️  Error al acceder al recurso. Esperando y reintentando...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Reintentar
      return createWebACL(ipSetArn);
    }
    throw error;
  }
}

async function associateWebACLWithCloudFront(webAclArn: string): Promise<void> {
  console.log('🔗 Asociando Web ACL con CloudFront...');

  try {
    // Obtener configuración actual de CloudFront
    const distConfig = await cloudfrontClient.send(new GetDistributionConfigCommand({
      Id: CLOUDFRONT_DISTRIBUTION_ID,
    }));

    if (!distConfig.DistributionConfig) {
      throw new Error('No se pudo obtener la configuración de CloudFront');
    }

    const config = distConfig.DistributionConfig;
    const etag = distConfig.ETag;

    // Verificar si ya tiene un Web ACL asociado
    if (config.WebACLId === webAclArn) {
      console.log('✅ El Web ACL ya está asociado a CloudFront');
      return;
    }

    // Actualizar distribución con el Web ACL
    await cloudfrontClient.send(new UpdateDistributionCommand({
      Id: CLOUDFRONT_DISTRIBUTION_ID,
      DistributionConfig: {
        ...config,
        WebACLId: webAclArn,
      },
      IfMatch: etag,
    }));

    console.log('✅ Web ACL asociado a CloudFront exitosamente');
    console.log('⏳ Nota: Los cambios en CloudFront pueden tardar 15-20 minutos en propagarse');
  } catch (error: any) {
    if (error.name === 'InvalidIfMatchVersion') {
      throw new Error('La configuración de CloudFront cambió. Por favor intenta de nuevo.');
    }
    throw error;
  }
}

async function main() {
  console.log('🔒 Configurando Restricción de IPs para Frontend\n');
  console.log('='.repeat(60));
  console.log('\n📋 IPs Permitidas:');
  ALLOWED_IPS.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.ip} (${item.label})`);
  });
  console.log('\n' + '='.repeat(60));

  try {
    // Paso 1: Obtener o crear IP Set
    const ipSetArn = await getOrCreateIPSet();
    
    // Paso 2: Crear Web ACL
    const webAclArn = await createWebACL(ipSetArn);
    
    // Paso 3: Asociar Web ACL con CloudFront
    await associateWebACLWithCloudFront(webAclArn);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ CONFIGURACIÓN COMPLETADA\n');
    console.log('📋 Resumen:');
    console.log(`   IP Set: ${IP_SET_NAME}`);
    console.log(`   Web ACL: ${WEB_ACL_NAME}`);
    console.log(`   CloudFront Distribution: ${CLOUDFRONT_DISTRIBUTION_ID}`);
    console.log(`   IPs permitidas: ${ALLOWED_IPS.length}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Los cambios pueden tardar 15-20 minutos en propagarse');
    console.log('   - Solo las IPs listadas podrán acceder al frontend');
    console.log('   - Todas las demás IPs serán bloqueadas');
    console.log('   - Puedes verificar el estado en AWS Console > WAF > Web ACLs');
    console.log('\n' + '='.repeat(60));
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.name === 'WAFDuplicateItemException') {
      console.error('\n💡 Solución:');
      console.error('   El recurso ya existe. Puedes:');
      console.error('   1. Eliminar el recurso existente desde AWS Console');
      console.error('   2. O modificar este script para usar nombres diferentes');
    }
    process.exit(1);
  }
}

main().catch(console.error);

