# 🚀 Guía de Despliegue n8n en AWS

## 📋 Requisitos Previos

### 1. Credenciales AWS Configuradas
```bash
aws configure
# Usar las credenciales del proyecto (configurar en variables de entorno):
# Access Key ID: [CONFIGURAR_EN_ENV]
# Secret Access Key: [CONFIGURAR_EN_ENV]
# Region: us-west-2
```

### 2. Verificar Conectividad
```bash
aws sts get-caller-identity --region us-west-2
```

## 🎯 Despliegue Automático

### Opción 1: Despliegue Completo (Recomendado)
```bash
./deploy-n8n-aws.sh
```

Este script automáticamente:
- ✅ Crea VPC con subnets públicas y privadas
- ✅ Configura Internet Gateway
- ✅ Crea ECS Cluster "n8n-production"
- ✅ Configura Security Groups para VAPI
- ✅ Crea IAM Roles necesarios
- ✅ Registra Task Definition optimizada
- ✅ Despliega servicio con 2 tareas

### Opción 2: Verificación de Estado
```bash
./check-n8n-status.sh
```

## 🔧 Despliegue Manual Paso a Paso

### 1. Crear ECS Cluster
```bash
aws ecs create-cluster --cluster-name n8n-production --region us-west-2
```

### 2. Registrar Task Definition
```bash
aws ecs register-task-definition --cli-input-json file://AWS_Project/n8n-task-definition-optimized.json --region us-west-2
```

### 3. Crear Servicio ECS
```bash
aws ecs create-service \
    --cluster n8n-production \
    --service-name n8n-service \
    --task-definition n8n-production \
    --desired-count 2 \
    --launch-type FARGATE \
    --region us-west-2
```

## 🔍 Diagnóstico de Problemas

### Verificar Estado de Servicios
```bash
# ECS Cluster
aws ecs list-clusters --region us-west-2

# Servicios ECS
aws ecs describe-services --cluster n8n-production --services n8n-service --region us-west-2

# RDS PostgreSQL
aws rds describe-db-instances --db-instance-identifier n8n-postgres --region us-west-2

# ElastiCache Redis
aws elasticache describe-cache-clusters --cache-cluster-id n8n-redis --region us-west-2
```

### Ver Logs en Tiempo Real
```bash
aws logs tail /ecs/n8n-production --follow --region us-west-2
```

### Verificar Health Check
```bash
curl -f https://ai.vidanta.com:5678/healthz
```

## 📊 Configuración Técnica

### ECS Fargate
- **CPU**: 2048 (2 vCPU)
- **Memory**: 4096 MB
- **Port**: 5678
- **Health Check**: /healthz
- **Log Group**: /ecs/n8n-production

### Base de Datos
- **Host**: n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com
- **Port**: 5432
- **Database**: postgres
- **User**: n8nuser
- **Password**: N8n_Secure_2024!

### Redis Cache
- **Host**: n8n-redis.7w6q9d.ng.0001.usw2.cache.amazonaws.com
- **Port**: 6379
- **Mode**: Queue (Bull)

### Security Groups
- **Puerto 5678**: Permitido desde VAPI IPs
  - 44.229.228.186/32
  - 44.238.177.138/32
- **Puerto 443**: HTTPS público
- **Puerto 5432**: RDS desde ECS únicamente

## 🎯 Optimización VAPI

### Configuración de Red
- **Región**: us-west-2 (Oregon) - Misma región que VAPI
- **Latencia objetivo**: <50ms
- **Availability Zones**: us-west-2a, us-west-2b, us-west-2c

### Variables de Entorno
```bash
export AWS_REGION=us-west-2
export VAPI_IP_1=44.229.228.186
export VAPI_IP_2=44.238.177.138
export LATENCY_TARGET=50
```

## 🚨 Solución de Problemas Comunes

### Error: "Cluster not found"
```bash
aws ecs create-cluster --cluster-name n8n-production --region us-west-2
```

### Error: "Task definition not found"
```bash
aws ecs register-task-definition --cli-input-json file://AWS_Project/n8n-task-definition-optimized.json --region us-west-2
```

### Error: "No subnets specified"
```bash
# Crear VPC y subnets primero
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region us-west-2
```

### Error: "Unable to pull image"
```bash
# Verificar IAM permissions para ECR/Docker Hub
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

## 📞 Contacto y Soporte

- **Email**: rodrigomora@grupovidanta.com
- **Proyecto**: Vidanta AI Call System
- **Región**: us-west-2 (Oregon)
- **Dominio**: ai.vidanta.com

## 🎉 Verificación de Éxito

Una vez desplegado correctamente, deberías ver:
- ✅ ECS Cluster "n8n-production" activo
- ✅ Servicio "n8n-service" con 2/2 tareas ejecutándose
- ✅ Health check en https://ai.vidanta.com:5678/healthz respondiendo
- ✅ Logs apareciendo en CloudWatch /ecs/n8n-production
- ✅ Conectividad a RDS y Redis funcionando
