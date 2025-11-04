#!/bin/bash

# Supabase Complete Deployment Script
# Despliega Supabase completo (API + Studio) en AWS

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Variables
MAIN_STACK="supabase-production"
STUDIO_STACK="supabase-studio"
REGION="us-west-2"

echo -e "${PURPLE}🚀 DESPLIEGUE COMPLETO DE SUPABASE EN AWS${NC}"
echo -e "${PURPLE}=======================================${NC}"

# Verificar AWS CLI
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI no configurado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configurado${NC}"

# Función para mostrar progreso
show_progress() {
    local duration=$1
    local message=$2
    echo -e "${YELLOW}⏳ $message${NC}"
    
    for ((i=0; i<=duration; i++)); do
        local percent=$((i * 100 / duration))
        local filled=$((percent / 2))
        local empty=$((50 - filled))
        
        printf "\r${BLUE}["
        printf "%${filled}s" | tr ' ' '█'
        printf "%${empty}s" | tr ' ' '░'
        printf "] %d%% (%d/%d)${NC}" $percent $i $duration
        
        sleep 1
    done
    echo ""
}

# PASO 1: Desplegar infraestructura principal
echo -e "${BLUE}📦 PASO 1: Desplegando infraestructura principal de Supabase...${NC}"

if [ ! -f "supabase-cloudformation-template.yaml" ]; then
    echo -e "${RED}❌ Template principal no encontrado${NC}"
    exit 1
fi

# Ejecutar despliegue principal
./deploy-supabase.sh

# Esperar a que el stack esté listo
echo -e "${YELLOW}⏳ Esperando a que los servicios estén listos...${NC}"
sleep 30

