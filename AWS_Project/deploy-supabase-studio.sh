#!/bin/bash

# Script para desplegar Supabase Studio (interfaz web)

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

echo -e "${PURPLE}🎨 DESPLEGANDO SUPABASE STUDIO (INTERFAZ WEB)${NC}"
echo -e "${PURPLE}============================================${NC}"

# 1. Crear task definition para Supabase Studio
echo -e "${BLUE}📋 Creando task definition para Supabase Studio...${NC}"
cat > studio-task.json << 'EOF'
{
  "family": "supabase-studio",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "studio",
      "image": "supabase/studio:20231103-ce42139",
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
          "name": "POSTGRES_PASSWORD",
          "value": "SuperBase123!"
        },
        {
          "name": "STUDIO_PG_META_URL",
          "value": "http://localhost:8080"
        },
        {
          "name": "NEXT_PUBLIC_ENABLE_LOGS",
          "value": "true"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-studio",
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
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-studio --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${BLUE}📋 Registrando task definition...${NC}"
STUDIO_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $STUDIO_TASK_ARN${NC}"
    
    # 4. Crear target group para Studio
    echo -e "${BLUE}🎯 Creando target group para Studio...${NC}"
    STUDIO_TG_ARN=$(aws elbv2 create-target-group \
        --name supabase-studio-tg \
        --protocol HTTP \
        --port 3000 \
        --vpc-id vpc-05eb3d8651aff5257 \
        --target-type ip \
        --health-check-path "/" \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --region $REGION \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || aws elbv2 describe-target-groups --names supabase-studio-tg --region $REGION --query 'TargetGroups[0].TargetGroupArn' --output text)
    
    echo -e "${GREEN}✅ Target group: $STUDIO_TG_ARN${NC}"
    
    # 5. Agregar listener rule para Studio
    echo -e "${BLUE}🔗 Configurando routing para Studio...${NC}"
    aws elbv2 create-rule \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:listener/app/supabase-alb/c7c557c0189c6abb/1e0ca0d4f5d4a4ba \
        --priority 50 \
        --conditions Field=path-pattern,Values="/studio*" \
        --actions Type=forward,TargetGroupArn=$STUDIO_TG_ARN \
        --region $REGION 2>/dev/null || echo "Regla ya existe"
    
    # 6. Crear servicio Studio
    echo -e "${BLUE}🎨 Creando servicio Studio...${NC}"
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name supabase-studio \
        --task-definition supabase-studio \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
        --load-balancers targetGroupArn=$STUDIO_TG_ARN,containerName=studio,containerPort=3000 \
        --health-check-grace-period-seconds 300 \
        --region $REGION 2>/dev/null || echo "Servicio Studio ya existe"
    
    # 7. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Studio (3 minutos)...${NC}"
    sleep 180
    
    # 8. Verificar estado
    echo -e "${BLUE}🔍 Verificando Studio...${NC}"
    aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-studio --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table 2>/dev/null || echo "Studio aún desplegándose"
    
    # 9. Probar acceso a Studio
    echo -e "${BLUE}🎨 Probando acceso a Studio...${NC}"
    curl -I "https://d2bxqn3xh4v4kj.cloudfront.net/studio" --max-time 15 || echo "Studio aún iniciando"
    
    # 10. Información final
    cat > supabase-studio-info.txt << EOF
=== SUPABASE STUDIO DESPLEGADO ===
Fecha: $(date)

🌐 URL Principal: https://d2bxqn3xh4v4kj.cloudfront.net
🎨 Supabase Studio: https://d2bxqn3xh4v4kj.cloudfront.net/studio

=== ACCESO A STUDIO ===
1. Ve a: https://d2bxqn3xh4v4kj.cloudfront.net/studio
2. Usa las credenciales de la base de datos para conectar
3. Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
4. User: supabase
5. Password: SuperBase123!

=== NOTA ===
Studio puede tardar 5-10 minutos en estar completamente listo.
Si no carga inmediatamente, espera unos minutos.
EOF
    
    echo -e "${GREEN}🎉 Studio desplegado!${NC}"
    echo -e "${BLUE}🎨 URL Studio: https://d2bxqn3xh4v4kj.cloudfront.net/studio${NC}"
    echo -e "${YELLOW}⏳ Studio puede tardar 5-10 minutos en estar listo${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f studio-task.json

echo -e "${GREEN}✅ Supabase Studio desplegado!${NC}"
