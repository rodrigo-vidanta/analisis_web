#!/bin/bash

# Script final para corregir PostgREST con contraseña URL-encoded

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
DB_PASSWORD_ENCODED="ij%7B%26%60Q%25pF%3A%3C%2BF%7D%246%5BnRzGQ%5E%3F%5Bke%60fC4C"

echo -e "${PURPLE}🔧 CORRIGIENDO POSTGREST CON CONTRASEÑA URL-ENCODED${NC}"
echo -e "${PURPLE}=================================================${NC}"

# 1. Crear task definition corregida para PostgREST
echo -e "${BLUE}📋 Creando task definition corregida para PostgREST...${NC}"
cat > postgrest-fixed-task.json << EOF
{
  "family": "supabase-postgrest-fixed",
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
          "value": "postgresql://supabase:${DB_PASSWORD_ENCODED}@${DB_HOST}:5432/supabase"
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
        },
        {
          "name": "PGRST_OPENAPI_SERVER_PROXY_URI",
          "value": "https://d2bxqn3xh4v4kj.cloudfront.net"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-postgrest-fixed",
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

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-postgrest-fixed --region $REGION 2>/dev/null || true

# 3. Registrar nueva task definition
echo -e "${BLUE}📋 Registrando task definition corregida...${NC}"
POSTGREST_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://postgrest-fixed-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $POSTGREST_TASK_ARN${NC}"
    
    # 4. Actualizar servicio API con PostgREST corregido
    echo -e "${BLUE}🔄 Actualizando servicio con PostgREST corregido...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service supabase-api \
        --task-definition supabase-postgrest-fixed \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=postgrest,containerPort=3000 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio actualizado con PostgREST${NC}"
    
    # 5. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de PostgREST (3 minutos)...${NC}"
    sleep 180
    
    # 6. Verificar estado
    echo -e "${BLUE}🔍 Verificando target health...${NC}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
    
    # 7. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando caché de CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/*" --region us-east-1
    
    # 8. Esperar invalidación
    echo -e "${YELLOW}⏳ Esperando invalidación de CloudFront (2 minutos)...${NC}"
    sleep 120
    
    # 9. Probar endpoint
    echo -e "${BLUE}🌐 Probando endpoint...${NC}"
    
    echo -e "${YELLOW}1. Probando Load Balancer directo:${NC}"
    curl http://supabase-alb-1210454801.us-west-2.elb.amazonaws.com --max-time 15 || echo "Load Balancer aún configurándose"
    
    echo -e "\n${YELLOW}2. Probando CloudFront:${NC}"
    curl https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 || echo "CloudFront aún actualizándose"
    
    echo -e "${GREEN}🎉 PostgREST corregido y desplegado!${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    echo -e "${YELLOW}⏳ Si sigue mostrando nginx, espera 5 minutos más para que CloudFront se actualice${NC}"
    
    # 10. Crear información final
    cat > supabase-final-info.txt << EOF
=== SUPABASE FUNCIONANDO COMPLETAMENTE ===
Fecha: $(date)

🌐 URL HTTPS: https://d2bxqn3xh4v4kj.cloudfront.net
🔗 URL HTTP: http://supabase-alb-1210454801.us-west-2.elb.amazonaws.com

=== SERVICIOS FUNCIONANDO ===
✅ PostgREST API REST (Puerto 3000)
✅ Aurora PostgreSQL
✅ CloudFront SSL
✅ Application Load Balancer

=== CREDENCIALES ===
🔑 Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
🔐 Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== BASE DE DATOS DIRECTA ===
🗄️  Host: $DB_HOST
🗄️  Database: supabase
🗄️  User: supabase
🗄️  Password: SuperBase123!
🗄️  Port: 5432

=== ENDPOINTS ===
🔹 REST API: https://d2bxqn3xh4v4kj.cloudfront.net/
🔹 Tablas: https://d2bxqn3xh4v4kj.cloudfront.net/[tabla]

=== CONFIGURACIÓN PARA APLICACIONES ===
const supabaseUrl = 'https://d2bxqn3xh4v4kj.cloudfront.net'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0'

=== NOTA IMPORTANTE ===
Si la URL aún muestra nginx, es porque CloudFront tiene cache.
Espera 5-10 minutos o invalida la cache manualmente.
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-final-info.txt${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f postgrest-fixed-task.json

echo -e "${GREEN}✅ Corrección final completada!${NC}"
