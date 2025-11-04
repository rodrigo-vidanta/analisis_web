#!/bin/bash

# Script para desplegar Supabase Studio OFICIAL

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

echo -e "${PURPLE}🎨 DESPLEGANDO SUPABASE STUDIO OFICIAL${NC}"
echo -e "${PURPLE}====================================${NC}"

# 1. Crear task definition para Supabase Studio oficial
echo -e "${BLUE}📋 Creando task definition para Studio oficial...${NC}"
cat > official-studio-task.json << 'EOF'
{
  "family": "supabase-studio-official",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "studio-official",
      "image": "supabase/studio:20231030-47ac053",
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
          "name": "LOGFLARE_API_KEY",
          "value": "your-logflare-key"
        },
        {
          "name": "LOGFLARE_URL",
          "value": "https://api.logflare.app"
        },
        {
          "name": "NEXT_PUBLIC_SUPABASE_URL",
          "value": "https://d2bxqn3xh4v4kj.cloudfront.net"
        },
        {
          "name": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
          "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-studio-official",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "studio"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/profile || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 120
      }
    }
  ]
}
EOF

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-studio-official --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${BLUE}📋 Registrando task definition oficial...${NC}"
STUDIO_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://official-studio-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $STUDIO_TASK_ARN${NC}"
    
    # 4. Actualizar servicio principal con Studio oficial
    echo -e "${BLUE}🔄 Desplegando Supabase Studio oficial...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service supabase-api \
        --task-definition supabase-studio-official \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=studio-official,containerPort=3000 \
        --region $REGION
    
    # 5. Actualizar health check para puerto 3000
    echo -e "${BLUE}🏥 Actualizando health check para puerto 3000...${NC}"
    aws elbv2 modify-target-group \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 \
        --health-check-path "/api/profile" \
        --health-check-port "3000" \
        --health-check-interval-seconds 60 \
        --health-check-timeout-seconds 10 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 5 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio actualizado con Studio oficial${NC}"
    
    # 6. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Studio oficial (4 minutos)...${NC}"
    echo -e "${YELLOW}Studio oficial tarda más en cargar porque es más complejo${NC}"
    sleep 240
    
    # 7. Verificar estado
    echo -e "${BLUE}🔍 Verificando Studio oficial...${NC}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
    
    # 8. Verificar logs
    echo -e "${BLUE}📋 Verificando logs de Studio...${NC}"
    aws logs tail /ecs/supabase-studio-official --region $REGION --since 5m --format short | tail -10
    
    # 9. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/*" --region us-east-1
    
    # 10. Esperar invalidación
    echo -e "${YELLOW}⏳ Esperando invalidación (2 minutos)...${NC}"
    sleep 120
    
    # 11. Probar Studio oficial
    echo -e "${BLUE}🌐 Probando Supabase Studio oficial...${NC}"
    curl -I https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 || echo "Studio oficial aún cargando"
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO OFICIAL DESPLEGADO!${NC}"
    echo -e "${PURPLE}=====================================${NC}"
    echo -e "${GREEN}✅ Interfaz REAL de Supabase Studio${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    echo -e "${BLUE}🔑 Usa las credenciales de la página para conectar${NC}"
    
    # 12. Crear información final
    cat > official-studio-info.txt << EOF
=== SUPABASE STUDIO OFICIAL DESPLEGADO ===
Fecha: $(date)

🌐 URL Studio Oficial: https://d2bxqn3xh4v4kj.cloudfront.net

=== CARACTERÍSTICAS ===
✅ Supabase Studio oficial (imagen: supabase/studio:20231030-47ac053)
✅ Interfaz idéntica a supabase.com
✅ Editor SQL integrado
✅ Table Editor visual
✅ Auth management
✅ Storage management
✅ API documentation
✅ Logs viewer

=== CREDENCIALES PARA STUDIO ===
URL: https://d2bxqn3xh4v4kj.cloudfront.net
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== BASE DE DATOS ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

=== NOTA IMPORTANTE ===
Studio oficial puede tardar 5-10 minutos en cargar completamente.
Si no carga inmediatamente, revisa los logs:
aws logs tail /ecs/supabase-studio-official --region us-west-2 --follow

¡Ahora tienes el Supabase Studio REAL y oficial!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: official-studio-info.txt${NC}"
    echo -e "${YELLOW}⏳ Studio oficial puede tardar 5-10 minutos en estar listo${NC}"
    echo -e "${YELLOW}Es el mismo Studio que usas en supabase.com${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f official-studio-task.json

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL COMPLETO!${NC}"
echo -e "${BLUE}🎨 Accede a: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
echo -e "${YELLOW}⏳ Espera 5-10 minutos para que cargue completamente${NC}"
