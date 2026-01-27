#!/bin/bash
# ============================================
# Script para ejecutar actualización de vista
# ============================================

set -e

echo "🔧 Ejecutando actualización de vista prospectos_con_ejecutivo_y_coordinacion..."

# Cargar variables de entorno
source .env.local

# Ejecutar SQL
psql "postgresql://postgres.glsmifhkoaifvaegsozd:${POSTGRES_PASSWORD}@db.glsmifhkoaifvaegsozd.supabase.co:5432/postgres" \
  -f scripts/optimizaciones/actualizar_vista_prospectos_con_etapas.sql

echo "✅ Vista actualizada correctamente"

# Verificar
echo "📊 Verificando vista..."
psql "postgresql://postgres.glsmifhkoaifvaegsozd:${POSTGRES_PASSWORD}@db.glsmifhkoaifvaegsozd.supabase.co:5432/postgres" \
  -c "SELECT etapa_codigo, COUNT(*) as total FROM prospectos_con_ejecutivo_y_coordinacion GROUP BY etapa_codigo ORDER BY total DESC LIMIT 5;"

echo "✅ Done!"
