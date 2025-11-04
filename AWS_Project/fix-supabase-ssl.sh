#!/bin/bash

# Script para agregar SSL/CloudFront a Supabase existente

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
ALB_DNS="supabase-alb-1210454801.us-west-2.elb.amazonaws.com"
REGION="us-west-2"

echo -e "${BLUE}🔐 Configurando SSL para Supabase${NC}"

# 1. Crear distribución CloudFront
echo -e "${YELLOW}📡 Creando distribución CloudFront...${NC}"

cat > cloudfront-config.json << EOF
{
    "CallerReference": "supabase-$(date +%s)",
    "Comment": "Supabase SSL Distribution",
    "DefaultRootObject": "",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "supabase-alb",
                "DomainName": "$ALB_DNS",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only",
                    "OriginSslProtocols": {
                        "Quantity": 1,
                        "Items": ["TLSv1.2"]
                    }
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "supabase-alb",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "ForwardedValues": {
            "QueryString": true,
            "Cookies": {
                "Forward": "all"
            },
            "Headers": {
                "Quantity": 3,
                "Items": ["Authorization", "Content-Type", "Accept"]
            }
        },
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 31536000
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

# Crear distribución
DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --region us-east-1 --query 'Distribution.Id' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Distribución CloudFront creada: $DISTRIBUTION_ID${NC}"
    
    # Obtener el dominio de CloudFront
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --region us-east-1 --query 'Distribution.DomainName' --output text)
    
    echo -e "${GREEN}🌐 Tu nueva URL HTTPS de Supabase:${NC}"
    echo -e "${BLUE}https://$CLOUDFRONT_DOMAIN${NC}"
    
    # Guardar información
    cat > supabase-ssl-info.txt << EOF
=== SUPABASE CON SSL CONFIGURADO ===
Fecha: $(date)

🌐 URL HTTPS: https://$CLOUDFRONT_DOMAIN
🔗 URL HTTP Original: http://$ALB_DNS
📡 CloudFront Distribution ID: $DISTRIBUTION_ID

=== CONFIGURACIÓN PARA APLICACIONES ===
Supabase URL: https://$CLOUDFRONT_DOMAIN
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

=== ENDPOINTS ===
- REST API: https://$CLOUDFRONT_DOMAIN/rest/v1/
- Auth: https://$CLOUDFRONT_DOMAIN/auth/v1/
- Storage: https://$CLOUDFRONT_DOMAIN/storage/v1/

=== NOTA IMPORTANTE ===
CloudFront puede tardar 5-15 minutos en desplegarse completamente.
Mientras tanto, puedes usar la URL HTTP para pruebas internas.

=== COMANDOS ÚTILES ===
# Ver estado de distribución:
aws cloudfront get-distribution --id $DISTRIBUTION_ID --region us-east-1 --query 'Distribution.Status' --output text

# Invalidar cache (si haces cambios):
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-ssl-info.txt${NC}"
    
    # Verificar estado
    echo -e "${YELLOW}⏳ Verificando estado de CloudFront (puede tardar unos minutos)...${NC}"
    DISTRIBUTION_STATUS=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --region us-east-1 --query 'Distribution.Status' --output text)
    echo -e "${BLUE}Estado actual: $DISTRIBUTION_STATUS${NC}"
    
    if [ "$DISTRIBUTION_STATUS" = "InProgress" ]; then
        echo -e "${YELLOW}⏳ CloudFront aún desplegándose. Estará listo en 5-15 minutos.${NC}"
        echo -e "${BLUE}Mientras tanto, verifica que los servicios ECS estén funcionando...${NC}"
    fi
    
else
    echo -e "${RED}❌ Error creando distribución CloudFront${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f cloudfront-config.json

echo -e "${GREEN}🎉 SSL configurado exitosamente!${NC}"
echo -e "${BLUE}Tu Supabase ahora está disponible en HTTPS: https://$CLOUDFRONT_DOMAIN${NC}"
