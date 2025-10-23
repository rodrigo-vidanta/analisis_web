#!/bin/bash

echo "🚀 Desplegando Edge Function: anthropic-proxy"
echo ""

# Asegurarse de que ~/bin esté en el PATH
export PATH="$HOME/bin:$PATH"

# Verificar si supabase CLI está instalado
if ! command -v ~/bin/supabase &> /dev/null
then
    echo "❌ Supabase CLI no encontrado. Por favor instálalo primero."
    echo "   Ejecuta: curl -L https://github.com/supabase/cli/releases/download/v2.53.6/supabase_darwin_arm64.tar.gz | tar -xz -C ~/bin"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Desplegar la función
echo "📦 Desplegando función anthropic-proxy..."
~/bin/supabase functions deploy anthropic-proxy --project-ref zbylezfyagwrxoecioup

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error al desplegar la función."
    echo ""
    echo "Si no has hecho login, ejecuta primero:"
    echo "   ~/bin/supabase login"
    echo ""
    echo "Si no has vinculado el proyecto, ejecuta:"
    echo "   ~/bin/supabase link --project-ref zbylezfyagwrxoecioup"
    exit 1
fi

echo ""
echo "✅ ¡Función desplegada correctamente!"
echo ""
echo "🧪 Puedes probarla con:"
echo ""
echo "curl -X POST \\"
echo "  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/anthropic-proxy' \\"
echo "  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
  \"model\": \"claude-3-5-sonnet-20241022\",
  \"max_tokens\": 100,
  \"messages\": [{\"role\": \"user\", \"content\": \"Hola\"}]
}'"
echo ""

