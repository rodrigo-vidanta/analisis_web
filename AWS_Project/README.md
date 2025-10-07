# 🚀 Migración Railway → AWS con Control Automático

Sistema completo para migrar tu infraestructura de Railway a AWS usando Cursor AI y AWS CLI de manera autónoma.

## 📋 Resumen del Proyecto

**Origen**: Railway (us-east4)
- n8n + worker
- PostgreSQL 
- Redis
- Frontend React

**Destino**: AWS (us-west-2) + GCP (failover)
**Optimizado para**: VAPI (latencia <50ms)
- ECS Fargate para aplicaciones
- RDS PostgreSQL
- ElastiCache Redis  
- S3 + CloudFront para frontend
- Route 53 con health checks

## 🗂️ Estructura del Proyecto

```
AWS_Project/
├── migration-control.yaml      # 📊 Plan maestro de migración
├── migration-controller.py     # 🤖 Controlador automático
├── setup-aws-environment.sh    # ⚙️  Configuración inicial
├── check-aws-resources.sh      # 🔍 Verificación de recursos
├── cleanup-aws-resources.sh    # 🗑️  Limpieza de emergencia
├── .cursorrules                # 🎯 Reglas para Cursor AI
├── cursor-context.md           # 📖 Contexto para Cursor
├── aws-knowledge-base/         # 📚 Documentación AWS CLI
│   ├── INDEX.md
│   ├── aws-*-help.txt
│   └── *-examples.txt
└── README.md                   # 📄 Este archivo
```

## 🚀 Inicio Rápido

### 1. Configuración Inicial

```bash
# Configurar credenciales AWS específicas para VAPI
./configure-aws-credentials.sh

# Test de latencia con VAPI
./test-vapi-latency.sh

# O ejecutar configuración automática completa
./setup-aws-environment.sh
```

Este script:
- ✅ Instala AWS CLI
- ✅ Configura credenciales
- ✅ Genera base de conocimiento
- ✅ Configura Cursor AI
- ✅ Crea scripts de utilidad

### 2. Verificar Configuración

```bash
# Verificar credenciales AWS
aws sts get-caller-identity

# Verificar recursos existentes
./check-aws-resources.sh
```

### 3. Ejecutar Migración

#### Opción A: Modo Interactivo
```bash
python3 migration-controller.py --interactive
```

#### Opción B: Migración Completa
```bash
# Dry run (simulación)
python3 migration-controller.py --full --dry-run

# Ejecución real
python3 migration-controller.py --full
```

#### Opción C: Por Fases
```bash
python3 migration-controller.py --phase phase_1
python3 migration-controller.py --phase phase_2
# ... etc
```

## 📊 Plan de Migración

### Fase 1: Preparación (1-2 días)
- ✅ Configurar AWS CLI
- 🔄 Crear VPC y networking
- 🔄 Configurar Security Groups

### Fase 2: Bases de Datos (2-3 días)  
- 🔄 Backup PostgreSQL Railway
- 🔄 Crear RDS PostgreSQL
- 🔄 Migrar datos
- 🔄 Crear ElastiCache Redis

### Fase 3: Aplicaciones (3-4 días)
- 🔄 Crear ECS Cluster
- 🔄 Desplegar n8n en Fargate
- 🔄 Configurar Load Balancer
- 🔄 Configurar auto-scaling

### Fase 4: Frontend y DNS (1-2 días)
- 🔄 Crear S3 bucket
- 🔄 Configurar CloudFront
- 🔄 Configurar Route 53
- 🔄 SSL/TLS certificates

### Fase 5: Testing y Optimización (2-3 días)
- 🔄 Health checks
- 🔄 Monitoreo CloudWatch
- 🔄 Testing de rendimiento
- 🔄 Optimizaciones

## 🎯 Uso con Cursor AI

### Prompts Recomendados

```
"Verifica mi configuración AWS y muestra el estado actual"

"Ejecuta la fase 1 de migración: crear VPC y networking"

"Despliega n8n en ECS Fargate con RDS PostgreSQL"

"Configura Route 53 con failover a GCP"

"Muestra el estado de todos los recursos AWS creados"
```

