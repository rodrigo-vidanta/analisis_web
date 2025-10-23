#!/bin/bash

# Script para desplegar la Edge Function send-img-proxy
# Ejecuta este script manualmente en tu terminal

echo "🚀 Desplegando Edge Function send-img-proxy..."
echo ""

# Agregar supabase al PATH
export PATH="$HOME/bin:$PATH"

cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform

# Login (esto abrirá el navegador)
echo "📝 Paso 1: Login en Supabase..."
~/bin/supabase login

# Vincular proyecto
echo "🔗 Paso 2: Vinculando proyecto..."
~/bin/supabase link --project-ref zbylezfyagwrxoecioup

# Desplegar función
echo "🚀 Paso 3: Desplegando función..."
~/bin/supabase functions deploy send-img-proxy

echo ""
echo "✅ ¡Listo! La función debería estar desplegada."
echo ""
echo "🧪 Prueba con:"
echo "curl -X POST \\"
echo "  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/send-img-proxy' \\"
echo "  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '[{\"whatsapp\": \"test\", \"uchat_id\": \"test\", \"imagenes\": [{\"archivo\": \"test.jpg\"}]}]'"

