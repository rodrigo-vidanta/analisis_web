#!/bin/bash
# ============================================
# Test del Sistema de Heartbeat
# ============================================

set -e

echo "🧪 Iniciando tests del sistema de heartbeat..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Verificar tabla active_sessions
echo "1️⃣ Verificando tabla active_sessions..."
psql_output=$(psql "postgresql://postgres.[PASSWORD]@db.glsmifhkoaifvaegsozd.supabase.co:5432/postgres" -c "SELECT COUNT(*) FROM active_sessions" 2>&1 || echo "ERROR")
if [[ "$psql_output" == *"ERROR"* ]]; then
  echo -e "${RED}❌ No se pudo conectar a la base de datos${NC}"
else
  echo -e "${GREEN}✅ Tabla active_sessions accesible${NC}"
fi

# Test 2: Verificar función cleanup
echo ""
echo "2️⃣ Verificando función cleanup_inactive_sessions()..."
curl -s -X POST "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/cleanup-inactive-sessions" \
  -H "Content-Type: application/json" \
  -d '{}' > /tmp/cleanup_test.json

if grep -q "success.*true" /tmp/cleanup_test.json; then
  echo -e "${GREEN}✅ Edge Function funcionando correctamente${NC}"
  cat /tmp/cleanup_test.json | jq '.'
else
  echo -e "${RED}❌ Edge Function con errores${NC}"
  cat /tmp/cleanup_test.json
fi

# Test 3: Verificar Cron Job
echo ""
echo "3️⃣ Verificando Cron Job..."
echo -e "${YELLOW}ℹ️  Ejecuta esto manualmente en Supabase SQL Editor:${NC}"
echo ""
echo "SELECT jobid, schedule, command FROM cron.job;"
echo ""
echo "SELECT jobid, status, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 3;"
echo ""

echo ""
echo -e "${GREEN}🎉 Tests completados!${NC}"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Hacer login en la app"
echo "  2. Abrir DevTools > Console"
echo "  3. Buscar: 💓 Heartbeat iniciado"
echo "  4. Esperar 30s y buscar: 💓 Heartbeat enviado"
