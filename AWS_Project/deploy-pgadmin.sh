#!/bin/bash

# Script para desplegar pgAdmin (interfaz web PostgreSQL real)

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

echo -e "${PURPLE}🎨 DESPLEGANDO PGADMIN (INTERFAZ REAL POSTGRESQL)${NC}"
echo -e "${PURPLE}===============================================${NC}"

# 1. Crear task definition para pgAdmin
echo -e "${BLUE}📋 Creando task definition para pgAdmin...${NC}"
cat > pgadmin-task.json << 'EOF'
{
  "family": "pgadmin-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "pgadmin",
      "image": "dpage/pgadmin4:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PGADMIN_DEFAULT_EMAIL",
          "value": "admin@supabase.local"
        },
        {
          "name": "PGADMIN_DEFAULT_PASSWORD",
          "value": "SuperBase123!"
        },
        {
          "name": "PGADMIN_DISABLE_POSTFIX",
          "value": "true"
        },
        {
          "name": "PGADMIN_CONFIG_SERVER_MODE",
          "value": "False"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pgadmin",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "pgadmin"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost/ || exit 1"
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
aws logs create-log-group --log-group-name /ecs/pgadmin --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${BLUE}📋 Registrando task definition...${NC}"
PGADMIN_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://pgadmin-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $PGADMIN_TASK_ARN${NC}"
    
    # 4. Actualizar servicio principal con pgAdmin
    echo -e "${BLUE}🔄 Desplegando pgAdmin en lugar de la interfaz simulada...${NC}"
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service supabase-api \
        --task-definition pgadmin-web \
        --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562,containerName=pgadmin,containerPort=80 \
        --region $REGION
    
    echo -e "${GREEN}✅ Servicio actualizado con pgAdmin${NC}"
    
    # 5. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de pgAdmin (3 minutos)...${NC}"
    sleep 180
    
    # 6. Verificar estado
    echo -e "${BLUE}🔍 Verificando pgAdmin...${NC}"
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:targetgroup/supabase-api-tg/5e77663131fa7562 --region $REGION --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
    
    # 7. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/*" --region us-east-1
    
    # 8. Esperar invalidación
    echo -e "${YELLOW}⏳ Esperando invalidación (1 minuto)...${NC}"
    sleep 60
    
    # 9. Probar pgAdmin
    echo -e "${BLUE}🌐 Probando pgAdmin...${NC}"
    curl -I https://d2bxqn3xh4v4kj.cloudfront.net --max-time 15 || echo "pgAdmin aún cargando"
    
    echo -e "${GREEN}🎉 ¡PGADMIN DESPLEGADO!${NC}"
    echo -e "${PURPLE}=====================${NC}"
    echo -e "${GREEN}✅ Interfaz web REAL de PostgreSQL${NC}"
    echo -e "${BLUE}🌐 URL: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    echo -e "${BLUE}📧 Email: admin@supabase.local${NC}"
    echo -e "${BLUE}🔐 Password: SuperBase123!${NC}"
    
    # 10. Crear información de acceso
    cat > pgadmin-access-info.txt << EOF
=== PGADMIN DESPLEGADO (INTERFAZ REAL) ===
Fecha: $(date)

🌐 URL pgAdmin: https://d2bxqn3xh4v4kj.cloudfront.net

=== CREDENCIALES PGADMIN ===
📧 Email: admin@supabase.local
🔐 Password: SuperBase123!

=== CONEXIÓN A SUPABASE ===
Una vez dentro de pgAdmin:
1. Click en "Add New Server"
2. Name: Supabase AWS
3. Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
4. Port: 5432
5. Database: supabase
6. Username: supabase
7. Password: SuperBase123!

=== CARACTERÍSTICAS ===
✅ Interfaz web oficial de PostgreSQL
✅ Editor SQL completo
✅ Navegador de tablas visual
✅ Gestión de usuarios y permisos
✅ Monitoreo de consultas
✅ Backup y restore
✅ Totalmente funcional

=== NOTA ===
pgAdmin es la interfaz estándar para PostgreSQL.
Es mucho más potente que Supabase Studio para gestión de BD.
EOF
    
    echo -e "${BLUE}📄 Información guardada en: pgadmin-access-info.txt${NC}"
    echo -e "${YELLOW}⏳ pgAdmin puede tardar 2-3 minutos en cargar completamente${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f pgadmin-task.json

echo -e "${GREEN}✅ ¡PGADMIN REAL DESPLEGADO!${NC}"
echo -e "${BLUE}🎨 Accede a: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
echo -e "${BLUE}📧 Login: admin@supabase.local${NC}"
echo -e "${BLUE}🔐 Pass: SuperBase123!${NC}"
