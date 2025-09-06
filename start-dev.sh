#!/bin/bash

# Script para iniciar desarrollo local - PQNC QA AI Platform
echo "🚀 Iniciando PQNC QA AI Platform..."

# Navegar al directorio correcto
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform

# Cerrar procesos previos
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

# Esperar
sleep 2

echo "🌐 Iniciando en http://localhost:5173"

# Iniciar con path completo
./node_modules/.bin/vite --port 5173 --host 0.0.0.0
