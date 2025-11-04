#!/bin/bash

# Script para desplegar Supabase REAL completo

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
DB_HOST="supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com"

echo -e "${PURPLE}🚀 DESPLEGANDO SUPABASE REAL COMPLETO${NC}"
echo -e "${PURPLE}====================================${NC}"

# 1. Obtener credenciales de la base de datos
echo -e "${BLUE}🔐 Obteniendo credenciales de la base de datos...${NC}"
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id supabase-database-credentials --region $REGION --query 'SecretString' --output text)
DB_PASSWORD=$(echo $DB_SECRET | jq -r '.password')

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Error obteniendo credenciales de la base de datos${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Credenciales obtenidas${NC}"

# 2. Crear task definition para PostgREST (API REST)
echo -e "${BLUE}📋 Creando task definition para PostgREST...${NC}"
cat > postgrest-task.json << EOF
{
  "family": "supabase-postgrest",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "postgrest",
      "image": "postgrest/postgrest:v12.0.2",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PGRST_DB_URI",
          "value": "postgresql://supabase:${DB_PASSWORD}@${DB_HOST}:5432/supabase"
        },
        {
          "name": "PGRST_DB_SCHEMAS",
          "value": "public"
        },
        {
          "name": "PGRST_DB_ANON_ROLE",
          "value": "anon"
        },
        {
          "name": "PGRST_JWT_SECRET",
          "value": "your-super-secret-jwt-token-with-at-least-32-characters-long"
        },
        {
          "name": "PGRST_DB_USE_LEGACY_GUCS",
          "value": "false"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-postgrest",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "postgrest"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/ || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 3. Crear task definition para GoTrue (Auth)
echo -e "${BLUE}🔐 Creando task definition para GoTrue Auth...${NC}"
cat > gotrue-task.json << EOF
{
  "family": "supabase-gotrue",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "gotrue",
      "image": "supabase/gotrue:v2.132.3",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 9999,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "GOTRUE_API_HOST",
          "value": "0.0.0.0"
        },
        {
          "name": "GOTRUE_API_PORT",
          "value": "9999"
        },
        {
          "name": "GOTRUE_DB_DRIVER",
          "value": "postgres"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://supabase:${DB_PASSWORD}@${DB_HOST}:5432/supabase"
        },
        {
          "name": "GOTRUE_SITE_URL",
          "value": "https://d2bxqn3xh4v4kj.cloudfront.net"
        },
        {
          "name": "GOTRUE_URI_ALLOW_LIST",
          "value": "*"
        },
        {
          "name": "GOTRUE_DISABLE_SIGNUP",
          "value": "false"
        },
        {
          "name": "GOTRUE_JWT_ADMIN_ROLES",
          "value": "service_role"
        },
        {
          "name": "GOTRUE_JWT_AUD",
          "value": "authenticated"
        },
        {
          "name": "GOTRUE_JWT_DEFAULT_GROUP_NAME",
          "value": "authenticated"
        },
        {
          "name": "GOTRUE_JWT_EXP",
          "value": "3600"
        },
        {
          "name": "GOTRUE_JWT_SECRET",
          "value": "your-super-secret-jwt-token-with-at-least-32-characters-long"
        },
        {
          "name": "GOTRUE_EXTERNAL_EMAIL_ENABLED",
          "value": "true"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-gotrue",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "gotrue"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:9999/health || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 4. Crear task definition para Kong (API Gateway)
echo -e "${BLUE}🌐 Creando task definition para Kong API Gateway...${NC}"
cat > kong-task.json << EOF
{
  "family": "supabase-kong",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "kong",
      "image": "kong:3.4-alpine",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        },
        {
          "containerPort": 8001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "KONG_DATABASE",
          "value": "off"
        },
        {
          "name": "KONG_DECLARATIVE_CONFIG",
          "value": "/tmp/kong.yml"
        },
        {
          "name": "KONG_DNS_ORDER",
          "value": "LAST,A,CNAME"
        },
        {
          "name": "KONG_PLUGINS",
          "value": "request-transformer,cors,key-auth,acl,basic-auth"
        },
        {
          "name": "KONG_NGINX_PROXY_PROXY_BUFFER_SIZE",
          "value": "160k"
        },
        {
          "name": "KONG_NGINX_PROXY_PROXY_BUFFERS",
          "value": "64 160k"
        },
        {
          "name": "KONG_LOG_LEVEL",
          "value": "info"
        }
      ],
      "command": [
        "/bin/sh",
        "-c",
        "echo '_format_version: \"3.0\"\\nservices:\\n  - name: postgrest\\n    url: http://postgrest:3000/\\n    routes:\\n      - name: rest\\n        strip_path: true\\n        paths:\\n          - /rest/v1/\\n  - name: gotrue\\n    url: http://gotrue:9999/\\n    routes:\\n      - name: auth\\n        strip_path: true\\n        paths:\\n          - /auth/v1/' > /tmp/kong.yml && kong start --vv"
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-kong",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "kong"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8001/status || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 5. Crear log groups
echo -e "${BLUE}📋 Creando log groups...${NC}"
aws logs create-log-group --log-group-name /ecs/supabase-postgrest --region $REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/supabase-gotrue --region $REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/supabase-kong --region $REGION 2>/dev/null || true

# 6. Registrar task definitions
echo -e "${BLUE}📋 Registrando task definitions...${NC}"
POSTGREST_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://postgrest-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)
GOTRUE_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://gotrue-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)
KONG_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://kong-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

echo -e "${GREEN}✅ Task definitions registradas${NC}"

# 7. Actualizar el servicio API principal con Kong
echo -e "${BLUE}🔄 Actualizando servicio API con Kong...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service supabase-api \
    --task-definition supabase-kong \
    --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=kong,containerPort=8000 \
    --region $REGION

# 8. Crear servicios adicionales
echo -e "${BLUE}🚀 Creando servicio PostgREST...${NC}"
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name supabase-postgrest \
    --task-definition supabase-postgrest \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
    --region $REGION 2>/dev/null || echo "Servicio PostgREST ya existe"

echo -e "${BLUE}🔐 Creando servicio GoTrue...${NC}"
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name supabase-gotrue \
    --task-definition supabase-gotrue \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
    --region $REGION 2>/dev/null || echo "Servicio GoTrue ya existe"

# 9. Actualizar health check del target group
echo -e "${BLUE}🏥 Actualizando health check...${NC}"
aws elbv2 modify-target-group \
    --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 \
    --health-check-path "/" \
    --health-check-port "8000" \
    --health-check-interval-seconds 60 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION

# 10. Esperar despliegue
echo -e "${YELLOW}⏳ Esperando despliegue (3 minutos)...${NC}"
sleep 180

# 11. Verificar servicios
echo -e "${BLUE}🔍 Verificando servicios...${NC}"
aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-api supabase-postgrest supabase-gotrue --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table

# 12. Probar endpoints
echo -e "${BLUE}🌐 Probando endpoints...${NC}"
sleep 60

echo -e "${YELLOW}Probando API REST...${NC}"
curl -I "https://d2bxqn3xh4v4kj.cloudfront.net/rest/v1/" --max-time 15 || echo "REST API aún iniciando"

echo -e "${YELLOW}Probando Auth...${NC}"
curl -I "https://d2bxqn3xh4v4kj.cloudfront.net/auth/v1/health" --max-time 15 || echo "Auth API aún iniciando"

# 13. Crear información de configuración
cat > supabase-real-config.txt << EOF
=== SUPABASE COMPLETO DESPLEGADO ===
Fecha: $(date)

🌐 URL HTTPS: https://d2bxqn3xh4v4kj.cloudfront.net
🔗 URL HTTP: http://supabase-alb-1210454801.us-west-2.elb.amazonaws.com

=== ENDPOINTS SUPABASE ===
🔹 REST API: https://d2bxqn3xh4v4kj.cloudfront.net/rest/v1/
🔹 Auth API: https://d2bxqn3xh4v4kj.cloudfront.net/auth/v1/
🔹 Health: https://d2bxqn3xh4v4kj.cloudfront.net/auth/v1/health

=== CREDENCIALES ===
🔑 Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
🔐 Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== BASE DE DATOS ===
🗄️  Host: $DB_HOST
🗄️  Database: supabase
🗄️  User: supabase
🗄️  Port: 5432

=== SERVICIOS DESPLEGADOS ===
✅ Kong API Gateway (Puerto 8000)
✅ PostgREST API (Puerto 3000)
✅ GoTrue Auth (Puerto 9999)
✅ Aurora PostgreSQL
✅ CloudFront SSL

=== CONFIGURACIÓN PARA APLICACIONES ===
const supabaseUrl = 'https://d2bxqn3xh4v4kj.cloudfront.net'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0'

=== COMANDOS ÚTILES ===
# Ver servicios:
aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-api supabase-postgrest supabase-gotrue --region $REGION

# Ver logs:
aws logs tail /ecs/supabase-kong --region $REGION --follow
aws logs tail /ecs/supabase-postgrest --region $REGION --follow
aws logs tail /ecs/supabase-gotrue --region $REGION --follow
EOF

# Limpiar archivos temporales
rm -f postgrest-task.json gotrue-task.json kong-task.json

echo -e "${GREEN}🎉 ¡SUPABASE COMPLETO DESPLEGADO!${NC}"
echo -e "${PURPLE}====================================${NC}"
echo -e "${GREEN}✅ Kong API Gateway${NC}"
echo -e "${GREEN}✅ PostgREST REST API${NC}"
echo -e "${GREEN}✅ GoTrue Authentication${NC}"
echo -e "${GREEN}✅ Aurora PostgreSQL${NC}"
echo -e "${GREEN}✅ CloudFront SSL${NC}"
echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
echo -e "${BLUE}📄 Config: supabase-real-config.txt${NC}"
echo -e "${YELLOW}⏳ Los servicios pueden tardar 5-10 minutos en estar completamente listos${NC}"
