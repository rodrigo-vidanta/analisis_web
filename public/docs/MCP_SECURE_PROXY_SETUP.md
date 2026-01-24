# 🔒 MCP Seguro con Edge Function Proxy

**Fecha:** 24 de Enero 2026  
**Versión:** 2.0.0  
**Estado:** Recomendado (Producción)

---

## 📋 Descripción

Este MCP reemplaza al MCP REST directo con una arquitectura más segura usando Edge Functions como proxy.

### ⚠️ Por qué NO usar MCP REST directo

| Aspecto | MCP REST | MCP Secure Proxy |
|---------|----------|------------------|
| **Token usado** | Personal Access Token (admin de cuenta) | Session Token (usuario específico) |
| **Acceso** | TOTAL a toda la cuenta Supabase | Solo tablas permitidas |
| **Auditoría** | ❌ No | ✅ Cada operación registrada |
| **Seguridad** | 🔴 Puede eliminar proyectos | 🟢 Solo operaciones whitelistadas |
| **Exposición** | Token en archivo local | Token de usuario temporal |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────┐
│           CURSOR IDE (Local)                │
│                                              │
│   MCP Server (Node.js)                     │
│   - Lee session_token de .cursor/          │
│   - NO tiene service_role_key              │
└───────────────┬──────────────────────────────┘
                │ HTTPS
                │ Header: x-session-token
                ▼
┌─────────────────────────────────────────────┐
│    EDGE FUNCTION: mcp-secure-proxy         │
│    (glsmifhkoaifvaegsozd.supabase.co)      │
│                                              │
│  ✅ Valida session_token                   │
│  ✅ Verifica permisos del usuario          │
│  ✅ Whitelist de operaciones               │
│  ✅ Audit logging (user_id + timestamp)    │
│  ✅ Límites (1000 rows, 10k backup)        │
└───────────────┬──────────────────────────────┘
                │ service_role_key (secret)
                ▼
