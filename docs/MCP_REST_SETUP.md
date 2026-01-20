# 🔧 MCP Supabase REST - Guía de Configuración

**Fecha:** 20 de Enero 2026  
**Versión:** 1.0.0

---

## 📋 Descripción

Este MCP se conecta a Supabase usando la **Management API REST** en lugar del cliente JavaScript. 

### Ventajas:
- ✅ **No requiere funciones RPC** (`exec_sql`, etc.)
- ✅ **No depende de RLS** - usa acceso de administración
- ✅ **Más simple** - solo necesita el Access Token
- ✅ **Funciona con cualquier proyecto** Supabase

---

## 🚀 Instalación

### Paso 1: Obtener el Access Token

1. Ir a https://supabase.com/dashboard
2. Click en tu avatar → **Account**
3. **Access Tokens** → **Generate New Token**
4. Guardar el token (empieza con `sbp_`)

### Paso 2: Guardar el Token

**Opción A:** En archivo (recomendado)
```bash
mkdir -p .supabase
echo "sbp_tu_token_aqui" > .supabase/access_token
chmod 600 .supabase/access_token
echo ".supabase/" >> .gitignore
```

**Opción B:** En variable de entorno (en mcp.json)

### Paso 3: Configurar MCP

Editar `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "SupabaseREST": {
      "command": "npx",
      "args": [
        "ts-node",
        "/Users/TU_USUARIO/Documents/pqnc-qa-ai-platform/mcp-supabase-rest-server.ts"
      ],
      "env": {
        "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd"
      }
    }
  }
}
```

El servidor lee automáticamente el token de `.supabase/access_token`.

**O con token en variable de entorno:**

```json
{
  "mcpServers": {
    "SupabaseREST": {
      "command": "npx",
      "args": [
        "ts-node",
        "/ruta/al/mcp-supabase-rest-server.ts"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_tu_token_aqui",
        "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd"
      }
    }
  }
}
```

### Paso 4: Reiniciar Cursor

Cerrar y abrir Cursor para que cargue el nuevo MCP.

---

## 🔧 Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `execute_sql` | Ejecutar SQL arbitrario |
| `query_table` | SELECT con filtros |
| `insert_data` | INSERT |
| `update_data` | UPDATE |
| `delete_data` | DELETE (requiere filtro) |
| `get_schema` | Ver estructura de BD |
| `get_table_info` | Detalles de una tabla |
| `backup_table` | Backup en JSON |
| `debug_connection` | Verificar conexión |

---

## 📝 Ejemplos de Uso

### Ejecutar SQL

```
mcp_SupabaseREST_execute_sql({
  sql: "SELECT COUNT(*) FROM prospectos WHERE status = 'activo'",
  description: "Contar prospectos activos"
})
```

### Consultar tabla

```
mcp_SupabaseREST_query_table({
  table: "auth_users",
  select: "id, email, full_name",
  filter: { is_active: true },
  limit: 10,
  order: "created_at DESC"
})
```

### Insertar datos

```
mcp_SupabaseREST_insert_data({
  table: "support_tickets",
  data: {
    title: "Nuevo ticket",
    description: "Descripción",
    reporter_id: "uuid-aqui"
  }
})
```

### Crear tabla

```
mcp_SupabaseREST_execute_sql({
  sql: `
    CREATE TABLE IF NOT EXISTS mi_tabla (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `,
  description: "Crear tabla mi_tabla"
})
```

### Ver esquema

```
mcp_SupabaseREST_get_schema()
```

### Debug conexión

```
mcp_SupabaseREST_debug_connection()
```

---

## 🔒 Seguridad

- ⚠️ **El Access Token tiene acceso TOTAL** a tu cuenta Supabase
- ✅ El archivo `.supabase/access_token` debe estar en `.gitignore`
- ✅ Usar `chmod 600` para restringir permisos
- ❌ **NUNCA** compartir el token ni subirlo a Git

---

## 🆚 Diferencias con MCP Anterior

| Aspecto | MCP Antiguo | MCP REST |
|---------|-------------|----------|
| **Conexión** | Cliente JS + service_role | REST API + Access Token |
| **Requiere** | `exec_sql` RPC function | Nada |
| **Acceso** | Limitado por RLS | Acceso total de admin |
| **Setup** | Ejecutar SQL en Supabase | Solo configurar token |

---

## 🐛 Troubleshooting

### Error: "SUPABASE_ACCESS_TOKEN not found"

**Solución:** Crear archivo `.supabase/access_token` o configurar variable de entorno.

### Error: "HTTP 401: Unauthorized"

**Solución:** El token expiró o es inválido. Generar uno nuevo en Supabase Dashboard.

### Error: "HTTP 404: Not Found"

**Solución:** Verificar que el `SUPABASE_PROJECT_ID` sea correcto.

---

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `mcp-supabase-rest-server.ts` | Servidor MCP |
| `.supabase/access_token` | Token (NO en Git) |
| `~/.cursor/mcp.json` | Configuración MCP |
| `docs/MCP_REST_SETUP.md` | Esta guía |

---

## 🔄 Migración desde MCP Antiguo

1. El MCP antiguo (`Supa_PQNC_AI`) usaba `mcp_Supa_PQNC_AI_pqnc_*`
2. El nuevo usa `mcp_SupabaseREST_*`
3. Puedes tener ambos activos durante la transición
4. Para desactivar el antiguo, comentarlo en `mcp.json`

---

**Última actualización:** 20 de Enero 2026
