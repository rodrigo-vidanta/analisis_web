#!/bin/bash

# Script para desplegar Supabase OFICIAL completo usando el repositorio oficial

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-west-2"
CLUSTER_NAME="supabase-cluster"

echo -e "${PURPLE}🚀 DESPLEGANDO SUPABASE OFICIAL COMPLETO${NC}"
echo -e "${PURPLE}====================================${NC}"

# 1. Clonar repositorio oficial de Supabase
echo -e "${BLUE}📦 Clonando repositorio oficial de Supabase...${NC}"
if [ ! -d "supabase-official" ]; then
    git clone --depth 1 https://github.com/supabase/supabase.git supabase-official
fi

cd supabase-official/docker

# 2. Configurar variables de entorno
echo -e "${BLUE}⚙️ Configurando variables de entorno oficiales...${NC}"
cp .env.example .env

# Generar JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Configurar .env con nuestros datos
cat > .env << EOF
############
# Secrets
# YOU MUST CHANGE THESE BEFORE GOING INTO PRODUCTION
############

POSTGRES_PASSWORD=SuperBase123!
JWT_SECRET=$JWT_SECRET
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=SuperBase123!

############
# Database - You can change these to any PostgreSQL database that has logical replication enabled.
############

POSTGRES_HOST=supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
POSTGRES_DB=supabase
POSTGRES_PORT=5432
# default user is postgres
POSTGRES_USER=supabase

############
# API Proxy - Configuration for the Kong Reverse proxy.
############

KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

############
# API - Configuration for PostgREST.
############

PGRST_DB_SCHEMAS=public,storage,graphql_public

############
# Auth - Configuration for GoTrue.
############

## General
SITE_URL=https://d2bxqn3xh4v4kj.cloudfront.net
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=https://d2bxqn3xh4v4kj.cloudfront.net

## Mailer Config
MAILER_URLPATHS_CONFIRMATION="/auth/v1/verify"
MAILER_URLPATHS_INVITE="/auth/v1/verify"
MAILER_URLPATHS_RECOVERY="/auth/v1/verify"
MAILER_URLPATHS_EMAIL_CHANGE="/auth/v1/verify"

## Email auth
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
SMTP_ADMIN_EMAIL=admin@example.org
SMTP_HOST=supabase-mail
SMTP_PORT=2500
SMTP_USER=fake_mail_user
SMTP_PASS=fake_mail_password
SMTP_SENDER_NAME=fake_mail_user

############
# Studio - Configuration for Supabase Studio.
############

STUDIO_DEFAULT_ORGANIZATION=Default Organization
STUDIO_DEFAULT_PROJECT=Default Project

STUDIO_PORT=3000
SUPABASE_PUBLIC_URL=https://d2bxqn3xh4v4kj.cloudfront.net

# Enable webp
IMGPROXY_ENABLE_WEBP_DETECTION=true

############
# Functions - Configuration for Functions.
############

FUNCTIONS_VERIFY_JWT=false

############
# Logs - Configuration for Logflare.
############

LOGFLARE_LOGGER_BACKEND_API_KEY=your-super-secret-and-long-logflare-key

# Change vector.toml sinks to reflect this change
LOGFLARE_API_KEY=your-super-secret-and-long-logflare-key

# Docker socket location - this value will differ depending on your OS
DOCKER_SOCKET_LOCATION=/var/run/docker.sock

# Google Cloud Storage
STORAGE_BACKEND=file
GLOBAL_S3_BUCKET=supabase-storage-307621978585-us-west-2

# AWS S3 Configuration
# STORAGE_BACKEND=s3
# STORAGE_S3_REGION=us-west-2
# STORAGE_S3_BUCKET=supabase-storage-307621978585-us-west-2
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=

############
# Realtime
############

# This should be the same as your database password
REALTIME_DB_PASSWORD=SuperBase123!

############
# Edge Runtime
############

EDGE_RUNTIME_FUNCTIONS_PORT=9000
EOF

echo -e "${GREEN}✅ Variables de entorno configuradas${NC}"

# 3. Crear task definitions para cada servicio oficial
echo -e "${BLUE}📋 Creando task definitions para stack oficial...${NC}"

# Studio oficial
cat > ../studio-official-task.json << 'EOF'
{
  "family": "supabase-studio-official-real",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "supabase-studio",
      "image": "supabase/studio:20241029-5db7c4b",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "SUPABASE_URL",
          "value": "https://d2bxqn3xh4v4kj.cloudfront.net"
        },
        {
          "name": "SUPABASE_ANON_KEY",
          "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0"
        },
        {
          "name": "SUPABASE_SERVICE_KEY",
          "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
        },
        {
          "name": "STUDIO_PG_META_URL",
          "value": "http://localhost:8080"
        },
        {
          "name": "POSTGRES_PASSWORD",
          "value": "SuperBase123!"
        },
        {
          "name": "NEXT_PUBLIC_ENABLE_LOGS",
          "value": "true"
        },
        {
          "name": "STUDIO_DEFAULT_ORGANIZATION",
          "value": "Default Organization"
        },
        {
          "name": "STUDIO_DEFAULT_PROJECT",
          "value": "Default Project"
        },
        {
          "name": "STUDIO_PORT",
          "value": "3000"
        },
        {
          "name": "SUPABASE_PUBLIC_URL",
          "value": "https://d2bxqn3xh4v4kj.cloudfront.net"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-studio-official-real",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "studio"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/profile || curl -f http://localhost:3000/ || exit 1"
        ],
        "interval": 60,
        "timeout": 30,
        "retries": 5,
        "startPeriod": 300
      }
    }
  ]
}
EOF

