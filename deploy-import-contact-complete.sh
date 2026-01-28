#!/bin/bash

# ============================================
# DEPLOY COMPLETO: import-contact-proxy
# ============================================
# 
# Este script hace el deployment completo de la edge function
# incluyendo la configuración del secret LIVECHAT_AUTH
#
# Fecha: 27 Enero 2026

set -e

PROJECT_REF="glsmifhkoaifvaegsozd"
FUNCTION_NAME="import-contact-proxy"
LIVECHAT_AUTH_VALUE="2025_livechat_auth"

echo "🚀 Deployment Completo de $FUNCTION_NAME"
echo "=========================================="
echo ""

# Paso 1: Deploy de la función
echo "📦 Paso 1/2: Desplegando edge function..."
supabase functions deploy $FUNCTION_NAME \
  --project-ref $PROJECT_REF \
  --no-verify-jwt

if [ $? -eq 0 ]; then
  echo "✅ Edge function desplegada exitosamente"
else
  echo "❌ Error al desplegar edge function"
  exit 1
fi

echo ""

# Paso 2: Configurar secret LIVECHAT_AUTH
echo "🔐 Paso 2/2: Configurando secret LIVECHAT_AUTH..."

supabase secrets set \
  --project-ref $PROJECT_REF \
  LIVECHAT_AUTH="$LIVECHAT_AUTH_VALUE"

if [ $? -eq 0 ]; then
  echo "✅ Secret LIVECHAT_AUTH configurado"
else
  echo "⚠️  Error al configurar secret (puedes hacerlo manualmente)"
fi

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETADO"
echo "=========================================="
echo ""
echo "📋 Información de la función:"
echo "   Nombre: $FUNCTION_NAME"
echo "   Proyecto: $PROJECT_REF"
echo "   URL: https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/$FUNCTION_NAME"
echo ""
echo "🔐 Secret configurado:"
echo "   LIVECHAT_AUTH = $LIVECHAT_AUTH_VALUE"
echo ""
echo "📝 Si el secret no se configuró automáticamente:"
echo "   1. Ir a: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo "   2. Buscar: $FUNCTION_NAME"
echo "   3. Agregar secret: LIVECHAT_AUTH = $LIVECHAT_AUTH_VALUE"
echo ""
echo "🧪 Test de la función:"
echo "   curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/$FUNCTION_NAME \\"
echo "     -H \"Authorization: Bearer {JWT_TOKEN}\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{...payload...}'"
echo ""
