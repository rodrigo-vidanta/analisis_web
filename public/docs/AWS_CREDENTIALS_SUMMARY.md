# RESUMEN DE CREDENCIALES AWS - PQNC QA AI PLATFORM

## 📍 Ubicación de Credenciales

### 1. **Variables de entorno en el proyecto**

**Archivo:** `/Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform/.env`

```bash
# AWS Credentials (para consolas AWS)
VITE_AWS_ACCESS_KEY_ID=your_aws_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
```

### 2. **Configuración en el código**

**Archivo:** `src/config/awsConfig.ts`

```typescript
export const AWS_REAL_CREDENTIALS = {
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'CONFIGURE_IN_ENV',
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'CONFIGURE_IN_ENV',
  region: 'us-west-2'
};
```

**Archivo:** `src/services/awsConsoleService.ts` (líneas 82-88)

```typescript
const AWS_CONFIG = {
  region: 'us-west-2',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'CONFIGURE_IN_ENV',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'CONFIGURE_IN_ENV'
  }
};
```

### 3. **Scripts de configuración AWS**

**Archivo:** `AWS_Project/configure-aws-credentials.sh`
- Script interactivo para configurar credenciales
- Lee credenciales y las guarda en `~/.aws/credentials`
- Verifica permisos IAM

**Archivo:** `AWS_Project/aws-config.env` (generado por script)

```bash
export AWS_REGION=us-west-2
export AWS_DEFAULT_REGION=us-west-2
export PROJECT_NAME=railway-migration
export ENVIRONMENT=production
export AWS_ACCOUNT_EMAIL=rodrigomora@grupovidanta.com
```

### 4. **Archivo de credenciales AWS estándar**

**Ubicación:** `~/.aws/credentials`

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY

[vidanta-ai]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

**Ubicación:** `~/.aws/config`

```ini
[default]
region = us-west-2
output = json

[profile vidanta-ai]
region = us-west-2
output = json
```

## 🔐 Información de Cuenta AWS

- **Email:** rodrigomora@grupovidanta.com
- **Región Principal:** us-west-2 (Oregon)
- **Propósito:** Optimizado para VAPI (latencia <50ms)

## 📊 Recursos AWS Existentes

### ECS (Elastic Container Service)
- **Cluster:** n8n-production
- **Servicios:** n8n-service
- **Launch Type:** Fargate

### RDS (PostgreSQL)
- **Instance ID:** n8n-postgres
- **Engine:** postgres 14.9
- **Class:** db.r6g.large
- **Endpoint:** n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com
- **Port:** 5432
- **Multi-AZ:** Sí

### ElastiCache (Redis)
- **Cluster ID:** n8n-redis
- **Node Type:** cache.r6g.large
- **Nodes:** 2
- **Engine:** redis

### VPC & Networking
- **VPC ID:** vpc-05eb3d8651aff5257
- **CIDR:** 10.0.0.0/16
- **Subnets:** 4

### Route 53
- **Hosted Zone ID:** Z05991931MBGUXOLH9HO2
- **Domain:** ai.vidanta.com

### S3
- **Bucket:** vidanta-ai-assets
- **Region:** us-west-2

## 🛠️ Servicios que usan AWS

1. **Frontend (React + Vite)**
   - `src/components/aws/*.tsx` - Componentes AWS
   - `src/services/awsService.ts` - Servicio principal
   - `src/services/awsConsoleService.ts` - Gestión de consola
   - `src/config/awsConfig.ts` - Configuración

2. **MCP Server AWS** (Nuevo)
   - `~/mcp-server-aws/` - Servidor MCP para Cursor
   - Gestiona: ECS, RDS, ElastiCache, EC2, S3, CloudWatch

## ⚠️ Permisos IAM Necesarios

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "rds:*",
        "elasticache:*",
        "ec2:Describe*",
        "s3:*",
        "route53:*",
        "cloudwatch:*",
        "logs:*",
        "iam:GetUser"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🔄 Cómo Obtener Credenciales

### Método 1: AWS Console

1. Ir a: https://console.aws.amazon.com/
2. Login con: rodrigomora@grupovidanta.com
3. IAM > Security credentials
4. Crear Access Key para CLI
5. Descargar CSV o copiar las keys

### Método 2: Script automático

```bash
cd AWS_Project
./configure-aws-credentials.sh
```

## 📝 Orden de Prioridad de Credenciales

El sistema busca credenciales en este orden:

1. **Variables de entorno del proceso**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `VITE_AWS_ACCESS_KEY_ID`
   - `VITE_AWS_SECRET_ACCESS_KEY`

2. **Archivo .env del proyecto**
   - `/Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform/.env`

3. **Archivo ~/.aws/credentials**
   - Profile `[default]`
   - Profile `[vidanta-ai]`

4. **IAM Role** (si corre en EC2)

## 🚀 Uso del MCP Server AWS

El nuevo servidor MCP permite gestionar AWS desde Cursor:

```bash
# Instalar
cd ~/mcp-server-aws
./install.sh

# Usar en Cursor
"Lista todos los clusters ECS"
"Crea un backup de n8n-postgres"
"Muéstrame las métricas de CPU del último día"
```

## 🔒 Seguridad

1. **NUNCA** commitear credenciales en Git
2. Rotar credenciales cada 90 días
3. Usar MFA en cuenta AWS
4. Limitar permisos al mínimo necesario
5. Usar variables de entorno en producción

## 📞 Contacto

- **Proyecto:** PQNC QA AI Platform
- **Email:** rodrigomora@grupovidanta.com
- **Región:** us-west-2 (Oregon)