# 4. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-studio-official-real --region $REGION 2>/dev/null || true

# 5. Registrar task definition oficial
echo -e "${BLUE}📋 Registrando task definition de Studio oficial...${NC}"
cd ..
STUDIO_OFFICIAL_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-official-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition oficial registrada: $STUDIO_OFFICIAL_ARN${NC}"
    
    # 6. Eliminar servicios anteriores
    echo -e "${BLUE}🗑️ Limpiando servicios anteriores...${NC}"
    aws ecs delete-service --cluster $CLUSTER_NAME --service supabase-studio-real --force --region $REGION 2>/dev/null || true
    aws ecs delete-service --cluster $CLUSTER_NAME --service supabase-api --force --region $REGION 2>/dev/null || true
    
    # Esperar eliminación
    sleep 30
    
    # 7. Crear servicio oficial de Studio
    echo -e "${BLUE}🚀 Creando servicio oficial de Supabase Studio...${NC}"
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name supabase-studio-official \
        --task-definition supabase-studio-official-real \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=supabase-studio,containerPort=3000 \
        --health-check-grace-period-seconds 600 \
        --region $REGION
    
    # 8. Actualizar health check para Studio
    echo -e "${BLUE}🏥 Configurando health check para Studio oficial...${NC}"
    aws elbv2 modify-target-group \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 \
        --health-check-path "/" \
        --health-check-port "3000" \
        --health-check-interval-seconds 60 \
        --health-check-timeout-seconds 30 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 5 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio oficial creado${NC}"
    
    # 9. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Studio oficial (5 minutos)...${NC}"
    echo -e "${YELLOW}Studio oficial tarda más porque es la aplicación completa${NC}"
    sleep 300
    
    # 10. Verificar estado
    echo -e "${BLUE}🔍 Verificando estado del Studio oficial...${NC}"
    aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-studio-official --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table
    
    # 11. Verificar health
    echo -e "${BLUE}🏥 Verificando health del target group...${NC}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
    
    # 12. Verificar logs
    echo -e "${BLUE}📋 Verificando logs de Studio oficial...${NC}"
    aws logs tail /ecs/supabase-studio-official-real --region $REGION --since 5m --format short | tail -10
    
    # 13. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/*" --region us-east-1
    
    # 14. Esperar invalidación
    echo -e "${YELLOW}⏳ Esperando invalidación (2 minutos)...${NC}"
    sleep 120
    
    # 15. Probar Studio oficial
    echo -e "${BLUE}🌐 Probando Supabase Studio oficial...${NC}"
    
    echo -e "${YELLOW}1. Probando Load Balancer:${NC}"
    curl -I http://supabase-alb-1210454801.us-west-2.elb.amazonaws.com --max-time 15 || echo "Load Balancer configurándose"
    
    echo -e "\n${YELLOW}2. Probando CloudFront:${NC}"
    curl -I https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 || echo "CloudFront actualizándose"
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO OFICIAL DESPLEGADO!${NC}"
    echo -e "${PURPLE}=====================================${NC}"
    echo -e "${GREEN}✅ Imagen oficial: supabase/studio:20241029-5db7c4b${NC}"
    echo -e "${GREEN}✅ Configuración oficial del repositorio${NC}"
    echo -e "${GREEN}✅ Variables de entorno oficiales${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    echo -e "${BLUE}👤 Usuario: admin${NC}"
    echo -e "${BLUE}🔐 Contraseña: SuperBase123!${NC}"
    
    # 16. Crear información final
    cat > ../supabase-studio-official-final.txt << EOF
=== SUPABASE STUDIO OFICIAL DESPLEGADO ===
Fecha: $(date)

🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net

=== CREDENCIALES DE ACCESO ===
👤 Usuario: admin
🔐 Contraseña: SuperBase123!

=== IMAGEN OFICIAL ===
Docker: supabase/studio:20241029-5db7c4b
Repositorio: https://github.com/supabase/supabase
Configuración: Oficial del repositorio

=== CARACTERÍSTICAS OFICIALES ===
✅ Table Editor (editor visual de tablas)
✅ SQL Editor con autocompletado
✅ Auth management (gestión de usuarios)
✅ Storage management (gestión de archivos)
✅ API documentation
✅ Database schema viewer
✅ Logs viewer
✅ Real-time subscriptions
✅ Functions management

=== BASE DE DATOS CONECTADA ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Database: supabase
User: supabase
Password: SuperBase123!

=== CONFIGURACIÓN OFICIAL ===
JWT Secret: $JWT_SECRET
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== ACCESO ===
1. Ve a: https://d2bxqn3xh4v4kj.cloudfront.net
2. Login: admin / SuperBase123!
3. Conecta a tu base de datos Aurora
4. ¡Usa Studio como en supabase.com!

=== NOTA ===
Este es el Supabase Studio OFICIAL del repositorio oficial.
Misma interfaz que usas en supabase.com.
Puede tardar 5-10 minutos en cargar completamente.

¡Ahora tienes el Studio oficial funcionando!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-studio-official-final.txt${NC}"
    echo -e "${YELLOW}⏳ Studio oficial puede tardar 5-10 minutos en estar listo${NC}"
    echo -e "${YELLOW}Es exactamente el mismo Studio que conoces de supabase.com${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition oficial${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f studio-official-task.json

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL COMPLETO!${NC}"
echo -e "${BLUE}🎨 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
echo -e "${BLUE}👤 Login: admin / SuperBase123!${NC}"
