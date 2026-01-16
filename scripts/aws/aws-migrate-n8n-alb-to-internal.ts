#!/usr/bin/env npx tsx
/**
 * Script para migrar el ALB de n8n de internet-facing a internal
 * 
 * AWS no permite cambiar el esquema de un ALB existente, por lo que:
 * 1. Crear nuevo ALB con esquema internal
 * 2. Crear listeners en el nuevo ALB
 * 3. Actualizar servicio ECS para usar nuevo ALB
 * 4. Eliminar ALB público antiguo
 */

import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateListenerCommand,
  DescribeLoadBalancersCommand,
  DescribeListenersCommand,
  DescribeTargetGroupsCommand,
  DeleteLoadBalancerCommand,
  DeleteListenerCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  ECSClient,
  DescribeServicesCommand,
} from '@aws-sdk/client-ecs';
import {
  EC2Client,
  DescribeSecurityGroupsCommand,
} from '@aws-sdk/client-ec2';

const REGION = 'us-west-2';
const VPC_ID = 'vpc-05eb3d8651aff5257';
const CLUSTER_NAME = 'n8n-production';
const SERVICE_NAME = 'n8n-service';
const OLD_ALB_NAME = 'n8n-alb';
const NEW_ALB_NAME = 'n8n-alb-internal';
const TARGET_GROUP_NAME = 'n8n-targets';

const elbClient = new ElasticLoadBalancingV2Client({ region: REGION });
const ecsClient = new ECSClient({ region: REGION });
const ec2Client = new EC2Client({ region: REGION });

