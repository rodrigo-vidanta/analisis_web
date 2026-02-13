# Agente AWS - Contexto Especializado

## REGLA CRITICA #1: LECTURA LIBRE, ESCRITURA CON AUTORIZACION

```
LECTURA (permitida siempre):
  list, describe, get, status, metrics, logs, cost, summary,
  certificates, security-groups, vpcs, subnets, route53

ESCRITURA (requiere autorizacion EXPLICITA del usuario):
  create, delete, scale, restart, reboot, stop, start, snapshot,
  invalidate, sync, update, modify

NUNCA ejecutar comandos destructivos sin que el usuario lo pida.
NUNCA hacer deploy a AWS sin solicitud explicita.
Esta regla es INVIOLABLE.
```

## Rol
Especialista en AWS: gestion de infraestructura, monitoreo de servicios, debugging de issues, analisis de costos, deploy de frontend, administracion de red y seguridad. Infraestructura de la plataforma PQNC QA AI.

## Conexion
- **Cuenta**: `307621978585` | IAM User: `darigrosales`
- **Region**: `us-west-2` (Oregon)
- **CLI**: AWS CLI v2.31.8 (`/usr/local/bin/aws`)
- **Credenciales**: `~/.aws/credentials` (perfil `default`)
- **Inventario**: `.claude/docs/aws-inventory.md` (actualizar tras cada cambio)

## Identificadores Clave

| Recurso | Identificador | Estado |
|---------|---------------|--------|
| S3 Frontend | `pqnc-qa-ai-frontend` | Activo |
| CloudFront Frontend | `E19ZID7TVR08JG` / `d3m6zgat40u0u1.cloudfront.net` | Deployed |
| CloudFront N8N | `EX8VQ3ZURB53T` / `dnw5j599cmiad.cloudfront.net` | Deployed |
| CloudFront Supabase | `E2O0E82C64Y0YI` / `d2bxqn3xh4v4kj.cloudfront.net` | Deployed |
| ECS Cluster | `n8n-production` | Activo (0 tareas) |
| ECS Test Cluster | `test-mcp-cluster` | Vacio |
| RDS PostgreSQL | `n8n-postgres` (db.r6g.large, 100GB) | Available |
| ElastiCache Redis 1 | `n8n-redis-001` (cache.t3.medium) | Available |
| ElastiCache Redis 2 | `n8n-redis-new-001` (cache.t3.medium) | Available |
| VPC Principal | `vpc-05eb3d8651aff5257` (n8n-vpc) | Activo |
| VPC Supabase | `vpc-08657e71be805f364` | Activo |
| ALB Interno | `n8n-alb-internal` | Active |
| Route53 Frontend | `ai.vidavacations.com` (Z08827553E19II0FRMQIC) | 4 records |
| Route53 N8N | `n8n.vidavacations.com` (Z08816521STA0HM2PS0Z3) | 4 records |
| ACM Cert Valido | `n8n.vidavacations.com` | ISSUED |

## URLs de Produccion

| Servicio | URL |
|----------|-----|
| Frontend (CloudFront) | `https://d3m6zgat40u0u1.cloudfront.net` |
| Frontend (Custom) | `https://ai.vidavacations.com` |
| S3 Direct | `http://pqnc-qa-ai-frontend.s3-website.us-west-2.amazonaws.com` |
| N8N (CloudFront) | `https://n8n.vidavacations.com` |

## Comandos AWS CLI por Servicio

### S3 (Storage & Frontend Hosting)
```bash
aws s3 ls
aws s3 ls s3://pqnc-qa-ai-frontend/ --recursive --human-readable
aws s3 ls s3://pqnc-qa-ai-frontend/ --recursive --summarize | tail -2
# DEPLOY (REQUIERE AUTORIZACION)
aws s3 sync dist/ s3://pqnc-qa-ai-frontend --region us-west-2 --delete --quiet
aws s3 cp <local> s3://pqnc-qa-ai-frontend/<remote>
aws s3 cp s3://pqnc-qa-ai-frontend/<path> <local>
```

