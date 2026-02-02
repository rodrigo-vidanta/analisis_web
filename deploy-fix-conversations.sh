#!/bin/bash

# ============================================
# DEPLOY: Fix get_conversations_ordered v6.5.1
# ============================================
# Elimina SECURITY DEFINER y agrega filtros por coordinaciones

set -e

echo "🚀 Iniciando deploy de fix get_conversations_ordered..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que existe el script
if [ ! -f "scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql" ]; then
    echo -e "${RED}❌ Error: No se encontró el script SQL${NC}"
    echo "   Ubicación esperada: scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql"
    exit 1
fi

echo -e "${GREEN}✅ Script SQL encontrado${NC}"
echo ""

# Instrucciones
echo -e "${YELLOW}📋 INSTRUCCIONES DE EJECUCIÓN MANUAL:${NC}"
echo ""
echo "1. Abrir SQL Editor de Supabase:"
echo -e "   ${GREEN}https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new${NC}"
echo ""
echo "2. Copiar el contenido del archivo:"
echo -e "   ${GREEN}scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql${NC}"
echo ""
echo "3. Pegar en el SQL Editor y hacer click en 'Run'"
echo ""
echo "4. Verificar el resultado esperado:"
echo "   'Success. No rows returned'"
echo ""
echo "5. Verificar que la función fue actualizada:"
echo ""
echo "   SELECT proname, "
echo "          CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as mode"
echo "   FROM pg_proc "
echo "   WHERE proname = 'get_conversations_ordered';"
echo ""
echo "   Resultado esperado: mode = 'SECURITY INVOKER'"
echo ""
echo -e "${YELLOW}─────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${GREEN}✅ Testing post-deploy:${NC}"
echo ""
echo "1. Logout y login de Mayra González"
echo "2. Ir al módulo WhatsApp"
echo "3. Verificar que NO ve 'Adriana Baeza' (4111573556) de BOOM"
echo "4. Verificar que SÍ ve conversaciones de VEN"
echo ""
echo -e "${YELLOW}─────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${GREEN}📄 Abrir archivo del script:${NC}"

# Detectar sistema operativo y abrir archivo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open -e "scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql"
    echo "   ✅ Archivo abierto en TextEdit"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql" 2>/dev/null || \
    cat "scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql"
else
    # Windows o desconocido
    cat "scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql"
fi

echo ""
echo -e "${GREEN}🌐 Abrir SQL Editor en navegador:${NC}"

# Intentar abrir el navegador
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new"
    echo "   ✅ SQL Editor abierto en navegador"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new" 2>/dev/null && \
    echo "   ✅ SQL Editor abierto en navegador" || \
    echo "   📋 Copiar URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new"
fi

echo ""
echo -e "${YELLOW}─────────────────────────────────────────────────────${NC}"
echo ""
echo -e "${GREEN}✅ LISTO PARA DEPLOY${NC}"
echo ""
echo "⚠️  IMPORTANTE: Este script requiere ejecución MANUAL en el SQL Editor"
echo "   por razones de seguridad de Supabase."
echo ""
