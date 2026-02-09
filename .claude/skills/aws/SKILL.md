---
name: aws
description: Gestion completa de infraestructura AWS. Reportes de estado, deploy frontend, monitoreo, costos, logs, escalado de servicios, DNS, certificados, y administracion de toda la infraestructura cloud de PQNC.
---

# AWS - PQNC QA AI Platform

## REGLA: ESCRITURA requiere autorizacion explicita del usuario. LECTURA es libre.

## Conexion
- **Cuenta**: 307621978585 | IAM User: `darigrosales`
- **Region**: `us-west-2` (Oregon)
- **CLI**: `aws` (v2.31.8, autenticado via `~/.aws/credentials`)
- **Inventario**: `.claude/docs/aws-inventory.md`
- **Agente**: `.claude/agents/aws-agent.md`

## Invocacion

### Status & Reportes (sin restricciones)
- `/aws status` - Estado rapido de todos los servicios activos
- `/aws inventory` - Inventario completo (leer `.claude/docs/aws-inventory.md`)
- `/aws report` - Reporte detallado con metricas en vivo
- `/aws costs` - Analisis de costos del mes actual por servicio
- `/aws costs history` - Costos ultimos 3 meses
- `/aws health` - Health check de todos los endpoints

### Servicios Individuales (sin restricciones)
- `/aws s3` - Listar buckets y contenido
- `/aws s3 size` - Tamanio total del bucket frontend
- `/aws cloudfront` - Estado de distribuciones CDN
- `/aws cloudfront invalidations` - Historial de invalidaciones
- `/aws ecs` - Estado de clusters y servicios ECS
- `/aws rds` - Estado de instancias RDS
- `/aws rds events` - Eventos recientes de RDS
- `/aws rds snapshots` - Listar snapshots disponibles
- `/aws redis` - Estado de clusters ElastiCache
- `/aws ec2` - Listar instancias EC2
- `/aws vpc` - Listar VPCs y subnets
- `/aws sg` - Security groups y reglas
- `/aws sg <sg-id>` - Detalle de reglas de un security group
- `/aws dns` - Hosted zones y records de Route53
- `/aws dns <zone>` - Records de una zona especifica
- `/aws lambda` - Listar funciones Lambda
- `/aws alb` - Load balancers y target groups
- `/aws alb health` - Health de targets
- `/aws certs` - Certificados SSL/ACM
- `/aws iam` - Usuarios y politicas IAM
- `/aws sqs` - Colas SQS

### Monitoreo & Logs (sin restricciones)
- `/aws logs <service>` - Logs de CloudWatch (ej: `/aws logs n8n-production`)
- `/aws metrics rds cpu` - CPU de RDS ultima hora
- `/aws metrics rds connections` - Conexiones activas de RDS
- `/aws metrics ecs cpu` - CPU de ECS ultima hora
- `/aws alarms` - Alarmas de CloudWatch
- `/aws log-groups` - Listar todos los log groups

### Deploy Frontend (requiere autorizacion)
- `/aws deploy` - Deploy completo: build + S3 sync + CloudFront invalidation
- `/aws deploy --skip-build` - Solo sync + invalidation (ya hizo build)
- `/aws invalidate` - Solo invalidar cache de CloudFront

### Gestion de Servicios (requiere autorizacion)
- `/aws ecs scale <N>` - Escalar n8n-service a N tareas
- `/aws ecs restart` - Forzar nuevo deploy de ECS
- `/aws rds snapshot` - Crear snapshot de n8n-postgres
- `/aws rds start` - Iniciar RDS detenido
- `/aws rds stop` - Detener RDS
- `/aws rds reboot` - Reiniciar RDS
- `/aws redis reboot` - Reiniciar nodos Redis

### Limpieza & Optimizacion (requiere autorizacion)
- `/aws cleanup logs` - Eliminar log groups vacios y configurar retention
- `/aws cleanup certs` - Eliminar certificados FAILED
- `/aws cleanup targets` - Evaluar y limpiar target groups huerfanos
- `/aws optimize` - Recomendaciones de optimizacion de costos

## Implementacion de Comandos

### `/aws status` - Resumen Rapido
```bash
echo "=== AWS Status Report - $(date) ==="
echo ""
echo "--- S3 Buckets ---"
aws s3 ls
echo ""
echo "--- CloudFront ---"
aws cloudfront list-distributions --query 'DistributionList.Items[*].{Id:Id,Alias:Aliases.Items[0],Status:Status}' --output table
echo ""
echo "--- ECS ---"
aws ecs describe-services --cluster n8n-production --services n8n-service --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' --output table 2>/dev/null || echo "No ECS services"
echo ""
echo "--- RDS ---"
aws rds describe-db-instances --query 'DBInstances[*].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Class:DBInstanceClass}' --output table
echo ""
echo "--- ElastiCache ---"
aws elasticache describe-cache-clusters --query 'CacheClusters[*].{Id:CacheClusterId,Status:CacheClusterStatus,Type:CacheNodeType}' --output table
echo ""
echo "--- ALB ---"
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].{Name:LoadBalancerName,State:State.Code}' --output table
```

### `/aws costs` - Costos del Mes
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output json
```

### `/aws deploy` - Deploy Frontend
```bash
# 1. Build
npm run build
# 2. Sync a S3
aws s3 sync dist/ s3://pqnc-qa-ai-frontend --region us-west-2 --delete --quiet
# 3. Invalidar CloudFront
aws cloudfront create-invalidation --distribution-id E19ZID7TVR08JG --paths "/*"
# O simplemente: ./update-frontend.sh
```

### `/aws report` - Reporte Completo
Ejecutar todos los comandos de status + metricas de CloudWatch + costos + eventos RDS.
Presentar en formato organizado con secciones y estado visual.

## Reglas de Operacion

1. **Leer inventario primero**: Antes de cualquier consulta, leer `.claude/docs/aws-inventory.md` para IDs
2. **No adivinar IDs**: Siempre usar los identificadores del inventario
3. **Actualizar inventario**: Tras cualquier cambio (create/delete/modify), actualizar el archivo de inventario
4. **Snapshot antes de destructivos**: Crear snapshot RDS antes de operaciones de riesgo
5. **Verificar antes de modificar**: Siempre `describe` antes de `update/delete`
6. **Reportar costos**: Incluir estimacion de costo cuando se creen recursos
7. **NUNCA deploy sin autorizacion**: Deploy a S3/CloudFront solo cuando el usuario lo pida

## Formato de Output

### Status Report
```
=== AWS Status - PQNC QA AI ===
Region: us-west-2 | Cuenta: 307621978585

S3:         pqnc-qa-ai-frontend          [ACTIVO]
CloudFront: ai.vidavacations.com          [DEPLOYED]
ECS:        n8n-production/n8n-service    [SCALED TO 0]
RDS:        n8n-postgres (db.r6g.large)   [AVAILABLE]
Redis:      n8n-redis-001                 [AVAILABLE]
Redis:      n8n-redis-new-001             [AVAILABLE]
ALB:        n8n-alb-internal              [ACTIVE]

Costo estimado: ~$290/mes
```

### Cost Report
```
=== Costos AWS - Febrero 2026 ===

| Servicio        | Costo MTD  |
|-----------------|------------|
| RDS             | $XX.XX     |
| ElastiCache     | $XX.XX     |
| CloudFront      | $XX.XX     |
| S3              | $XX.XX     |
| Route53         | $XX.XX     |
| Otros           | $XX.XX     |
| TOTAL           | $XXX.XX    |
```
