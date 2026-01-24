#!/bin/bash

# Script para reiniciar MCP SupabaseREST en Cursor
# Uso: ./scripts/restart-mcp.sh

set -e

echo "🔄 Reiniciando MCP SupabaseREST..."
echo ""

# 1. Detener procesos MCP existentes
echo "1️⃣  Deteniendo procesos MCP existentes..."
pkill -f "mcp-supabase-rest-server" 2>/dev/null || echo "   (No hay procesos para detener)"

# 2. Limpiar cache de Cursor
echo "2️⃣  Limpiando cache de Cursor..."
CACHE_DIR="$HOME/.cursor/projects/Users-darigsamuelrosalesrobledo-Documents-pqnc-qa-ai-platform/mcps/user-SupabaseREST"
if [ -d "$CACHE_DIR" ]; then
  rm -rf "$CACHE_DIR"
  echo "   ✅ Cache limpiado"
else
  echo "   (No hay cache para limpiar)"
fi

# 3. Verificar token
echo "3️⃣  Verificando token..."
if [ -f ".supabase/access_token" ]; then
  TOKEN_PREFIX=$(head -c 10 .supabase/access_token)
  echo "   ✅ Token encontrado: ${TOKEN_PREFIX}..."
  
  # Verificar permisos
  PERMS=$(stat -f "%A" .supabase/access_token 2>/dev/null || stat -c "%a" .supabase/access_token 2>/dev/null)
  if [ "$PERMS" != "600" ]; then
    echo "   ⚠️  Permisos incorrectos ($PERMS), corrigiendo a 600..."
    chmod 600 .supabase/access_token
  fi
else
  echo "   ❌ Token NO encontrado en .supabase/access_token"
  echo ""
  echo "   Para crear el token:"
  echo "   1. Ir a https://supabase.com/dashboard/account/tokens"
  echo "   2. Generate New Token"
  echo "   3. Guardar en .supabase/access_token"
  echo ""
  exit 1
fi

# 4. Verificar configuración de mcp.json
echo "4️⃣  Verificando configuración..."
if grep -q "SupabaseREST" "$HOME/.cursor/mcp.json" 2>/dev/null; then
  echo "   ✅ MCP configurado en ~/.cursor/mcp.json"
else
  echo "   ⚠️  MCP NO encontrado en ~/.cursor/mcp.json"
  echo ""
  echo "   Agregar a ~/.cursor/mcp.json:"
  echo '   {
     "mcpServers": {
       "SupabaseREST": {
         "command": "npx",
         "args": ["-y", "tsx", "'$(pwd)'/mcp-supabase-rest-server.ts"],
         "env": {
           "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd"
         }
       }
     }
   }'
  echo ""
fi

# 5. Test del servidor
echo "5️⃣  Probando servidor MCP..."
TEST_OUTPUT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
  SUPABASE_PROJECT_ID=glsmifhkoaifvaegsozd npx -y tsx mcp-supabase-rest-server.ts 2>&1 | grep -o '"serverInfo"' || echo "")

if [ -n "$TEST_OUTPUT" ]; then
  echo "   ✅ Servidor MCP funciona correctamente"
else
  echo "   ❌ Error al iniciar servidor MCP"
  echo ""
  echo "   Ejecutar test manual:"
  echo "   cd $(pwd)"
  echo '   echo '"'"'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'"'"' | \'
  echo "   SUPABASE_PROJECT_ID=glsmifhkoaifvaegsozd npx -y tsx mcp-supabase-rest-server.ts"
  echo ""
  exit 1
fi

echo ""
echo "✅ Preparación completada"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Cerrar Cursor completamente (Cmd+Q)"
echo "   2. Abrir Cursor"
echo "   3. Esperar ~15 segundos"
echo "   4. Probar con: mcp_SupabaseREST_debug_connection()"
echo ""
echo "🔍 Verificar en Cursor:"
echo "   Settings → MCP → SupabaseREST debe aparecer sin errores"
echo ""
