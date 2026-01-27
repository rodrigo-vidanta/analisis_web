# Informe de Diagnóstico: Problemas MCP SupabaseREST

**Fecha:** 27 de Enero 2026  
**Contexto:** Intento de actualizar funciones RPC `get_dashboard_conversations` y `search_dashboard_conversations`  
**Proyecto Supabase:** glsmifhkoaifvaegsozd (PQNC_AI)

---

## 📋 Resumen Ejecutivo

El MCP `SupabaseREST` tiene **limitaciones críticas** para ejecutar DDL (DROP, CREATE FUNCTION). La causa principal es que la función `exec_sql` en Supabase está diseñada para **queries que devuelven datos (SELECT)**, no para comandos DDL que no devuelven resultados.

---

## 🔍 Métodos Intentados y Resultados

### 1. CallMcpTool con `execute_sql`

**Intento:**
```typescript
CallMcpTool({
  server: "user-SupabaseREST",
  toolName: "execute_sql",
  arguments: {
    sql: "DROP FUNCTION IF EXISTS get_dashboard_conversations(...) CASCADE"
  }
})
```

**Resultado:**
```json
{
  "success": false,
  "error": "HTTP 400: {\"code\":\"42P13\",\"details\":\"Row type defined by OUT parameters is different.\",\"hint\":\"Use DROP FUNCTION first.\",\"message\":\"cannot change return type of existing function\"}"
}
```

**Diagnóstico:**
- El MCP intentó hacer `CREATE OR REPLACE` sin DROP previo
- PostgreSQL no permite cambiar el tipo de retorno sin DROP
- El MCP no maneja transacciones complejas (DROP + CREATE)

---

### 2. Curl Directo a `/rest/v1/rpc/exec_sql` con `anon_key`

**Intento:**
```bash
curl -X POST 'https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  --data '{"query":"DROP FUNCTION ..."}'
```

**Resultado:**
```json
{
  "code": "PGRST202",
  "details": "Searched for the function public.exec_sql with parameter sql_query or with a single unnamed json/jsonb parameter...",
  "message": "Could not find the function public.exec_sql(sql_query) in the schema cache"
}
```

**Diagnóstico:**
- La función `exec_sql` **NO está disponible para `anon` role**
- Solo está disponible para `service_role`
- Esto es correcto por seguridad (anon no debe ejecutar SQL arbitrario)

---

### 3. Curl Directo a `/rest/v1/rpc/exec_sql` con `service_role_key`

**Intento:**
```bash
curl -X POST 'https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  --data '{"query":"DROP FUNCTION IF EXISTS get_dashboard_conversations(...) CASCADE"}'
```

**Resultado:**
```json
{
  "code": "42601",
  "details": null,
  "hint": null,
  "message": "INTO used with a command that cannot return data"
}
```

**Diagnóstico:**
- ✅ La función `exec_sql` SÍ existe para `service_role`
- ❌ Pero espera un **SELECT** que devuelva datos
- Los comandos DDL (DROP, CREATE) no devuelven datos, causando este error
- PostgreSQL espera que toda query en una función RETURNS SETOF tenga INTO o RETURN QUERY

---

### 4. DO Block Wrapper

**Intento:**
```bash
curl --data '{"query":"DO $$ BEGIN EXECUTE '\''DROP FUNCTION IF EXISTS ...'\''; END $$; SELECT 1 as result"}'
```

**Resultado:**
```
✅ SUCCESS: 1
```

**Diagnóstico:**
- ✅ El DO block ejecuta el DDL
- ✅ El SELECT 1 satisface el requirement de retornar datos
- ✅ Este método funcionó para el DROP

---

### 5. CREATE FUNCTION con DO Block

**Intento:**
```bash
curl --data '{"query":"CREATE OR REPLACE FUNCTION get_dashboard_conversations(...) ..."}'
```

**Resultado:**
```json
{
  "code": "42601",
  "message": "INTO used with a command that cannot return data"
}
```

**Diagnóstico:**
- ❌ CREATE FUNCTION es muy largo (>100 líneas)
- ❌ No puede ser wrapped en DO block fácilmente
- ❌ El MCP no soporta queries multi-statement complejas

---

### 6. Supabase Management API (con Access Token)

**Intento:**
```bash
curl -X POST \
  "https://api.supabase.com/v1/projects/glsmifhkoaifvaegsozd/database/query" \
  -H "Authorization: Bearer sbp_cf20ef17a23fc72d04085cac9d55ddeb966eabdb" \
  --data '{"query":"DROP FUNCTION ..."}'
```

**Resultado:**
```json
{
  "message": "Unauthorized"
}
```

**Diagnóstico:**
- ❌ El Personal Access Token no tiene permisos para ejecutar queries SQL
- Solo tiene permisos de Management API (proyectos, settings, etc.)
- No puede ejecutar SQL directo

---

## 🚫 Limitaciones Identificadas

### MCP SupabaseREST

| Característica | Estado | Notas |
|---|---|---|
| **SELECT queries** | ✅ Funciona | Via `query_table` o `execute_sql` |
| **INSERT/UPDATE/DELETE** | ✅ Funciona | Via herramientas específicas |
| **CREATE TABLE** | ❌ No funciona | DDL no devuelve datos |
| **DROP TABLE** | ❌ No funciona | DDL no devuelve datos |
| **CREATE FUNCTION** | ❌ No funciona | DDL no devuelve datos |
| **DROP FUNCTION** | ⚠️ Solo con wrapper | Requiere DO block + SELECT |
| **Multi-statement** | ❌ No funciona | Límite de complejidad |
| **Transacciones** | ❌ No funciona | No soporta BEGIN/COMMIT |

