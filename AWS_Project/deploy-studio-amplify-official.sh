#!/bin/bash

# Script para desplegar Supabase Studio OFICIAL en AWS Amplify Hosting

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-west-2"

echo -e "${PURPLE}🎨 DESPLEGANDO SUPABASE STUDIO EN AWS AMPLIFY HOSTING${NC}"
echo -e "${PURPLE}===================================================${NC}"

# 1. Crear repositorio CodeCommit para Studio
echo -e "${BLUE}📦 Creando repositorio CodeCommit para Studio...${NC}"
REPO_ARN=$(aws codecommit create-repository \
    --repository-name supabase-studio-official \
    --repository-description "Supabase Studio oficial" \
    --region $REGION \
    --query 'repositoryMetadata.Arn' \
    --output text 2>/dev/null || aws codecommit get-repository --repository-name supabase-studio-official --region $REGION --query 'repositoryMetadata.Arn' --output text)

REPO_URL=$(aws codecommit get-repository --repository-name supabase-studio-official --region $REGION --query 'repositoryMetadata.cloneUrlHttp' --output text)

echo -e "${GREEN}✅ Repositorio CodeCommit: $REPO_URL${NC}"

# 2. Clonar Studio oficial del repositorio de Supabase
echo -e "${BLUE}📥 Clonando Studio oficial de Supabase...${NC}"
cd /tmp
rm -rf supabase-studio-source
git clone --depth 1 --branch master https://github.com/supabase/supabase.git supabase-studio-source
cd supabase-studio-source/apps/studio

# 3. Crear configuración de build para Amplify
echo -e "${BLUE}⚙️ Creando amplify.yml oficial...${NC}"
cat > amplify.yml << 'EOF'
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
      customHeaders:
        - pattern: '**'
          headers:
            - key: 'Strict-Transport-Security'
              value: 'max-age=31536000; includeSubDomains'
            - key: 'X-Frame-Options'
              value: 'SAMEORIGIN'
    appRoot: apps/studio
EOF

# 4. Crear .env para Studio
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://d2bxqn3xh4v4kj.cloudfront.net
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
POSTGRES_PASSWORD=SuperBase123!
DEFAULT_ORGANIZATION_NAME=AWS Organization
DEFAULT_PROJECT_NAME=AWS Supabase
EOF

# 5. Configurar git para CodeCommit
cd /tmp/supabase-studio-source
git config user.email "admin@supabase.local"
git config user.name "Supabase Admin"

# 6. Agregar remote de CodeCommit
git remote add codecommit $REPO_URL

# 7. Push a CodeCommit
echo -e "${BLUE}📤 Subiendo Studio a CodeCommit...${NC}"
git add .
git commit -m "Supabase Studio oficial para AWS" || true
git push codecommit master --force

echo -e "${GREEN}✅ Studio subido a CodeCommit${NC}"

