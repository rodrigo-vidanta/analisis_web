# 🚀 MCP Supabase REST - Acceso Completo (Desarrollo Local)

**Fecha:** 24 de Enero 2026  
**Versión:** 2.0.0  
**Estado:** ✅ Funcional - Desarrollo Local

---

## ⚡ Resumen

MCP con **acceso completo** a todos tus proyectos de Supabase usando Personal Access Token.

### ✅ Capacidades

- 📋 **Listar todos los proyectos** de tu cuenta
- 🔄 **Cambiar entre proyectos** dinámicamente
- ⚡ **SQL arbitrario** (SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, etc.)
- 🔧 **Sin restricciones** - Acceso total a Management API
- 🏗️ **DDL completo** - Crear/modificar tablas, funciones, triggers, etc.

---

## ⚠️ Advertencia de Seguridad

Este MCP tiene **ACCESO TOTAL** a tu cuenta de Supabase:

🔴 **Puede:**
- Eliminar proyectos
- Modificar configuración de billing
- Acceder a todas las bases de datos
- Ejecutar cualquier SQL (incluyendo DROP DATABASE)

✅ **Uso Seguro:**
- Solo en computadora personal
- Token en archivo local (NO en Git)
- Permisos 600 en archivo de token
- Solo para desarrollo/debugging

---

## 🚀 Setup Rápido

### 1. Obtener Personal Access Token

1. Ir a https://supabase.com/dashboard
2. Click en tu avatar → **Account Settings**
3. **Access Tokens** → **Generate New Token**
4. Copiar token (empieza con `sbp_`)

### 2. Guardar Token

```bash
# Crear archivo de token
mkdir -p .supabase
echo "sbp_tu_token_aqui" > .supabase/access_token
chmod 600 .supabase/access_token

# Asegurar que está en .gitignore
echo ".supabase/access_token" >> .gitignore
```

### 3. Configurar en Cursor

Editar `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "SupabaseREST": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/Users/TU_USUARIO/Documents/pqnc-qa-ai-platform/mcp-supabase-rest-server.ts"
      ],
      "env": {
        "SUPABASE_PROJECT_ID": "glsmifhkoaifvaegsozd"
      }
    }
  }
}
```

**Nota:** `SUPABASE_PROJECT_ID` es opcional. Si no lo especificas, usará el proyecto por defecto.

### 4. Reiniciar Cursor

1. **Cerrar Cursor** completamente (Cmd+Q)
2. **Abrir Cursor**
3. Esperar ~10 segundos para que cargue el MCP

---

## 🔧 Herramientas Disponibles

### Gestión de Proyectos

| Herramienta | Descripción |
|-------------|-------------|
| `list_projects` | 📋 Lista todos los proyectos de tu cuenta |
| `switch_project` | 🔄 Cambia al proyecto especificado |
| `get_current_project` | 📍 Muestra el proyecto actualmente seleccionado |

### Operaciones SQL

| Herramienta | Descripción |
|-------------|-------------|
| `execute_sql` | ⚡ SQL arbitrario (cualquier operación) |
| `query_table` | SELECT con filtros |
| `insert_data` | INSERT |
| `update_data` | UPDATE |
| `delete_data` | DELETE |

### Utilidades

| Herramienta | Descripción |
|-------------|-------------|
| `get_schema` | Ver estructura de BD |
| `get_table_info` | Detalles de una tabla |
| `backup_table` | Backup en JSON |
| `debug_connection` | Test de conexión |

---

## 📝 Ejemplos de Uso

### Listar Proyectos

```typescript
mcp_SupabaseREST_list_projects()

// Output:
// [
//   {
//     "id": "glsmifhkoaifvaegsozd",
//     "name": "PQNC AI",
//     "region": "us-west-2",
//     ...
//   },
//   {
//     "id": "zbylezfyagwrxoecioup",
//     "name": "SystemUI",
//     ...
//   }
// ]
```

### Cambiar Proyecto

