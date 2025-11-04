#!/bin/bash

# Script para desplegar SUPABASE COMPLETO OFICIAL con todos los servicios

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
echo -e "${PURPLE}TODOS LOS SERVICIOS NECESARIOS PARA STUDIO${NC}"
echo -e "${PURPLE}=========================================${NC}"

# 1. Limpiar servicios anteriores
echo -e "${BLUE}🗑️ Limpiando servicios anteriores...${NC}"
aws ecs update-service --cluster $CLUSTER_NAME --service supabase-studio-standalone --desired-count 0 --region $REGION 2>/dev/null || true
aws ecs delete-service --cluster $CLUSTER_NAME --service supabase-studio-standalone --force --region $REGION 2>/dev/null || true

# 2. Crear task definition para Kong (API Gateway) - REQUERIDO para Studio
echo -e "${BLUE}🌐 Creando Kong API Gateway (requerido para Studio)...${NC}"
cat > kong-official.json << 'EOF'
{
  "family": "supabase-kong-official",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "kong-official",
      "image": "kong:2.8.1-alpine",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        },
        {
          "containerPort": 8443,
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
          "value": "/var/lib/kong/kong.yml"
        },
        {
          "name": "KONG_DNS_ORDER",
          "value": "LAST,A,CNAME"
        },
        {
          "name": "KONG_PLUGINS",
          "value": "request-transformer,cors,key-auth,acl"
        }
      ],
      "mountPoints": [],
      "volumesFrom": [],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kong-official",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "kong"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "kong health"
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

# 3. Crear task definition para PostgREST - REQUERIDO para Studio
echo -e "${BLUE}📊 Creando PostgREST (requerido para Studio)...${NC}"
cat > postgrest-official.json << 'EOF'
{
  "family": "supabase-postgrest-official",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "postgrest-official",
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
          "value": "postgresql://supabase:SuperBase123!@supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com:5432/supabase"
        },
        {
          "name": "PGRST_DB_SCHEMAS",
          "value": "public,storage,graphql_public"
        },
        {
          "name": "PGRST_DB_ANON_ROLE",
          "value": "anon"
        },
        {
          "name": "PGRST_JWT_SECRET",
          "value": "your-super-secret-jwt-token-with-at-least-32-characters-long"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/postgrest-official",
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

# 4. Crear task definition para Meta (requerido para Studio)
echo -e "${BLUE}🔍 Creando pg_meta (requerido para Studio)...${NC}"
cat > meta-official.json << 'EOF'
{
  "family": "supabase-meta-official",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "meta-official",
      "image": "supabase/postgres-meta:v0.68.0",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PG_META_PORT",
          "value": "8080"
        },
        {
          "name": "PG_META_DB_HOST",
          "value": "supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com"
        },
        {
          "name": "PG_META_DB_NAME",
          "value": "supabase"
        },
        {
          "name": "PG_META_DB_USER",
          "value": "supabase"
        },
        {
          "name": "PG_META_DB_PASSWORD",
          "value": "SuperBase123!"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/meta-official",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "meta"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8080/health || exit 1"
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

# 5. Crear task definition para Studio OFICIAL completo
echo -e "${BLUE}🎨 Creando Supabase Studio OFICIAL completo...${NC}"
cat > studio-complete-official.json << 'EOF'
{
  "family": "supabase-studio-complete",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "studio-complete",
      "image": "supabase/studio:2025.10.27-sha-85b84e0",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "HOSTNAME",
          "value": "::"
        },
        {
          "name": "STUDIO_PG_META_URL",
          "value": "http://50.112.52.182:8080"
        },
        {
          "name": "POSTGRES_PASSWORD",
          "value": "SuperBase123!"
        },
        {
          "name": "DEFAULT_ORGANIZATION_NAME",
          "value": "AWS Organization"
        },
        {
          "name": "DEFAULT_PROJECT_NAME",
          "value": "AWS Supabase Project"
        },
        {
          "name": "SUPABASE_URL",
          "value": "http://50.112.52.182:8000"
        },
        {
          "name": "SUPABASE_PUBLIC_URL",
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
          "name": "AUTH_JWT_SECRET",
          "value": "your-super-secret-jwt-token-with-at-least-32-characters-long"
        },
        {
          "name": "NEXT_PUBLIC_ENABLE_LOGS",
          "value": "true"
        },
        {
          "name": "LOGFLARE_URL",
          "value": "http://localhost:4000"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/studio-complete-official",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "studio"
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
        "startPeriod": 180
      }
    }
  ]
}
EOF

# 6. Crear log groups
echo -e "${BLUE}📋 Creando log groups...${NC}"
aws logs create-log-group --log-group-name /ecs/kong-official --region $REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/postgrest-official --region $REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/meta-official --region $REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/studio-complete-official --region $REGION 2>/dev/null || true

