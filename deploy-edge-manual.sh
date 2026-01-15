#!/bin/bash
# Deploy Edge Function vía API de Supabase

PROJECT_REF="glsmifhkoaifvaegsozd"
FUNCTION_NAME="secure-query"

# Comprimir función
cd supabase/functions/secure-query
tar -czf /tmp/secure-query.tar.gz index.ts

# Deploy vía API requiere access token de Supabase
echo "⚠️  Deploy manual requiere Supabase CLI"
echo "Instalar: brew install supabase/tap/supabase"
echo "O: npm install -g supabase"
echo ""
echo "Luego ejecutar:"
echo "  supabase functions deploy secure-query --project-ref $PROJECT_REF"