```typescript
mcp_SupabaseREST_switch_project({
  projectId: "zbylezfyagwrxoecioup"
})

// Output:
// {
//   "success": true,
//   "message": "Switched to project: zbylezfyagwrxoecioup"
// }
```

### SQL Arbitrario

```typescript
// CREATE TABLE
mcp_SupabaseREST_execute_sql({
  sql: `
    CREATE TABLE test_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `,
  description: "Crear tabla de prueba"
})

// CREATE FUNCTION
mcp_SupabaseREST_execute_sql({
  sql: `
    CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
    RETURNS TABLE(call_count INT, total_duration INT) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        COUNT(*)::INT,
        SUM(duration)::INT
      FROM llamadas_ventas
      WHERE ejecutivo_id = user_id;
    END;
    $$ LANGUAGE plpgsql;
  `,
  description: "Crear función de estadísticas"
})

// DROP TABLE (¡Cuidado!)
mcp_SupabaseREST_execute_sql({
  sql: "DROP TABLE IF EXISTS test_table CASCADE",
  description: "Eliminar tabla de prueba"
})

// ALTER TABLE
mcp_SupabaseREST_execute_sql({
  sql: `
    ALTER TABLE prospectos 
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  `,
  description: "Agregar columna source"
})
```

### Consultas Complejas

```typescript
mcp_SupabaseREST_execute_sql({
  sql: `
    SELECT 
      c.nombre as coordinacion,
      COUNT(p.id) as total_prospectos,
      COUNT(CASE WHEN p.status = 'activo' THEN 1 END) as activos,
      COUNT(CASE WHEN p.status = 'convertido' THEN 1 END) as convertidos,
      ROUND(
        COUNT(CASE WHEN p.status = 'convertido' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(p.id), 0) * 100, 
        2
      ) as conversion_rate
    FROM coordinaciones c
    LEFT JOIN prospectos p ON c.id = p.coordinacion_id
    WHERE p.created_at > NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.nombre
    ORDER BY conversion_rate DESC
  `,
  description: "Estadísticas de conversión por coordinación"
})
```

### Backup de Tabla

```typescript
mcp_SupabaseREST_backup_table({
  table: "coordinaciones"
})

// Output:
// {
//   "success": true,
//   "table": "coordinaciones",
//   "timestamp": "2026-01-24T19:00:00.000Z",
//   "rowCount": 15,
//   "backup": [ ... datos ... ]
// }
```

---

## 🔍 Troubleshooting

### Error: "SUPABASE_ACCESS_TOKEN not found"

**Solución:** Crear archivo `.supabase/access_token` con tu token personal.

```bash
echo "sbp_tu_token" > .supabase/access_token
chmod 600 .supabase/access_token
```

### Error: "HTTP 401: Unauthorized"

**Solución:** Token expiró o es inválido. Generar uno nuevo en Supabase Dashboard.

### Error: "Project not found"

**Solución:** Verificar que el project ID sea correcto. Listar proyectos con `list_projects`.

### MCP no aparece en Cursor

**Solución:**

1. Verificar que la ruta en `mcp.json` sea absoluta y correcta
2. Eliminar cache: `rm -rf ~/.cursor/projects/.../mcps/user-SupabaseREST/`
3. Reiniciar Cursor completamente (Cmd+Q)
4. Esperar ~15 segundos después de abrir

### Verificar que funciona manualmente

```bash
cd /Users/TU_USUARIO/Documents/pqnc-qa-ai-platform

# Test manual
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
SUPABASE_PROJECT_ID=glsmifhkoaifvaegsozd npx -y tsx mcp-supabase-rest-server.ts
```

Si ves `"serverInfo":{"name":"SupabaseREST","version":"1.0.0"}`, el servidor funciona.

---

## 📊 Comparación de Opciones

