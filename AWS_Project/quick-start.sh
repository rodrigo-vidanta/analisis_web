#!/bin/bash
# ============================================================================
# INICIO RÁPIDO - MIGRACIÓN RAILWAY → AWS
# ============================================================================
# Script para ejecutar toda la configuración y migración de manera automática

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

print_banner() {
    print_colored "PURPLE" "
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 MIGRACIÓN RAILWAY → AWS CON CURSOR AI                  ║
║                                                              ║
║    Sistema automático de migración completa                  ║
║    Powered by: AWS CLI + Cursor + Python                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"
}

show_menu() {
    print_colored "CYAN" "\n📋 OPCIONES DISPONIBLES:"
    print_colored "CYAN" "1. 🔧 Configuración inicial completa"
    print_colored "CYAN" "2. 🔍 Verificar configuración actual"
    print_colored "CYAN" "3. 🎮 Modo interactivo (recomendado)"
    print_colored "CYAN" "4. 🧪 Dry run - Simular migración completa"
    print_colored "CYAN" "5. 🚀 Ejecutar migración completa"
    print_colored "CYAN" "6. 📊 Ver estado de recursos AWS"
    print_colored "CYAN" "7. 🗑️  Limpieza de emergencia"
    print_colored "CYAN" "8. 📖 Mostrar documentación"
    print_colored "CYAN" "9. 🚪 Salir"
    echo
}

setup_environment() {
    print_colored "BLUE" "\n🔧 Ejecutando configuración inicial..."
    
    if [[ -f "./setup-aws-environment.sh" ]]; then
        chmod +x ./setup-aws-environment.sh
        ./setup-aws-environment.sh
    else
        print_colored "RED" "❌ Error: setup-aws-environment.sh no encontrado"
        return 1
    fi
    
    print_colored "GREEN" "✅ Configuración inicial completada"
}

