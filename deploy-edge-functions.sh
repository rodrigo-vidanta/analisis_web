#!/bin/bash
##############################################################################
# DEPLOY EDGE FUNCTIONS - SEGURIDAD ENTERPRISE
# PQNC QA AI Platform
##############################################################################

set -e

PROJECT_REF="glsmifhkoaifvaegsozd"
EDGE_URL="https://glsmifhkoaifvaegsozd.supabase.co"

echo "🚀 Desplegando Edge Functions de seguridad..."
echo ""

# 1. Login (si no está logueado)
echo "📝 Verificando autenticación..."
supabase login 2>/dev/null || echo "Ya autenticado"

# 2. Deploy Edge Function
echo "📝 Desplegando secure-query..."
cd supabase/functions
supabase functions deploy secure-query \
  --project-ref $PROJECT_REF \
  --no-verify-jwt

# 3. Configurar secrets
echo "📝 Configurando secrets..."

# Obtener service_role key de .env
SERVICE_KEY=$(grep VITE_ANALYSIS_SUPABASE_SERVICE_KEY ../../.env.production | cut -d'=' -f2)

if [ -z "$SERVICE_KEY" ]; then
  echo "⚠️  No se encontró SERVICE_KEY en .env.production"
  echo "Ingresa el service_role key manualmente:"
  read -s SERVICE_KEY
fi

supabase secrets set \
  SUPABASE_URL=$EDGE_URL \
  SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY \
  --project-ref $PROJECT_REF

echo ""
echo "✅ Edge Function desplegada"
echo "URL: $EDGE_URL/functions/v1/secure-query"
echo ""

# 4. Test
echo "📝 Testeando Edge Function..."
echo ""

# Necesitas obtener un session_token válido de localStorage
echo "Para testear, ejecuta en consola del navegador:"
echo "  localStorage.getItem('auth_token')"
echo ""
echo "Luego ejecuta:"
echo "  curl -X POST $EDGE_URL/functions/v1/secure-query \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'Authorization: Bearer ANON_KEY' \\"
echo "    -H 'x-session-token: TU_SESSION_TOKEN' \\"
echo "    -d '{\"table\":\"prospectos\",\"select\":\"id,nombre\",\"limit\":5}'"
echo ""
