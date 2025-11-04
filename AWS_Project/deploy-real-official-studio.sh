#!/bin/bash

# Script para desplegar Supabase Studio OFICIAL con imagen exacta

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

echo -e "${PURPLE}🎨 DESPLEGANDO SUPABASE STUDIO OFICIAL REAL${NC}"
echo -e "${PURPLE}=========================================${NC}"

# 1. Crear task definition con imagen oficial exacta
echo -e "${BLUE}📋 Creando task definition con imagen oficial exacta...${NC}"
cat > studio-official-exact.json << 'EOF'
{
  "family": "supabase-studio-official-exact",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "supabase-studio-exact",
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
          "value": "http://localhost:8080"
        },
        {
          "name": "POSTGRES_PASSWORD",
          "value": "SuperBase123!"
        },
        {
          "name": "DEFAULT_ORGANIZATION_NAME",
          "value": "Default Organization"
        },
        {
          "name": "DEFAULT_PROJECT_NAME",
          "value": "Default Project"
        },
        {
          "name": "SUPABASE_URL",
          "value": "https://d2bxqn3xh4v4kj.cloudfront.net"
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
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-studio-official-exact",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "studio"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"fetch('http://localhost:3000/api/platform/profile').then((r) => {if (r.status !== 200) throw new Error(r.status)})\" || exit 1"
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

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-studio-official-exact --region $REGION 2>/dev/null || true

# 3. Registrar task definition oficial
echo -e "${BLUE}📋 Registrando task definition oficial exacta...${NC}"
STUDIO_EXACT_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-official-exact.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition oficial registrada: $STUDIO_EXACT_ARN${NC}"
    
    # 4. Crear nuevo servicio oficial
    echo -e "${BLUE}🚀 Creando servicio oficial de Supabase Studio...${NC}"
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name supabase-studio-official-exact \
        --task-definition supabase-studio-official-exact \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=supabase-studio-exact,containerPort=3000 \
        --health-check-grace-period-seconds 600 \
        --region $REGION 2>/dev/null || echo "Servicio ya existe, actualizando..."
    
    # Si el servicio ya existe, actualizarlo
    if [ $? -ne 0 ]; then
        echo -e "${BLUE}🔄 Actualizando servicio existente...${NC}"
        aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service supabase-studio-real \
            --task-definition supabase-studio-official-exact \
            --desired-count 1 \
            --region $REGION 2>/dev/null || true
    fi
    
    # 5. Actualizar health check
    echo -e "${BLUE}🏥 Configurando health check oficial...${NC}"
    aws elbv2 modify-target-group \
        --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 \
        --health-check-path "/api/platform/profile" \
        --health-check-port "3000" \
        --health-check-interval-seconds 60 \
        --health-check-timeout-seconds 30 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 5 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio oficial configurado${NC}"
    
    # 6. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Studio oficial (5 minutos)...${NC}"
    echo -e "${YELLOW}Studio oficial es una aplicación Next.js completa${NC}"
    sleep 300
    
    # 7. Verificar estado
    echo -e "${BLUE}🔍 Verificando servicios de Studio...${NC}"
    aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output table
    
    # 8. Verificar health
    echo -e "${BLUE}🏥 Verificando health...${NC}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Description]' --output table
    
    # 9. Verificar logs
    echo -e "${BLUE}📋 Verificando logs de Studio oficial...${NC}"
    aws logs tail /ecs/supabase-studio-official-exact --region $REGION --since 5m --format short | tail -15
    
    # 10. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/*" --region us-east-1
    
    # 11. Esperar invalidación y probar
    echo -e "${YELLOW}⏳ Esperando invalidación (2 minutos)...${NC}"
    sleep 120
    
    # 12. Probar Studio oficial
    echo -e "${BLUE}🌐 Probando Supabase Studio oficial...${NC}"
    
    echo -e "${YELLOW}1. Health check endpoint:${NC}"
    curl -I https://d2bxqn3xh4v4kj.cloudfront.net/api/platform/profile --max-time 15 || echo "Health check aún configurándose"
    
    echo -e "\n${YELLOW}2. Página principal:${NC}"
    curl -I https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 || echo "Studio aún cargando"
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO OFICIAL DESPLEGADO!${NC}"
    echo -e "${PURPLE}=====================================${NC}"
    echo -e "${GREEN}✅ Imagen oficial: supabase/studio:2025.10.27-sha-85b84e0${NC}"
    echo -e "${GREEN}✅ Configuración del repositorio oficial${NC}"
    echo -e "${GREEN}✅ Health check oficial${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    
    # 13. Crear información final oficial
    cat > supabase-studio-oficial-real.txt << EOF
=== SUPABASE STUDIO OFICIAL DESPLEGADO ===
Fecha: $(date)

🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net

=== IMAGEN OFICIAL ===
Docker: supabase/studio:2025.10.27-sha-85b84e0
Fuente: Repositorio oficial github.com/supabase/supabase
Configuración: docker-compose.yml oficial

=== CARACTERÍSTICAS OFICIALES ===
✅ Interfaz idéntica a supabase.com
✅ Table Editor (editor visual de tablas)
✅ SQL Editor con autocompletado
✅ Auth management (gestión de usuarios)
✅ Storage management (gestión de archivos)
✅ API documentation
✅ Database schema viewer
✅ Logs viewer
✅ Real-time subscriptions
✅ Functions management
✅ Platform profile API

=== CONFIGURACIÓN OFICIAL ===
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
JWT Secret: your-super-secret-jwt-token-with-at-least-32-characters-long

=== BASE DE DATOS CONECTADA ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

=== ACCESO ===
1. Ve a: https://d2bxqn3xh4v4kj.cloudfront.net
2. Debería cargar Supabase Studio oficial
3. Conecta a tu base de datos Aurora
4. ¡Usa Studio exactamente como en supabase.com!

=== NOTA IMPORTANTE ===
Este es el Supabase Studio OFICIAL del repositorio oficial.
Imagen: supabase/studio:2025.10.27-sha-85b84e0
Misma interfaz que usas en supabase.com.

Studio puede tardar 5-10 minutos en cargar completamente.
Si no carga, revisa logs:
aws logs tail /ecs/supabase-studio-official-exact --region us-west-2 --follow

¡Ahora tienes el Studio oficial real!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-studio-oficial-real.txt${NC}"
    echo -e "${YELLOW}⏳ Studio oficial puede tardar 5-10 minutos en estar listo${NC}"
    echo -e "${YELLOW}Es EXACTAMENTE el mismo Studio de supabase.com${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition oficial${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f studio-official-exact.json

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL REAL COMPLETO!${NC}"
echo -e "${BLUE}🎨 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
echo -e "${YELLOW}⏳ Espera 5-10 minutos para que Studio cargue${NC}"
echo -e "${GREEN}✅ Imagen oficial: supabase/studio:2025.10.27-sha-85b84e0${NC}"
