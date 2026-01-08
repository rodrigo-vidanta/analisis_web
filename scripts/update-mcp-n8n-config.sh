#!/bin/bash
# Script para actualizar la configuración del MCP de N8N para usar el servidor proxy

MCP_CONFIG_FILE="$HOME/.cursor/mcp.json"
BACKUP_FILE="$HOME/.cursor/mcp.json.backup.$(date +%Y%m%d_%H%M%S)"

# Crear backup
if [ -f "$MCP_CONFIG_FILE" ]; then
  cp "$MCP_CONFIG_FILE" "$BACKUP_FILE"
  echo "✅ Backup creado: $BACKUP_FILE"
fi

# Obtener el directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROXY_SERVER="$PROJECT_DIR/mcp-n8n-proxy-server.ts"

# Verificar que el servidor proxy existe
if [ ! -f "$PROXY_SERVER" ]; then
  echo "❌ Error: No se encontró el servidor proxy en $PROXY_SERVER"
  exit 1
fi

# Crear configuración temporal con jq si está disponible, o usar sed
if command -v jq &> /dev/null; then
  # Usar jq para actualizar la configuración
  jq '.mcpServers.N8N = {
    "command": "npx",
    "args": [
      "-y",
      "tsx",
      "'"$PROXY_SERVER"'"
    ],
    "env": {
      "N8N_MCP_URL": "https://primary-dev-d75a.up.railway.app/mcp-server/http",
      "N8N_MCP_TOKEN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ0OTk5M2U1LTFjZTUtNDFmZS04YTY2LTVjZjgwOWE2ODc1NiIsImlhdCI6MTc2NDY5MTU3Mn0.akqsmM_akDSgDpbmBSUVIeMolOMshXnR29TswdKPwBs",
      "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3ODI4NjA0fQ.R4_fqUc7j2Mbls1DOSyHHApohJBWJrXdOPRtLBTgonc"
    }
  }' "$MCP_CONFIG_FILE" > "$MCP_CONFIG_FILE.tmp" && mv "$MCP_CONFIG_FILE.tmp" "$MCP_CONFIG_FILE"
  echo "✅ Configuración actualizada usando jq"
else
  echo "⚠️  jq no está instalado. Por favor, actualiza manualmente $MCP_CONFIG_FILE"
  echo ""
  echo "Reemplaza la sección N8N con:"
  echo ""
  cat << 'EOF'
    "N8N": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform/mcp-n8n-proxy-server.ts"
      ],
      "env": {
        "N8N_MCP_URL": "https://primary-dev-d75a.up.railway.app/mcp-server/http",
        "N8N_MCP_TOKEN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ0OTk5M2U1LTFjZTUtNDFmZS04YTY2LTVjZjgwOWE2ODc1NiIsImlhdCI6MTc2NDY5MTU3Mn0.akqsmM_akDSgDpbmBSUVIeMolOMshXnR29TswdKPwBs",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3ODI4NjA0fQ.R4_fqUc7j2Mbls1DOSyHHApohJBWJrXdOPRtLBTgonc"
      }
    },
EOF
  exit 1
fi

echo ""
echo "✅ Configuración del MCP de N8N actualizada exitosamente"
echo "🔄 Reinicia Cursor para aplicar los cambios"