┌─────────────────────────────────────────────┐
│         SUPABASE PQNC_AI                   │
│         PostgreSQL Database                 │
└─────────────────────────────────────────────┘
```

---

## 🚀 Instalación

### Paso 1: Desplegar Edge Function

```bash
# Desde la raíz del proyecto
npx supabase functions deploy mcp-secure-proxy --project-ref glsmifhkoaifvaegsozd
```

### Paso 2: Crear Tabla de Auditoría

```bash
# Ejecutar migración
psql "postgresql://postgres:[PASSWORD]@db.glsmifhkoaifvaegsozd.supabase.co:5432/postgres" < migrations/028_create_mcp_audit_log.sql
```

O desde Supabase Dashboard → SQL Editor.

### Paso 3: Obtener Session Token

**Opción A: Desde la App**
1. Loguéate en https://ai.vidavacations.com
2. Abre DevTools (F12) → Console
3. Ejecuta: `localStorage.getItem('session_token')`
4. Copia el token

**Opción B: Desde Supabase**
```sql
SELECT session_token 
FROM auth_sessions 
WHERE user_id = '[TU_USER_ID]' 
AND expires_at > NOW() 
ORDER BY created_at DESC 
LIMIT 1;
```

### Paso 4: Configurar Token

**Crear archivo .cursor/session_token:**
```bash
mkdir -p .cursor
echo "tu_session_token_aqui" > .cursor/session_token
chmod 600 .cursor/session_token
echo ".cursor/session_token" >> .gitignore
```

### Paso 5: Configurar MCP en Cursor

Editar `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "MCPSecureProxy": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/Users/TU_USUARIO/Documents/pqnc-qa-ai-platform/mcp-secure-proxy-server.ts"
      ],
      "env": {
        "EDGE_FUNCTION_URL": "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/mcp-secure-proxy"
      }
    }
  }
}
```

### Paso 6: Reiniciar Cursor

Cerrar y abrir Cursor para cargar el nuevo MCP.

---

## 🔧 Herramientas Disponibles

| Herramienta | Descripción | Permisos |
|-------------|-------------|----------|
| `query_table` | SELECT con filtros | Usuarios autenticados |
| `insert_data` | INSERT con auditoría | Usuarios autenticados |
| `update_data` | UPDATE con auditoría (requiere filtro) | Usuarios autenticados |
| `get_schema` | Ver estructura de BD | Usuarios autenticados |
| `get_table_info` | Detalles de una tabla | Usuarios autenticados |
| `backup_table` | Backup JSON (max 10k rows) | Usuarios autenticados |
| `execute_read_sql` | SQL de solo lectura | Usuarios autenticados |
| `debug_connection` | Test de conexión | Usuarios autenticados |

### Operaciones Restringidas (NO disponibles)

❌ `delete_data` - Requiere permisos admin  
❌ `execute_write_sql` - DDL requiere admin  
❌ `drop_table` - PROHIBIDO  
❌ `truncate_table` - PROHIBIDO

---

## 📝 Ejemplos de Uso

### Consultar tabla

```typescript
mcp_MCPSecureProxy_query_table({
  table: "prospectos",
  select: "id, nombre, telefono, status",
  filter: { status: "activo", coordinacion_id: "abc-123" },
  limit: 50,
  order: "created_at.desc"
})
```

### Insertar datos

```typescript
mcp_MCPSecureProxy_insert_data({
  table: "llamadas_ventas",
  data: {
    prospecto_id: "uuid-aqui",
    ejecutivo_id: "uuid-aqui",
    duration: 120,
    status: "completada"
  }
})
// Automáticamente agrega: created_by, created_at
```

### Actualizar datos

```typescript
mcp_MCPSecureProxy_update_data({
  table: "prospectos",
  data: { status: "contactado" },
  filter: { id: "uuid-aqui" }
})
// Automáticamente agrega: updated_by, updated_at
```

### SQL de solo lectura

```typescript
mcp_MCPSecureProxy_execute_read_sql({
  sql: `
    SELECT 
      coordinacion_id,
      COUNT(*) as total_prospectos,
      COUNT(CASE WHEN status = 'activo' THEN 1 END) as activos
    FROM prospectos
    GROUP BY coordinacion_id
  `
})
```

### Backup de tabla

```typescript
mcp_MCPSecureProxy_backup_table({
  table: "coordinaciones"
})
```

---

## 🔒 Seguridad

### Tablas Permitidas

**Lectura:**
- `prospectos`
- `llamadas_ventas`
- `conversaciones_whatsapp`
- `mensajes_whatsapp`
- `auth_users`
- `auth_sessions`
- `coordinaciones`
- `auth_roles`
- `system_config`
- `user_profiles_v2`
- `call_analysis_summary`
- `paraphrase_logs`

**Solo Admins:**
- `api_auth_tokens`
- `auth_login_logs`
- `assignment_logs`

### Validaciones

✅ Session token validado en cada request  
✅ Expiración de sesión verificada  
✅ Whitelist de tablas  
✅ Whitelist de operaciones  
✅ Límites: 1000 rows (query), 10k rows (backup)  
✅ SQL de escritura bloqueado en `execute_read_sql`  
✅ UPDATE/DELETE requieren filtro (prevenir masivos)

### Auditoría

Cada operación se registra en `mcp_audit_log`:
- `user_id` - Quién ejecutó
- `operation` - Qué hizo
- `table_name` - En qué tabla
- `timestamp` - Cuándo
- `success` - Si funcionó
- `error_message` - Si falló

**Ver tu historial:**
```sql
SELECT * FROM mcp_audit_log 
WHERE user_id = auth.uid() 
ORDER BY timestamp DESC 
LIMIT 50;
```

---

## 🆚 Comparación con Alternativas

### vs MCP REST directo

| Aspecto | MCP REST | MCP Secure Proxy |
|---------|----------|------------------|
| Setup | Más simple | Requiere Edge Function |
| Seguridad | 🔴 Baja | 🟢 Alta |
| Auditoría | ❌ No | ✅ Sí |
| Límites | ❌ No | ✅ Sí |
| Token expira | ❌ No (permanente) | ✅ Sí (con sesión) |

### vs MCP con exec_sql (eliminado)

| Aspecto | MCP exec_sql | MCP Secure Proxy |
|---------|--------------|------------------|
| Exposición | 🔴 Función RPC pública | 🟢 Edge Function protegida |
| SQL arbitrario | 🔴 Sí | 🟡 Solo SELECT |
| Validación | ❌ No | ✅ Whitelist |
| Razón eliminado | Vulnerabilidad de seguridad | N/A |

---

## 🐛 Troubleshooting

### Error: "Session token required"

**Solución:** Crear `.cursor/session_token` con tu token de sesión.

```bash
echo "tu_session_token" > .cursor/session_token
chmod 600 .cursor/session_token
```

### Error: "Invalid or expired session"

**Solución:** Tu sesión expiró. Obtén un nuevo token logueándote en la app.

### Error: "Tabla no permitida"

**Solución:** La tabla no está en la whitelist. Modificar `READABLE_TABLES` en la Edge Function.

### Error: "Operación no permitida"

**Solución:** La operación no está en `ALLOWED_OPERATIONS`. Usar una operación permitida.

---

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `mcp-secure-proxy-server.ts` | Servidor MCP (local) |
| `supabase/functions/mcp-secure-proxy/index.ts` | Edge Function (remote) |
| `.cursor/session_token` | Token de usuario (NO en Git) |
| `migrations/028_create_mcp_audit_log.sql` | Tabla de auditoría |
| `~/.cursor/mcp.json` | Configuración de Cursor |

---

## 🔄 Migración desde MCP REST

1. **Desplegar Edge Function** (Paso 1)
2. **Crear tabla de auditoría** (Paso 2)
3. **Obtener session token** (Paso 3)
4. **Configurar .cursor/session_token** (Paso 4)
5. **Actualizar mcp.json** (Paso 5)
6. **Reiniciar Cursor** (Paso 6)

**Para desactivar MCP REST:**
```json
{
  "mcpServers": {
    // "SupabaseREST": { ... }, // Comentado
    "MCPSecureProxy": { ... }
  }
}
```

---

## 📊 Monitoreo

### Ver estadísticas de uso

```sql
SELECT 
  user_id,
  operation,
  COUNT(*) as total,
  COUNT(CASE WHEN success THEN 1 END) as successful,
  COUNT(CASE WHEN NOT success THEN 1 END) as failed
