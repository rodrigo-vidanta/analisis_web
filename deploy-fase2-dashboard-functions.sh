#!/bin/bash

# ============================================
# DEPLOY FASE 2: Dashboard Functions sin SECURITY DEFINER
# ============================================

PROJECT_ID="glsmifhkoaifvaegsozd"
SQL_FILE="scripts/sql/fix_dashboard_functions_v6.5.1_SECURE.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY FASE 2: Dashboard Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Funciones a actualizar:"
echo "   1. get_dashboard_conversations"
echo "   2. search_dashboard_conversations"
echo ""
echo "🔄 Cambio: SECURITY DEFINER → SECURITY INVOKER"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Abrir archivo SQL en TextEdit
echo "📝 Abriendo script SQL en TextEdit..."
open -a TextEdit "$SQL_FILE"
sleep 1

# Abrir SQL Editor de Supabase
echo "🌐 Abriendo Supabase SQL Editor..."
open "https://supabase.com/dashboard/project/${PROJECT_ID}/sql/new"
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 INSTRUCCIONES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Copiar TODO el contenido del archivo SQL abierto"
echo "2. Pegar en el SQL Editor de Supabase"
echo "3. Hacer clic en 'RUN' (▶️)"
echo "4. Verificar que las 3 queries se ejecuten sin errores"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFICACIÓN ESPERADA:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "La última query debe mostrar:"
echo ""
echo "┌──────────────────────────────────┬──────────────────┐"
echo "│ function_name                    │ security_mode    │"
echo "├──────────────────────────────────┼──────────────────┤"
echo "│ get_dashboard_conversations      │ SECURITY INVOKER │"
echo "│ search_dashboard_conversations   │ SECURITY INVOKER │"
echo "└──────────────────────────────────┴──────────────────┘"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Si hay algún error, notifica de inmediato"
echo "🔄 Rollback disponible en:"
echo "   - EJECUTAR_get_dashboard_conversations_FINAL.sql"
echo "   - EJECUTAR_search_dashboard_conversations_FINAL.sql"
echo ""
