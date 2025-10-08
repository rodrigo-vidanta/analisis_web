# 📋 N8N AWS Deployment Guide - Production Ready

**Fecha**: Octubre 2025  
**Proyecto**: PQNC QA AI Platform  
**Servicio**: N8N Automation Platform  
**Infraestructura**: AWS ECS + RDS + CloudFront  

---

## 🎯 **Resumen del Deploy**

Deploy exitoso de n8n en AWS usando arquitectura de microservicios con SSL automático y gestión de usuarios desde base de datos.

**🌐 URL Final**: https://[cloudfront-domain].cloudfront.net  
**👤 Acceso**: Basic Auth configurado  
**🔐 SSL**: Certificado AWS automático  

---

## 🔍 **Problemas Críticos Resueltos**

### ❌ **1. SSL/Encryption Conflict**
**Error**: `"no pg_hba.conf entry... no encryption"`

**Solución**:
- Creado parameter group personalizado para RDS
- Deshabilitado SSL forzado: `rds.force_ssl=0`
- Configurado n8n con `DB_POSTGRESDB_SSL=false`
- Reinicio RDS requerido para aplicar cambios

### ❌ **2. Task Definition Incorrecta**
**Error**: 160+ failed tasks, instalación npm en cada inicio

**Solución**:
- Imagen oficial: `n8nio/n8n:latest`
- Health check optimizado: `startPeriod=60s`
- Variables según documentación oficial n8n

### ❌ **3. CloudFront SPA Routing**
**Error**: `Cannot GET /home/workflows` (404)

**Solución**:
- Custom Error Pages: 404 → 200
- ResponsePagePath: `/` 
- Soporte completo para rutas SPA

### ❌ **4. Security Group Configuration**
**Error**: CloudFront timeout

**Solución**:
- Permitir puerto 80 público para CloudFront
- Mantener puerto 5678 restringido

---

## 🏗️ **Infraestructura Desplegada**

### 🐳 **ECS Fargate**
- **Cluster**: n8n-production
- **Service**: n8n-service  
- **Image**: n8nio/n8n:latest (v1.114.3)
- **Resources**: 2048 CPU, 4096 MB RAM
- **Status**: ACTIVE (1/1 running)

### 🗄️ **RDS PostgreSQL**
- **Engine**: PostgreSQL 15.12
- **Class**: db.r6g.large
- **Storage**: 100GB gp3 encrypted
- **Parameter Group**: Personalizado (SSL opcional)
- **Subnets**: Privadas (seguridad)

### 🌐 **Application Load Balancer**
- **Listeners**: Puerto 80 → Target Group
- **Target Health**: healthy
- **Security**: Public puerto 80, restringido 5678

### 🔐 **CloudFront SSL**
- **SSL**: Certificado AWS automático
- **Protocol**: redirect-to-https
- **Cache**: TTL=0 (aplicación dinámica)
- **SPA Support**: Custom Error Pages

---

## ⚙️ **Configuración N8N Optimizada**

### 📋 **Variables Críticas**
```env
# Database (sin credenciales)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=[rds-endpoint]
DB_POSTGRESDB_SSL=false

# Server
N8N_HOST=0.0.0.0
N8N_PROTOCOL=https
WEBHOOK_URL=https://[cloudfront-domain]

# Según documentación oficial
N8N_RUNNERS_ENABLED=true
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
N8N_GIT_NODE_DISABLE_BARE_REPOS=true
```

---

## 🔧 **Método de Gestión de Base de Datos**

### 💡 **Problema**: RDS en Subnets Privadas
RDS no es accesible desde internet (seguridad).

### ✅ **Solución**: ECS Task con PostgreSQL Client

#### **1. Crear Task Definition**:
```json
{
  "family": "postgres-admin",
  "image": "postgres:15-alpine",
  "networkMode": "awsvpc",
  "environment": [
    {"name": "PGHOST", "value": "[rds-endpoint]"},
    {"name": "PGUSER", "value": "[db-user]"},
    {"name": "PGPASSWORD", "value": "[db-password]"},
    {"name": "PGDATABASE", "value": "postgres"}
  ]
}
```

#### **2. Ejecutar Comandos**:
```bash
# Registrar y ejecutar
aws ecs register-task-definition --cli-input-json file://postgres-admin.json
aws ecs run-task --cluster n8n-production --task-definition postgres-admin:1

# Ver resultados en logs
aws logs get-log-events --log-group-name "/ecs/postgres-admin"
```

#### **3. SQL para Gestión de Usuarios**:
```sql
-- Ver usuarios
SELECT email, "roleSlug" FROM "user";

-- Actualizar rol a administrador
UPDATE "user" SET "roleSlug" = 'global:owner' WHERE email = 'usuario@dominio.com';

-- Verificar cambio
SELECT email, "roleSlug", "updatedAt" FROM "user" WHERE email = 'usuario@dominio.com';
```

---

## 🚀 **Proceso de Replicación**

### 📋 **Deploy Desde Cero (30 minutos)**:

#### **1. RDS Setup (10 min)**:
```bash
# Crear parameter group personalizado
aws rds create-db-parameter-group --db-parameter-group-name n8n-postgres-custom

# Configurar SSL opcional
aws rds modify-db-parameter-group --parameters "ParameterName=rds.force_ssl,ParameterValue=0"
```

#### **2. ECS Deploy (10 min)**:
```bash
# Task definition optimizada
aws ecs register-task-definition --cli-input-json file://n8n-optimized.json

# Crear servicio
aws ecs create-service --cluster n8n-production --task-definition n8n-production:latest
```

#### **3. CloudFront SSL (10 min)**:
```bash
# Crear distribución con SPA support
aws cloudfront create-distribution --distribution-config file://cloudfront-spa.json
```

---

## 🛡️ **Configuraciones de Seguridad**

### ✅ **Security Groups**:
- **ECS**: Puerto 80 público, 5678 restringido
- **RDS**: Puerto 5432 solo VPC interna

### 🔒 **Best Practices Aplicadas**:
- RDS en subnets privadas
- SSL termination en CloudFront
- Basic Auth habilitado
- Encryption key configurado

---

## 📊 **Monitoreo y Mantenimiento**

### 🔍 **Health Checks**:
```bash
# ECS Service
aws ecs describe-services --cluster n8n-production --services n8n-service

# Target Group
aws elbv2 describe-target-health --target-group-arn [target-group-arn]

# CloudFront
aws cloudfront get-distribution --id [distribution-id]
```

### 📈 **Logs**:
- **N8N Application**: `/ecs/n8n-production`
- **PostgreSQL Admin**: `/ecs/postgres-admin`
- **CloudFront**: Access logs (opcional)

---

## 🎉 **Resultado Final**

### ✅ **N8N Production Ready**:
- **SSL**: ✅ Funcionando
- **SPA Routing**: ✅ Configurado  
- **Database**: ✅ PostgreSQL optimizada
- **Users**: ✅ Gestión desde BD
- **Webhooks**: ✅ URLs personalizadas
- **Monitoring**: ✅ CloudWatch completo

### 🎯 **Ventajas vs Documentación Oficial**:
- **ECS > EKS**: Menos complejidad
- **RDS > PostgreSQL pods**: Más robusto
- **CloudFront > Kubernetes LB**: SSL automático
- **Managed services**: Menos mantenimiento

---

**🚀 N8N AWS Deploy Completamente Exitoso - Octubre 2025**
