#!/bin/bash
# ============================================================================
# SCRIPT DE DESPLIEGUE N8N EN AWS
# ============================================================================
# Basado en la documentación del proyecto AWS_Project
# Región optimizada: us-west-2 (Oregon) para latencia <50ms con VAPI

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_colored() {
    local color=$1
    local message=$2
    echo -e "${!color}${message}${NC}"
}

print_colored "PURPLE" "🚀 INICIANDO DESPLIEGUE N8N EN AWS"
print_colored "PURPLE" "====================================="

# Verificar credenciales AWS
print_colored "BLUE" "\n1. Verificando credenciales AWS..."
if ! aws sts get-caller-identity --region us-west-2 >/dev/null 2>&1; then
    print_colored "RED" "❌ Error: Credenciales AWS no válidas"
    print_colored "YELLOW" "💡 Ejecuta: aws configure"
    exit 1
fi
print_colored "GREEN" "✅ Credenciales AWS válidas"

# Configurar variables
AWS_REGION="us-west-2"
CLUSTER_NAME="n8n-production"
SERVICE_NAME="n8n-service"
TASK_DEFINITION="n8n-production"
VPC_CIDR="10.0.0.0/16"

print_colored "CYAN" "\n📋 Configuración:"
print_colored "CYAN" "   Región: $AWS_REGION"
print_colored "CYAN" "   Cluster: $CLUSTER_NAME"
print_colored "CYAN" "   Servicio: $SERVICE_NAME"

# Paso 1: Crear VPC si no existe
print_colored "BLUE" "\n2. Configurando VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=cidr-block,Values=$VPC_CIDR" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION 2>/dev/null || echo "None")

if [ "$VPC_ID" = "None" ] || [ "$VPC_ID" = "null" ]; then
    print_colored "YELLOW" "⚠️  Creando VPC..."
    VPC_ID=$(aws ec2 create-vpc --cidr-block $VPC_CIDR --region $AWS_REGION --query 'Vpc.VpcId' --output text)
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION
    print_colored "GREEN" "✅ VPC creada: $VPC_ID"
else
    print_colored "GREEN" "✅ VPC existente: $VPC_ID"
fi

# Paso 2: Crear subnets
print_colored "BLUE" "\n3. Configurando subnets..."

# Subnet pública
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a --region $AWS_REGION --query 'Subnet.SubnetId' --output text 2>/dev/null || echo "exists")

# Subnet privada
PRIVATE_SUBNET_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 --availability-zone ${AWS_REGION}a --region $AWS_REGION --query 'Subnet.SubnetId' --output text 2>/dev/null || echo "exists")

print_colored "GREEN" "✅ Subnets configuradas"

# Paso 3: Crear Internet Gateway
print_colored "BLUE" "\n4. Configurando Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway --region $AWS_REGION --query 'InternetGateway.InternetGatewayId' --output text 2>/dev/null || echo "exists")
if [ "$IGW_ID" != "exists" ]; then
    aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION
    print_colored "GREEN" "✅ Internet Gateway creado y adjuntado"
fi

# Paso 4: Crear ECS Cluster
print_colored "BLUE" "\n5. Creando ECS Cluster..."
if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION >/dev/null 2>&1; then
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
    print_colored "GREEN" "✅ ECS Cluster creado: $CLUSTER_NAME"
else
    print_colored "GREEN" "✅ ECS Cluster existente: $CLUSTER_NAME"
fi

# Paso 5: Crear Security Group para n8n
print_colored "BLUE" "\n6. Configurando Security Groups..."
SG_ID=$(aws ec2 create-security-group --group-name n8n-sg --description "Security group for n8n" --vpc-id $VPC_ID --region $AWS_REGION --query 'GroupId' --output text 2>/dev/null || echo "exists")

if [ "$SG_ID" != "exists" ]; then
    # Permitir tráfico desde VAPI
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 5678 --cidr 44.229.228.186/32 --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 5678 --cidr 44.238.177.138/32 --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION
    print_colored "GREEN" "✅ Security Group creado con reglas VAPI"
fi

