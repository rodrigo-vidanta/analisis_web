#!/bin/bash

# Script para corregir Kong y desplegar Supabase funcional

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

echo -e "${PURPLE}🔧 CORRIGIENDO KONG Y SUPABASE${NC}"
echo -e "${PURPLE}==============================${NC}"

# 1. Crear task definition corregida para Kong con imagen válida
echo -e "${BLUE}🌐 Creando task definition corregida para Kong...${NC}"
cat > kong-fixed-task.json << 'EOF'
{
  "family": "supabase-kong-fixed",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "kong",
      "image": "kong:2.8-alpine",
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
          "value": "request-transformer,cors,key-auth,acl"
        },
        {
          "name": "KONG_LOG_LEVEL",
          "value": "info"
        }
      ],
      "command": [
        "/bin/sh",
        "-c",
        "echo '_format_version: \"1.1\"\\nservices:\\n- name: api\\n  url: http://host.docker.internal:3000\\n  routes:\\n  - name: rest\\n    paths:\\n    - /rest/v1\\n    strip_path: true\\n- name: auth\\n  url: http://host.docker.internal:9999\\n  routes:\\n  - name: auth\\n    paths:\\n    - /auth/v1\\n    strip_path: true' > /tmp/kong.yml && kong start --vv"
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-kong-fixed",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "kong"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:8000/ || exit 1"
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
aws logs create-log-group --log-group-name /ecs/supabase-kong-fixed --region $REGION 2>/dev/null || true

# 3. Registrar nueva task definition
echo -e "${BLUE}📋 Registrando task definition corregida...${NC}"
KONG_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://kong-fixed-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $KONG_TASK_ARN${NC}"
    
    # 4. Actualizar servicio API con Kong corregido
    echo -e "${BLUE}🔄 Actualizando servicio con Kong corregido...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service supabase-api \
        --task-definition supabase-kong-fixed \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=kong,containerPort=8000 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio actualizado${NC}"
    
    # 5. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Kong (2 minutos)...${NC}"
    sleep 120
    
    # 6. Verificar estado
    echo -e "${BLUE}🔍 Verificando servicios...${NC}"
    aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-api --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table
    
    # 7. Probar endpoint
    echo -e "${BLUE}🌐 Probando endpoint principal...${NC}"
    sleep 30
    if curl -I https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 | grep -q "200\|404"; then
        echo -e "${GREEN}✅ CloudFront respondiendo${NC}"
        
        echo -e "${YELLOW}Probando con Kong...${NC}"
        curl https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 || echo "Kong aún configurándose"
        
    else
        echo -e "${YELLOW}⚠️  Aún configurándose...${NC}"
    fi
    
    echo -e "${GREEN}🎉 Kong corregido y desplegado!${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    echo -e "${YELLOW}⏳ Puede tardar 5-10 minutos en estar completamente listo${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f kong-fixed-task.json

echo -e "${GREEN}✅ Corrección completada!${NC}"