### Archivos de Referencia para Cursor

- **`.cursorrules`**: Reglas y mejores prácticas
- **`cursor-context.md`**: Contexto del proyecto
- **`aws-knowledge-base/`**: Documentación AWS CLI
- **`migration-control.yaml`**: Plan detallado

## 🔧 Comandos Útiles

### Verificación
```bash
# Estado general
python3 migration-controller.py

# Recursos AWS
./check-aws-resources.sh

# Logs de migración
tail -f migration.log
```

### Control de Migración
```bash
# Ver variables actuales
python3 migration-controller.py --interactive
> vars

# Ver estado de fases
python3 migration-controller.py --interactive  
> status

# Ejecutar comando específico
aws ecs list-clusters
aws rds describe-db-instances
```

### Emergencia
```bash
# Rollback completo (⚠️ CUIDADO)
./cleanup-aws-resources.sh

# Rollback DNS a Railway
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch file://rollback-dns.json
```

## 💰 Costos Estimados

| Servicio | Costo Mensual |
|----------|---------------|
| ECS Fargate | $150-300 |
| RDS PostgreSQL | $100-200 |
| ElastiCache Redis | $80-150 |
| Load Balancer | $20-30 |
| CloudFront | $10-50 |
| Route 53 | $5-10 |
| S3 Storage | $5-20 |
| **Total** | **$380-890** |

*Railway actual: ~$200-400/mes*

## 🔍 Monitoreo y Alertas

### Métricas Clave
- CPU/Memoria ECS > 80%
- Conexiones RDS > 80% 
- Tiempo respuesta ALB > 1s
- Tasa error CloudFront > 5%

### Dashboards
- CloudWatch: `migration-dashboard`
- Logs: `/aws/ecs/n8n`, `/aws/rds/postgresql`

## 🆘 Solución de Problemas

### Error: Credenciales AWS
```bash
aws configure
aws sts get-caller-identity
```

### Error: Permisos IAM
```bash
# Verificar políticas del usuario
aws iam list-attached-user-policies --user-name $USER
aws iam list-user-policies --user-name $USER
```

### Error: Recursos no encontrados
```bash
# Verificar región
aws configure get region

# Listar recursos en todas las regiones
aws ec2 describe-regions --query 'Regions[].RegionName' --output text | xargs -I {} aws ec2 describe-vpcs --region {}
```

### Error: Límites de servicio
```bash
# Verificar límites
aws service-quotas list-service-quotas --service-code ec2
aws service-quotas list-service-quotas --service-code rds
```

## 📞 Soporte

### Logs Importantes
- `migration.log`: Log principal del controlador
- `aws-cli.log`: Logs de AWS CLI (si está habilitado)
- CloudWatch Logs: Logs de aplicaciones en AWS

### Archivos de Estado
- `migration_state.json`: Estado actual de la migración
- `migration-control.yaml`: Plan maestro (actualizable)

### Comandos de Diagnóstico
```bash
# Verificar conectividad
aws sts get-caller-identity
curl -I https://aws.amazon.com

# Verificar DNS
nslookup tudominio.com
dig tudominio.com

# Verificar servicios
aws ecs describe-services --cluster migration-cluster --services n8n-service
aws rds describe-db-instances --db-instance-identifier n8n-postgres
```

## 🔄 Actualizaciones

Para actualizar el sistema:

```bash
# Actualizar AWS CLI
pip3 install --upgrade awscli

# Regenerar base de conocimiento
./setup-aws-environment.sh

# Actualizar dependencias Python
pip3 install --upgrade pyyaml boto3 requests
```

## 📝 Notas Importantes

- ⚠️ **Backup**: Siempre haz backup antes de migrar
- 🔒 **Seguridad**: Usa IAM roles con permisos mínimos
- 💰 **Costos**: Monitorea costos con AWS Cost Explorer
- 🌍 **Multi-región**: Considera replicación para DR
- 📊 **Monitoreo**: Configura alertas desde el día 1

---

**¿Listo para migrar?** 🚀

```bash
./setup-aws-environment.sh
python3 migration-controller.py --interactive
```
