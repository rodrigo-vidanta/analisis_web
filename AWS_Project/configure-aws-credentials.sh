#!/bin/bash
# ============================================================================
# CONFIGURACIÓN AUTOMÁTICA DE CREDENCIALES AWS
# ============================================================================
# Script para configurar las credenciales AWS específicas del proyecto

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_colored() {
    local color=$1
    local message=$2
    echo -e "${!color}${message}${NC}"
}

print_colored "PURPLE" "🔐 CONFIGURANDO CREDENCIALES AWS PARA PROYECTO VAPI"
print_colored "PURPLE" "=" "$(printf '=%.0s' {1..60})"

# Información de la cuenta
ACCOUNT_EMAIL="rodrigomora@grupovidanta.com"
AWS_REGION="us-west-2"  # Oregon - Óptimo para VAPI

print_colored "CYAN" "\n📋 Información de la cuenta:"
print_colored "CYAN" "   Email: $ACCOUNT_EMAIL"
print_colored "CYAN" "   Región: $AWS_REGION (Oregon)"
print_colored "CYAN" "   Optimizado para: VAPI (latencia <50ms)"

print_colored "YELLOW" "\n⚠️  IMPORTANTE:"
print_colored "YELLOW" "   Necesitarás crear Access Keys en la consola AWS"
print_colored "YELLOW" "   1. Ve a: https://console.aws.amazon.com/iam/home#/security_credentials"
print_colored "YELLOW" "   2. Crea un nuevo Access Key"
print_colored "YELLOW" "   3. Guarda el Access Key ID y Secret Access Key"

read -p "¿Ya tienes las Access Keys? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_colored "CYAN" "\n💡 Pasos para crear Access Keys:"
    print_colored "CYAN" "   1. Inicia sesión en AWS Console con:"
    print_colored "CYAN" "      URL: https://signin.aws.amazon.com/"
    print_colored "CYAN" "      Email: $ACCOUNT_EMAIL"
    print_colored "CYAN" "      Password: [tu contraseña]"
    print_colored "CYAN" ""
    print_colored "CYAN" "   2. Ve a IAM > Security credentials"
    print_colored "CYAN" "   3. Crea Access Key para CLI"
    print_colored "CYAN" "   4. Descarga el archivo CSV o copia las keys"
    print_colored "CYAN" "   5. Ejecuta este script nuevamente"
    
    exit 0
fi

print_colored "BLUE" "\n🔧 Configurando AWS CLI..."

# Verificar si AWS CLI está instalado
if ! command -v aws >/dev/null 2>&1; then
    print_colored "RED" "❌ AWS CLI no está instalado"
    print_colored "CYAN" "💡 Ejecuta primero: ./setup-aws-environment.sh"
    exit 1
fi

# Configurar credenciales
print_colored "CYAN" "\n📝 Ingresa tus credenciales AWS:"

# Configurar usando aws configure
aws configure set region $AWS_REGION
aws configure set output json

print_colored "CYAN" "🔑 Ingresa tu AWS Access Key ID:"
read -r AWS_ACCESS_KEY_ID
aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"

print_colored "CYAN" "🔐 Ingresa tu AWS Secret Access Key:"
read -s AWS_SECRET_ACCESS_KEY
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
echo

print_colored "GREEN" "✅ Credenciales configuradas"

# Verificar configuración
print_colored "BLUE" "\n🔍 Verificando configuración..."

if aws sts get-caller-identity >/dev/null 2>&1; then
    IDENTITY=$(aws sts get-caller-identity)
    USER_ARN=$(echo $IDENTITY | jq -r '.Arn' 2>/dev/null || echo "Usuario AWS")
    ACCOUNT_ID=$(echo $IDENTITY | jq -r '.Account' 2>/dev/null || echo "Cuenta desconocida")
    
    print_colored "GREEN" "✅ Conexión exitosa:"
    print_colored "GREEN" "   Usuario: $USER_ARN"
    print_colored "GREEN" "   Cuenta: $ACCOUNT_ID"
    print_colored "GREEN" "   Región: $AWS_REGION"
else
    print_colored "RED" "❌ Error: No se pudo verificar la conexión"
    print_colored "YELLOW" "💡 Verifica que las credenciales sean correctas"
    exit 1
fi

# Verificar permisos básicos
print_colored "BLUE" "\n🔐 Verificando permisos..."

# Lista de servicios que necesitamos
SERVICES_TO_CHECK=(
    "ec2:DescribeVpcs"
    "ecs:ListClusters" 
    "rds:DescribeDBInstances"
    "elasticache:DescribeCacheClusters"
    "s3:ListAllMyBuckets"
    "iam:GetUser"
)

PERMISSIONS_OK=true