verify_setup() {
    print_colored "BLUE" "\n🔍 Verificando configuración..."
    
    # Verificar AWS CLI
    if command -v aws >/dev/null 2>&1; then
        print_colored "GREEN" "✅ AWS CLI instalado"
        
        if aws sts get-caller-identity >/dev/null 2>&1; then
            IDENTITY=$(aws sts get-caller-identity)
            USER_ARN=$(echo $IDENTITY | jq -r '.Arn' 2>/dev/null || echo "Usuario AWS")
            print_colored "GREEN" "✅ Credenciales configuradas: $USER_ARN"
        else
            print_colored "RED" "❌ Credenciales AWS no configuradas"
            return 1
        fi
    else
        print_colored "RED" "❌ AWS CLI no instalado"
        return 1
    fi
    
    # Verificar Python
    if command -v python3 >/dev/null 2>&1; then
        print_colored "GREEN" "✅ Python3 disponible"
        
        if python3 -c "import yaml, boto3" 2>/dev/null; then
            print_colored "GREEN" "✅ Dependencias Python instaladas"
        else
            print_colored "YELLOW" "⚠️  Instalando dependencias Python..."
            pip3 install --user pyyaml boto3 requests
        fi
    else
        print_colored "RED" "❌ Python3 no encontrado"
        return 1
    fi
    
    # Verificar archivos
    local required_files=("migration-control.yaml" "migration-controller.py" ".cursorrules")
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_colored "GREEN" "✅ $file presente"
        else
            print_colored "RED" "❌ $file no encontrado"
            return 1
        fi
    done
    
    # Verificar base de conocimiento
    if [[ -d "aws-knowledge-base" ]]; then
        KB_FILES=$(ls aws-knowledge-base/*.txt 2>/dev/null | wc -l)
        print_colored "GREEN" "✅ Base de conocimiento AWS ($KB_FILES archivos)"
    else
        print_colored "YELLOW" "⚠️  Base de conocimiento no encontrada"
    fi
    
    print_colored "GREEN" "\n✅ Verificación completada exitosamente"
}

interactive_mode() {
    print_colored "BLUE" "\n🎮 Iniciando modo interactivo..."
    
    if [[ -f "./migration-controller.py" ]]; then
        python3 ./migration-controller.py --interactive
    else
        print_colored "RED" "❌ Error: migration-controller.py no encontrado"
        return 1
    fi
}

dry_run_migration() {
    print_colored "BLUE" "\n🧪 Ejecutando simulación de migración completa..."
    print_colored "YELLOW" "⚠️  Esto NO creará recursos reales en AWS"
    
    read -p "¿Continuar con dry run? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python3 ./migration-controller.py --full --dry-run
    else
        print_colored "CYAN" "⏭️  Dry run cancelado"
    fi
}

full_migration() {
    print_colored "RED" "\n🚀 MIGRACIÓN COMPLETA - ESTO CREARÁ RECURSOS REALES EN AWS"
    print_colored "YELLOW" "⚠️  Esta operación:"
    print_colored "YELLOW" "   - Creará recursos en AWS que generarán costos"
    print_colored "YELLOW" "   - Modificará tu infraestructura actual"
    print_colored "YELLOW" "   - Puede tomar 2-4 horas en completarse"
    
    print_colored "CYAN" "\n💡 Recomendación: Ejecuta primero un dry run (opción 4)"
    
    read -p "¿Estás seguro de continuar? Escribe 'MIGRATE' para confirmar: " confirm
    
    if [ "$confirm" = "MIGRATE" ]; then
        print_colored "GREEN" "🚀 Iniciando migración completa..."
        python3 ./migration-controller.py --full
    else
        print_colored "CYAN" "⏭️  Migración cancelada"
    fi
}

check_resources() {
    print_colored "BLUE" "\n📊 Verificando recursos AWS..."
    
    if [[ -f "./check-aws-resources.sh" ]]; then
        chmod +x ./check-aws-resources.sh
        ./check-aws-resources.sh
    else
        print_colored "YELLOW" "⚠️  Script de verificación no encontrado, usando comandos básicos..."
        
        echo -e "\n🔐 Identidad AWS:"
        aws sts get-caller-identity 2>/dev/null || print_colored "RED" "❌ Error obteniendo identidad"
        
        echo -e "\n🌐 VPCs:"
        aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock,State]' --output table 2>/dev/null || print_colored "RED" "❌ Error listando VPCs"
        
        echo -e "\n🖥️  ECS Clusters:"
        aws ecs list-clusters --query 'clusterArns' --output table 2>/dev/null || print_colored "RED" "❌ Error listando clusters ECS"
        
        echo -e "\n🗄️  RDS Instances:"
        aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]' --output table 2>/dev/null || print_colored "RED" "❌ Error listando RDS"
    fi
}

emergency_cleanup() {
    print_colored "RED" "\n🗑️  LIMPIEZA DE EMERGENCIA"
    print_colored "RED" "⚠️  ESTO ELIMINARÁ TODOS LOS RECURSOS CREADOS"
    print_colored "YELLOW" "Esta operación:"
    print_colored "YELLOW" "   - Eliminará servicios ECS"
    print_colored "YELLOW" "   - Eliminará instancias RDS"
    print_colored "YELLOW" "   - Eliminará clusters ElastiCache"
    print_colored "YELLOW" "   - Eliminará Load Balancers"
    print_colored "YELLOW" "   - NO se puede deshacer"
    
    read -p "¿Estás seguro? Escribe 'DELETE' para confirmar: " confirm
    
    if [ "$confirm" = "DELETE" ]; then
        if [[ -f "./cleanup-aws-resources.sh" ]]; then
            chmod +x ./cleanup-aws-resources.sh
            ./cleanup-aws-resources.sh
        else
            print_colored "RED" "❌ Script de limpieza no encontrado"
        fi
    else
        print_colored "CYAN" "⏭️  Limpieza cancelada"
    fi
}

show_documentation() {
    print_colored "BLUE" "\n📖 DOCUMENTACIÓN Y RECURSOS"
    print_colored "CYAN" "
📁 Archivos principales:
   - migration-control.yaml    : Plan maestro de migración
   - migration-controller.py   : Controlador automático
   - setup-aws-environment.sh  : Configuración inicial
   - README.md                 : Documentación completa

📚 Base de conocimiento AWS:
   - aws-knowledge-base/       : Documentación AWS CLI
   - templates/                : Plantillas de configuración

🎯 Configuración Cursor:
   - .cursorrules              : Reglas para Cursor AI
   - cursor-context.md         : Contexto del proyecto

💡 Comandos útiles:
   aws sts get-caller-identity              # Verificar credenciales
   python3 migration-controller.py --help  # Ver opciones
   ./check-aws-resources.sh                # Ver recursos AWS
   
📊 Monitoreo:
   - CloudWatch Dashboard: migration-dashboard
   - Logs: /ecs/n8n, /ecs/n8n-worker
   - Métricas: CPU, Memoria, Conexiones DB
"
    
    if [[ -f "README.md" ]]; then
        print_colored "CYAN" "\n📄 Para documentación completa, ver README.md"
    fi
}

main() {
    print_banner
    
    while true; do
        show_menu
        read -p "Selecciona una opción (1-9): " choice
        
        case $choice in
            1)
                setup_environment
                ;;
            2)
                verify_setup
                ;;
            3)
                interactive_mode
                ;;
            4)
                dry_run_migration
                ;;
            5)
                full_migration
                ;;
            6)
                check_resources
                ;;
            7)
                emergency_cleanup
                ;;
            8)
                show_documentation
                ;;
            9)
                print_colored "GREEN" "\n👋 ¡Hasta luego! Migración exitosa 🚀"
                exit 0
                ;;
            *)
                print_colored "RED" "❌ Opción inválida. Por favor selecciona 1-9."
                ;;
        esac
        
        print_colored "YELLOW" "\n⏸️  Presiona Enter para continuar..."
        read
    done
}

# Verificar si estamos en el directorio correcto
if [[ ! -f "migration-control.yaml" ]]; then
    print_colored "RED" "❌ Error: No se encontró migration-control.yaml"
    print_colored "YELLOW" "💡 Asegúrate de ejecutar este script desde el directorio del proyecto"
    exit 1
fi

# Ejecutar función principal
main