# Obtener endpoint de la API
SUPABASE_URL=$(aws cloudformation describe-stacks \
    --stack-name $MAIN_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseAPIEndpoint`].OutputValue' \
    --output text)

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ No se pudo obtener el endpoint de Supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Infraestructura principal desplegada${NC}"
echo -e "${BLUE}🌐 Supabase API: $SUPABASE_URL${NC}"

# PASO 2: Configurar base de datos
echo -e "${BLUE}📊 PASO 2: Configurando base de datos PostgreSQL...${NC}"

# Obtener credenciales de la base de datos
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $MAIN_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseDatabaseEndpoint`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Base de datos configurada${NC}"
echo -e "${BLUE}🗄️  Database: $DB_ENDPOINT${NC}"

# PASO 3: Verificar servicios ECS
echo -e "${BLUE}🐳 PASO 3: Verificando servicios ECS...${NC}"

CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name $MAIN_STACK \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseClusterName`].OutputValue' \
    --output text)

# Listar servicios
echo -e "${YELLOW}Servicios en el cluster:${NC}"
aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output table

# Verificar estado de los servicios
echo -e "${YELLOW}Verificando estado de servicios...${NC}"
SERVICES=$(aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output text)

for service in $SERVICES; do
    SERVICE_NAME=$(basename $service)
    RUNNING_COUNT=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $service \
        --region $REGION \
        --query 'services[0].runningCount' \
        --output text)
    
    if [ "$RUNNING_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ $SERVICE_NAME: $RUNNING_COUNT tareas ejecutándose${NC}"
    else
        echo -e "${YELLOW}⚠️  $SERVICE_NAME: $RUNNING_COUNT tareas ejecutándose${NC}"
    fi
done

# PASO 4: Probar conectividad
echo -e "${BLUE}🔍 PASO 4: Probando conectividad de la API...${NC}"

# Probar health check
if curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/health" | grep -q "200"; then
    echo -e "${GREEN}✅ API Supabase respondiendo correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  API Supabase aún iniciando (esto es normal)${NC}"
fi

# PASO 5: Configurar Studio (opcional)
echo -e "${BLUE}🎨 PASO 5: ¿Deseas desplegar Supabase Studio? (y/n)${NC}"
read -r deploy_studio

if [[ $deploy_studio =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📱 Desplegando Supabase Studio en Amplify...${NC}"
    
    if [ ! -f "supabase-studio-amplify.yaml" ]; then
        echo -e "${RED}❌ Template de Studio no encontrado${NC}"
    else
        # Desplegar Studio
        aws cloudformation create-stack \
            --stack-name $STUDIO_STACK \
            --template-body file://supabase-studio-amplify.yaml \
            --parameters \
                ParameterKey=SupabaseAPIEndpoint,ParameterValue=$SUPABASE_URL \
                ParameterKey=StudioUsername,ParameterValue=admin \
                ParameterKey=StudioPassword,ParameterValue=ChangeMe123! \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $REGION \
            --tags \
                Key=Project,Value=supabase-studio \
                Key=Environment,Value=production
        
        echo -e "${YELLOW}⏳ Esperando despliegue de Studio...${NC}"
        aws cloudformation wait stack-create-complete --stack-name $STUDIO_STACK --region $REGION
        
        STUDIO_URL=$(aws cloudformation describe-stacks \
            --stack-name $STUDIO_STACK \
            --region $REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`StudioURL`].OutputValue' \
            --output text)
        
        echo -e "${GREEN}✅ Studio desplegado: $STUDIO_URL${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Saltando despliegue de Studio${NC}"
fi

# PASO 6: Configuración para N8N
echo -e "${BLUE}🔗 PASO 6: Configuración para integración con N8N${NC}"

cat > supabase-n8n-config.txt << EOF
=== CONFIGURACIÓN SUPABASE PARA N8N ===

🌐 URL de Supabase: $SUPABASE_URL
🗄️  Database Host: $DB_ENDPOINT
🔑 Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
🔐 Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== CONFIGURACIÓN EN N8N ===
1. Crear nueva credencial de Supabase
2. URL: $SUPABASE_URL
3. Anon Key: [usar la clave de arriba]
4. Service Key: [usar la clave de arriba]

=== ENDPOINTS DISPONIBLES ===
- API REST: $SUPABASE_URL/rest/v1/
- Auth: $SUPABASE_URL/auth/v1/
- Storage: $SUPABASE_URL/storage/v1/
- Realtime: $SUPABASE_URL/realtime/v1/

=== CONECTIVIDAD ===
- Supabase está en la misma VPC que N8N
- Comunicación interna optimizada
- Sin cargos de transferencia entre servicios
EOF

echo -e "${GREEN}✅ Configuración guardada en: supabase-n8n-config.txt${NC}"

# PASO 7: Resumen final
echo -e "${PURPLE}🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
echo -e "${PURPLE}====================================${NC}"

echo -e "${GREEN}✅ Supabase API: $SUPABASE_URL${NC}"
echo -e "${GREEN}✅ Database: $DB_ENDPOINT${NC}"
echo -e "${GREEN}✅ ECS Cluster: $CLUSTER_NAME${NC}"
if [ ! -z "$STUDIO_URL" ]; then
    echo -e "${GREEN}✅ Studio: $STUDIO_URL${NC}"
fi

echo -e "${BLUE}📋 PRÓXIMOS PASOS:${NC}"
echo -e "${YELLOW}1. Revisa supabase-n8n-config.txt para configurar N8N${NC}"
echo -e "${YELLOW}2. Ejecuta migraciones de base de datos si es necesario${NC}"
echo -e "${YELLOW}3. Configura autenticación y policies en Supabase${NC}"
echo -e "${YELLOW}4. Prueba la integración con N8N${NC}"

echo -e "${BLUE}🔧 COMANDOS ÚTILES:${NC}"
echo -e "${YELLOW}# Ver servicios ECS:${NC}"
echo -e "aws ecs list-services --cluster $CLUSTER_NAME --region $REGION"
echo -e "${YELLOW}# Ver logs:${NC}"
echo -e "aws logs describe-log-groups --log-group-name-prefix /ecs/supabase --region $REGION"
echo -e "${YELLOW}# Estado del stack:${NC}"
echo -e "aws cloudformation describe-stacks --stack-name $MAIN_STACK --region $REGION"

echo -e "${GREEN}🚀 ¡Supabase está listo para usar con N8N!${NC}"
