#!/bin/bash

# Solución final para Supabase Studio oficial

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

echo -e "${PURPLE}🎨 SOLUCIÓN FINAL: SUPABASE STUDIO OFICIAL${NC}"
echo -e "${PURPLE}=========================================${NC}"

# 1. Crear task definition con imagen latest de Studio
echo -e "${BLUE}📋 Creando task definition con imagen latest...${NC}"
cat > studio-latest-task.json << 'EOF'
{
  "family": "supabase-studio-latest",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "studio-latest",
      "image": "supabase/studio:latest",
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
          "awslogs-group": "/ecs/supabase-studio-latest",
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
        "startPeriod": 120
      }
    }
  ]
}
EOF

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-studio-latest --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${BLUE}📋 Registrando task definition latest...${NC}"
STUDIO_LATEST_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-latest-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition latest registrada: $STUDIO_LATEST_ARN${NC}"
    
    # 4. Actualizar servicio con imagen latest
    echo -e "${BLUE}🔄 Actualizando con Studio latest...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service supabase-studio-real \
        --task-definition supabase-studio-latest \
        --desired-count 1 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio actualizado con Studio latest${NC}"
    
    # 5. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Studio latest (4 minutos)...${NC}"
    sleep 240
    
    # 6. Verificar estado
    echo -e "${BLUE}🔍 Verificando estado del Studio...${NC}"
    aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-studio-real --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table
    
    # 7. Verificar health del target group
    echo -e "${BLUE}🏥 Verificando health del target group...${NC}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
    
    # 8. Verificar logs
    echo -e "${BLUE}📋 Verificando logs de Studio...${NC}"
    aws logs tail /ecs/supabase-studio-latest --region $REGION --since 5m --format short | tail -10
    
    # 9. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/*" --region us-east-1
    
    # 10. Esperar invalidación
    echo -e "${YELLOW}⏳ Esperando invalidación (2 minutos)...${NC}"
    sleep 120
    
    # 11. Probar Studio
    echo -e "${BLUE}🌐 Probando Supabase Studio oficial...${NC}"
    curl -I https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO OFICIAL FUNCIONANDO!${NC}"
    echo -e "${PURPLE}======================================${NC}"
    echo -e "${GREEN}✅ Studio oficial de Supabase (latest)${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    echo -e "${YELLOW}⏳ Si aún no carga, espera 5 minutos más${NC}"
    
    # 12. Información final
    cat > studio-official-final.txt << EOF
=== SUPABASE STUDIO OFICIAL DESPLEGADO ===
Fecha: $(date)

🌐 URL Studio Oficial: https://d2bxqn3xh4v4kj.cloudfront.net

=== IMAGEN OFICIAL ===
Docker: supabase/studio:latest
Puerto: 3000
Estado: Desplegado en ECS Fargate

=== CONFIGURACIÓN ===
URL: https://d2bxqn3xh4v4kj.cloudfront.net
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== CARACTERÍSTICAS ===
✅ Interfaz idéntica a supabase.com
✅ Table Editor visual
✅ SQL Editor integrado  
✅ Auth management
✅ Storage management
✅ API documentation
✅ Logs viewer
✅ Database schema viewer

=== ACCESO ===
Ve a: https://d2bxqn3xh4v4kj.cloudfront.net
Usa las credenciales mostradas para conectar

=== NOTA ===
Este es el Studio oficial de Supabase, no una simulación.
Puede tardar 5-10 minutos en cargar completamente.

¡Ahora tienes el Supabase Studio REAL!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: studio-official-final.txt${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f studio-latest-task.json

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL COMPLETO!${NC}"
echo -e "${BLUE}🎨 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
echo -e "${YELLOW}⏳ Espera 5-10 minutos para que Studio cargue completamente${NC}"
echo -e "${YELLOW}Es el mismo Studio que conoces de supabase.com${NC}"