FROM mcp_audit_log
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, operation
ORDER BY total DESC;
```

### Operaciones más lentas (si agregas metadata)

```sql
SELECT 
  operation,
  table_name,
  AVG((metadata->>'duration_ms')::int) as avg_duration_ms
FROM mcp_audit_log
WHERE metadata->>'duration_ms' IS NOT NULL
GROUP BY operation, table_name
ORDER BY avg_duration_ms DESC
LIMIT 10;
```

---

## ✅ Checklist de Seguridad

Antes de usar en producción:

- [ ] Edge Function desplegada
- [ ] Tabla `mcp_audit_log` creada
- [ ] RLS habilitado en `mcp_audit_log`
- [ ] Session token configurado (NO en Git)
- [ ] `.cursor/session_token` en `.gitignore`
- [ ] Whitelist de tablas revisada
- [ ] Whitelist de operaciones revisada
- [ ] Límites configurados (1000/10k)
- [ ] Token de prueba (no de admin)

---

## 📚 Ver También

- [Arquitectura de Seguridad](ARQUITECTURA_SEGURIDAD_2026.md)
- [Edge Functions Catalog](EDGE_FUNCTIONS_CATALOG.md)
- [Security Rules](.cursor/rules/security-rules.mdc)
- [Pentesting Report 2026-01-16](PENTESTING_2026-01-16.md)

---

**Última actualización:** 24 de Enero 2026  
**Autor:** Darig Samuel Rosales Robledo  
**Revisión de seguridad:** ✅ Aprobada
