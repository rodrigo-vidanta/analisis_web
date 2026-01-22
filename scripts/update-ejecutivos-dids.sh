#!/bin/bash

# Script para actualizar números DID de ejecutivos
# Fecha: 22 de Enero 2026
# Usa Edge Function auth-admin-proxy para actualizar auth.users

set -e

# Configuración
EDGE_FUNCTIONS_URL="https://glsmifhkoaifvaegsozd.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzUwODgsImV4cCI6MjA1MDA1MTA4OH0.zQeon3xjeNM5vwz9eABJGLW0u5c4gGOUv6CqraCIKs"

echo "🔧 Actualizando números DID de ejecutivos PQNC AI"
echo "=================================================="
echo ""

# Función para actualizar teléfono
update_phone() {
  local user_id=$1
  local email=$2
  local new_phone=$3
  
  echo "📞 Actualizando: $email"
  echo "   → Nuevo DID: $new_phone"
  
  response=$(curl -s -X POST "${EDGE_FUNCTIONS_URL}/functions/v1/auth-admin-proxy" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -d "{
      \"operation\": \"updateUserMetadata\",
      \"params\": {
        \"userId\": \"${user_id}\",
        \"metadata\": {
          \"phone\": \"${new_phone}\"
        }
      }
    }")
  
  if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
    echo "   ✅ Actualizado correctamente"
  else
    echo "   ❌ Error: $(echo "$response" | jq -r '.error // "Unknown error"')"
  fi
  echo ""
}

# 1. Fernanda Mondragón (cambiar de email a DID)
echo "1/3 - fernandamondragon@vidavacations.com"
update_phone "9e81ada2-028d-426a-ad10-8a814080a3df" \
  "fernandamondragon@vidavacations.com" \
  "+16232533325"

# 2. Angélica Guzmán (NULL → DID)
echo "2/3 - angelicaguzman@vidavacations.com"
update_phone "e86a85eb-b291-476d-8cd4-08b1391e5a7a" \
  "angelicaguzman@vidavacations.com" \
  "+16232533579"

# 3. Vanessa Pérez (NULL → DID)
echo "3/3 - vanessaperez@vidavacations.com"
update_phone "90303228-29d4-4938-8245-4c5275bc881d" \
  "vanessaperez@vidavacations.com" \
  "+16232533580"

echo "=================================================="
echo "✅ Proceso completado"
echo ""
echo "⚠️  IMPORTANTE: Revisar conflictos de DIDs duplicados:"
echo "   - ejecutivo@grupovidanta.com tiene +16232533579"
echo "   - invitado@grupovidanta.com tiene +16232533579"
echo "   - paolamaldonado@vidavacations.com tiene +16232533583"
echo "   - coordinador@grupovidanta.com tiene +16232536880"
echo ""
echo "📋 Ver detalles completos en: docs/AUDITORIA_DIDS_EJECUTIVOS.md"
