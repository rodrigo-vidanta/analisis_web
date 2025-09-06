#!/bin/bash

# Script simple para deploy con versionado automático
# Uso: ./scripts/deploy.sh "Mensaje del commit"

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -eq 0 ]; then
    echo -e "${YELLOW}💡 Uso: ./scripts/deploy.sh \"Mensaje del commit\"${NC}"
    echo ""
    echo -e "${BLUE}📋 Ejemplo:${NC}"
    echo "  ./scripts/deploy.sh \"Fix reproductor de audio\""
    echo "  ./scripts/deploy.sh \"Add new dashboard filter\""
    exit 1
fi

COMMIT_MESSAGE=$1
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo -e "${BLUE}🚀 DEPLOY AUTOMÁTICO - PQNC QA AI Platform${NC}"
echo ""

# 1. Verificar rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Debes estar en la rama main${NC}"
    exit 1
fi

# 2. Obtener versión actual
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Versión actual: ${CURRENT_VERSION}${NC}"

# 3. Incrementar patch version automáticamente
echo -e "${BLUE}📈 Incrementando versión patch...${NC}"
npm version patch --no-git-tag-version

# 4. Obtener nueva versión
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ Nueva versión: ${NEW_VERSION}${NC}"

# 5. Actualizar changelog simple
echo -e "${BLUE}📝 Actualizando changelog...${NC}"
TEMP_FILE=$(mktemp)

cat > $TEMP_FILE << EOF
# 📋 CHANGELOG - PQNC QA AI Platform

## Historial de Versiones

### v${NEW_VERSION} (${TIMESTAMP})
**Descripción**: ${COMMIT_MESSAGE}

EOF

# Añadir contenido existente
if [ -f "CHANGELOG.md" ]; then
    tail -n +5 CHANGELOG.md >> $TEMP_FILE
fi

mv $TEMP_FILE CHANGELOG.md

# 6. Build
echo -e "${BLUE}🔨 Compilando...${NC}"
npm run build

# 7. Commit y push
echo -e "${BLUE}📤 Subiendo a GitHub...${NC}"
git add .
git commit -m "🔖 v${NEW_VERSION} - ${COMMIT_MESSAGE}

📦 ${CURRENT_VERSION} → ${NEW_VERSION}
🕐 ${TIMESTAMP}
📋 ${COMMIT_MESSAGE}"

git tag -a "v${NEW_VERSION}" -m "v${NEW_VERSION}: ${COMMIT_MESSAGE}"
git push origin main
git push origin --tags

echo ""
echo -e "${GREEN}🎉 ¡DEPLOY COMPLETADO!${NC}"
echo -e "   Versión: ${CURRENT_VERSION} → ${GREEN}${NEW_VERSION}${NC}"
echo -e "   GitHub: ${GREEN}✅ Actualizado${NC}"
echo ""
