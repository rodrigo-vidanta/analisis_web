#!/bin/bash
# ============================================================================
# CONFIGURACIÓN AUTOMÁTICA DEL ENTORNO AWS PARA CURSOR
# ============================================================================
# Este script configura AWS CLI y genera la base de conocimiento para Cursor

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_colored() {
    local color=$1
    local message=$2
    echo -e "${!color}${message}${NC}"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_colored "PURPLE" "🚀 CONFIGURANDO ENTORNO AWS PARA CURSOR"
print_colored "PURPLE" "=" "$(printf '=%.0s' {1..50})"

# ============================================================================
# 1. INSTALAR AWS CLI
# ============================================================================
print_colored "BLUE" "\n📦 1. Verificando/Instalando AWS CLI..."

if command_exists aws; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d/ -f2 | cut -d' ' -f1)
    print_colored "GREEN" "✅ AWS CLI ya está instalado (versión: $AWS_VERSION)"
else
    print_colored "YELLOW" "⚠️  AWS CLI no encontrado. Instalando..."
    
    # Detectar sistema operativo
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            print_colored "CYAN" "📱 Instalando via Homebrew..."
            brew install awscli
        else
            print_colored "CYAN" "📱 Instalando via curl..."
            curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
            sudo installer -pkg AWSCLIV2.pkg -target /
            rm AWSCLIV2.pkg
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        print_colored "CYAN" "🐧 Instalando en Linux..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf awscliv2.zip aws/
    else
        print_colored "RED" "❌ Sistema operativo no soportado: $OSTYPE"
        exit 1
    fi
    
    print_colored "GREEN" "✅ AWS CLI instalado exitosamente"
fi

# ============================================================================
# 2. CONFIGURAR CREDENCIALES AWS
# ============================================================================
print_colored "BLUE" "\n🔐 2. Configurando credenciales AWS..."

# Verificar si ya están configuradas
if aws sts get-caller-identity >/dev/null 2>&1; then
    CURRENT_USER=$(aws sts get-caller-identity --query 'Arn' --output text)
    print_colored "GREEN" "✅ Credenciales ya configuradas para: $CURRENT_USER"
    
    read -p "¿Quieres reconfigurar las credenciales? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_colored "CYAN" "⏭️  Saltando configuración de credenciales"
    else
        aws configure
    fi
else
    print_colored "YELLOW" "⚠️  Credenciales no configuradas. Iniciando configuración..."
    print_colored "CYAN" "💡 Necesitarás:"
    print_colored "CYAN" "   - AWS Access Key ID"
    print_colored "CYAN" "   - AWS Secret Access Key"
    print_colored "CYAN" "   - Región por defecto (recomendado: us-east-1)"
    print_colored "CYAN" "   - Formato de salida (recomendado: json)"
    
    aws configure
fi

# Verificar configuración
print_colored "CYAN" "🔍 Verificando configuración..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    IDENTITY=$(aws sts get-caller-identity)
    USER_ARN=$(echo $IDENTITY | jq -r '.Arn')
    ACCOUNT_ID=$(echo $IDENTITY | jq -r '.Account')
    
    print_colored "GREEN" "✅ Configuración exitosa:"
    print_colored "GREEN" "   Usuario: $USER_ARN"
    print_colored "GREEN" "   Cuenta: $ACCOUNT_ID"
else
    print_colored "RED" "❌ Error en la configuración de credenciales"
    exit 1
fi

# ============================================================================
# 3. INSTALAR DEPENDENCIAS ADICIONALES
# ============================================================================
print_colored "BLUE" "\n🛠️  3. Instalando dependencias adicionales..."

# Verificar/instalar jq para parsing JSON
if ! command_exists jq; then
    print_colored "YELLOW" "⚠️  Instalando jq para parsing JSON..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y jq
    fi
    print_colored "GREEN" "✅ jq instalado"
else
    print_colored "GREEN" "✅ jq ya está disponible"
fi

# Verificar/instalar Python y PyYAML
if ! command_exists python3; then
    print_colored "RED" "❌ Python3 es requerido pero no está instalado"
    exit 1
fi

print_colored "CYAN" "🐍 Instalando dependencias Python..."
pip3 install --user pyyaml boto3 requests

# ============================================================================
# 4. GENERAR BASE DE CONOCIMIENTO AWS CLI
# ============================================================================
print_colored "BLUE" "\n📚 4. Generando base de conocimiento AWS CLI..."

# Crear directorio para la base de conocimiento
KB_DIR="aws-knowledge-base"
mkdir -p "$KB_DIR"