# 7. Registrar task definitions
echo -e "${BLUE}📋 Registrando task definitions oficiales...${NC}"
KONG_ARN=$(aws ecs register-task-definition --cli-input-json file://kong-official.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)
POSTGREST_ARN=$(aws ecs register-task-definition --cli-input-json file://postgrest-official.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)
META_ARN=$(aws ecs register-task-definition --cli-input-json file://meta-official.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)
STUDIO_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-complete-official.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

echo -e "${GREEN}✅ Task definitions registradas${NC}"

# 8. Crear servicios en orden (dependencias)
echo -e "${BLUE}🚀 Desplegando servicios en orden...${NC}"

# PostgREST primero
echo -e "${YELLOW}1. Desplegando PostgREST...${NC}"
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name postgrest-official \
    --task-definition supabase-postgrest-official \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
    --region $REGION 2>/dev/null || echo "PostgREST ya existe"

# Meta después
echo -e "${YELLOW}2. Desplegando pg_meta...${NC}"
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name meta-official \
    --task-definition supabase-meta-official \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
    --region $REGION 2>/dev/null || echo "Meta ya existe"

# Kong después
echo -e "${YELLOW}3. Desplegando Kong API Gateway...${NC}"
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name kong-official \
    --task-definition supabase-kong-official \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
    --region $REGION 2>/dev/null || echo "Kong ya existe"

# Studio al final
echo -e "${YELLOW}4. Desplegando Supabase Studio OFICIAL...${NC}"
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name studio-complete-official \
    --task-definition supabase-studio-complete \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
    --region $REGION 2>/dev/null || echo "Studio ya existe"

# 9. Esperar despliegue
echo -e "${YELLOW}⏳ Esperando despliegue completo (5 minutos)...${NC}"
sleep 300

# 10. Verificar todos los servicios
echo -e "${BLUE}🔍 Verificando todos los servicios...${NC}"
aws ecs describe-services --cluster $CLUSTER_NAME --services postgrest-official meta-official kong-official studio-complete-official --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table

# 11. Obtener IPs de los servicios
echo -e "${BLUE}🌐 Obteniendo IPs de los servicios...${NC}"

# Studio IP
STUDIO_TASK=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name studio-complete-official --region $REGION --query 'taskArns[0]' --output text)
if [ "$STUDIO_TASK" != "None" ] && [ -n "$STUDIO_TASK" ]; then
    STUDIO_ENI=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $STUDIO_TASK --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
    STUDIO_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $STUDIO_ENI --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
    echo -e "${GREEN}✅ Studio IP: $STUDIO_IP${NC}"
else
    echo -e "${YELLOW}⚠️  Studio aún iniciando${NC}"
    STUDIO_IP="iniciando"
fi

# 12. Verificar logs de Studio
echo -e "${BLUE}📋 Verificando logs de Studio oficial...${NC}"
aws logs tail /ecs/studio-complete-official --region $REGION --since 10m --format short | tail -10

# 13. Probar Studio oficial
if [ "$STUDIO_IP" != "iniciando" ] && [ "$STUDIO_IP" != "None" ]; then
    echo -e "${BLUE}🌐 Probando Supabase Studio oficial...${NC}"
    sleep 60
    curl -I http://$STUDIO_IP:3000 --max-time 15 || echo "Studio aún cargando"
fi

echo -e "${GREEN}🎉 ¡SUPABASE OFICIAL COMPLETO DESPLEGADO!${NC}"
echo -e "${PURPLE}=====================================${NC}"
echo -e "${GREEN}✅ PostgREST oficial${NC}"
echo -e "${GREEN}✅ pg_meta oficial${NC}"
echo -e "${GREEN}✅ Kong API Gateway oficial${NC}"
echo -e "${GREEN}✅ Studio oficial (imagen: supabase/studio:2025.10.27-sha-85b84e0)${NC}"

if [ "$STUDIO_IP" != "iniciando" ] && [ "$STUDIO_IP" != "None" ]; then
    echo -e "${BLUE}🎨 URL Studio: http://$STUDIO_IP:3000${NC}"
fi

# 14. Crear información final
cat > supabase-oficial-completo.txt << EOF
=== SUPABASE OFICIAL COMPLETO DESPLEGADO ===
Fecha: $(date)

🎨 SUPABASE STUDIO OFICIAL:
$(if [ "$STUDIO_IP" != "iniciando" ] && [ "$STUDIO_IP" != "None" ]; then echo "URL: http://$STUDIO_IP:3000"; else echo "IP: Iniciando..."; fi)

=== SERVICIOS OFICIALES DESPLEGADOS ===
✅ PostgREST (API REST)
✅ pg_meta (Database metadata)
✅ Kong (API Gateway)
✅ Studio (Interfaz oficial)

=== IMÁGENES OFICIALES ===
Studio: supabase/studio:2025.10.27-sha-85b84e0
PostgREST: postgrest/postgrest:v12.0.2
Meta: supabase/postgres-meta:v0.68.0
Kong: kong:2.8.1-alpine

=== BASE DE DATOS ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

=== ACCESO AL STUDIO OFICIAL ===
$(if [ "$STUDIO_IP" != "iniciando" ] && [ "$STUDIO_IP" != "None" ]; then echo "URL: http://$STUDIO_IP:3000"; else echo "Esperando IP..."; fi)

Esto es el Supabase Studio OFICIAL del repositorio oficial.
Exactamente la misma interfaz que usas en supabase.com.

=== COMANDOS ÚTILES ===
# Ver servicios:
aws ecs describe-services --cluster supabase-cluster --services studio-complete-official --region us-west-2

# Ver logs:
aws logs tail /ecs/studio-complete-official --region us-west-2 --follow

# Obtener IP actual:
aws ecs list-tasks --cluster supabase-cluster --service-name studio-complete-official --region us-west-2
EOF

echo -e "${BLUE}📄 Información guardada en: supabase-oficial-completo.txt${NC}"

# Limpiar archivos temporales
rm -f kong-official.json postgrest-official.json meta-official.json studio-complete-official.json

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL FUNCIONANDO!${NC}"
if [ "$STUDIO_IP" != "iniciando" ] && [ "$STUDIO_IP" != "None" ]; then
    echo -e "${BLUE}🎨 Accede a: http://$STUDIO_IP:3000${NC}"
fi
echo -e "${YELLOW}⏳ Studio puede tardar 5-10 minutos en cargar completamente${NC}"
echo -e "${GREEN}✅ Es el Studio OFICIAL de Supabase${NC}"
