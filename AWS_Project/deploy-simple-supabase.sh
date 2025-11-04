#!/bin/bash

# Script para desplegar Supabase simple con Nginx

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-west-2"
CLUSTER_NAME="supabase-cluster"

echo -e "${BLUE}🚀 Desplegando Supabase Simple con Nginx${NC}"

# 1. Crear nueva task definition con nginx
cat > simple-supabase-task.json << 'EOF'
{
  "family": "simple-supabase",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "nginx",
      "image": "nginx:alpine",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/simple-supabase",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "nginx"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost/ || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
EOF

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/simple-supabase --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${YELLOW}📋 Registrando nueva task definition...${NC}"
TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file://simple-supabase-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $TASK_DEF_ARN${NC}"
    
    # 4. Actualizar servicio API para usar nginx
    echo -e "${YELLOW}🔄 Actualizando servicio API...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service supabase-api \
        --task-definition simple-supabase \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=nginx,containerPort=80 \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Servicio actualizado exitosamente${NC}"
        
        # 5. Actualizar health check del target group
        echo -e "${YELLOW}🏥 Actualizando health check...${NC}"
        aws elbv2 modify-target-group \
            --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 \
            --health-check-path "/" \
            --health-check-interval-seconds 30 \
            --health-check-timeout-seconds 5 \
            --healthy-threshold-count 2 \
            --unhealthy-threshold-count 3 \
            --region $REGION
        
        echo -e "${GREEN}✅ Health check actualizado${NC}"
        
        # 6. Esperar despliegue
        echo -e "${YELLOW}⏳ Esperando despliegue (2 minutos)...${NC}"
        sleep 120
        
        # 7. Verificar estado
        echo -e "${BLUE}🔍 Verificando estado del servicio...${NC}"
        SERVICE_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-api --region $REGION --query 'services[0].[serviceName,status,runningCount,desiredCount]' --output text)
        echo -e "${BLUE}Estado del servicio: $SERVICE_STATUS${NC}"
        
        # 8. Verificar health check
        echo -e "${BLUE}🏥 Verificando health check...${NC}"
        aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
        
        # 9. Probar conectividad
        echo -e "${BLUE}🌐 Probando conectividad...${NC}"
        if curl -I http://supabase-alb-1210454801.us-west-2.elb.amazonaws.com --max-time 10 | grep -q "200\|404"; then
            echo -e "${GREEN}✅ Load Balancer respondiendo correctamente${NC}"
            echo -e "${GREEN}🌐 URL HTTP: http://supabase-alb-1210454801.us-west-2.elb.amazonaws.com${NC}"
            echo -e "${GREEN}🔐 URL HTTPS: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
        else
            echo -e "${YELLOW}⚠️  Load Balancer aún iniciando...${NC}"
        fi
        
        echo -e "${GREEN}🎉 Supabase simple desplegado!${NC}"
        echo -e "${BLUE}Ahora tienes un servidor web básico funcionando.${NC}"
        echo -e "${BLUE}Puedes configurar los servicios de Supabase paso a paso.${NC}"
        
    else
        echo -e "${RED}❌ Error actualizando servicio${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f simple-supabase-task.json

echo -e "${GREEN}✅ Despliegue completado!${NC}"