| Característica | MCP REST (Este) | MCP Secure Proxy | MCP exec_sql |
|----------------|-----------------|------------------|--------------|
| **Setup** | Simple | Requiere Edge Function | Simple |
| **Seguridad** | 🔴 Token admin | 🟢 Token usuario | 🔴 RPC pública |
| **Auditoría** | ❌ No | ✅ Completa | ❌ No |
| **DDL (CREATE/DROP)** | ✅ Sí | ❌ No | ✅ Sí |
| **Multi-proyecto** | ✅ Sí | ❌ No | ❌ No |
| **Límites** | ❌ No | ✅ 1000/10k | ❌ No |
| **Estado** | ✅ Activo | ✅ Activo | ❌ Eliminado |
| **Uso recomendado** | Desarrollo local | Producción | - |

---

## 🔒 Mejores Prácticas

### ✅ HACER

- ✅ Guardar token en `.supabase/access_token`
- ✅ Usar `chmod 600` en archivo de token
- ✅ Agregar a `.gitignore`
- ✅ Usar solo en computadora personal
- ✅ Regenerar token si se compromete
- ✅ Usar `list_projects` para ver proyectos disponibles
- ✅ Usar `switch_project` para cambiar entre proyectos
- ✅ Hacer backups antes de operaciones destructivas

### ❌ NO HACER

- ❌ Subir token a Git
- ❌ Compartir token
- ❌ Usar en servidor de producción
- ❌ Dejar token en variables de entorno de shell
- ❌ Ejecutar DROP sin backup previo
- ❌ Modificar configuración de billing sin confirmar

---

## 🎯 Casos de Uso

### Desarrollo Local

```typescript
// Crear tablas de desarrollo
mcp_SupabaseREST_execute_sql({
  sql: "CREATE TABLE dev_testing (id UUID PRIMARY KEY, data JSONB)"
})

// Poblar con datos de prueba
mcp_SupabaseREST_insert_data({
  table: "dev_testing",
  data: { data: { test: true } }
})

// Limpiar
mcp_SupabaseREST_execute_sql({
  sql: "DROP TABLE dev_testing"
})
```

### Debugging Multi-Proyecto

```typescript
// Ver todos los proyectos
mcp_SupabaseREST_list_projects()

// Cambiar a proyecto de staging
mcp_SupabaseREST_switch_project({ projectId: "staging-project-id" })

// Consultar datos
mcp_SupabaseREST_query_table({
  table: "prospectos",
  filter: { status: "activo" },
  limit: 10
})

// Volver a producción
mcp_SupabaseREST_switch_project({ projectId: "glsmifhkoaifvaegsozd" })
```

### Migraciones

```typescript
// Backup antes de migración
mcp_SupabaseREST_backup_table({ table: "coordinaciones" })

// Ejecutar migración
mcp_SupabaseREST_execute_sql({
  sql: `
    ALTER TABLE coordinaciones 
    ADD COLUMN region TEXT DEFAULT 'CDMX'
  `
})

// Verificar
mcp_SupabaseREST_get_table_info({ table: "coordinaciones" })
```

---

## 📁 Archivos

| Archivo | Descripción | En Git |
|---------|-------------|--------|
| `mcp-supabase-rest-server.ts` | Servidor MCP | ✅ Sí |
| `.supabase/access_token` | Personal Access Token | ❌ **NO** |
| `~/.cursor/mcp.json` | Configuración de Cursor | ❌ NO |
| `docs/MCP_REST_FULL_ACCESS.md` | Esta documentación | ✅ Sí |

---

## 📚 Referencias

- **Supabase Management API:** https://supabase.com/docs/reference/api
- **Personal Access Tokens:** https://supabase.com/dashboard/account/tokens
- **MCP Protocol:** https://modelcontextprotocol.io/

---

## ✅ Checklist de Verificación

Antes de usar:

- [ ] Token generado en Supabase Dashboard
- [ ] Token guardado en `.supabase/access_token`
- [ ] Permisos 600 en archivo de token
- [ ] Token agregado a `.gitignore`
- [ ] MCP configurado en `~/.cursor/mcp.json`
- [ ] Ruta absoluta correcta en configuración
- [ ] Cursor reiniciado completamente
- [ ] Test manual exitoso

---

**Última actualización:** 24 de Enero 2026  
**Autor:** Darig Samuel Rosales Robledo  
**Estado:** ✅ Funcional - Desarrollo Local