### CloudFront (CDN)
```bash
aws cloudfront list-distributions --query 'DistributionList.Items[*].{Id:Id,Domain:DomainName,Status:Status,Aliases:Aliases.Items[0]}' --output table
aws cloudfront get-distribution --id E19ZID7TVR08JG
# INVALIDACION (REQUIERE AUTORIZACION)
aws cloudfront create-invalidation --distribution-id E19ZID7TVR08JG --paths "/*"
aws cloudfront list-invalidations --distribution-id E19ZID7TVR08JG --query 'InvalidationList.Items[*].{Id:Id,Status:Status,Created:CreateTime}' --output table
```

### ECS (Containers - Fargate)
```bash
aws ecs list-clusters --output json
aws ecs list-services --cluster n8n-production --output json
aws ecs describe-services --cluster n8n-production --services n8n-service --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount,TaskDef:taskDefinition}' --output table
aws ecs list-tasks --cluster n8n-production --service-name n8n-service
aws ecs list-task-definitions --family-prefix n8n-production --output json
# ESCALAR (REQUIERE AUTORIZACION)
aws ecs update-service --cluster n8n-production --service n8n-service --desired-count <N>
aws ecs update-service --cluster n8n-production --service n8n-service --force-new-deployment
```

### RDS (Base de Datos PostgreSQL)
```bash
aws rds describe-db-instances --query 'DBInstances[*].{Id:DBInstanceIdentifier,Engine:Engine,Class:DBInstanceClass,Status:DBInstanceStatus,Endpoint:Endpoint.Address,Storage:AllocatedStorage,MultiAZ:MultiAZ}' --output table
aws rds describe-db-instances --db-instance-identifier n8n-postgres
aws rds describe-events --source-identifier n8n-postgres --source-type db-instance --duration 1440
aws rds describe-db-snapshots --db-instance-identifier n8n-postgres --query 'DBSnapshots[*].{Id:DBSnapshotIdentifier,Status:Status,Created:SnapshotCreateTime,Size:AllocatedStorage}' --output table
# SNAPSHOT (REQUIERE AUTORIZACION)
aws rds create-db-snapshot --db-instance-identifier n8n-postgres --db-snapshot-identifier "manual-$(date +%Y%m%d-%H%M%S)"
# START/STOP (REQUIERE AUTORIZACION)
aws rds start-db-instance --db-instance-identifier n8n-postgres
aws rds stop-db-instance --db-instance-identifier n8n-postgres
aws rds reboot-db-instance --db-instance-identifier n8n-postgres
```

### ElastiCache (Redis)
```bash
aws elasticache describe-cache-clusters --query 'CacheClusters[*].{Id:CacheClusterId,Engine:Engine,NodeType:CacheNodeType,Status:CacheClusterStatus,Nodes:NumCacheNodes}' --output table
aws elasticache describe-cache-clusters --cache-cluster-id n8n-redis-001 --show-cache-node-info
aws elasticache describe-replication-groups --output json
# REBOOT (REQUIERE AUTORIZACION)
aws elasticache reboot-cache-cluster --cache-cluster-id n8n-redis-001 --cache-node-ids-to-reboot 0001
```

### EC2 & VPC (Red)
```bash
aws ec2 describe-instances --query 'Reservations[*].Instances[*].{Id:InstanceId,Type:InstanceType,State:State.Name,Name:Tags[?Key==`Name`].Value|[0]}' --output table
aws ec2 describe-vpcs --query 'Vpcs[*].{Id:VpcId,CIDR:CidrBlock,IsDefault:IsDefault,Name:Tags[?Key==`Name`].Value|[0]}' --output table
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-05eb3d8651aff5257" --query 'Subnets[*].{Id:SubnetId,AZ:AvailabilityZone,CIDR:CidrBlock}' --output table
aws ec2 describe-security-groups --query 'SecurityGroups[*].{Id:GroupId,Name:GroupName,VPC:VpcId}' --output table
aws ec2 describe-security-groups --group-ids <sg-id> --query 'SecurityGroups[0].{Ingress:IpPermissions,Egress:IpPermissionsEgress}'
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=vpc-05eb3d8651aff5257" --output json
```

### Route53 (DNS)
```bash
aws route53 list-hosted-zones --query 'HostedZones[*].{Id:Id,Name:Name,Records:ResourceRecordSetCount}' --output table
aws route53 list-resource-record-sets --hosted-zone-id Z08827553E19II0FRMQIC --output table
```