async function main() {
  console.log('🔄 Migrando ALB de n8n a esquema INTERNAL\n');
  console.log('============================================================\n');

  try {
    // Paso 1: Obtener información del ALB actual
    console.log('📋 Paso 1: Obteniendo información del ALB actual...');
    const oldALB = await elbClient.send(
      new DescribeLoadBalancersCommand({
        Names: [OLD_ALB_NAME],
      })
    );

    if (!oldALB.LoadBalancers || oldALB.LoadBalancers.length === 0) {
      throw new Error(`ALB ${OLD_ALB_NAME} no encontrado`);
    }

    const oldALBArn = oldALB.LoadBalancers[0].LoadBalancerArn!;
    console.log(`✅ ALB encontrado: ${oldALBArn}`);

    // Obtener listeners del ALB actual
    const listeners = await elbClient.send(
      new DescribeListenersCommand({
        LoadBalancerArn: oldALBArn,
      })
    );

    console.log(`✅ Listeners encontrados: ${listeners.Listeners?.length || 0}`);

    // Obtener target group
    const targetGroups = await elbClient.send(
      new DescribeTargetGroupsCommand({
        Names: [TARGET_GROUP_NAME],
      })
    );

    if (!targetGroups.TargetGroups || targetGroups.TargetGroups.length === 0) {
      throw new Error(`Target Group ${TARGET_GROUP_NAME} no encontrado`);
    }

    const targetGroupArn = targetGroups.TargetGroups[0].TargetGroupArn!;
    console.log(`✅ Target Group encontrado: ${targetGroupArn}\n`);

    // Obtener subnets (usar las mismas que el ALB actual)
    const subnets = oldALB.LoadBalancers[0].AvailabilityZones?.map(
      (az) => az.SubnetId
    ).filter(Boolean) as string[];

    if (!subnets || subnets.length < 2) {
      throw new Error('Se necesitan al menos 2 subnets para el ALB');
    }

    console.log(`✅ Subnets a usar: ${subnets.join(', ')}\n`);

    // Obtener Security Group (usar el mismo)
    const securityGroups = oldALB.LoadBalancers[0].SecurityGroups || [];
    if (securityGroups.length === 0) {
      throw new Error('No se encontraron Security Groups');
    }

    console.log(`✅ Security Groups: ${securityGroups.join(', ')}\n`);

    // Paso 2: Crear nuevo ALB interno
    console.log('📋 Paso 2: Creando nuevo ALB INTERNAL...');
    const createALBResponse = await elbClient.send(
      new CreateLoadBalancerCommand({
        Name: NEW_ALB_NAME,
        Scheme: 'internal', // ⚠️ INTERNAL en lugar de internet-facing
        Type: 'application',
        Subnets: subnets,
        SecurityGroups: securityGroups,
        Tags: [
          { Key: 'Name', Value: NEW_ALB_NAME },
          { Key: 'Purpose', Value: 'n8n-internal-load-balancer' },
          { Key: 'MigratedFrom', Value: OLD_ALB_NAME },
        ],
      })
    );

    if (!createALBResponse.LoadBalancers || createALBResponse.LoadBalancers.length === 0) {
      throw new Error('Error al crear el nuevo ALB');
    }

    const newALBArn = createALBResponse.LoadBalancers[0].LoadBalancerArn!;
    const newALBDNS = createALBResponse.LoadBalancers[0].DNSName!;
    console.log(`✅ Nuevo ALB INTERNAL creado:`);
    console.log(`   ARN: ${newALBArn}`);
    console.log(`   DNS: ${newALBDNS}`);
    console.log(`   Scheme: internal\n`);

    // Paso 3: Eliminar listeners del ALB antiguo (para liberar el target group)
    console.log('📋 Paso 3: Eliminando listeners del ALB antiguo...');
    if (listeners.Listeners) {
      for (const listener of listeners.Listeners) {
        if (listener.ListenerArn) {
          await elbClient.send(
            new DeleteListenerCommand({
              ListenerArn: listener.ListenerArn,
            })
          );
          console.log(`✅ Listener eliminado: Puerto ${listener.Port}`);
        }
      }
    }
    console.log(`✅ Todos los listeners del ALB antiguo eliminados\n`);

    // Esperar un momento para que AWS procese la eliminación
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Paso 4: Crear listeners en el nuevo ALB
    console.log('📋 Paso 3: Creando listeners en el nuevo ALB...');
    
    if (listeners.Listeners) {
      for (const listener of listeners.Listeners) {
        // Solo crear listeners HTTP/HTTPS, no el 5678 directamente
        if (listener.Port === 80 || listener.Port === 443) {
          const certArn = listener.Certificates?.[0]?.CertificateArn;
          
          if (listener.Port === 443 && certArn) {
            // Listener HTTPS
            await elbClient.send(
              new CreateListenerCommand({
                LoadBalancerArn: newALBArn,
                Protocol: 'HTTPS',
                Port: 443,
                Certificates: [{ CertificateArn: certArn }],
                DefaultActions: [
                  {
                    Type: 'forward',
                    TargetGroupArn: targetGroupArn,
                  },
                ],
              })
            );
            console.log(`✅ Listener HTTPS (443) creado`);
          } else if (listener.Port === 80) {
            // Listener HTTP
            await elbClient.send(
              new CreateListenerCommand({
                LoadBalancerArn: newALBArn,
                Protocol: 'HTTP',
                Port: 80,
                DefaultActions: [
                  {
                    Type: 'forward',
                    TargetGroupArn: targetGroupArn,
                  },
                ],
              })
            );
            console.log(`✅ Listener HTTP (80) creado`);
          }
        }
      }
    }

    // Crear listener para puerto 5678 (n8n)
    await elbClient.send(
      new CreateListenerCommand({
        LoadBalancerArn: newALBArn,
        Protocol: 'HTTP',
        Port: 5678,
        DefaultActions: [
          {
            Type: 'forward',
            TargetGroupArn: targetGroupArn,
          },
        ],
      })
    );
    console.log(`✅ Listener HTTP (5678) creado\n`);

    // Paso 5: Actualizar servicio ECS
    console.log('📋 Paso 4: Actualizando servicio ECS...');
    
    // Obtener configuración actual del servicio
    const service = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: CLUSTER_NAME,
        services: [SERVICE_NAME],
      })
    );

    if (!service.services || service.services.length === 0) {
      throw new Error(`Servicio ${SERVICE_NAME} no encontrado`);
    }

    const currentService = service.services[0];
    const currentLoadBalancers = currentService.loadBalancers || [];

    // Actualizar servicio con nuevo ALB
    const updatedLoadBalancers = currentLoadBalancers.map((lb) => ({
      ...lb,
      // Mantener la misma configuración pero el target group sigue siendo el mismo
    }));

    // Nota: El servicio ECS usa el target group, no el ALB directamente
    // El target group sigue siendo el mismo, así que no necesitamos cambiar el servicio
    // Solo necesitamos asegurarnos de que el nuevo ALB apunte al mismo target group (ya hecho)
    
    console.log(`✅ Servicio ECS configurado correctamente`);
    console.log(`   El servicio usa el Target Group, que ahora está conectado al nuevo ALB interno\n`);

    // Paso 6: Esperar a que el nuevo ALB esté activo
    console.log('📋 Paso 5: Esperando que el nuevo ALB esté activo...');
    let isActive = false;
    let attempts = 0;
    while (!isActive && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const status = await elbClient.send(
        new DescribeLoadBalancersCommand({
          LoadBalancerArns: [newALBArn],
        })
      );
      
      if (status.LoadBalancers && status.LoadBalancers[0].State?.Code === 'active') {
        isActive = true;
        console.log(`✅ Nuevo ALB está activo\n`);
      } else {
        attempts++;
        console.log(`   Esperando... (${attempts}/30)`);
      }
    }

    if (!isActive) {
      throw new Error('El nuevo ALB no se activó en el tiempo esperado');
    }

    // Paso 7: Eliminar ALB público antiguo
    console.log('📋 Paso 6: Eliminando ALB público antiguo...');
    console.log(`⚠️  ADVERTENCIA: Esto eliminará el ALB público ${OLD_ALB_NAME}`);
    console.log(`   ARN: ${oldALBArn}\n`);

    await elbClient.send(
      new DeleteLoadBalancerCommand({
        LoadBalancerArn: oldALBArn,
      })
    );

    console.log(`✅ ALB público eliminado\n`);

    console.log('============================================================\n');
    console.log('✅ MIGRACIÓN COMPLETADA\n');
    console.log('📋 Resumen:');
    console.log(`   ALB Anterior: ${OLD_ALB_NAME} (ELIMINADO)`);
    console.log(`   ALB Nuevo: ${NEW_ALB_NAME} (INTERNAL)`);
    console.log(`   DNS Interno: ${newALBDNS}`);
    console.log(`   Scheme: internal`);
    console.log(`   Target Group: ${TARGET_GROUP_NAME} (sin cambios)`);
    console.log(`   Servicio ECS: ${SERVICE_NAME} (sin cambios)\n`);
    console.log('⚠️  IMPORTANTE:');
    console.log('   - El nuevo ALB solo es accesible desde dentro de la VPC');
    console.log('   - Para acceder necesitarás VPN, Bastion, o estar en la misma VPC');
    console.log('   - El servicio ECS seguirá funcionando igual cuando lo reactives\n');
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
