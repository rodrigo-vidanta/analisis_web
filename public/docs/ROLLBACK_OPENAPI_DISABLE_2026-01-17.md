# Rollback Plan: Deshabilitación de OpenAPI Schema

**Fecha:** 17 de Enero 2026  
**Operación:** Deshabilitar `pgrst.openapi_mode` para roles `anon` y `authenticator`  
**Proyecto:** PQNC_AI (glsmifhkoaifvaegsozd)  
**Ejecutado por:** Cursor AI + Samuel Rosales

---

## Estado Previo (Backup)

### Configuración PostgREST Antes del Cambio

```json
{
  "db_schema": "public",
  "max_rows": 1000,
  "db_extra_search_path": "public, extensions",
  "db_pool": null
}
```

### OpenAPI Mode (Estado Original)

Los roles `anon` y `authenticator` **NO tenían** `pgrst.openapi_mode` configurado, lo que significa que usaban el valor por defecto (`follow-privileges`).

```sql
-- Estado original (implícito):
-- pgrst.openapi_mode = 'follow-privileges' (default)
```

---

## Cambio Aplicado

```sql
-- Deshabilitar OpenAPI para roles públicos
ALTER ROLE authenticator SET pgrst.openapi_mode TO 'disabled';
ALTER ROLE anon SET pgrst.openapi_mode TO 'disabled';

-- Recargar configuración de PostgREST
NOTIFY pgrst, 'reload config';
```

---

## Plan de Rollback

Si hay problemas, ejecutar en SQL Editor de Supabase:

```sql
-- ROLLBACK: Restaurar OpenAPI mode a default
ALTER ROLE authenticator RESET pgrst.openapi_mode;
ALTER ROLE anon RESET pgrst.openapi_mode;

-- Recargar configuración
NOTIFY pgrst, 'reload config';
```

### Verificación Post-Rollback

```bash
# Debe devolver el schema completo (732KB)
curl -s "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/" \
  -H "apikey: $ANON_KEY" | wc -c
```

---

## Verificación del Cambio

### Test 1: OpenAPI debe estar bloqueado

```bash
# Debe devolver error o respuesta vacía
curl -s "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/" \
  -H "apikey: $ANON_KEY"
```

**Esperado:** Error 406 Not Acceptable o respuesta vacía

### Test 2: Endpoints específicos deben seguir funcionando

```bash
# Debe devolver datos (con service_role) o 401 (con anon + RLS)
curl -s "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/coordinaciones?limit=1" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

**Esperado:** Array JSON con datos

### Test 3: RPCs deben seguir funcionando

```bash
# Debe funcionar para usuarios autenticados
curl -s -X POST "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/get_user_permissions" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "uuid-here"}'
```

---

## Impacto Esperado

| Componente | Impacto |
|------------|---------|
| Frontend (React) | ✅ Ninguno - No usa `/rest/v1/` |
| Endpoints REST específicos | ✅ Funcionan normal |
| RPCs | ✅ Funcionan normal |
| Introspección schema | ❌ **Bloqueada** (objetivo) |
| Supabase Dashboard | ✅ Sin cambios |

---

## Proyectos a Aplicar

| Proyecto | ID | Aplicar |
|----------|-----|---------|
| PQNC_AI | glsmifhkoaifvaegsozd | ✅ Sí |
| System_UI | zbylezfyagwrxoecioup | ⏳ Después de verificar PQNC_AI |
| PQNC_QA | hmmfuhqgvsehkizlfzga | ⏳ Después |
| Log_monitor | dffuwdzybhypxfzrmdcz | ⏳ Después |
| Sales_Assistant | vxsihmavkhhxajniwqpd | ⏳ Después |
| Documentation | dhuovmigauxfgynazuxj | ⏳ Después |
| PQNC_AI_DEV | gvfrsubjhgikrridlouu | ⏳ Después |

---

## Notas

- El cambio es reversible con `RESET` en lugar de `SET`
- No requiere reinicio de servicios, solo `NOTIFY pgrst, 'reload config'`
- El frontend usa `@supabase/supabase-js` que nunca llama al endpoint raíz

---

---

## ✅ Resultado de la Aplicación

**Fecha de ejecución:** 2026-01-17 15:35 CST

### Proyectos Actualizados

| Proyecto | ID | Estado | Tamaño Respuesta |
|----------|-----|--------|------------------|
| PQNC_AI | glsmifhkoaifvaegsozd | ✅ BLOQUEADO | 3 bytes |
| System_UI | zbylezfyagwrxoecioup | ✅ BLOQUEADO | 94 bytes |
| PQNC_QA | hmmfuhqgvsehkizlfzga | ✅ BLOQUEADO | 3 bytes |
| Log_monitor | dffuwdzybhypxfzrmdcz | ✅ BLOQUEADO | 94 bytes |
| Sales_Assistant | vxsihmavkhhxajniwqpd | ✅ BLOQUEADO | 94 bytes |
| Documentation | dhuovmigauxfgynazuxj | ✅ BLOQUEADO | 3 bytes |
| PQNC_AI_DEV | gvfrsubjhgikrridlouu | ✅ BLOQUEADO | 94 bytes |

### Verificación de Funcionamiento

- ✅ Endpoints específicos (`/rest/v1/tabla`) funcionan normalmente
- ✅ RLS sigue activo (anon bloqueado con error 42501)
- ✅ RPCs funcionan con autenticación
- ✅ Schema ya NO se expone en `/rest/v1/`

### Vulnerabilidad Remediada

- **CVSS Antes:** 5.3 (Medium)
- **CVSS Después:** 0 (Remediado)
- **Reducción de exposición:** 732KB → 3 bytes

---

**Documento creado:** 2026-01-17 15:30 CST  
**Actualizado con resultados:** 2026-01-17 15:35 CST
