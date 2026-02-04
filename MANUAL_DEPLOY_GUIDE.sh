#!/bin/bash

# Script para guiar el deploy manual de send-audio-proxy
# Ya que el access token no tiene permisos suficientes para CLI

echo "===================================="
echo "DEPLOY MANUAL DE send-audio-proxy"
echo "===================================="
echo ""
echo "El access token actual no tiene permisos de deploy."
echo "Opciones:"
echo ""
echo "1. DASHBOARD (Recomendado - 5 minutos)"
echo "   https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/functions"
echo ""
echo "2. GENERAR NUEVO TOKEN CON PERMISOS"
echo "   - Ir a: https://supabase.com/dashboard/account/tokens"
echo "   - Crear token con permisos: 'Edge Functions: Write'"
echo "   - Guardar en: ~/.supabase/access_token"
echo "   - Deploy: npx supabase functions deploy send-audio-proxy --project-ref glsmifhkoaifvaegsozd"
echo ""
echo "3. CÓDIGO PARA COPIAR AL DASHBOARD:"
echo ""
cat supabase/functions/send-audio-proxy/index.ts
echo ""
echo "===================================="