### CloudWatch (Monitoreo & Logs)
```bash
aws logs describe-log-groups --query 'logGroups[*].{Name:logGroupName,Bytes:storedBytes,Retention:retentionInDays}' --output table
aws logs filter-log-events --log-group-name /ecs/n8n-production --limit 20
# Metricas CPU RDS
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name CPUUtilization --dimensions Name=DBInstanceIdentifier,Value=n8n-postgres --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Average --output table
# Metricas conexiones RDS
aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name DatabaseConnections --dimensions Name=DBInstanceIdentifier,Value=n8n-postgres --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Average --output table
```

### Lambda (Funciones)
```bash
aws lambda list-functions --query 'Functions[*].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize}' --output table
aws lambda get-function --function-name <name>
```

### Load Balancers (ALB/NLB)
```bash
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].{Name:LoadBalancerName,DNS:DNSName,Type:Type,State:State.Code}' --output table
aws elbv2 describe-target-groups --query 'TargetGroups[*].{Name:TargetGroupName,Protocol:Protocol,Port:Port,HealthCheck:HealthCheckPath}' --output table
aws elbv2 describe-target-health --target-group-arn <arn>
```

### ACM (Certificados SSL)
```bash
aws acm list-certificates --query 'CertificateSummaryList[*].{Domain:DomainName,Status:Status}' --output table
aws acm describe-certificate --certificate-arn <arn>
```

### IAM & STS
```bash
aws sts get-caller-identity
aws iam list-users --query 'Users[*].{Name:UserName,Created:CreateDate}' --output table
aws iam list-attached-user-policies --user-name darigrosales
```

### Cost Explorer
```bash
aws ce get-cost-and-usage --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost --output json
aws ce get-cost-and-usage --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE --output json
```

## Deploy Frontend (Proceso Completo)
```bash
npm run build
aws s3 sync dist/ s3://pqnc-qa-ai-frontend --region us-west-2 --delete --quiet
aws cloudfront create-invalidation --distribution-id E19ZID7TVR08JG --paths "/*"
# O script: ./update-frontend.sh
```

## Clasificacion de Riesgo

| Nivel | Operaciones |
|-------|-------------|
| SEGURO | list, describe, get, ls, status, metrics, logs, events |
| PRECAUCION | scale, restart, reboot, invalidate, snapshot |
| ALTO RIESGO | create, delete, stop, modify, sync --delete |
| CRITICO | delete-cluster, delete-instance, terminate-instances |

## Reglas de Seguridad

1. Snapshot antes de destructivos: Crear snapshot de RDS antes de stop/reboot/delete
2. Verificar estado: Siempre `describe` antes de modificar
3. No escalar sin contexto: Verificar metricas antes de scale up/down
4. Logs primero: Ante problemas, revisar CloudWatch Logs antes de reiniciar
5. Costos: Verificar Cost Explorer antes de crear recursos nuevos
6. Inventario: Actualizar `.claude/docs/aws-inventory.md` tras cada cambio

## WAF - Registro de IPs Permitidas (ai.vidavacations.com)

WAF Web ACL `frontend-ip-restriction` (CLOUDFRONT, default BLOCK).
IP Set: `frontend-allowed-ips` (ID: `9ed33da4-fb8e-498e-baf7-ff0b672d7725`, region us-east-1).

| # | IP | Etiqueta |
|---|-----|----------|
| 1 | `189.203.238.35` | Vidanta PQNC |
| 2 | `187.210.107.179` | Vidanta PQNC 2 |
| 3 | `189.178.124.238` | IP del usuario 1 |
| 4 | `189.177.138.158` | IP del usuario 2 |
| 5 | `187.190.202.130` | drosales |
| 6 | `189.177.48.132` | oficinaIA |
| 7 | `187.144.87.193` | casa rodrigo |
| 8 | `189.177.141.218` | DGV Oficina |
| 9 | `189.177.28.203` | Marketing |

**REGLA**: Al listar IPs, SIEMPRE incluir la etiqueta. Al agregar/quitar/cambiar IPs, SIEMPRE actualizar esta tabla, el skill (`/aws`), y `docs/AWS_FRONTEND_IP_RESTRICTION.md`.

## Alertas Conocidas (Feb 2026)

- 4 certificados ACM en estado FAILED (limpiar)
- 63 log groups sin retention policy (configurar o eliminar vacios)
- ECS n8n-service escalado a 0 (N8N migrado a Railway)
- 2 CloudFront distributions apuntan a ALBs eliminados
- 9 target groups posiblemente huerfanos
