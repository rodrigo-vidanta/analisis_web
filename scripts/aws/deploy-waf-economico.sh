#!/bin/bash
##############################################################################
# DEPLOY AWS WAF - CONFIGURACIÓN ECONÓMICA
# Costo estimado: $8-12 USD/mes (vs $20-30 con todas las reglas)
##############################################################################

set -e

REGION="us-east-1"  # WAF para CloudFront debe estar en us-east-1
WEB_ACL_NAME="pqnc-waf-economico"

echo "🛡️ Desplegando AWS WAF - Configuración Económica"
echo "Costo estimado: ~$8-12 USD/mes"
echo ""

# ============================================
# 1. CREAR WEB ACL CON REGLAS MÍNIMAS
# ============================================

cat > /tmp/waf-economico.json << 'EOF'
{
  "Name": "pqnc-waf-economico",
  "Scope": "CLOUDFRONT",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "RateLimitPerIP",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {
          "CustomResponse": {
            "ResponseCode": 429
          }
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": false,
    "MetricName": "pqnc-waf-economico"
  }
}
EOF

echo "📝 Creando Web ACL económico (solo rate limiting)..."

WEB_ACL_ARN=$(aws wafv2 create-web-acl \
  --cli-input-json file:///tmp/waf-economico.json \
  --region $REGION \
  --query 'Summary.ARN' \
  --output text 2>/dev/null)

if [ -z "$WEB_ACL_ARN" ]; then
  echo "⚠️  WAF ya existe, obteniendo ARN..."
  WEB_ACL_ARN=$(aws wafv2 list-web-acls \
    --scope CLOUDFRONT \
    --region $REGION \
    --query "WebACLs[?Name=='$WEB_ACL_NAME'].ARN" \
    --output text)
fi

echo "✅ Web ACL creado: $WEB_ACL_ARN"
echo ""

# ============================================
# 2. OBTENER CLOUDFRONT DISTRIBUTION
# ============================================

echo "📝 Buscando CloudFront distribution..."

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, 'ai.vidavacations.com')]].Id" \
  --output text)

if [ -z "$DIST_ID" ]; then
  echo "❌ No se encontró CloudFront distribution"
  echo "Verifica que el dominio esté configurado en CloudFront"
  exit 1
fi

echo "✅ Distribution ID: $DIST_ID"
echo ""

# ============================================
# 3. ASOCIAR WAF (CON CUIDADO - YA HAY IP RESTRICTION)
# ============================================

echo "⚠️  PRECAUCIÓN: Tu distribution ya tiene IP restriction"
echo "El WAF se agregará ADEMÁS de las restricciones existentes"
echo ""
echo "¿Continuar? (y/n)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "❌ Cancelado por usuario"
  exit 0
fi

# Backup de configuración actual
aws cloudfront get-distribution-config \
  --id $DIST_ID \
  --output json > /tmp/cloudfront-backup-$(date +%Y%m%d-%H%M%S).json

echo "✅ Backup creado en /tmp/"

# Obtener configuración
aws cloudfront get-distribution-config \
  --id $DIST_ID \
  --output json > /tmp/dist-config.json

ETAG=$(jq -r '.ETag' /tmp/dist-config.json)

# Agregar WAF ARN
jq ".DistributionConfig.WebACLId = \"$WEB_ACL_ARN\"" /tmp/dist-config.json | \
  jq '.DistributionConfig' > /tmp/dist-updated.json

# Aplicar
echo "📝 Asociando WAF a CloudFront..."

aws cloudfront update-distribution \
  --id $DIST_ID \
  --if-match $ETAG \
  --distribution-config file:///tmp/dist-updated.json \
  --output json > /dev/null

echo ""
echo "✅ WAF ASOCIADO"
echo ""
echo "════════════════════════════════════════════════"
echo "CONFIGURACIÓN APLICADA:"
echo "════════════════════════════════════════════════"
echo "✅ Rate Limiting: 2,000 requests/5min por IP"
echo "✅ Bloqueo automático después del límite"
echo "✅ Métricas en CloudWatch habilitadas"
echo ""
echo "COSTO MENSUAL ESTIMADO:"
echo "├─ WAF base: $5 USD/mes"
echo "├─ Requests: ~$1-2 USD/mes"
echo "└─ Total: ~$6-7 USD/mes"
echo ""
echo "PROPAGACIÓN: 5-15 minutos"
echo ""
echo "VERIFICAR:"
echo "AWS Console → WAF → Web ACLs → $WEB_ACL_NAME"
echo ""
echo "TEST:"
echo "for i in {1..2500}; do"
echo "  curl -s -o /dev/null https://ai.vidavacations.com/"
echo "done"
echo "# Debe empezar a bloquear después de ~2000"
echo ""
