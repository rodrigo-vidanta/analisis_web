#!/bin/bash

# Script de deploy para send-audio-proxy
# Fecha: 04 Febrero 2026

set -e

echo "🚀 Deploying send-audio-proxy Edge Function..."
echo ""

# Verificar que estamos en la raíz del proyecto
if [ ! -d "supabase/functions/send-audio-proxy" ]; then
  echo "❌ Error: Debes ejecutar este script desde la raíz del proyecto"
  exit 1
fi

# Proyecto Supabase
PROJECT_REF="glsmifhkoaifvaegsozd"

echo "📦 Proyecto: $PROJECT_REF"
echo "📁 Función: send-audio-proxy"
echo ""

# Verificar que supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
  echo "❌ Error: Supabase CLI no está instalado"
  echo "Instalar con: brew install supabase/tap/supabase"
  exit 1
fi

# Verificar autenticación
echo "🔐 Verificando autenticación..."
if ! supabase projects list &> /dev/null; then
  echo "❌ Error: No estás autenticado con Supabase CLI"
  echo "Ejecuta: supabase login"
  exit 1
fi

# Deploy
echo "⬆️  Deploying..."
supabase functions deploy send-audio-proxy --project-ref $PROJECT_REF

echo ""
echo "✅ Deploy completado!"
echo ""
echo "🧪 Para probar la función:"
echo "supabase functions logs send-audio-proxy --project-ref $PROJECT_REF --tail"
echo ""
echo "📋 Verificar secrets:"
echo "supabase secrets list --project-ref $PROJECT_REF | grep LIVECHAT_AUTH"
