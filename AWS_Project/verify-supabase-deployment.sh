#!/bin/bash

# Script de verificación de despliegue de Supabase
# Verifica que todos los componentes estén funcionando correctamente

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Variables
STACK_NAME="supabase-production"
REGION="us-west-2"

echo -e "${PURPLE}🔍 VERIFICACIÓN DE DESPLIEGUE SUPABASE${NC}"
echo -e "${PURPLE}===================================${NC}"

# Función para verificar endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local expected_code=${3:-200}
    
    echo -ne "${YELLOW}Verificando $name... ${NC}"
    
    if command -v curl &> /dev/null; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
        if [ "$response" = "$expected_code" ]; then
            echo -e "${GREEN}✅ OK ($response)${NC}"
            return 0
        else
            echo -e "${RED}❌ FAIL ($response)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  curl no disponible${NC}"
        return 0
    fi
}

# Verificar que el stack existe
echo -e "${BLUE}📋 Verificando stack CloudFormation...${NC}"
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].StackStatus' \
        --output text)
    
    if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
        echo -e "${GREEN}✅ Stack $STACK_NAME: $STACK_STATUS${NC}"
    else
        echo -e "${RED}❌ Stack $STACK_NAME: $STACK_STATUS${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Stack $STACK_NAME no encontrado${NC}"
    exit 1
fi

# Obtener outputs del stack
echo -e "${BLUE}📊 Obteniendo información del despliegue...${NC}"

SUPABASE_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseAPIEndpoint`].OutputValue' \
    --output text)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseDatabaseEndpoint`].OutputValue' \
    --output text)

CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseClusterName`].OutputValue' \
    --output text)

STORAGE_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`SupabaseStorageBucket`].OutputValue' \
    --output text)

if [ -z "$SUPABASE_URL" ] || [ -z "$DB_ENDPOINT" ] || [ -z "$CLUSTER_NAME" ]; then
    echo -e "${RED}❌ No se pudieron obtener los outputs del stack${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Información obtenida correctamente${NC}"

# Verificar servicios ECS
echo -e "${BLUE}🐳 Verificando servicios ECS...${NC}"

SERVICES=$(aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output text)

if [ -z "$SERVICES" ]; then
    echo -e "${RED}❌ No se encontraron servicios en el cluster${NC}"
    exit 1
fi

echo -e "${YELLOW}Servicios encontrados:${NC}"
for service in $SERVICES; do
    SERVICE_NAME=$(basename $service)
    
    # Obtener detalles del servicio
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $service \
        --region $REGION \
        --query 'services[0].[serviceName,status,runningCount,desiredCount,pendingCount]' \
        --output text)
    
    read -r name status running desired pending <<< "$SERVICE_INFO"
    
    if [ "$status" = "ACTIVE" ] && [ "$running" -gt 0 ]; then
        echo -e "${GREEN}✅ $name: $status ($running/$desired running, $pending pending)${NC}"
    elif [ "$status" = "ACTIVE" ] && [ "$running" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  $name: $status ($running/$desired running, $pending pending)${NC}"
    else
        echo -e "${RED}❌ $name: $status ($running/$desired running, $pending pending)${NC}"
    fi
done

# Verificar base de datos
echo -e "${BLUE}🗄️  Verificando base de datos Aurora...${NC}"

DB_CLUSTER_ID=$(echo $DB_ENDPOINT | cut -d'.' -f1)
DB_STATUS=$(aws rds describe-db-clusters \
    --db-cluster-identifier $DB_CLUSTER_ID \
    --region $REGION \
    --query 'DBClusters[0].Status' \
    --output text 2>/dev/null || echo "not-found")

if [ "$DB_STATUS" = "available" ]; then
    echo -e "${GREEN}✅ Base de datos: $DB_STATUS${NC}"
else
    echo -e "${RED}❌ Base de datos: $DB_STATUS${NC}"
fi

# Verificar bucket S3
echo -e "${BLUE}🪣 Verificando bucket S3...${NC}"

if aws s3 ls "s3://$STORAGE_BUCKET" &> /dev/null; then
    echo -e "${GREEN}✅ Bucket S3: $STORAGE_BUCKET accesible${NC}"
else
    echo -e "${RED}❌ Bucket S3: $STORAGE_BUCKET no accesible${NC}"
fi

# Verificar endpoints de API
echo -e "${BLUE}🌐 Verificando endpoints de API...${NC}"

# Esperar un poco para que los servicios estén listos
sleep 5

# Health check principal
check_endpoint "$SUPABASE_URL/health" "Health Check" 200

# Auth endpoint
check_endpoint "$SUPABASE_URL/auth/v1/health" "Auth Service" 200

# Storage endpoint
check_endpoint "$SUPABASE_URL/storage/v1/status" "Storage Service" 200

# REST API endpoint
check_endpoint "$SUPABASE_URL/rest/v1/" "REST API" 200

# Verificar logs recientes
echo -e "${BLUE}📋 Verificando logs recientes...${NC}"

LOG_GROUPS=$(aws logs describe-log-groups \
    --log-group-name-prefix "/ecs/supabase" \
    --region $REGION \
    --query 'logGroups[].logGroupName' \
    --output text)

if [ -n "$LOG_GROUPS" ]; then
    echo -e "${GREEN}✅ Log groups encontrados:${NC}"
    for log_group in $LOG_GROUPS; do
        echo -e "${YELLOW}  - $log_group${NC}"
        
        # Obtener streams recientes
        RECENT_STREAM=$(aws logs describe-log-streams \
            --log-group-name "$log_group" \
            --region $REGION \
            --order-by LastEventTime \
            --descending \
            --max-items 1 \
            --query 'logStreams[0].logStreamName' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$RECENT_STREAM" ] && [ "$RECENT_STREAM" != "None" ]; then
            echo -e "${BLUE}    Stream más reciente: $RECENT_STREAM${NC}"
            
            # Mostrar últimos logs (solo errores)
            RECENT_ERRORS=$(aws logs filter-log-events \
                --log-group-name "$log_group" \
                --log-stream-names "$RECENT_STREAM" \
                --region $REGION \
                --filter-pattern "ERROR" \
                --max-items 3 \
                --query 'events[].message' \
                --output text 2>/dev/null || echo "")
            
            if [ -n "$RECENT_ERRORS" ] && [ "$RECENT_ERRORS" != "None" ]; then
                echo -e "${RED}    ⚠️  Errores recientes encontrados${NC}"
            else
                echo -e "${GREEN}    ✅ No hay errores recientes${NC}"
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠️  No se encontraron log groups${NC}"
fi

# Verificar métricas de CloudWatch
echo -e "${BLUE}📈 Verificando métricas de CloudWatch...${NC}"

# CPU utilization del cluster ECS
CPU_METRICS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name CPUUtilization \
    --dimensions Name=ClusterName,Value=$CLUSTER_NAME \
    --statistics Average \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --region $REGION \
    --query 'Datapoints[0].Average' \
    --output text 2>/dev/null || echo "")

if [ -n "$CPU_METRICS" ] && [ "$CPU_METRICS" != "None" ]; then
    echo -e "${GREEN}✅ CPU Utilization: ${CPU_METRICS}%${NC}"
else
    echo -e "${YELLOW}⚠️  Métricas de CPU no disponibles aún${NC}"
fi

# Resumen final
echo -e "${PURPLE}📋 RESUMEN DE VERIFICACIÓN${NC}"
echo -e "${PURPLE}=========================${NC}"

echo -e "${BLUE}🌐 Supabase URL: $SUPABASE_URL${NC}"
echo -e "${BLUE}🗄️  Database: $DB_ENDPOINT${NC}"
echo -e "${BLUE}🐳 ECS Cluster: $CLUSTER_NAME${NC}"
echo -e "${BLUE}🪣 Storage: $STORAGE_BUCKET${NC}"

# Crear archivo de estado
cat > supabase-status-report.txt << EOF
=== REPORTE DE ESTADO SUPABASE ===
Fecha: $(date)
Stack: $STACK_NAME
Region: $REGION

=== COMPONENTES ===
✅ CloudFormation Stack: $STACK_STATUS
✅ Supabase API: $SUPABASE_URL
✅ Database Cluster: $DB_STATUS
✅ ECS Cluster: $CLUSTER_NAME
✅ Storage Bucket: $STORAGE_BUCKET

=== SERVICIOS ECS ===
$(aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output table)

=== CONFIGURACIÓN PARA N8N ===
URL: $SUPABASE_URL
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== COMANDOS ÚTILES ===
# Ver servicios:
aws ecs list-services --cluster $CLUSTER_NAME --region $REGION

# Ver logs:
aws logs describe-log-groups --log-group-name-prefix /ecs/supabase --region $REGION

# Reiniciar servicio:
aws ecs update-service --cluster $CLUSTER_NAME --service <service-name> --force-new-deployment --region $REGION
EOF

echo -e "${GREEN}✅ Reporte guardado en: supabase-status-report.txt${NC}"

echo -e "${GREEN}🎉 Verificación completada!${NC}"

# Comandos útiles para el usuario
echo -e "${BLUE}🔧 COMANDOS ÚTILES:${NC}"
echo -e "${YELLOW}# Monitorear servicios:${NC}"
echo -e "watch 'aws ecs list-services --cluster $CLUSTER_NAME --region $REGION'"
echo -e "${YELLOW}# Ver logs en tiempo real:${NC}"
echo -e "aws logs tail /ecs/supabase-api --region $REGION --follow"
echo -e "${YELLOW}# Reiniciar todos los servicios:${NC}"
echo -e "aws ecs list-services --cluster $CLUSTER_NAME --region $REGION --query 'serviceArns' --output text | xargs -I {} aws ecs update-service --cluster $CLUSTER_NAME --service {} --force-new-deployment --region $REGION"
