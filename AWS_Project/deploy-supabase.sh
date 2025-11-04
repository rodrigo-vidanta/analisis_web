#!/bin/bash

# Supabase on AWS Deployment Script
# Este script despliega Supabase en la VPC existente donde está N8N

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
STACK_NAME="supabase-production"
TEMPLATE_FILE="supabase-cloudformation-template.yaml"
REGION="us-west-2"
VPC_ID="vpc-05eb3d8651aff5257"
PUBLIC_SUBNETS="subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2"
PRIVATE_SUBNETS="subnet-0a6923caf8d8074b1,subnet-0253cc70d618537c4"
DATABASE_SUBNETS="subnet-05caa36c0d56f6e13,subnet-0a8537f7b2e058dd9"

echo -e "${BLUE}🚀 Iniciando despliegue de Supabase en AWS${NC}"
echo -e "${YELLOW}Stack Name: ${STACK_NAME}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"
echo -e "${YELLOW}VPC: ${VPC_ID}${NC}"

# Verificar que AWS CLI esté configurado
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Error: AWS CLI no está configurado o no tienes credenciales válidas${NC}"
    echo -e "${YELLOW}Por favor ejecuta: aws configure${NC}"
    exit 1
fi

# Verificar que el template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}❌ Error: No se encuentra el archivo $TEMPLATE_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configurado correctamente${NC}"
echo -e "${GREEN}✅ Template CloudFormation encontrado${NC}"

# Validar el template
echo -e "${BLUE}🔍 Validando template CloudFormation...${NC}"
if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE --region $REGION &> /dev/null; then
    echo -e "${GREEN}✅ Template válido${NC}"
else
    echo -e "${RED}❌ Error: Template CloudFormation inválido${NC}"
    exit 1
fi

# Verificar si el stack ya existe
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
    echo -e "${YELLOW}⚠️  Stack $STACK_NAME ya existe. Actualizando...${NC}"
    OPERATION="update-stack"
else
    echo -e "${BLUE}📦 Creando nuevo stack $STACK_NAME...${NC}"
    OPERATION="create-stack"
fi

# Desplegar el stack
echo -e "${BLUE}🚀 Desplegando Supabase...${NC}"

if [ "$OPERATION" = "create-stack" ]; then
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters \
            ParameterKey=VpcId,ParameterValue=$VPC_ID \
            ParameterKey=PublicSubnetIds,ParameterValue=\"$PUBLIC_SUBNETS\" \
            ParameterKey=PrivateSubnetIds,ParameterValue=\"$PRIVATE_SUBNETS\" \
            ParameterKey=DatabaseSubnetIds,ParameterValue=\"$DATABASE_SUBNETS\" \
            ParameterKey=TaskSize,ParameterValue=medium \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION \
        --tags \
            Key=Project,Value=supabase-deployment \
            Key=Environment,Value=production \
            Key=ManagedBy,Value=cloudformation
else
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters \
            ParameterKey=VpcId,ParameterValue=$VPC_ID \
            ParameterKey=PublicSubnetIds,ParameterValue=\"$PUBLIC_SUBNETS\" \
            ParameterKey=PrivateSubnetIds,ParameterValue=\"$PRIVATE_SUBNETS\" \
            ParameterKey=DatabaseSubnetIds,ParameterValue=\"$DATABASE_SUBNETS\" \
            ParameterKey=TaskSize,ParameterValue=medium \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION \
        --tags \
            Key=Project,Value=supabase-deployment \
            Key=Environment,Value=production \
            Key=ManagedBy,Value=cloudformation
fi

# Esperar a que el stack se complete
echo -e "${YELLOW}⏳ Esperando a que el despliegue se complete...${NC}"
echo -e "${YELLOW}Esto puede tomar entre 10-15 minutos...${NC}"

if [ "$OPERATION" = "create-stack" ]; then
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
    WAIT_RESULT=$?
else
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
    WAIT_RESULT=$?
fi

if [ $WAIT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Stack desplegado exitosamente!${NC}"
    
    # Obtener outputs del stack
    echo -e "${BLUE}📋 Información del despliegue:${NC}"
    
    SUPABASE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SupabaseAPIEndpoint`].OutputValue' \
        --output text)
    
    DATABASE_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SupabaseDatabaseEndpoint`].OutputValue' \
        --output text)
    
    STORAGE_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SupabaseStorageBucket`].OutputValue' \
        --output text)
    
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`SupabaseClusterName`].OutputValue' \
        --output text)
    
    echo -e "${GREEN}🌐 Supabase API URL: ${SUPABASE_URL}${NC}"
    echo -e "${GREEN}🗄️  Database Endpoint: ${DATABASE_ENDPOINT}${NC}"
    echo -e "${GREEN}🪣 Storage Bucket: ${STORAGE_BUCKET}${NC}"
    echo -e "${GREEN}🐳 ECS Cluster: ${CLUSTER_NAME}${NC}"
    
    # Guardar la información en un archivo
    cat > supabase-deployment-info.txt << EOF
=== SUPABASE DEPLOYMENT INFO ===
Fecha de despliegue: $(date)
Stack Name: $STACK_NAME
Region: $REGION

=== ENDPOINTS ===
Supabase API URL: $SUPABASE_URL
Database Endpoint: $DATABASE_ENDPOINT
Storage Bucket: $STORAGE_BUCKET
ECS Cluster: $CLUSTER_NAME

=== CONFIGURACIÓN PARA N8N ===
Para conectar N8N con Supabase, usa:
- URL: $SUPABASE_URL
- Database: postgresql://$DATABASE_ENDPOINT:5432/supabase

=== PRÓXIMOS PASOS ===
1. Configurar Supabase Studio
2. Ejecutar migraciones de base de datos
3. Configurar autenticación
4. Probar conectividad con N8N
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-deployment-info.txt${NC}"
    
    # Verificar estado de los servicios
    echo -e "${BLUE}🔍 Verificando estado de los servicios...${NC}"
    
    # Listar servicios ECS
    aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output table
    
    echo -e "${GREEN}🎉 ¡Supabase desplegado exitosamente en tu VPC!${NC}"
    echo -e "${YELLOW}📝 Revisa el archivo supabase-deployment-info.txt para más detalles${NC}"
    
else
    echo -e "${RED}❌ Error durante el despliegue del stack${NC}"
    
    # Mostrar eventos del stack para debugging
    echo -e "${YELLOW}📋 Últimos eventos del stack:${NC}"
    aws cloudformation describe-stack-events \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'StackEvents[0:10].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
        --output table
    
    exit 1
fi

echo -e "${BLUE}🔧 Para monitorear el despliegue:${NC}"
echo -e "${YELLOW}aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION${NC}"
echo -e "${YELLOW}aws ecs list-services --cluster $CLUSTER_NAME --region $REGION${NC}"