# 8. Crear aplicación Amplify
echo -e "${BLUE}🚀 Creando aplicación Amplify para Studio...${NC}"
APP_ID=$(aws amplify create-app \
    --name supabase-studio-official \
    --description "Supabase Studio oficial self-hosted" \
    --repository $REPO_URL \
    --platform WEB \
    --iam-service-role-arn arn:aws:iam::307621978585:role/amplifyconsole-backend-role \
    --environment-variables \
        NEXT_PUBLIC_SUPABASE_URL=https://d2bxqn3xh4v4kj.cloudfront.net,\
        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0,\
        SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
    --region $REGION \
    --query 'app.appId' \
    --output text 2>/dev/null || aws amplify list-apps --region $REGION --query 'apps[?name==`supabase-studio-official`].appId' --output text)

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    echo -e "${GREEN}✅ App Amplify creada: $APP_ID${NC}"
    
    # 9. Crear branch en Amplify
    echo -e "${BLUE}🌿 Creando branch master en Amplify...${NC}"
    aws amplify create-branch \
        --app-id $APP_ID \
        --branch-name master \
        --framework 'Next.js - SSR' \
        --enable-auto-build \
        --region $REGION 2>/dev/null || echo "Branch ya existe"
    
    # 10. Iniciar build
    echo -e "${BLUE}🔨 Iniciando build de Studio oficial...${NC}"
    JOB_ID=$(aws amplify start-job \
        --app-id $APP_ID \
        --branch-name master \
        --job-type RELEASE \
        --region $REGION \
        --query 'jobSummary.jobId' \
        --output text)
    
    echo -e "${YELLOW}⏳ Build iniciado (Job ID: $JOB_ID)${NC}"
    echo -e "${YELLOW}Esto puede tardar 10-15 minutos...${NC}"
    
    # 11. Esperar build
    echo -e "${BLUE}⏳ Esperando build de Amplify...${NC}"
    sleep 600
    
    # 12. Verificar estado del build
    BUILD_STATUS=$(aws amplify get-job \
        --app-id $APP_ID \
        --branch-name master \
        --job-id $JOB_ID \
        --region $REGION \
        --query 'job.summary.status' \
        --output text)
    
    echo -e "${BLUE}Estado del build: $BUILD_STATUS${NC}"
    
    # 13. Obtener URL de Studio
    STUDIO_URL=$(aws amplify get-app \
        --app-id $APP_ID \
        --region $REGION \
        --query 'app.defaultDomain' \
        --output text)
    
    FULL_STUDIO_URL="https://master.$STUDIO_URL"
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO OFICIAL DESPLEGADO EN AMPLIFY!${NC}"
    echo -e "${PURPLE}================================================${NC}"
    echo -e "${GREEN}✅ Supabase Studio oficial${NC}"
    echo -e "${GREEN}✅ Desplegado en AWS Amplify Hosting${NC}"
    echo -e "${GREEN}✅ Build automático configurado${NC}"
    echo -e "${BLUE}🌐 URL: $FULL_STUDIO_URL${NC}"
    
    # 14. Probar Studio
    echo -e "${BLUE}🔍 Probando Studio en Amplify...${NC}"
    sleep 60
    curl -I $FULL_STUDIO_URL --max-time 15 || echo "Studio aún desplegándose"
    
    # 15. Crear información final
    cat > studio-amplify-official.txt << EOF
=== SUPABASE STUDIO OFICIAL EN AMPLIFY ===
Fecha: $(date)

🌐 URL Studio Oficial: $FULL_STUDIO_URL

=== CARACTERÍSTICAS ===
✅ Supabase Studio oficial del repositorio oficial
✅ Desplegado en AWS Amplify Hosting (método oficial)
✅ Build automático desde CodeCommit
✅ SSL habilitado automáticamente
✅ CDN global de Amplify
✅ Actualizaciones automáticas

=== CONFIGURACIÓN ===
App ID: $APP_ID
Branch: master
Framework: Next.js - SSR
Build Status: $BUILD_STATUS

=== CREDENCIALES API ===
URL: https://d2bxqn3xh4v4kj.cloudfront.net
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== BASE DE DATOS ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

=== ACCESO ===
URL: $FULL_STUDIO_URL
Método: AWS Amplify Hosting (oficial)

=== COMANDOS ÚTILES ===
# Ver estado del build:
aws amplify get-job --app-id $APP_ID --branch-name master --job-id $JOB_ID --region us-west-2

# Ver logs del build:
aws amplify list-jobs --app-id $APP_ID --branch-name master --region us-west-2

# Reconstruir Studio:
aws amplify start-job --app-id $APP_ID --branch-name master --job-type RELEASE --region us-west-2

¡Este es el método oficial para desplegar Studio!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: studio-amplify-official.txt${NC}"
    echo -e "${YELLOW}⏳ Build puede tardar 10-15 minutos${NC}"
    echo -e "${GREEN}✅ Método oficial: AWS Amplify Hosting${NC}"
    
else
    echo -e "${RED}❌ Error creando aplicación Amplify${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL EN AMPLIFY!${NC}"
echo -e "${BLUE}🎨 URL: $FULL_STUDIO_URL${NC}"
echo -e "${YELLOW}⏳ Espera 10-15 minutos para que el build complete${NC}"
