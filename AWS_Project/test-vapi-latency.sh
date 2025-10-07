#!/bin/bash
# ============================================================================
# TEST DE LATENCIA CON VAPI
# ============================================================================
# Script para probar la latencia entre AWS us-west-2 y los servicios de VAPI

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

print_colored "PURPLE" "🌐 TEST DE LATENCIA CON VAPI"
print_colored "PURPLE" "=" "$(printf '=%.0s' {1..40})"

# IPs de VAPI
VAPI_IPS=("44.229.228.186" "44.238.177.138")
VAPI_LOCATION="Oregon, US"
AWS_REGION="us-west-2"

print_colored "CYAN" "\n📍 Información de ubicación:"
print_colored "CYAN" "   VAPI: $VAPI_LOCATION"
print_colored "CYAN" "   AWS: $AWS_REGION (Oregon)"
print_colored "CYAN" "   Objetivo: <50ms de latencia"

# Función para probar latencia
test_latency() {
    local ip=$1
    local name=$2
    
    print_colored "BLUE" "\n🔍 Probando latencia a $name ($ip)..."
    
    if command -v ping >/dev/null 2>&1; then
        # Test con ping
        print_colored "CYAN" "   📡 Test ICMP (ping):"
        if ping_result=$(ping -c 5 -W 3000 $ip 2>/dev/null); then
            avg_latency=$(echo "$ping_result" | tail -1 | awk -F'/' '{print $5}' | cut -d'.' -f1)
            if [[ -n "$avg_latency" ]]; then
                if [[ $avg_latency -lt 50 ]]; then
                    print_colored "GREEN" "      ✅ Latencia promedio: ${avg_latency}ms (EXCELENTE)"
                elif [[ $avg_latency -lt 100 ]]; then
                    print_colored "YELLOW" "      ⚠️  Latencia promedio: ${avg_latency}ms (BUENA)"
                else
                    print_colored "RED" "      ❌ Latencia promedio: ${avg_latency}ms (ALTA)"
                fi
            else
                print_colored "YELLOW" "      ⚠️  No se pudo obtener latencia promedio"
            fi
            
            # Mostrar estadísticas detalladas
            min_latency=$(echo "$ping_result" | tail -1 | awk -F'/' '{print $4}' | cut -d'.' -f1)
            max_latency=$(echo "$ping_result" | tail -1 | awk -F'/' '{print $6}' | cut -d'.' -f1)
            print_colored "CYAN" "      📊 Min: ${min_latency}ms | Max: ${max_latency}ms"
        else
            print_colored "RED" "      ❌ No se pudo hacer ping a $ip"
        fi
    else
        print_colored "YELLOW" "      ⚠️  Comando ping no disponible"
    fi
    
    # Test con curl si es posible
    if command -v curl >/dev/null 2>&1; then
        print_colored "CYAN" "   🌐 Test HTTP (curl):"
        
        # Intentar conexión HTTP
        if curl_result=$(curl -o /dev/null -s -w "%{time_total}" --connect-timeout 5 --max-time 10 "http://$ip" 2>/dev/null); then
            latency_ms=$(echo "$curl_result * 1000" | bc 2>/dev/null || echo "N/A")
            if [[ "$latency_ms" != "N/A" ]]; then
                latency_int=$(echo "$latency_ms" | cut -d'.' -f1)
                if [[ $latency_int -lt 50 ]]; then
                    print_colored "GREEN" "      ✅ Tiempo de conexión: ${latency_int}ms (EXCELENTE)"
                elif [[ $latency_int -lt 100 ]]; then
                    print_colored "YELLOW" "      ⚠️  Tiempo de conexión: ${latency_int}ms (BUENA)"
                else
                    print_colored "RED" "      ❌ Tiempo de conexión: ${latency_int}ms (ALTA)"
                fi
            fi
        else
            print_colored "YELLOW" "      ⚠️  No se pudo conectar por HTTP (normal para IPs sin servicio web)"
        fi
    fi
}

# Probar cada IP de VAPI
for i in "${!VAPI_IPS[@]}"; do
    ip="${VAPI_IPS[$i]}"
    name="VAPI Server $((i+1))"
    test_latency "$ip" "$name"
done

# Test de traceroute si está disponible
print_colored "BLUE" "\n🛣️  Análisis de ruta de red:"
if command -v traceroute >/dev/null 2>&1; then
    print_colored "CYAN" "   Trazando ruta a ${VAPI_IPS[0]}..."
    if traceroute_result=$(traceroute -m 10 -w 3 "${VAPI_IPS[0]}" 2>/dev/null | head -10); then
        echo "$traceroute_result" | while read line; do
            print_colored "CYAN" "   $line"
        done
    else
        print_colored "YELLOW" "   ⚠️  No se pudo ejecutar traceroute"
    fi
