#!/bin/bash

# ============================================
# DEPLOY: import-contact-proxy Edge Function
# ============================================
# 
# Despliega la edge function import-contact-proxy a Supabase
# 
# Uso:
#   ./deploy-import-contact-proxy.sh
#
# Fecha: 27 Enero 2026

set -e

echo "🚀 Desplegando import-contact-proxy a Supabase..."
echo ""

# Proyecto: PQNC_AI (glsmifhkoaifvaegsozd)
PROJECT_REF="glsmifhkoaifvaegsozd"

echo "📦 Proyecto: $PROJECT_REF"
echo "📁 Función: import-contact-proxy"
echo ""

# Desplegar edge function
supabase functions deploy import-contact-proxy \
  --project-ref $PROJECT_REF \
  --no-verify-jwt

echo ""
echo "✅ Edge function desplegada exitosamente"
echo ""
echo "📋 Configuración requerida en Supabase Dashboard:"
echo "   1. Ir a: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo "   2. Buscar: import-contact-proxy"
echo "   3. Agregar secrets:"
echo "      - LIVECHAT_AUTH = [token desde api_auth_tokens]"
echo "      - N8N_IMPORT_CONTACT_URL = https://primary-dev-d75a.up.railway.app/webhook/import-contact-crm"
echo ""
echo "🔗 URL de la función:"
echo "   https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/import-contact-proxy"
echo ""
