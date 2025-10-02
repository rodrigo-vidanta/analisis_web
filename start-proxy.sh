#!/bin/bash

# Script para mantener el servidor proxy corriendo
# Reinicia automáticamente si se desconecta

echo "🚀 Iniciando servidor proxy para n8n..."

while true; do
    echo "📡 Iniciando proxy en puerto 3001..."
    node simple-proxy.js
    
    echo "⚠️ Servidor proxy se desconectó. Reiniciando en 3 segundos..."
    sleep 3
done