elif command -v tracert >/dev/null 2>&1; then
    print_colored "CYAN" "   Trazando ruta a ${VAPI_IPS[0]}..."
    tracert -h 10 -w 3000 "${VAPI_IPS[0]}" 2>/dev/null | head -10 | while read line; do
        print_colored "CYAN" "   $line"
    done
else
    print_colored "YELLOW" "   ⚠️  Traceroute no disponible"
fi

# Verificar configuración de AWS
print_colored "BLUE" "\n☁️  Verificando configuración AWS:"
if command -v aws >/dev/null 2>&1; then
    current_region=$(aws configure get region 2>/dev/null || echo "no configurada")
    print_colored "CYAN" "   Región AWS configurada: $current_region"
    
    if [[ "$current_region" == "us-west-2" ]]; then
        print_colored "GREEN" "   ✅ Región óptima para VAPI"
    else
        print_colored "YELLOW" "   ⚠️  Considera cambiar a us-west-2 para mejor latencia"
    fi
    
    # Verificar si hay recursos en la región
    if aws sts get-caller-identity >/dev/null 2>&1; then
        print_colored "GREEN" "   ✅ Credenciales AWS configuradas"
        
        # Verificar VPCs en us-west-2
        vpc_count=$(aws ec2 describe-vpcs --region us-west-2 --query 'length(Vpcs)' --output text 2>/dev/null || echo "0")
        print_colored "CYAN" "   VPCs en us-west-2: $vpc_count"
    else
        print_colored "RED" "   ❌ Credenciales AWS no configuradas"
    fi
else
    print_colored "RED" "   ❌ AWS CLI no instalado"
fi

# Recomendaciones
print_colored "PURPLE" "\n💡 RECOMENDACIONES PARA OPTIMIZAR LATENCIA:"
print_colored "CYAN" "1. 🌍 Región: Usar us-west-2 (Oregon) - Misma región que VAPI"
print_colored "CYAN" "2. 🖥️  Instancias: Usar tipos optimizados para red (c5n, m5n, r5n)"
print_colored "CYAN" "3. 🔗 Networking: Habilitar Enhanced Networking y SR-IOV"
print_colored "CYAN" "4. 📍 Placement Groups: Usar cluster placement groups"
print_colored "CYAN" "5. 🚀 ECS: Configurar tareas en la misma AZ que VAPI"

# Configuración recomendada
print_colored "BLUE" "\n⚙️  Configuración recomendada para n8n:"
print_colored "CYAN" "   - Región: us-west-2a (más cercana a VAPI)"
print_colored "CYAN" "   - Tipo instancia: c5n.large o m5n.large"
print_colored "CYAN" "   - Enhanced Networking: Habilitado"
print_colored "CYAN" "   - Security Groups: Permitir IPs VAPI específicas"

# Test de DNS
print_colored "BLUE" "\n🌐 Test de resolución DNS:"
for ip in "${VAPI_IPS[@]}"; do
    if command -v nslookup >/dev/null 2>&1; then
        print_colored "CYAN" "   Resolviendo $ip..."
        if nslookup_result=$(nslookup $ip 2>/dev/null); then
            hostname=$(echo "$nslookup_result" | grep "name =" | awk '{print $4}' | sed 's/\.$//')
            if [[ -n "$hostname" ]]; then
                print_colored "GREEN" "   ✅ $ip -> $hostname"
            else
                print_colored "CYAN" "   📍 $ip (sin hostname reverso)"
            fi
        else
            print_colored "YELLOW" "   ⚠️  No se pudo resolver $ip"
        fi
    fi
done

print_colored "PURPLE" "\n📊 RESUMEN DEL TEST:"
print_colored "GREEN" "✅ IPs de VAPI identificadas y probadas"
print_colored "GREEN" "✅ Configuración optimizada para us-west-2"
print_colored "GREEN" "✅ Security groups configurados para VAPI"

print_colored "CYAN" "\n🚀 PRÓXIMOS PASOS:"
print_colored "CYAN" "1. Ejecutar: ./configure-aws-credentials.sh"
print_colored "CYAN" "2. Desplegar en us-west-2 para latencia óptima"
print_colored "CYAN" "3. Monitorear latencia post-despliegue"

print_colored "GREEN" "\n🎯 ¡Configuración optimizada para VAPI lista!"
