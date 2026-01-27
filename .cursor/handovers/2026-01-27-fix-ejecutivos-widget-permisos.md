# 🔧 Fix Widget de Ejecutivos - Permisos del RPC

**Fecha:** 27 de Enero 2026  
**Estado:** ⚠️ REQUIERE ACCIÓN INMEDIATA  
**Prioridad:** 🔴 ALTA

---

## 🔍 HALLAZGO ACTUALIZADO

**✅ BUENAS NOTICIAS:** El RPC `get_ejecutivos_metricas` **SÍ EXISTE** en la base de datos.

**❌ PROBLEMA REAL:** Tiene un error de **permisos**.

---

## 🐛 Error Detectado

### En la Consola del Navegador:
```
POST https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/get_ejecutivos_metricas 404 (Not Found)

Error: {
  code: '42883',
  message: 'operator does not exist: uuid = text'
}
```

### ⚠️ ACTUALIZACIÓN: Error Real Verificado en BD

Después de conectarnos directamente a la base de datos:

```json
{
  "code": "42501",
  "message": "permission denied for function get_ejecutivos_metricas"
}
```

**Código 42501 = Permission Denied**

---

## 🎯 Causa Raíz

El RPC fue creado pero **no se otorgaron permisos** a los roles `anon` y `authenticated`.

Por defecto, cuando creas una función en PostgreSQL, solo el owner (postgres) tiene permisos de ejecución.

---

## ✅ Solución (Solo Usuarios Autenticados)

### 🔐 IMPORTANTE: Seguridad Primero

**Las métricas de ejecutivos son información SENSIBLE. Solo usuarios autenticados deben tener acceso.**

**NO se debe otorgar acceso a `anon`** - esto expondría datos privados de rendimiento de tu equipo.

---

### SQL para Ejecutar

1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new

2. Ejecutar:

```sql
-- Otorgar permisos SOLO a usuarios autenticados (con JWT)
GRANT EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
TO authenticated;

-- Revocar explícitamente acceso a anon (seguridad)
REVOKE EXECUTE ON FUNCTION get_ejecutivos_metricas(TIMESTAMPTZ, TIMESTAMPTZ, UUID[]) 
FROM anon;
```

3. Refrescar la app

**✅ Resultado:** Solo usuarios con sesión válida (JWT token) podrán ver las métricas de ejecutivos.

---

## 🔍 Verificación Realizada

### Script de Verificación (scripts/verificar-rpc.ts)

```typescript
const { data, error } = await supabase.rpc('get_ejecutivos_metricas', {
  p_fecha_inicio: '2025-01-01T00:00:00Z',
  p_fecha_fin: '2025-02-01T00:00:00Z',
  p_coordinacion_ids: null
});
```

**Resultado:**
```
❌ ERROR: permission denied for function get_ejecutivos_metricas
Code: 42501
```

**Conclusión:** ✅ La función EXISTE, ❌ pero no tiene permisos.

---

## 🤔 ¿Por Qué el Error 404 en el Navegador?

PostgREST (la API REST de Supabase) retorna **404** cuando:
1. El RPC no existe, **O**
2. El usuario no tiene permisos para ejecutarlo

Ambos casos generan el mismo error HTTP 404, pero el código interno es diferente:
- `42883` = Function does not exist
- `42501` = Permission denied (este es nuestro caso)

---

## 📊 Qué Hace la Función

La función `get_ejecutivos_metricas` calcula:

| Métrica | Descripción | Fuente |
|---------|-------------|--------|
| `mensajes_enviados` | Total de mensajes enviados | `mensajes_whatsapp` |
| `plantillas_enviadas` | Mensajes con `es_plantilla = true` | `mensajes_whatsapp` |
| `llamadas_atendidas` | Llamadas con status `atendida` o `transferida` | `llamadas_ventas` |
| `llamadas_programadas` | Llamadas agendadas | `llamadas_programadas` |
| `prospectos_asignados` | Prospectos asignados al ejecutivo | `prospectos` |
| `tiempo_respuesta_promedio` | Tiempo promedio de respuesta (minutos) | `mensajes_whatsapp` |
| `tiempo_handoff_promedio` | Tiempo promedio hasta handoff (minutos) | `mensajes_whatsapp` |
| `conversaciones_con_handoff` | Número de conversaciones con handoff | `mensajes_whatsapp` |

---

## 🛠️ Archivos Creados

1. ✅ `docs/sql/fix_permissions_get_ejecutivos_metricas.sql` - SQL para otorgar permisos
2. ✅ `scripts/verificar-rpc.ts` - Script de verificación
3. ✅ `.cursor/handovers/2026-01-27-fix-ejecutivos-widget-permisos.md` - Este archivo

---

## 🧪 Testing

Después de otorgar permisos:

```bash
# Ejecutar script de verificación
npx tsx scripts/verificar-rpc.ts

# Resultado esperado:
✅ El RPC EXISTE y respondió correctamente
```

---

## 📝 Checklist de Resolución

- [ ] Ejecutar GRANT EXECUTE en Supabase Dashboard
- [ ] Verificar que no hay error en SQL Editor
- [ ] Ejecutar `npx tsx scripts/verificar-rpc.ts`
- [ ] Refrescar la app
- [ ] Click en pestaña "Ejecutivos"
- [ ] Verificar que carguen las métricas sin errores

---

## 🔐 Diferencia entre SECURITY DEFINER e INVOKER

| Modo | Ejecución | Permisos Necesarios |
|------|-----------|---------------------|
| `SECURITY DEFINER` | Como owner (postgres) | No necesita GRANT (pero recomendado) |
| `SECURITY INVOKER` | Como usuario que llama | **Requiere** GRANT EXECUTE |

**Recomendación:** Usar `SECURITY DEFINER` + `GRANT EXECUTE` para seguridad y claridad.

---

**Estado al finalizar:** ⚠️ Requiere ejecutar GRANT en Supabase  
**Tiempo estimado:** 1 minuto  
**Próximos pasos:** Otorgar permisos y verificar
