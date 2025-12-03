# 🔧 Configuración MCP N8N

## 📋 Descripción

Configuración del servidor MCP (Model Context Protocol) para n8n, permitiendo acceso a workflows, ejecuciones y recursos de n8n desde Cursor.

## 🚀 Configuración Actual

### ✅ Método 1: Access Token (Activo)

**Ubicación:** `.cursor/cursor-settings.json`

```json
"N8N": {
  "command": "npx",
  "args": [
    "-y",
    "supergateway",
    "--streamableHttp",
    "https://primary-dev-d75a.up.railway.app/mcp-server/http",
    "--header",
    "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ]
}
```

**Características:**
- ✅ Usa `supergateway` como intermediario HTTP
- ✅ Autenticación mediante Bearer Token
- ✅ URL del servidor: `https://primary-dev-d75a.up.railway.app/mcp-server/http`
- ✅ Access Token configurado

### 🔐 Método 2: OAuth (Alternativo)

Para usar OAuth en lugar de access token, puedes cambiar la configuración a:

```json
"N8N-OAuth": {
  "command": "npx",
  "args": [
    "-y",
    "supergateway",
    "--streamableHttp",
    "https://primary-dev-d75a.up.railway.app/mcp-server/http"
  ],
  "env": {
    "N8N_OAUTH_ENABLED": "true",
    "N8N_OAUTH_URL": "https://primary-dev-d75a.up.railway.app/mcp-server/http"
  }
}
```

**Nota:** OAuth requiere configuración adicional en n8n. Consulta la documentación oficial de n8n para más detalles.

## 🔑 Credenciales

### Access Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjQ0OTk5M2U1LTFjZTUtNDFmZS04YTY2LTVjZjgwOWE2ODc1NiIsImlhdCI6MTc2NDY5MTU3Mn0.akqsmM_akDSgDpbmBSUVIeMolOMshXnR29TswdKPwBs
```

### API Key (Alternativo - para uso directo en código)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmE1MDZkMS1hZDM4LTQ3MGYtOTEzOS02MzAwM2NiMjQzZGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzU3ODgzfQ.7z0FtziI-eFleJr4pLvP5GgRVptllCw26Losrxf_Qpo
```

## 🌐 URLs

- **MCP Server HTTP:** `https://primary-dev-d75a.up.railway.app/mcp-server/http`
- **API Base URL:** `https://primary-dev-d75a.up.railway.app/api/v1`

## 📚 Funcionalidades Disponibles

Una vez configurado, el MCP de n8n permite:

- ✅ Listar workflows
- ✅ Obtener detalles de workflows específicos
- ✅ Actualizar workflows
- ✅ Ver ejecuciones de workflows
- ✅ Obtener métricas de rendimiento
- ✅ Buscar workflows por nombre o tags

## 🔄 Activación

1. **Reiniciar Cursor** para que detecte la nueva configuración MCP
2. Verificar en la lista de recursos MCP que aparece "N8N"
3. Probar acceso usando las herramientas MCP disponibles

## ⚠️ Notas de Seguridad

- ⚠️ Los tokens están almacenados en el archivo de configuración local
- ⚠️ No hacer commit de tokens a Git (ya está en `.gitignore`)
- ⚠️ Rotar tokens periódicamente según políticas de seguridad
- ⚠️ Usar variables de entorno en producción si es posible

## 📖 Referencias

- [Documentación n8n MCP](https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/)
- [n8n API Reference](https://docs.n8n.io/api/api-reference/)
- [Supergateway Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/supergateway)

---

**Última actualización:** Enero 2025
**Estado:** ✅ Configurado y activo

