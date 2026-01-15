#!/bin/bash
##############################################################################
# DEPLOY AWS WAF - ENTERPRISE SECURITY
# Sistema: PQNC QA AI Platform
# Autor: Darig Samuel Rosales Robledo
# Fecha: 15 Enero 2026
##############################################################################

set -e

echo "🛡️ ============================================"
echo "   DESPLEGANDO AWS WAF - ENTERPRISE SECURITY"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
REGION="us-east-1"  # WAF para CloudFront debe estar en us-east-1
WEB_ACL_NAME="pqnc-waf-enterprise"
CLOUDFRONT_DOMAIN="ai.vidavacations.com"

echo "📋 Configuración:"
echo "   Región: $REGION"
echo "   Web ACL: $WEB_ACL_NAME"
echo "   Dominio: $CLOUDFRONT_DOMAIN"
echo ""

# ============================================
# 1. CREAR RESPONSE BODY PERSONALIZADO
# ============================================
echo "📝 Paso 1: Creando response body personalizado para rate limit..."

cat > /tmp/rate-limit-response.json << 'EOF'
{
  "ContentType": "APPLICATION_JSON",
  "Content": "{\"error\":\"Too Many Requests\",\"message\":\"Has excedido el límite de peticiones. Por favor intenta en unos minutos.\",\"retry_after\":300}"
}
EOF

aws wafv2 create-custom-response-body \
  --scope CLOUDFRONT \
  --name rate-limit-body \
  --content-type APPLICATION_JSON \
  --content '{"error":"Too Many Requests","message":"Has excedido el límite de peticiones. Por favor intenta en unos minutos.","retry_after":300}' \
  --region $REGION 2>/dev/null || echo "   ℹ️ Response body ya existe"

echo -e "${GREEN}✓${NC} Response body configurado"
echo ""

# ============================================
# 2. CREAR WEB ACL CON REGLAS ENTERPRISE
# ============================================
echo "📝 Paso 2: Creando Web ACL con reglas de seguridad..."

cat > /tmp/waf-rules.json << 'EOF'
{
  "Name": "pqnc-waf-enterprise",
  "Scope": "CLOUDFRONT",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "RateLimitGlobal",
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
            "ResponseCode": 429,
            "CustomResponseBodyKey": "rate-limit-body"
          }
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitGlobal"
      }
    },
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet",
          "ExcludedRules": []
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedCommon"
      }
    },
    {
      "Name": "AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 3,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedBadInputs"
      }
    },
    {
      "Name": "AWSManagedRulesSQLiRuleSet",
      "Priority": 4,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesSQLiRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedSQLi"
      }
    },
    {
      "Name": "BlockGeoRestricted",
      "Priority": 5,
      "Statement": {
        "NotStatement": {
          "Statement": {
            "GeoMatchStatement": {
              "CountryCodes": ["MX", "US", "CA"]
            }
          }
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "GeoBlock"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "pqnc-waf-enterprise"
  }
}
EOF

echo "   Creando Web ACL..."
WEB_ACL_ARN=$(aws wafv2 create-web-acl \
  --cli-input-json file:///tmp/waf-rules.json \
  --region $REGION \
  --query 'Summary.ARN' \
  --output text 2>/dev/null)

if [ -z "$WEB_ACL_ARN" ]; then
  echo -e "${YELLOW}⚠️${NC} Web ACL ya existe, obteniendo ARN..."
  WEB_ACL_ARN=$(aws wafv2 list-web-acls \
    --scope CLOUDFRONT \
    --region $REGION \
    --query "WebACLs[?Name=='$WEB_ACL_NAME'].ARN" \
    --output text)
fi

echo -e "${GREEN}✓${NC} Web ACL creado/encontrado:"
echo "   ARN: $WEB_ACL_ARN"
echo ""

# ============================================
# 3. ASOCIAR WAF A CLOUDFRONT
# ============================================
echo "📝 Paso 3: Asociando WAF a CloudFront..."

# Buscar Distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, '$CLOUDFRONT_DOMAIN')]].Id" \
  --output text)

if [ -z "$DIST_ID" ]; then
  echo -e "${RED}✗${NC} No se encontró CloudFront distribution para $CLOUDFRONT_DOMAIN"
  exit 1
fi

echo "   Distribution ID: $DIST_ID"

# Obtener configuración actual
aws cloudfront get-distribution-config \
  --id $DIST_ID \
  --output json > /tmp/dist-config.json

ETAG=$(jq -r '.ETag' /tmp/dist-config.json)

# Actualizar con WAF ARN
jq ".DistributionConfig.WebACLId = \"$WEB_ACL_ARN\"" /tmp/dist-config.json | \
  jq '.DistributionConfig' > /tmp/dist-config-updated.json

# Aplicar cambios
aws cloudfront update-distribution \
  --id $DIST_ID \
  --if-match $ETAG \
  --distribution-config file:///tmp/dist-config-updated.json \
  --output json > /dev/null

echo -e "${GREEN}✓${NC} WAF asociado a CloudFront"
echo ""

# ============================================
# 4. CONFIGURAR CLOUDWATCH ALARMS
# ============================================
echo "📝 Paso 4: Configurando CloudWatch Alarms..."

# Alarm 1: Rate Limit Triggers
aws cloudwatch put-metric-alarm \
  --alarm-name pqnc-waf-rate-limit-triggered \
  --alarm-description "Alerta cuando el WAF bloquea por rate limit" \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=Rule,Value=RateLimitGlobal Name=WebACL,Value=$WEB_ACL_NAME \
  --region $REGION \
  2>/dev/null || echo "   ℹ️ Alarm ya existe"

echo -e "${GREEN}✓${NC} CloudWatch Alarms configuradas"
echo ""

# ============================================
# 5. RESUMEN
# ============================================
echo "═══════════════════════════════════════════"
echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO${NC}"
echo "═══════════════════════════════════════════"
echo ""
echo "Configuración aplicada:"
echo "  ✓ Rate Limiting: 2,000 req/5min por IP"
echo "  ✓ AWS Managed Rules activadas"
echo "  ✓ Geo-blocking (solo MX, US, CA)"
echo "  ✓ Protección SQL Injection"
echo "  ✓ CloudWatch Alarms configuradas"
echo ""
echo "⏱️  Propagación: 5-15 minutos"
echo ""
echo "Verificar en:"
echo "  AWS Console → WAF → Web ACLs → $WEB_ACL_NAME"
echo "  CloudWatch → Alarms → pqnc-waf-*"
echo ""
echo "Test de verificación:"
echo "  for i in {1..2500}; do"
echo "    curl -s -o /dev/null -w \"%{http_code}\n\" https://$CLOUDFRONT_DOMAIN/"
echo "  done | grep -c 429"
echo "  # Esperado: >0 (algunas 429 después del límite)"
echo ""
