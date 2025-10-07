#!/bin/bash
# ============================================================================
# SCRIPT DE DESPLIEGUE DEL FRONTEND A AWS
# ============================================================================
# Despliega el frontend React a S3 + CloudFront para evitar problemas CORS

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

print_colored "PURPLE" "🚀 DESPLEGANDO FRONTEND A AWS"
print_colored "PURPLE" "==============================="

# Configuración
S3_BUCKET="pqnc-qa-ai-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E19ZID7TVR08JG"
AWS_REGION="us-west-2"

print_colored "BLUE" "\n1. Haciendo build de producción..."
npm run build

print_colored "GREEN" "✅ Build completado"

print_colored "BLUE" "\n2. Subiendo archivos a S3..."
aws s3 sync dist/ s3://$S3_BUCKET --region $AWS_REGION --delete --quiet

print_colored "GREEN" "✅ Archivos subidos a S3"

print_colored "BLUE" "\n3. Invalidando cache de CloudFront..."
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --region $AWS_REGION --query 'Invalidation.Id' --output text > /dev/null

print_colored "GREEN" "✅ Cache invalidado"

print_colored "BLUE" "\n4. Verificando URLs..."

# Obtener URLs
S3_URL="http://$S3_BUCKET.s3-website.us-west-2.amazonaws.com"
CLOUDFRONT_URL="https://d3m6zgat40u0u1.cloudfront.net"

print_colored "CYAN" "\n📋 URLs del Frontend:"
print_colored "CYAN" "   S3 Direct: $S3_URL"
print_colored "CYAN" "   CloudFront: $CLOUDFRONT_URL (recomendado)"

print_colored "BLUE" "\n5. Verificando conectividad..."
sleep 10

# Verificar S3
if curl -s -o /dev/null -w "%{http_code}" $S3_URL | grep -q "200"; then
    print_colored "GREEN" "✅ S3 Website funcionando"
else
    print_colored "YELLOW" "⚠️  S3 Website aún configurándose"
fi

print_colored "PURPLE" "\n🎉 DESPLIEGUE COMPLETADO"
print_colored "PURPLE" "======================="
print_colored "GREEN" "✅ Bucket S3: $S3_BUCKET"
print_colored "GREEN" "✅ CloudFront: d3m6zgat40u0u1.cloudfront.net"
print_colored "GREEN" "✅ Región: $AWS_REGION"

print_colored "CYAN" "\n📋 Próximos pasos:"
print_colored "CYAN" "   1. Esperar 5-10 minutos para CloudFront"
print_colored "CYAN" "   2. Acceder vía CloudFront (sin CORS)"
print_colored "CYAN" "   3. Configurar dominio personalizado (opcional)"

print_colored "YELLOW" "\n💡 Nota importante:"
print_colored "YELLOW" "   CloudFront puede tardar hasta 15 minutos en estar"
print_colored "YELLOW" "   completamente disponible globalmente."