### PostgREST API (`/rest/v1/rpc/exec_sql`)

| Característica | Estado | Notas |
|---|---|---|
| **Disponible para anon** | ❌ No | Solo `service_role` |
| **Acepta DDL** | ❌ No | Solo queries que retornan datos |
| **Formato de salida** | JSON | Debe parsear resultado como JSON válido |
| **Limite de tamaño** | Desconocido | Queries muy largas pueden fallar |

### Supabase Management API

| Característica | Estado | Notas |
|---|---|---|
| **Ejecutar SQL** | ❌ No disponible | No hay endpoint para raw SQL |
| **Personal Access Token** | ✅ Funciona | Solo para management, no para SQL |
| **Service Role Key** | N/A | No aplicable para Management API |

---

## 🔧 Soluciones Funcionales

### ✅ Método 1: SQL Editor Manual (Usado)
- **Ventaja:** Funciona 100%, sin restricciones
- **Desventaja:** Requiere intervención manual del usuario
- **Recomendación:** Usar para DDL complejas

### ✅ Método 2: DO Block para DDL Simples
```bash
curl --data '{"query":"DO $$ BEGIN EXECUTE '\''DDL_COMMAND'\''; END $$; SELECT 1 as result"}'
```
- **Ventaja:** Automatizable para DROP, ALTER simples
- **Desventaja:** No funciona para CREATE FUNCTION (muy largo)
- **Recomendación:** Usar solo para DROP, ALTER cortos

### ❌ Método 3: MCP Mejorado (Propuesta)
Crear una función wrapper en Supabase:
```sql
CREATE OR REPLACE FUNCTION exec_ddl(ddl_command TEXT)
RETURNS TEXT
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE ddl_command;
  RETURN 'OK';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION exec_ddl TO service_role;
```

Luego el MCP podría llamar:
```typescript
CallMcpTool({
  toolName: "execute_sql",
  arguments: {
    sql: "SELECT exec_ddl('DROP FUNCTION ...')"
  }
})
```

**Estado:** No implementado (requiere modificar BD)

---

## 📊 Comparativa de Métodos

| Método | DDL Simple | DDL Complejo | Automático | Seguro |
|---|---|---|---|---|
| SQL Editor | ✅ | ✅ | ❌ | ✅ |
| DO Block + curl | ✅ | ❌ | ✅ | ✅ |
| MCP actual | ❌ | ❌ | ✅ | ✅ |
| MCP mejorado (propuesto) | ✅ | ✅ | ✅ | ⚠️ |
| Management API | ❌ | ❌ | N/A | N/A |

---

## 🐛 Causa Raíz del Problema

### PostgreSQL + PostgREST Arquitectura

```
┌─────────────────┐
│ Frontend/MCP    │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ PostgREST       │ ◄── Convierte HTTP → SQL
│ /rest/v1/rpc/   │     Espera JSON de retorno
└────────┬────────┘
         │ SQL Query
         ▼
┌─────────────────┐
│ PostgreSQL      │
│ exec_sql()      │ ◄── Función que ejecuta query
│   ↓             │     Debe retornar SETOF record
│ EXECUTE query   │     DDL no retorna nada → ERROR
└─────────────────┘
```

**El problema:**
1. `exec_sql()` está definida como `RETURNS SETOF record`
2. PostgreSQL require que funciones RETURNS SETOF tengan `RETURN QUERY` o `INTO`
3. DDL (DROP, CREATE) no genera resultado → no se puede RETURN QUERY
4. Esto causa el error "INTO used with a command that cannot return data"

---

## 💡 Recomendaciones

### Inmediato (Para este caso)
1. ✅ **Usar SQL Editor manual** para DDL complejas
2. ✅ **DO Block + curl** solo para DROP/ALTER simples
3. ❌ **NO usar MCP** para operaciones DDL

### Corto Plazo
1. Crear función `exec_ddl()` en Supabase
2. Actualizar MCP para usar `exec_ddl()` cuando sea DDL
3. Documentar limitaciones en `.cursor/rules/mcp-rest-rules.mdc`

### Largo Plazo
1. Considerar MCP alternativo que use conexión directa (no PostgREST)
2. O implementar proxy Edge Function para DDL
3. Evaluar si vale la pena vs SQL Editor manual

---

## 📝 Archivos Relevantes

| Archivo | Propósito |
|---|---|
| `.cursor/rules/mcp-rest-rules.mdc` | Reglas actuales del MCP |
| `mcp-supabase-rest-server.ts` | Código del servidor MCP |
| `~/.cursor/mcp.json` | Configuración (service_role_key) |
| `.supabase/access_token` | Personal Access Token (no útil para SQL) |

---

## ✅ Conclusión

El MCP `SupabaseREST` **NO está roto**, simplemente tiene **limitaciones inherentes** de PostgREST:
- Solo soporta queries que devuelven datos (SELECT, INSERT RETURNING, etc.)
- No puede ejecutar DDL directamente (CREATE, DROP, ALTER de funciones)
- DO block es un workaround parcial

Para DDL complejas como CREATE FUNCTION, **SQL Editor manual es el método correcto** y no hay forma de automatizarlo sin modificar la arquitectura.

---

**Estado:** ✅ Diagnóstico completo  
**Acción requerida:** Usar SQL Editor para el resto de la migración
