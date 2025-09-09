#!/bin/bash
# ============================================
# SCRIPT DE VERIFICACIÓN DE DEPENDENCIAS
# Verificar imports rotos antes de eliminar archivos
# ============================================

echo "🔍 Verificando dependencias de componentes..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
broken_count=0
total_checked=0

echo ""
echo "📋 Buscando imports rotos..."

# Buscar todos los archivos TypeScript/React
find src/ -name "*.tsx" -o -name "*.ts" | while read file; do
  # Buscar imports relativos
  grep "import.*from '\./[^']*'" "$file" 2>/dev/null | while read line; do
    # Extraer el path del import
    imported=$(echo "$line" | sed -n "s/.*from '\.\([^']*\)'.*/\1/p")
    base_dir=$(dirname "$file")
    
    # Verificar si el archivo existe (.tsx o .ts)
    if [ ! -f "${base_dir}${imported}.tsx" ] && [ ! -f "${base_dir}${imported}.ts" ] && [ ! -f "${base_dir}${imported}/index.tsx" ] && [ ! -f "${base_dir}${imported}/index.ts" ]; then
      echo -e "${RED}❌ IMPORT ROTO:${NC} $file"
      echo -e "   ${YELLOW}→ Busca:${NC} ${base_dir}${imported}"
      echo -e "   ${YELLOW}→ Línea:${NC} $line"
      echo ""
      broken_count=$((broken_count + 1))
    fi
    total_checked=$((total_checked + 1))
  done
done

echo "📊 RESUMEN DE VERIFICACIÓN:"
echo -e "✅ Total verificados: $total_checked imports"
echo -e "${RED}❌ Imports rotos: $broken_count${NC}"

if [ $broken_count -eq 0 ]; then
  echo -e "${GREEN}🎉 ¡Todas las dependencias están correctas!${NC}"
else
  echo -e "${RED}⚠️ Se encontraron $broken_count imports rotos que deben corregirse${NC}"
fi

echo ""
echo "💡 RECOMENDACIONES:"
echo "1. Corregir imports rotos antes de hacer commit"
echo "2. Ejecutar 'npm run build' para verificar compilación"
echo "3. Probar aplicación en navegador"
echo "4. Documentar cambios en docs/COMPONENT_DEPENDENCIES.md"

# También verificar build
echo ""
echo "🔧 Verificando compilación..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Compilación exitosa${NC}"
else
  echo -e "${RED}❌ Error en compilación - revisar dependencias${NC}"
fi
