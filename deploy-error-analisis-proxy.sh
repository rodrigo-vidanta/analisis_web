#!/bin/bash

# Script para desplegar la Edge Function error-analisis-proxy
# Ejecuta este script manualmente en tu terminal

echo "🚀 Desplegando Edge Function error-analisis-proxy..."
echo ""

# Verificar si supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no encontrado."
    echo ""
    echo "📦 Instalación rápida (macOS):"
    echo "   brew install supabase/tap/supabase"
    echo ""
    echo "   O descarga desde: https://github.com/supabase/cli/releases"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Ir al directorio del proyecto
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform

# Verificar si ya está vinculado
echo "🔗 Verificando vinculación con proyecto..."
if ! supabase projects list &> /dev/null; then
    echo "📝 Necesitas hacer login primero..."
    supabase login
fi

# Vincular proyecto (si no está vinculado)
echo "🔗 Vinculando proyecto dffuwdzybhypxfzrmdcz (Log Monitor)..."
supabase link --project-ref dffuwdzybhypxfzrmdcz

# Desplegar función
echo ""
echo "🚀 Desplegando función error-analisis-proxy..."
supabase functions deploy error-analisis-proxy --project-ref dffuwdzybhypxfzrmdcz

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error al desplegar la función."
    echo ""
    echo "💡 Posibles soluciones:"
    echo "   1. Verifica que estés logueado: supabase login"
    echo "   2. Verifica que el proyecto esté vinculado: supabase link --project-ref zbylezfyagwrxoecioup"
    echo "   3. Verifica que la carpeta supabase/functions/error-analisis-proxy/ exista"
    exit 1
fi

echo ""
echo "✅ ¡Función desplegada correctamente!"
echo ""
echo "⚠️  IMPORTANTE: Ahora debes configurar las variables de entorno en Supabase:"
echo ""
echo "   1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/settings/functions"
echo "   2. Busca la función 'error-analisis-proxy'"
echo "   3. Agrega estas variables:"
echo ""
echo "      ERROR_ANALISIS_WEBHOOK_TOKEN = 4@Lt'\\o93BSkgA59MH[TSC\"gERa+)jlgf|BWIR-7fAmM9o59}3.|W2k-JiRu(oeb"
echo "      ERROR_ANALISIS_WEBHOOK_URL = https://primary-dev-d75a.up.railway.app/webhook/error-analisis"
echo ""
echo "🧪 Prueba con:"
echo ""
echo "curl -X POST \\"
echo "  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/error-analisis-proxy' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \\"
echo "  -d '{"
echo "    \"analysis_id\": \"test-id\","
echo "    \"error_log\": {"
echo "      \"id\": \"test-log-id\","
echo "      \"tipo\": \"ui\","
echo "      \"subtipo\": \"test\","
echo "      \"severidad\": \"media\","
echo "      \"ambiente\": \"desarrollo\","
echo "      \"timestamp\": \"2025-01-18T15:21:00.000Z\","
echo "      \"mensaje\": \"Test error\""
echo "    },"
echo "    \"tags\": [],"
echo "    \"annotations\": [],"
echo "    \"include_suggested_fix\": true,"
echo "    \"requested_at\": \"2025-01-18T15:22:00.000Z\""
echo "  }'"
echo ""

