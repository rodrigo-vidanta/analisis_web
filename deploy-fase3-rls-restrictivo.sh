#!/bin/bash

# ============================================
# DEPLOY FASE 3: RLS Restrictivo
# ============================================

PROJECT_ID="glsmifhkoaifvaegsozd"
SQL_FILE="scripts/sql/fix_rls_restrictivo_v1.0.0_SECURE.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DEPLOY FASE 3: RLS Restrictivo"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Tablas a proteger (5):"
echo "   1. prospectos"
echo "   2. mensajes_whatsapp"
echo "   3. conversaciones_whatsapp"
echo "   4. llamadas_ventas"
echo "   5. prospect_assignments"
echo ""
echo "🔄 Cambio: Políticas PERMISIVAS → RESTRICTIVAS"
echo ""
echo "⚠️  IMPORTANTE: Este cambio afecta TODOS los accesos a estas tablas"
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

# Abrir análisis completo
echo "📖 Abriendo análisis 360..."
open -a TextEdit "ANALISIS_360_FASE3_RLS_RESTRICTIVO.md"
sleep 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 INSTRUCCIONES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. LEER el análisis 360 (ANALISIS_360_FASE3_RLS_RESTRICTIVO.md)"
echo "2. Copiar TODO el contenido del SQL"
echo "3. Pegar en el SQL Editor de Supabase"
echo "4. Hacer clic en 'RUN' (▶️)"
echo "5. Verificar que las 7 queries se ejecuten sin errores"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VERIFICACIÓN ESPERADA:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "La última query debe mostrar 10 políticas:"
echo ""
echo "┌─────────────────────────┬────────────────────────────────────────────┐"
echo "│ tablename               │ policyname                                 │"
echo "├─────────────────────────┼────────────────────────────────────────────┤"
echo "│ prospectos              │ RLS: prospectos read by permissions        │"
echo "│ prospectos              │ RLS: prospectos write by role              │"
echo "│ mensajes_whatsapp       │ RLS: mensajes read by prospecto permissions│"
echo "│ mensajes_whatsapp       │ RLS: mensajes write by role                │"
echo "│ conversaciones_whatsapp │ RLS: conversaciones read by prospecto...   │"
echo "│ conversaciones_whatsapp │ RLS: conversaciones write by role          │"
echo "│ llamadas_ventas         │ RLS: llamadas read by prospecto permissions│"
echo "│ llamadas_ventas         │ RLS: llamadas write by role                │"
echo "│ prospect_assignments    │ RLS: assignments read by prospecto...      │"
echo "│ prospect_assignments    │ RLS: assignments write by admin            │"
echo "└─────────────────────────┴────────────────────────────────────────────┘"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  ROLLBACK disponible (si hay problemas):"
echo ""
echo "   1. Ir a Supabase SQL Editor"
echo "   2. Ejecutar queries de las líneas 3-12 de ANALISIS_360_FASE3_RLS_RESTRICTIVO.md (sección 7)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
