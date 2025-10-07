#!/bin/bash
# ============================================================================
# SCRIPT DE ACTUALIZACIÓN DEL FRONTEND EN AWS
# ============================================================================
# Actualiza el frontend desplegado en AWS con los últimos cambios

set -e

# Configuración
S3_BUCKET="pqnc-qa-ai-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E19ZID7TVR08JG"
AWS_REGION="us-west-2"

echo "🔄 Actualizando frontend en AWS..."

# Build
echo "📦 Haciendo build..."
npm run build

# Upload
echo "⬆️ Subiendo archivos..."
aws s3 sync dist/ s3://$S3_BUCKET --region $AWS_REGION --delete --quiet

# Invalidate cache
echo "🗑️ Invalidando cache..."
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --region $AWS_REGION --query 'Invalidation.Id' --output text > /dev/null

echo "✅ Frontend actualizado exitosamente"
echo "🌐 URLs disponibles:"
echo "   S3: http://$S3_BUCKET.s3-website.us-west-2.amazonaws.com"
echo "   CloudFront: https://d3m6zgat40u0u1.cloudfront.net"
echo ""
echo "💡 CloudFront puede tardar 5-10 minutos en reflejar cambios"
