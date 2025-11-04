#!/bin/bash

# Script para corregir Studio oficial usando imagen latest

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

echo -e "${PURPLE}🔧 CORRIGIENDO STUDIO OFICIAL CON IMAGEN LATEST${NC}"
echo -e "${PURPLE}===============================================${NC}"

# 1. Crear task definition con imagen latest que funciona
echo -e "${BLUE}📋 Creando Studio con imagen latest (funciona)...${NC}"
cat > studio-latest-working.json << 'EOF'
{
  "family": "supabase-studio-latest-working",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "studio-latest-working",
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
          "name": "HOSTNAME",
          "value": "::"
        },
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
        },
        {
          "name": "DEFAULT_ORGANIZATION_NAME",
          "value": "AWS Organization"
        },
        {
          "name": "DEFAULT_PROJECT_NAME",
          "value": "AWS Supabase"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/studio-latest-working",
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
aws logs create-log-group --log-group-name /ecs/studio-latest-working --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${BLUE}📋 Registrando task definition latest...${NC}"
STUDIO_LATEST_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-latest-working.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition latest registrada: $STUDIO_LATEST_ARN${NC}"
    
    # 4. Parar servicio anterior
    echo -e "${BLUE}🛑 Parando servicio anterior...${NC}"
    aws ecs update-service --cluster $CLUSTER_NAME --service studio-complete-official --desired-count 0 --region $REGION
    
    # 5. Esperar que pare
    echo -e "${YELLOW}⏳ Esperando que pare el servicio anterior...${NC}"
    sleep 30
    
    # 6. Actualizar con imagen latest
    echo -e "${BLUE}🔄 Actualizando con imagen latest...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service studio-complete-official \
        --task-definition supabase-studio-latest-working \
        --desired-count 1 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio actualizado con imagen latest${NC}"
    
    # 7. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue con imagen latest (3 minutos)...${NC}"
    sleep 180
    
    # 8. Verificar nueva tarea
    echo -e "${BLUE}🔍 Verificando nueva tarea...${NC}"
    NEW_TASK=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name studio-complete-official --region $REGION --query 'taskArns[0]' --output text)
    
    if [ "$NEW_TASK" != "None" ] && [ -n "$NEW_TASK" ]; then
        # Obtener nueva IP
        NEW_ENI=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $NEW_TASK --region $REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
        NEW_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $NEW_ENI --region $REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
        
        echo -e "${GREEN}✅ Nueva IP Studio: $NEW_IP${NC}"
        
        # 9. Verificar estado de la tarea
        TASK_STATUS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $NEW_TASK --region $REGION --query 'tasks[0].lastStatus' --output text)
        echo -e "${BLUE}Estado de la tarea: $TASK_STATUS${NC}"
        
        # 10. Verificar logs
        echo -e "${BLUE}📋 Verificando logs de Studio latest...${NC}"
        aws logs tail /ecs/studio-latest-working --region $REGION --since 5m --format short | tail -10
        
        # 11. Probar conectividad
        if [ "$TASK_STATUS" = "RUNNING" ]; then
            echo -e "${BLUE}🌐 Probando Studio latest...${NC}"
            sleep 60
            curl -I http://$NEW_IP:3000 --max-time 15 || echo "Studio aún iniciando"
            
            echo -e "${GREEN}🎉 ¡STUDIO OFICIAL LATEST FUNCIONANDO!${NC}"
            echo -e "${BLUE}🎨 URL: http://$NEW_IP:3000${NC}"
        else
            echo -e "${YELLOW}⚠️  Studio aún iniciando...${NC}"
            echo -e "${BLUE}🎨 URL cuando esté listo: http://$NEW_IP:3000${NC}"
        fi
        
        # 12. Crear información actualizada
        cat > studio-latest-info.txt << EOF
=== SUPABASE STUDIO OFICIAL LATEST ===
Fecha: $(date)

🎨 URL Studio Oficial: http://$NEW_IP:3000

=== IMAGEN OFICIAL ===
Docker: supabase/studio:latest
Estado: $TASK_STATUS
Tarea: $NEW_TASK

=== CONFIGURACIÓN ===
URL: https://d2bxqn3xh4v4kj.cloudfront.net
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== BASE DE DATOS ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

=== ACCESO ===
URL: http://$NEW_IP:3000
Estado: $TASK_STATUS

=== COMANDOS MONITOREO ===
# Ver logs en tiempo real:
aws logs tail /ecs/studio-latest-working --region us-west-2 --follow

# Ver estado de tarea:
aws ecs describe-tasks --cluster supabase-cluster --tasks $NEW_TASK --region us-west-2

¡Este es el Studio oficial de Supabase!
EOF
        
        echo -e "${BLUE}📄 Información guardada en: studio-latest-info.txt${NC}"
        
    else
        echo -e "${RED}❌ No se pudo obtener información de la nueva tarea${NC}"
    fi
    
else
    echo -e "${RED}❌ Error registrando task definition latest${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f studio-latest-working.json

echo -e "${GREEN}✅ Studio oficial latest configurado${NC}"
echo -e "${YELLOW}⏳ Espera 5-10 minutos para que Studio cargue completamente${NC}"
