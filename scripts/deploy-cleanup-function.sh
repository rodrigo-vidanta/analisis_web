#!/bin/bash
# ============================================
# Script de Deploy para cleanup-inactive-sessions
# ============================================

set -e

echo "🚀 Desplegando Edge Function: cleanup-inactive-sessions"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "supabase/functions/cleanup-inactive-sessions" ]; then
  echo -e "${RED}❌ Error: No se encuentra el directorio supabase/functions/cleanup-inactive-sessions${NC}"
  echo "Por favor ejecuta este script desde la raíz del proyecto"
  exit 1
fi

# Verificar que supabase CLI está instalado
if ! command -v npx &> /dev/null; then
  echo -e "${RED}❌ Error: npx no está instalado${NC}"
  exit 1
fi

echo "📦 Verificando Supabase CLI..."
if ! npx supabase --version &> /dev/null; then
  echo "📥 Instalando Supabase CLI..."
  npm install -g supabase
fi

echo ""
echo "🔐 Login en Supabase..."
# Login usando el access token
cat .supabase/access_token | npx supabase login --no-browser

echo ""
echo "🚀 Desplegando función..."
npx supabase functions deploy cleanup-inactive-sessions \
  --no-verify-jwt \
  --project-ref glsmifhkoaifvaegsozd

echo ""
echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
echo ""
echo "🧪 Probando función..."
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzOTYzODksImV4cCI6MjA0OTk3MjM4OX0.T0x_OmzF7IQCOxh0GZCb6GvmSc_iHXMabPv3sEW6_ug" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo ""
echo -e "${GREEN}📋 Próximo paso: Configurar Cron Job${NC}"
echo ""
echo "Ejecuta este SQL en Supabase Dashboard > SQL Editor:"
echo ""
echo "SELECT cron.schedule("
echo "  'cleanup-inactive-sessions',"
echo "  '* * * * *',"
echo "  \$\$"
echo "  SELECT net.http_post("
echo "    url := 'https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions',"
echo "    headers := jsonb_build_object("
echo "      'Content-Type', 'application/json',"
echo "      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzOTYzODksImV4cCI6MjA0OTk3MjM4OX0.T0x_OmzF7IQCOxh0GZCb6GvmSc_iHXMabPv3sEW6_ug'"
echo "    ),"
echo "    body := '{}'::jsonb"
echo "  );"
echo "  \$\$"
echo ");"
