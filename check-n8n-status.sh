#!/bin/bash
# ============================================================================
# VERIFICACIÓN RÁPIDA DEL ESTADO DE N8N EN AWS
# ============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_colored() {
    local color=$1
    local message=$2
    echo -e "${!color}${message}${NC}"
}

AWS_REGION="us-west-2"
CLUSTER_NAME="n8n-production"
SERVICE_NAME="n8n-service"

print_colored "BLUE" "🔍 VERIFICANDO ESTADO N8N EN AWS"
print_colored "BLUE" "================================"

# Verificar credenciales
print_colored "CYAN" "\n1. Verificando credenciales AWS..."
if aws sts get-caller-identity --region $AWS_REGION >/dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_colored "GREEN" "✅ Credenciales válidas - Account: $ACCOUNT_ID"
else
    print_colored "RED" "❌ Credenciales AWS inválidas"
    exit 1
fi

# Verificar ECS Cluster
print_colored "CYAN" "\n2. Verificando ECS Cluster..."
if aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION >/dev/null 2>&1; then
    CLUSTER_STATUS=$(aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text)
    print_colored "GREEN" "✅ Cluster existe: $CLUSTER_NAME ($CLUSTER_STATUS)"
else
    print_colored "RED" "❌ Cluster no existe: $CLUSTER_NAME"
    print_colored "YELLOW" "💡 Ejecuta: ./deploy-n8n-aws.sh"
fi

# Verificar servicio ECS
print_colored "CYAN" "\n3. Verificando servicio ECS..."
if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION >/dev/null 2>&1; then
    SERVICE_STATUS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text)
    RUNNING_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].runningCount' --output text)
    DESIRED_COUNT=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].desiredCount' --output text)
    
    print_colored "GREEN" "✅ Servicio existe: $SERVICE_NAME ($SERVICE_STATUS)"
    print_colored "CYAN" "📊 Tareas: $RUNNING_COUNT/$DESIRED_COUNT ejecutándose"
    
    if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" -gt 0 ]; then
        print_colored "GREEN" "🎉 n8n está funcionando correctamente!"
    else
        print_colored "YELLOW" "⚠️  Servicio creado pero tareas no están ejecutándose"
    fi
else
    print_colored "RED" "❌ Servicio no existe: $SERVICE_NAME"
fi

# Verificar RDS
print_colored "CYAN" "\n4. Verificando RDS PostgreSQL..."
if aws rds describe-db-instances --db-instance-identifier n8n-postgres --region $AWS_REGION >/dev/null 2>&1; then
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier n8n-postgres --region $AWS_REGION --query 'DBInstances[0].DBInstanceStatus' --output text)
    RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier n8n-postgres --region $AWS_REGION --query 'DBInstances[0].Endpoint.Address' --output text)
    print_colored "GREEN" "✅ RDS disponible: $RDS_STATUS"
    print_colored "CYAN" "🔗 Endpoint: $RDS_ENDPOINT"
else
    print_colored "RED" "❌ RDS no encontrado: n8n-postgres"
fi

# Verificar ElastiCache Redis
print_colored "CYAN" "\n5. Verificando ElastiCache Redis..."
if aws elasticache describe-cache-clusters --cache-cluster-id n8n-redis --region $AWS_REGION >/dev/null 2>&1; then
    REDIS_STATUS=$(aws elasticache describe-cache-clusters --cache-cluster-id n8n-redis --region $AWS_REGION --query 'CacheClusters[0].CacheClusterStatus' --output text)
    print_colored "GREEN" "✅ Redis disponible: $REDIS_STATUS"
else
    print_colored "RED" "❌ Redis no encontrado: n8n-redis"
fi

# Verificar logs
print_colored "CYAN" "\n6. Verificando logs..."
if aws logs describe-log-groups --log-group-name-prefix /ecs/$CLUSTER_NAME --region $AWS_REGION >/dev/null 2>&1; then
    print_colored "GREEN" "✅ Log group existe: /ecs/$CLUSTER_NAME"
    print_colored "CYAN" "💡 Ver logs: aws logs tail /ecs/$CLUSTER_NAME --follow --region $AWS_REGION"
else
    print_colored "YELLOW" "⚠️  Log group no encontrado (se creará automáticamente)"
fi

print_colored "BLUE" "\n📋 RESUMEN DEL DIAGNÓSTICO"
print_colored "BLUE" "=========================="
print_colored "CYAN" "Para desplegar n8n completamente, ejecuta:"
print_colored "GREEN" "   ./deploy-n8n-aws.sh"
print_colored "CYAN" "\nPara monitorear en tiempo real:"
print_colored "GREEN" "   aws logs tail /ecs/$CLUSTER_NAME --follow --region $AWS_REGION"
print_colored "CYAN" "\nPara verificar health check:"
print_colored "GREEN" "   curl -f https://ai.vidanta.com:5678/healthz"