# Servicios principales para la migración
SERVICES=(
    "ec2"           # Networking, VPC, Security Groups
    "ecs"           # Containers para n8n y Supabase
    "rds"           # PostgreSQL databases
    "elasticache"   # Redis
    "s3"            # Storage para frontend
    "cloudfront"    # CDN
    "route53"       # DNS
    "elbv2"         # Load Balancers
    "iam"           # Permisos y roles
    "secretsmanager" # Gestión de secretos
    "cloudwatch"    # Monitoreo
    "cloudformation" # Infrastructure as Code
)

print_colored "CYAN" "📖 Generando documentación para ${#SERVICES[@]} servicios..."

# Generar documentación general
print_colored "CYAN" "   📄 Documentación general..."
aws help > "$KB_DIR/aws-general-help.txt" 2>/dev/null

# Generar documentación por servicio
for service in "${SERVICES[@]}"; do
    print_colored "CYAN" "   📄 Documentando $service..."
    
    # Help principal del servicio
    aws $service help > "$KB_DIR/aws-$service-help.txt" 2>/dev/null
    
    # Comandos wait si existen
    aws $service wait help > "$KB_DIR/aws-$service-wait-help.txt" 2>/dev/null || true
    
    # Ejemplos específicos para servicios críticos
    case $service in
        "ec2")
            echo "# Ejemplos comunes EC2
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-12345 --cidr-block 10.0.1.0/24
aws ec2 create-security-group --group-name my-sg --description 'My security group'
aws ec2 describe-vpcs
aws ec2 describe-subnets
aws ec2 describe-security-groups" > "$KB_DIR/ec2-examples.txt"
            ;;
        "ecs")
            echo "# Ejemplos comunes ECS
aws ecs create-cluster --cluster-name my-cluster
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster my-cluster --service-name my-service
aws ecs list-clusters
aws ecs describe-services --cluster my-cluster --services my-service" > "$KB_DIR/ecs-examples.txt"
            ;;
        "rds")
            echo "# Ejemplos comunes RDS
aws rds create-db-instance --db-instance-identifier mydb --db-instance-class db.t3.micro
aws rds describe-db-instances
aws rds create-db-snapshot --db-instance-identifier mydb --db-snapshot-identifier mydb-snapshot" > "$KB_DIR/rds-examples.txt"
            ;;
    esac
done

# Generar índice de documentación
print_colored "CYAN" "   📄 Generando índice..."
cat > "$KB_DIR/INDEX.md" << EOF
# AWS CLI Knowledge Base para Migración Railway → AWS

