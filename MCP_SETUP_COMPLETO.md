# ✅ MCP Supabase REST - Configuración Completa

**Fecha:** 27 de Enero 2026  
**Estado:** ✅ Completamente funcional y seguro

---

## 📋 Archivos Creados/Actualizados

### ✅ Documentación Segura
| Archivo | Propósito | En Git |
|---------|-----------|--------|
| `SUPABASE_CREDENTIALS.local.md` | 🔑 Credenciales completas | ❌ NO (*.local.md) |
| `.cursor/rules/mcp-supabase-rest-full.mdc` | 📚 Reglas actualizadas | ✅ SÍ |
| `.cursor/rules/mcp-rest-rules.mdc` | ⚠️ Deprecado | ✅ SÍ (marcado obsoleto) |
| `CREAR_EXEC_DDL_SEGURO.sql` | 🛠️ Script para Supabase | ✅ SÍ |
| `mcp-supabase-rest-server.ts` | ⚙️ Servidor MCP | ✅ SÍ |

---

## 🔐 Seguridad Garantizada

### ✅ Credenciales Protegidas

```
📁 SUPABASE_CREDENTIALS.local.md
   ├─ service_role_key (bypasea RLS)
   ├─ personal_access_token (Management API)
   └─ secret_api_key (Admin)
   
   ✅ Ignorado por Git (*.local.md)
   ✅ NO en bundle de producción
   ✅ Solo uso local
```

### 🔒 Función Segura en Supabase

```sql
exec_ddl(sql_command TEXT)
   ├─ SECURITY DEFINER
   ├─ SOLO service_role puede ejecutar
   ├─ REVOCADO: anon, authenticated, public
   └─ ✅ NO expuesta públicamente
```

---

## 🎯 Capacidades del MCP

### Nombre en Cursor
```
user-SupabaseREST
```

### Herramientas
```typescript
// SQL Completo (DDL + DML)
mcp_user-SupabaseREST_execute_sql

// Operaciones específicas
mcp_user-SupabaseREST_query_table
mcp_user-SupabaseREST_insert_data
mcp_user-SupabaseREST_update_data
mcp_user-SupabaseREST_delete_data
mcp_user-SupabaseREST_get_schema
mcp_user-SupabaseREST_get_table_info
mcp_user-SupabaseREST_backup_table
mcp_user-SupabaseREST_debug_connection
```

### Capacidades SQL
| Operación | Estado |
|-----------|--------|
| CREATE TABLE/VIEW | ✅ |
| DROP TABLE/VIEW | ✅ |
| CREATE FUNCTION | ✅ |
| DROP FUNCTION | ✅ |
| ALTER TABLE | ✅ |
| CREATE TRIGGER | ✅ |
| SELECT/INSERT/UPDATE/DELETE | ✅ |

---

## 📝 Cómo Citar Credenciales

### En Conversaciones con AI
```
"Las credenciales están en SUPABASE_CREDENTIALS.local.md"
```

### En Issues/Tickets
```
Ver archivo local: SUPABASE_CREDENTIALS.local.md
(No en repositorio, solo desarrollo local)
```

### En Documentación
```
Configuración: ~/.cursor/mcp.json
Credenciales: SUPABASE_CREDENTIALS.local.md (local)
```

---

## ✅ Checklist de Seguridad

Antes de cada commit:

```bash
# 1. Verificar que service_role NO esté en código
grep -r "service_role" src/ 
# → Debe retornar: (sin resultados)

# 2. Verificar .gitignore
git check-ignore SUPABASE_CREDENTIALS.local.md
# → Debe retornar: SUPABASE_CREDENTIALS.local.md

# 3. Verificar bundle (después de build)
npm run build && grep -r "service_role" dist/
# → Debe retornar: (sin resultados)

# 4. Verificar .env.production
cat .env.production | grep -i service
# → Debe retornar: (sin resultados)
```

---

## 🚀 Uso Rápido

### Ejemplo 1: Crear Vista
```typescript
CallMcpTool({
  server: "user-SupabaseREST",
  toolName: "execute_sql",
  arguments: {
    sql: `CREATE OR REPLACE VIEW my_view AS 
          SELECT * FROM prospectos WHERE active = true`
  }
})
```

### Ejemplo 2: Actualizar Config
```typescript
CallMcpTool({
  server: "user-SupabaseREST",
  toolName: "update_data",
  arguments: {
    table: "system_config",
    data: { config_value: { version: "1.0.0" } },
    filter: { config_key: "app_version" }
  }
})
```

### Ejemplo 3: Consultar con Filtros
```typescript
CallMcpTool({
  server: "user-SupabaseREST",
  toolName: "query_table",
  arguments: {
    table: "prospectos",
    select: "id, nombre",
    filter: { status: "activo" },
    limit: 10
  }
})
```

---

## 📚 Referencias

| Documento | Descripción |
|-----------|-------------|
| `SUPABASE_CREDENTIALS.local.md` | 🔑 Credenciales (NO en Git) |
| `.cursor/rules/mcp-supabase-rest-full.mdc` | 📚 Reglas completas |
| `.cursor/rules/security-rules.mdc` | 🔒 Seguridad general |
| `CREAR_EXEC_DDL_SEGURO.sql` | 🛠️ Setup de `exec_ddl` |
| `mcp-supabase-rest-server.ts` | ⚙️ Código del servidor |

---

## ⚠️ Recordatorios

1. **NUNCA** agregar `service_role_key` al código fuente
2. **SIEMPRE** verificar bundle antes de deploy
3. **SOLO** usar en desarrollo local
4. **NUNCA** compartir `SUPABASE_CREDENTIALS.local.md`

---

**✅ Setup Completo**  
**🔒 Seguridad Verificada**  
**🚀 Listo Para Usar**
