#!/bin/bash

# Script para versionado automático y deploy
# Uso: ./scripts/version-and-deploy.sh [patch|minor|major] "Mensaje del commit"

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}📋 SISTEMA DE VERSIONADO AUTOMÁTICO PQNC${NC}"
    echo ""
    echo -e "${YELLOW}Uso:${NC}"
    echo "  ./scripts/version-and-deploy.sh [patch|minor|major] \"Mensaje del commit\""
    echo ""
    echo -e "${YELLOW}Tipos de versión:${NC}"
    echo "  patch  - Incrementa 1.0.3 → 1.0.4 (bug fixes, mejoras menores)"
    echo "  minor  - Incrementa 1.0.3 → 1.1.0 (nuevas funcionalidades)"
    echo "  major  - Incrementa 1.0.3 → 2.0.0 (cambios breaking)"
    echo ""
    echo -e "${YELLOW}Ejemplo:${NC}"
    echo "  ./scripts/version-and-deploy.sh patch \"Fix audio player CORS issue\""
    echo "  ./scripts/version-and-deploy.sh minor \"Add new dashboard features\""
    exit 1
}

# Verificar parámetros
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Error: Faltan parámetros${NC}"
    show_help
fi

VERSION_TYPE=$1
COMMIT_MESSAGE=$2

# Validar tipo de versión
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}❌ Error: Tipo de versión inválido. Usa: patch, minor, o major${NC}"
    show_help
fi

echo -e "${BLUE}🚀 INICIANDO PROCESO DE VERSIONADO Y DEPLOY${NC}"
echo ""

# 1. Verificar que estemos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Debes estar en la rama main para hacer deploy${NC}"
    exit 1
fi

# 2. Verificar que no hay cambios sin commit
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️ Hay cambios sin commit. Agregando automáticamente...${NC}"
    git add .
fi

# 3. Obtener versión actual
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Versión actual: ${CURRENT_VERSION}${NC}"

# 4. Incrementar versión usando npm
echo -e "${BLUE}📈 Incrementando versión (${VERSION_TYPE})...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# 5. Obtener nueva versión
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ Nueva versión: ${NEW_VERSION}${NC}"

# 6. Actualizar changelog con timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
echo -e "${BLUE}📝 Actualizando changelog...${NC}"

# Crear entrada en changelog si no existe
if [ ! -f "CHANGELOG.md" ]; then
    cat > CHANGELOG.md << EOF
# 📋 CHANGELOG - PQNC QA AI Platform

## Historial de Versiones

EOF
fi

# Añadir nueva entrada al changelog
TEMP_FILE=$(mktemp)
cat > $TEMP_FILE << EOF
# 📋 CHANGELOG - PQNC QA AI Platform

## Historial de Versiones

### v${NEW_VERSION} (${TIMESTAMP})
**Tipo**: ${VERSION_TYPE}
**Descripción**: ${COMMIT_MESSAGE}

EOF

# Añadir el contenido existente (si existe)
if [ -f "CHANGELOG.md" ]; then
    tail -n +4 CHANGELOG.md >> $TEMP_FILE
fi

mv $TEMP_FILE CHANGELOG.md

# 7. Build de la aplicación
echo -e "${BLUE}🔨 Compilando aplicación...${NC}"
npm run build

# 8. Commit con la nueva versión
echo -e "${BLUE}📤 Haciendo commit...${NC}"
git add .
git commit -m "🔖 Release v${NEW_VERSION} - ${COMMIT_MESSAGE}

📦 Versión: ${CURRENT_VERSION} → ${NEW_VERSION}
🕐 Fecha: ${TIMESTAMP}
📝 Tipo: ${VERSION_TYPE}
📋 Descripción: ${COMMIT_MESSAGE}

🔨 Build: ✅ Compilado exitosamente
📚 Changelog: ✅ Actualizado automáticamente"

# 9. Crear tag de git
echo -e "${BLUE}🏷️ Creando tag de versión...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}: ${COMMIT_MESSAGE}"

# 10. Push al repositorio
echo -e "${BLUE}📡 Subiendo a GitHub...${NC}"
git push origin main
git push origin --tags

echo ""
echo -e "${GREEN}🎉 ¡DEPLOY COMPLETADO EXITOSAMENTE!${NC}"
echo ""
echo -e "${BLUE}📊 RESUMEN:${NC}"
echo -e "   Versión: ${CURRENT_VERSION} → ${GREEN}${NEW_VERSION}${NC}"
echo -e "   Commit: ${GREEN}✅ Realizado${NC}"
echo -e "   Tag: ${GREEN}v${NEW_VERSION}${NC}"
echo -e "   Push: ${GREEN}✅ Subido a GitHub${NC}"
echo -e "   Build: ${GREEN}✅ Compilado${NC}"
echo -e "   Changelog: ${GREEN}✅ Actualizado${NC}"
echo ""
echo -e "${YELLOW}🔗 Próximos pasos:${NC}"
echo "   1. Verificar en GitHub: https://github.com/rodrigo-vidanta/analisis_web"
echo "   2. Revisar el changelog actualizado"
echo "   3. Validar la nueva versión en el footer de la aplicación"
echo ""