for service_action in "${SERVICES_TO_CHECK[@]}"; do
    service=$(echo $service_action | cut -d: -f1)
    action=$(echo $service_action | cut -d: -f2)
    
    case $service in
        "ec2")
            if aws ec2 describe-vpcs --max-items 1 >/dev/null 2>&1; then
                print_colored "GREEN" "   ✅ EC2 permissions OK"
            else
                print_colored "RED" "   ❌ EC2 permissions missing"
                PERMISSIONS_OK=false
            fi
            ;;
        "ecs")
            if aws ecs list-clusters --max-items 1 >/dev/null 2>&1; then
                print_colored "GREEN" "   ✅ ECS permissions OK"
            else
                print_colored "RED" "   ❌ ECS permissions missing"
                PERMISSIONS_OK=false
            fi
            ;;
        "rds")
            if aws rds describe-db-instances --max-items 1 >/dev/null 2>&1; then
                print_colored "GREEN" "   ✅ RDS permissions OK"
            else
                print_colored "RED" "   ❌ RDS permissions missing"
                PERMISSIONS_OK=false
            fi
            ;;
        "elasticache")
            if aws elasticache describe-cache-clusters --max-items 1 >/dev/null 2>&1; then
                print_colored "GREEN" "   ✅ ElastiCache permissions OK"
            else
                print_colored "RED" "   ❌ ElastiCache permissions missing"
                PERMISSIONS_OK=false
            fi
            ;;
        "s3")
            if aws s3 ls >/dev/null 2>&1; then
                print_colored "GREEN" "   ✅ S3 permissions OK"
            else
                print_colored "RED" "   ❌ S3 permissions missing"
                PERMISSIONS_OK=false
            fi
            ;;
        "iam")
            if aws iam get-user >/dev/null 2>&1; then
                print_colored "GREEN" "   ✅ IAM permissions OK"
            else
                print_colored "YELLOW" "   ⚠️  IAM permissions limited (normal para algunos usuarios)"
            fi
            ;;
    esac
done

if [ "$PERMISSIONS_OK" = true ]; then
    print_colored "GREEN" "\n✅ Todos los permisos necesarios están disponibles"
else
    print_colored "YELLOW" "\n⚠️  Algunos permisos están limitados"
    print_colored "CYAN" "💡 Contacta al administrador AWS para obtener permisos completos"
fi

# Verificar latencia a VAPI
print_colored "BLUE" "\n🌐 Verificando latencia a VAPI..."

VAPI_IPS=("44.229.228.186" "44.238.177.138")

for ip in "${VAPI_IPS[@]}"; do
    if command -v ping >/dev/null 2>&1; then
        print_colored "CYAN" "   Probando conectividad a $ip..."
        if ping -c 3 -W 3000 $ip >/dev/null 2>&1; then
            print_colored "GREEN" "   ✅ Conectividad OK a $ip"
        else
            print_colored "YELLOW" "   ⚠️  No se pudo hacer ping a $ip (puede ser normal)"
        fi
    fi
done

# Crear archivo de configuración local
print_colored "BLUE" "\n📄 Creando archivo de configuración local..."

cat > "aws-config.env" << EOF
# Configuración AWS para proyecto VAPI
export AWS_REGION=us-west-2
export AWS_DEFAULT_REGION=us-west-2
export PROJECT_NAME=railway-migration
export ENVIRONMENT=production

# IPs de VAPI para security groups
export VAPI_IP_1=44.229.228.186
export VAPI_IP_2=44.238.177.138

# Configuración de latencia
export LATENCY_TARGET=50
export REGION_OPTIMIZED=us-west-2

# Información de cuenta
export AWS_ACCOUNT_EMAIL=rodrigomora@grupovidanta.com
export AWS_ACCOUNT_ID=$ACCOUNT_ID
EOF

print_colored "GREEN" "✅ Archivo aws-config.env creado"

# Actualizar migration-controller.py con la región correcta
if [[ -f "migration-controller.py" ]]; then
    sed -i.bak 's/us-east-1/us-west-2/g' migration-controller.py
    print_colored "GREEN" "✅ migration-controller.py actualizado para us-west-2"
fi

print_colored "PURPLE" "\n🎉 CONFIGURACIÓN COMPLETADA"
print_colored "PURPLE" "=========================="
print_colored "GREEN" "✅ Credenciales AWS configuradas"
print_colored "GREEN" "✅ Región optimizada: us-west-2 (Oregon)"
print_colored "GREEN" "✅ Configuración para VAPI lista"
print_colored "GREEN" "✅ Permisos verificados"

print_colored "CYAN" "\n📋 PRÓXIMOS PASOS:"
print_colored "CYAN" "1. Cargar variables: source aws-config.env"
print_colored "CYAN" "2. Verificar recursos: ./check-aws-resources.sh"
print_colored "CYAN" "3. Iniciar migración: ./quick-start.sh"

print_colored "YELLOW" "\n💡 COMANDOS ÚTILES:"
print_colored "YELLOW" "   source aws-config.env                    # Cargar variables"
print_colored "YELLOW" "   aws sts get-caller-identity              # Verificar conexión"
print_colored "YELLOW" "   python3 migration-controller.py --help   # Ver opciones"

print_colored "GREEN" "\n🚀 ¡Listo para migrar con latencia optimizada para VAPI!"