## Documentación Generada
Fecha: $(date)
Servicios documentados: ${#SERVICES[@]}

## Servicios Principales

EOF

for service in "${SERVICES[@]}"; do
    echo "- [$service](./aws-$service-help.txt)" >> "$KB_DIR/INDEX.md"
done

cat >> "$KB_DIR/INDEX.md" << EOF

## Archivos de Ayuda
- [General](./aws-general-help.txt)
- [Ejemplos EC2](./ec2-examples.txt)
- [Ejemplos ECS](./ecs-examples.txt)
- [Ejemplos RDS](./rds-examples.txt)

## Uso con Cursor
Esta base de conocimiento está diseñada para ser usada con Cursor AI.
Puedes referenciar estos archivos en tus prompts para obtener información
precisa sobre comandos AWS CLI.

### Ejemplo de prompt:
"Usando la documentación en aws-knowledge-base/aws-ec2-help.txt, 
crea una VPC con 2 subnets públicas y 2 privadas"
EOF

print_colored "GREEN" "✅ Base de conocimiento generada en $KB_DIR/"

# ============================================================================
# 5. CONFIGURAR CURSOR PARA AWS
# ============================================================================
print_colored "BLUE" "\n🎯 5. Configurando Cursor para AWS..."

# Crear archivo .cursorrules
cat > ".cursorrules" << 'EOF'
# REGLAS PARA CURSOR - MIGRACIÓN AWS
# ================================

Eres un experto en AWS DevOps con acceso completo a AWS CLI. Tu objetivo es ayudar con la migración de Railway a AWS.

## Capacidades Disponibles:
- AWS CLI instalado y configurado
- Acceso completo para crear, modificar y eliminar recursos AWS
- Base de conocimiento AWS CLI en ./aws-knowledge-base/
- Controlador de migración en ./migration-controller.py
- Archivo de control maestro en ./migration-control.yaml

## Reglas Obligatorias:
1. SIEMPRE verifica comandos con --dry-run cuando esté disponible
2. USA aws sts get-caller-identity para verificar credenciales antes de operaciones
3. ETIQUETA todos los recursos con: Project=railway-migration, Environment=production, ManagedBy=cursor
4. MUESTRA el comando exacto antes de ejecutarlo
5. EXPLICA qué hace cada comando antes de ejecutarlo
6. USA formato JSON para salidas que requieran parsing
7. CONSULTA la base de conocimiento en aws-knowledge-base/ antes de crear comandos

## Mejores Prácticas:
- Usar CloudFormation o Terraform para infraestructura compleja
- Crear recursos en us-east-1 por defecto
- Habilitar logging y monitoreo en todos los servicios
- Usar políticas IAM de menor privilegio
- Crear backups antes de modificaciones importantes
- Validar cada paso antes de continuar

## Servicios Prioritarios:
1. ECS Fargate para contenedores (n8n, Supabase)
2. RDS PostgreSQL para bases de datos
3. ElastiCache para Redis
4. S3 + CloudFront para frontend estático
5. Route53 para DNS y health checks
6. Application Load Balancer para distribución de tráfico

## Comandos de Verificación Frecuentes:
```bash
# Verificar identidad
aws sts get-caller-identity

# Listar recursos principales
aws ec2 describe-vpcs
aws ecs list-clusters
aws rds describe-db-instances
aws elasticache describe-cache-clusters
aws s3 ls
```

## Flujo de Trabajo:
1. Verificar credenciales AWS
2. Consultar migration-control.yaml para el plan
3. Ejecutar comandos paso a paso
4. Validar cada recurso creado
5. Actualizar variables en migration-controller.py
6. Continuar con siguiente fase

## En Caso de Errores:
- Revisar logs en migration.log
- Verificar permisos IAM
- Consultar documentación en aws-knowledge-base/
- Usar modo dry-run para testing
- Implementar rollback si es necesario

Recuerda: Siempre explica lo que vas a hacer antes de ejecutar comandos AWS.
EOF

print_colored "GREEN" "✅ Archivo .cursorrules creado"

# Crear archivo de contexto para Cursor
cat > "cursor-context.md" << EOF
# CONTEXTO DE MIGRACIÓN RAILWAY → AWS

## Estado Actual
- **Origen**: Railway (us-east4)
- **Destino**: AWS (us-east-1)
- **Servicios**: n8n + worker, PostgreSQL, Redis, React frontend

## Archivos Importantes
- \`migration-control.yaml\`: Plan maestro de migración
- \`migration-controller.py\`: Controlador automático
- \`aws-knowledge-base/\`: Documentación AWS CLI
- \`.cursorrules\`: Reglas para Cursor AI

## Variables de Entorno Actuales
\`\`\`bash
AWS_REGION=us-east-1
PROJECT_NAME=railway-migration
ENVIRONMENT=production
DOMAIN=tudominio.com  # Cambiar por tu dominio real
\`\`\`

## Próximos Pasos
1. Ejecutar: \`python3 migration-controller.py --interactive\`
2. O usar comandos directos con Cursor
3. Seguir el plan en migration-control.yaml

## Comandos Rápidos
\`\`\`bash
# Verificar configuración
aws sts get-caller-identity

# Modo interactivo
python3 migration-controller.py --interactive

# Dry run completo
python3 migration-controller.py --full --dry-run

# Ejecutar fase específica
python3 migration-controller.py --phase phase_1
\`\`\`
EOF

print_colored "GREEN" "✅ Archivo cursor-context.md creado"

# ============================================================================
# 6. CREAR SCRIPTS DE UTILIDAD
# ============================================================================
print_colored "BLUE" "\n🔧 6. Creando scripts de utilidad..."

# Script para verificar estado de recursos
cat > "check-aws-resources.sh" << 'EOF'
#!/bin/bash
# Script para verificar el estado de recursos AWS

echo "🔍 VERIFICANDO RECURSOS AWS"
echo "=========================="

echo -e "\n📊 Identidad AWS:"
aws sts get-caller-identity

echo -e "\n🌐 VPCs:"
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock,State,Tags[?Key==`Name`].Value|[0]]' --output table

echo -e "\n🖥️  ECS Clusters:"
aws ecs list-clusters --query 'clusterArns' --output table

echo -e "\n🗄️  RDS Instances:"
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Engine,DBInstanceClass]' --output table

echo -e "\n🔴 ElastiCache Clusters:"
aws elasticache describe-cache-clusters --query 'CacheClusters[*].[CacheClusterId,CacheClusterStatus,Engine,CacheNodeType]' --output table

echo -e "\n⚖️  Load Balancers:"
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,State.Code,Type,Scheme]' --output table

echo -e "\n🪣 S3 Buckets:"
aws s3 ls

echo -e "\n✅ Verificación completada"
EOF

chmod +x "check-aws-resources.sh"

# Script para limpiar recursos (emergencia)
cat > "cleanup-aws-resources.sh" << 'EOF'
#!/bin/bash
# Script de emergencia para limpiar recursos AWS
# ⚠️  USAR CON PRECAUCIÓN - ELIMINA RECURSOS

echo "⚠️  SCRIPT DE LIMPIEZA DE EMERGENCIA"
echo "=================================="
echo "Este script eliminará TODOS los recursos creados para la migración"
read -p "¿Estás seguro? Escribe 'DELETE' para continuar: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "❌ Operación cancelada"
    exit 1
fi

echo "🗑️  Iniciando limpieza..."

# Eliminar servicios ECS
echo "Eliminando servicios ECS..."
aws ecs list-services --cluster migration-cluster --query 'serviceArns' --output text | xargs -I {} aws ecs update-service --cluster migration-cluster --service {} --desired-count 0
sleep 30
aws ecs list-services --cluster migration-cluster --query 'serviceArns' --output text | xargs -I {} aws ecs delete-service --cluster migration-cluster --service {}

# Eliminar cluster ECS
aws ecs delete-cluster --cluster migration-cluster

# Eliminar RDS instances
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `migration`) || contains(DBInstanceIdentifier, `n8n`)].DBInstanceIdentifier' --output text | xargs -I {} aws rds delete-db-instance --db-instance-identifier {} --skip-final-snapshot

# Eliminar ElastiCache
aws elasticache describe-cache-clusters --query 'CacheClusters[?contains(CacheClusterId, `migration`) || contains(CacheClusterId, `redis`)].CacheClusterId' --output text | xargs -I {} aws elasticache delete-cache-cluster --cache-cluster-id {}

echo "⚠️  Limpieza iniciada. Los recursos pueden tardar varios minutos en eliminarse completamente."
EOF

chmod +x "cleanup-aws-resources.sh"

print_colored "GREEN" "✅ Scripts de utilidad creados"

# ============================================================================
# 7. VERIFICACIÓN FINAL
# ============================================================================
print_colored "BLUE" "\n✅ 7. Verificación final del entorno..."

# Verificar que todo esté funcionando
print_colored "CYAN" "🔍 Verificando componentes..."

# AWS CLI
if aws sts get-caller-identity >/dev/null 2>&1; then
    print_colored "GREEN" "✅ AWS CLI configurado correctamente"
else
    print_colored "RED" "❌ AWS CLI no configurado correctamente"
fi

# Python y dependencias
if python3 -c "import yaml, boto3" 2>/dev/null; then
    print_colored "GREEN" "✅ Dependencias Python disponibles"
else
    print_colored "RED" "❌ Faltan dependencias Python"
fi

# Archivos de configuración
if [[ -f "migration-control.yaml" && -f "migration-controller.py" && -f ".cursorrules" ]]; then
    print_colored "GREEN" "✅ Archivos de configuración presentes"
else
    print_colored "RED" "❌ Faltan archivos de configuración"
fi

# Base de conocimiento
if [[ -d "$KB_DIR" && -f "$KB_DIR/INDEX.md" ]]; then
    KB_FILES=$(ls "$KB_DIR"/*.txt 2>/dev/null | wc -l)
    print_colored "GREEN" "✅ Base de conocimiento generada ($KB_FILES archivos)"
else
    print_colored "RED" "❌ Base de conocimiento no generada correctamente"
fi

print_colored "PURPLE" "\n🎉 CONFIGURACIÓN COMPLETADA"
print_colored "PURPLE" "=========================="
print_colored "GREEN" "✅ AWS CLI configurado"
print_colored "GREEN" "✅ Base de conocimiento generada"
print_colored "GREEN" "✅ Cursor configurado"
print_colored "GREEN" "✅ Scripts de utilidad creados"

print_colored "CYAN" "\n📋 PRÓXIMOS PASOS:"
print_colored "CYAN" "1. Abre Cursor en este directorio"
print_colored "CYAN" "2. Usa prompts como: 'Verifica mi configuración AWS'"
print_colored "CYAN" "3. O ejecuta: python3 migration-controller.py --interactive"
print_colored "CYAN" "4. Sigue el plan en migration-control.yaml"

print_colored "YELLOW" "\n💡 COMANDOS ÚTILES:"
print_colored "YELLOW" "   ./check-aws-resources.sh     # Verificar recursos"
print_colored "YELLOW" "   python3 migration-controller.py --dry-run --full  # Simular migración"
print_colored "YELLOW" "   python3 migration-controller.py --interactive      # Modo interactivo"

print_colored "GREEN" "\n🚀 ¡Listo para comenzar la migración!"
