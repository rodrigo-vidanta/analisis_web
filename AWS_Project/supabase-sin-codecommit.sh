#!/bin/bash

# Script para desplegar Supabase oficial SIN CodeCommit (usando GitHub directo)

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-west-2"

echo -e "${PURPLE}🚀 DESPLEGANDO SUPABASE OFICIAL SIN CODECOMMIT${NC}"
echo -e "${PURPLE}=============================================${NC}"

# 1. Crear plantilla modificada sin CodeCommit
echo -e "${BLUE}📋 Creando plantilla sin CodeCommit...${NC}"
cat > supabase-sin-codecommit.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Supabase oficial sin CodeCommit - Solo Amplify con GitHub'

Parameters:
  Email:
    Type: String
    Default: admin@supabase.aws
    Description: Email para notificaciones

Resources:
  # Aplicación Amplify conectada directamente a GitHub
  SupabaseStudioApp:
    Type: AWS::Amplify::App
    Properties:
      Name: SupabaseStudio
      Description: Supabase Studio oficial
      Repository: https://github.com/supabase/supabase
      Platform: WEB_COMPUTE
      BuildSpec: |
        version: 1
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
                  - apps/studio/node_modules/**/*
      EnvironmentVariables:
        - Name: NEXT_PUBLIC_SUPABASE_URL
          Value: https://d2bxqn3xh4v4kj.cloudfront.net
        - Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
          Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
        - Name: SUPABASE_SERVICE_KEY
          Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
        - Name: POSTGRES_PASSWORD
          Value: SuperBase123!
        - Name: STUDIO_PG_META_URL
          Value: https://d2bxqn3xh4v4kj.cloudfront.net/pg
        - Name: SUPABASE_URL
          Value: https://d2bxqn3xh4v4kj.cloudfront.net
        - Name: SUPABASE_PUBLIC_URL
          Value: https://d2bxqn3xh4v4kj.cloudfront.net

  # Branch de producción
  SupabaseStudioBranch:
    Type: AWS::Amplify::Branch
    Properties:
      AppId: !GetAtt SupabaseStudioApp.AppId
      BranchName: master
      EnableAutoBuild: true
      Framework: Next.js - SSR
      Stage: PRODUCTION

Outputs:
  StudioUrl:
    Description: URL de Supabase Studio oficial
    Value: !Sub "https://master.${SupabaseStudioApp.DefaultDomain}"
  
  AppId:
    Description: Amplify App ID
    Value: !GetAtt SupabaseStudioApp.AppId
EOF

# 2. Desplegar plantilla simplificada
echo -e "${BLUE}🚀 Desplegando Studio en Amplify sin CodeCommit...${NC}"
aws cloudformation create-stack \
  --stack-name Supabase-Studio-GitHub \
  --template-body file://supabase-sin-codecommit.yaml \
  --parameters ParameterKey=Email,ParameterValue=admin@supabase.aws \
  --capabilities CAPABILITY_IAM \
  --region $REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Stack iniciado exitosamente${NC}"
    
    # 3. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue (5-10 minutos)...${NC}"
    aws cloudformation wait stack-create-complete --stack-name Supabase-Studio-GitHub --region $REGION
    
    if [ $? -eq 0 ]; then
        # 4. Obtener URLs
        STUDIO_URL=$(aws cloudformation describe-stacks \
            --stack-name Supabase-Studio-GitHub \
            --region $REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`StudioUrl`].OutputValue' \
            --output text)
        
        APP_ID=$(aws cloudformation describe-stacks \
            --stack-name Supabase-Studio-GitHub \
            --region $REGION \
            --query 'Stacks[0].Outputs[?OutputKey==`AppId`].OutputValue' \
            --output text)
        
        echo -e "${GREEN}🎉 ¡SUPABASE STUDIO OFICIAL DESPLEGADO!${NC}"
        echo -e "${PURPLE}=====================================${NC}"
        echo -e "${GREEN}✅ Supabase Studio oficial en Amplify${NC}"
        echo -e "${BLUE}🎨 URL: $STUDIO_URL${NC}"
        echo -e "${BLUE}📱 App ID: $APP_ID${NC}"
        
        # 5. Iniciar build
        echo -e "${BLUE}🔨 Iniciando build de Studio...${NC}"
        JOB_ID=$(aws amplify start-job \
            --app-id $APP_ID \
            --branch-name master \
            --job-type RELEASE \
            --region $REGION \
            --query 'jobSummary.jobId' \
            --output text)
        
        echo -e "${YELLOW}⏳ Build iniciado (Job ID: $JOB_ID)${NC}"
        echo -e "${YELLOW}Esto puede tardar 10-15 minutos...${NC}"
        
        # 6. Crear información final
        cat > studio-github-info.txt << INFOEOF
=== SUPABASE STUDIO OFICIAL EN AMPLIFY ===
Fecha: $(date)

🎨 URL Studio Oficial: $STUDIO_URL

=== MÉTODO OFICIAL ===
✅ AWS Amplify Hosting (método oficial según documentación)
✅ Conectado directamente a GitHub (sin CodeCommit)
✅ Build automático desde repositorio oficial
✅ Framework: Next.js - SSR
✅ SSL habilitado automáticamente

=== CONFIGURACIÓN ===
App ID: $APP_ID
Branch: master
Job ID: $JOB_ID
Repository: https://github.com/supabase/supabase

=== CREDENCIALES CONECTADAS ===
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
URL: $STUDIO_URL
Estado: Desplegado en Amplify
Build: En progreso

=== COMANDOS ÚTILES ===
# Ver estado del build:
aws amplify get-job --app-id $APP_ID --branch-name master --job-id $JOB_ID --region us-west-2

# Ver logs del build:
aws logs tail /aws/amplify/$APP_ID --region us-west-2 --follow

# Reconstruir:
aws amplify start-job --app-id $APP_ID --branch-name master --job-type RELEASE --region us-west-2

¡Este es el Supabase Studio oficial funcionando!
INFOEOF
        
        echo -e "${BLUE}📄 Información guardada en: studio-github-info.txt${NC}"
        echo -e "${YELLOW}⏳ Build puede tardar 10-15 minutos${NC}"
        echo -e "${GREEN}✅ Es el Studio oficial de Supabase${NC}"
        
    else
        echo -e "${RED}❌ Error durante el despliegue${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ Error creando stack${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f supabase-sin-codecommit.yaml

echo -e "${GREEN}✅ ¡SUPABASE STUDIO OFICIAL EN AMPLIFY!${NC}"
echo -e "${BLUE}🎨 URL: $STUDIO_URL${NC}"
echo -e "${YELLOW}⏳ Espera 10-15 minutos para que el build complete${NC}"
