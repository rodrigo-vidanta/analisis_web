#!/bin/bash

# Script para mostrar información de versión actual
# Uso: ./scripts/version-info.sh

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 INFORMACIÓN DE VERSIÓN - PQNC QA AI Platform${NC}"
echo ""

# Versión actual
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}📦 Versión actual: ${CURRENT_VERSION}${NC}"

# Último commit
LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)")
echo -e "${BLUE}📝 Último commit: ${LAST_COMMIT}${NC}"

# Último tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "Sin tags")
echo -e "${YELLOW}🏷️ Último tag: ${LAST_TAG}${NC}"

# Estado del repo
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️ Estado: Cambios sin commit${NC}"
else
    echo -e "${GREEN}✅ Estado: Limpio${NC}"
fi

# Rama actual
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}🌿 Rama: ${CURRENT_BRANCH}${NC}"

echo ""
echo -e "${BLUE}🚀 Para hacer deploy:${NC}"
echo "   ./scripts/deploy.sh \"Mensaje del cambio\""
echo ""