# Paso 6: Crear IAM Role para ECS
print_colored "BLUE" "\n7. Configurando IAM Roles..."
ROLE_NAME="ecsTaskExecutionRole"

# Verificar si el rol existe
if ! aws iam get-role --role-name $ROLE_NAME >/dev/null 2>&1; then
    print_colored "YELLOW" "⚠️  Creando IAM Role..."
    
    # Crear rol
    aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'
    
    # Adjuntar políticas necesarias
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
    
    print_colored "GREEN" "✅ IAM Role creado"
else
    print_colored "GREEN" "✅ IAM Role existente"
fi

# Paso 7: Registrar Task Definition
print_colored "BLUE" "\n8. Registrando Task Definition..."

# Obtener Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Crear Task Definition JSON
cat > n8n-task-def.json << EOF
{
  "family": "$TASK_DEFINITION",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME",
  "taskRoleArn": "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME",
  "containerDefinitions": [
    {
      "name": "n8n",
      "image": "n8nio/n8n:latest",
      "portMappings": [
        {
          "containerPort": 5678,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "DB_TYPE",
          "value": "postgresdb"
        },
        {
          "name": "DB_POSTGRESDB_HOST",
          "value": "n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com"
        },
        {
          "name": "DB_POSTGRESDB_DATABASE",
          "value": "postgres"
        },
        {
          "name": "DB_POSTGRESDB_USER",
          "value": "n8nuser"
        },
        {
          "name": "DB_POSTGRESDB_PASSWORD",
          "value": "N8n_Secure_2024!"
        },
        {
          "name": "DB_POSTGRESDB_PORT",
          "value": "5432"
        },
        {
          "name": "N8N_HOST",
          "value": "ai.vidanta.com"
        },
        {
          "name": "N8N_PORT",
          "value": "5678"
        },
        {
          "name": "WEBHOOK_URL",
          "value": "https://ai.vidanta.com"
        },
        {
          "name": "AWS_REGION",
          "value": "$AWS_REGION"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/$CLUSTER_NAME",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:5678/healthz || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file://n8n-task-def.json --region $AWS_REGION
print_colored "GREEN" "✅ Task Definition registrada"

# Paso 8: Crear servicio ECS
print_colored "BLUE" "\n9. Creando servicio ECS..."

# Obtener subnet IDs
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION)

aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_DEFINITION \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --region $AWS_REGION

print_colored "GREEN" "✅ Servicio ECS creado"

# Paso 9: Verificar estado
print_colored "BLUE" "\n10. Verificando estado del despliegue..."
sleep 30

SERVICE_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text)
RUNNING_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].runningCount' --output text)

print_colored "CYAN" "📊 Estado del servicio: $SERVICE_STATUS"
print_colored "CYAN" "📊 Tareas ejecutándose: $RUNNING_COUNT"

if [ "$RUNNING_COUNT" -gt 0 ]; then
    print_colored "GREEN" "✅ n8n desplegado exitosamente!"
    print_colored "GREEN" "🌐 Acceso: https://ai.vidanta.com:5678"
else
    print_colored "YELLOW" "⚠️  Servicio creado, esperando que las tareas inicien..."
    print_colored "CYAN" "💡 Verifica logs en CloudWatch: /ecs/$CLUSTER_NAME"
fi

# Limpiar archivos temporales
rm -f n8n-task-def.json

print_colored "PURPLE" "\n🎉 DESPLIEGUE COMPLETADO"
print_colored "PURPLE" "======================="
print_colored "GREEN" "✅ ECS Cluster: $CLUSTER_NAME"
print_colored "GREEN" "✅ Servicio: $SERVICE_NAME"
print_colored "GREEN" "✅ Región: $AWS_REGION"
print_colored "GREEN" "✅ VPC: $VPC_ID"
print_colored "CYAN" "\n📋 Próximos pasos:"
print_colored "CYAN" "   1. Verificar conectividad a RDS"
print_colored "CYAN" "   2. Configurar Load Balancer"
print_colored "CYAN" "   3. Configurar dominio ai.vidanta.com"
print_colored "CYAN" "   4. Verificar health checks"
