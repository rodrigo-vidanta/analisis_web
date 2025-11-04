#!/bin/bash

# Script para desplegar Studio usando repositorio público sin token

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-west-2"

echo -e "${PURPLE}🚀 DESPLEGANDO STUDIO CON REPOSITORIO PÚBLICO${NC}"
echo -e "${PURPLE}===========================================${NC}"

# 1. Crear aplicación Amplify sin token
echo -e "${BLUE}📱 Creando aplicación Amplify...${NC}"
APP_ID=$(aws amplify create-app \
    --name supabase-studio-publico \
    --description "Supabase Studio desde repositorio público" \
    --platform WEB \
    --build-spec "version: 1
applications:
  - appRoot: apps/studio
    frontend:
      phases:
        preBuild:
          commands:
            - cd apps/studio
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: apps/studio/.next
        files:
          - '**/*'
      cache:
        paths:
          - apps/studio/node_modules/**/*" \
    --environment-variables \
        NEXT_PUBLIC_SUPABASE_URL=https://d2bxqn3xh4v4kj.cloudfront.net \
        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0 \
        SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
    --region $REGION \
    --query 'app.appId' \
    --output text)

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    echo -e "${GREEN}✅ App creada: $APP_ID${NC}"
    
    # 2. Conectar repositorio manualmente
    echo -e "${BLUE}🔗 Conectando repositorio GitHub...${NC}"
    aws amplify update-app \
        --app-id $APP_ID \
        --repository https://github.com/supabase/supabase \
        --region $REGION
    
    # 3. Crear branch
    echo -e "${BLUE}🌿 Creando branch master...${NC}"
    aws amplify create-branch \
        --app-id $APP_ID \
        --branch-name master \
        --framework "Next.js - SSR" \
        --enable-auto-build \
        --stage PRODUCTION \
        --region $REGION
    
    # 4. Obtener URL
    STUDIO_URL=$(aws amplify get-app \
        --app-id $APP_ID \
        --region $REGION \
        --query 'app.defaultDomain' \
        --output text)
    
    FULL_URL="https://master.$STUDIO_URL"
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO CONFIGURADO!${NC}"
    echo -e "${PURPLE}==============================${NC}"
    echo -e "${GREEN}✅ Amplify App creada${NC}"
    echo -e "${GREEN}✅ Repositorio conectado${NC}"
    echo -e "${GREEN}✅ Branch configurado${NC}"
    echo -e "${BLUE}🎨 URL: $FULL_URL${NC}"
    
    # 5. Intentar build manual
    echo -e "${BLUE}🔨 Intentando build manual...${NC}"
    JOB_ID=$(aws amplify start-job \
        --app-id $APP_ID \
        --branch-name master \
        --job-type RELEASE \
        --region $REGION \
        --query 'jobSummary.jobId' \
        --output text 2>/dev/null || echo "MANUAL_REQUIRED")
    
    if [ "$JOB_ID" != "MANUAL_REQUIRED" ]; then
        echo -e "${GREEN}✅ Build iniciado: $JOB_ID${NC}"
        echo -e "${YELLOW}⏳ Esperando build (10-15 minutos)...${NC}"
    else
        echo -e "${YELLOW}⚠️  Build manual requerido${NC}"
        echo -e "${BLUE}Ve a AWS Console Amplify para configurar GitHub token${NC}"
    fi
    
    # 6. Crear información
    cat > studio-publico-info.txt << EOF
=== SUPABASE STUDIO AMPLIFY CONFIGURADO ===
Fecha: $(date)

🎨 URL Studio: $FULL_URL

=== AMPLIFY APP ===
App ID: $APP_ID
Repository: https://github.com/supabase/supabase
Branch: master
Framework: Next.js - SSR

=== CONFIGURACIÓN ===
URL: https://d2bxqn3xh4v4kj.cloudfront.net
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== PRÓXIMO PASO ===
Para completar el despliegue:
1. Ve a AWS Console → Amplify
2. Busca la app: supabase-studio-publico
3. Configura GitHub token (opcional)
4. Inicia build manual

=== ALTERNATIVA ===
Si no quieres configurar GitHub:
- Usa tu base de datos PostgreSQL directamente
- Conecta DBeaver/pgAdmin a la Aurora
- Tienes Supabase backend completo funcionando

URL App: $FULL_URL
App ID: $APP_ID
EOF
    
    echo -e "${BLUE}📄 Info guardada en: studio-publico-info.txt${NC}"
    
else
    echo -e "${RED}❌ Error creando aplicación Amplify${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Studio configurado en Amplify${NC}"
echo -e "${BLUE}🎨 URL: $FULL_URL${NC}"
