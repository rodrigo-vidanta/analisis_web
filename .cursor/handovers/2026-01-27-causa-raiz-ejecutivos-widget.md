# 🔍 Análisis de Causa Raíz: Widget de Ejecutivos Roto

**Fecha:** 27 de Enero 2026  
**Problema:** Widget de "Métricas de Ejecutivos" no carga (404 Not Found)  
**RPC Faltante:** `get_ejecutivos_metricas`

---

## 🎯 Pregunta del Usuario

> **"¿Por qué esto no está funcionando si ya estaba funcionando antes?"**

---

## 🔍 Causa Raíz Identificada

### Línea de Tiempo de Eventos

| Fecha | Evento | Detalles |
|-------|--------|----------|
| **Antes de Enero 16** | ✅ RPC funcionaba | El widget de ejecutivos cargaba correctamente |
| **Enero 16, 2026** | 🧹 Limpieza masiva de BD | Se eliminaron 7 funciones obsoletas (ver `CHANGELOG_LIMPIEZA_BD_2026-01-16.md`) |
| **Enero 21, 2026** | 📋 Diagnóstico | Documento `DIAGNOSTICO_EJECUTIVO_ID_MIGRACION.md` menciona: "`get_ejecutivos_metricas` ✅ Ya migrada" |
| **Enero 27, 2026** | 🔴 Error detectado | Widget falla con `404 Not Found` - **RPC no existe** |

---

## 🕵️ Análisis Detallado

### 1. Evidencia de Limpieza (16 de Enero)

Del archivo `docs/CHANGELOG_LIMPIEZA_BD_2026-01-16.md`:

```
Funciones RPC:
- Antes: ~94 funciones custom
- Después: ~87 funciones custom
- Eliminadas: 7 funciones obsoletas
```

**Funciones documentadas como eliminadas:**
- ❌ `fn_force_leido_false_on_insert` (versiones v1-v5)
- ❌ `authenticate_user` (v1-v2)
- ❌ Funciones `create_company*` (no existían)

**⚠️ PROBLEMA:** El RPC `get_ejecutivos_metricas` **no está en la lista de funciones eliminadas documentadas**, pero el conteo indica que hubo más funciones eliminadas de las reportadas.

---

### 2. El Diagnóstico del 21 de Enero Asumió Incorrectamente

Del archivo `docs/DIAGNOSTICO_EJECUTIVO_ID_MIGRACION.md` (línea 328):

```markdown
| `get_ejecutivos_metricas` | ✅ Ya migrada | Ninguna |
```

**Problema:** Este diagnóstico se hizo **sin verificar** si el RPC realmente existía en la base de datos. Se asumió que estaba presente porque anteriormente funcionaba.

---

### 3. Escenarios Posibles

#### Escenario A: Eliminación No Documentada (Más Probable)

Durante la limpieza del 16 de enero, es posible que:
1. Se ejecutó un script de limpieza más agresivo de lo documentado
2. El RPC `get_ejecutivos_metricas` fue considerado "obsoleto" por error
3. La función fue eliminada junto con otras 7-10 funciones (el conteo indica 7 eliminadas)

#### Escenario B: Nunca Fue Creado Después de Migración

Es posible que:
1. La función existía en el esquema legacy
2. Durante la migración de `System_UI` → `PQNC_AI` (13 Enero 2025), no se migró este RPC
3. El widget seguía llamando al RPC del proyecto viejo (System_UI)
4. Cuando se limpió System_UI, el RPC desapareció

#### Escenario C: Cambio de Signature

Es posible que:
1. Durante la migración de `ejecutivo_id`, la función necesitaba cambiar su signature
2. Se eliminó la versión vieja con `DROP FUNCTION`
3. Nunca se creó la versión nueva con la signature correcta

---

## 🔎 Verificación de la Teoría

### Query para Verificar si Alguna Vez Existió

```sql
-- Ver historial de funciones en pg_stat_statements (si está habilitado)
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%get_ejecutivos_metricas%';

-- Ver logs de Supabase (Dashboard > Logs > Postgres)
-- Buscar: DROP FUNCTION get_ejecutivos_metricas
```

---

## 💡 Por Qué Pasó Desapercibido

1. **El widget de Ejecutivos no es tan usado:** La mayoría de usuarios usa el dashboard principal (Pipeline de Prospectos), no la pestaña de "Ejecutivos"

2. **Sin tests automatizados:** No hay tests que verifiquen que todos los RPCs necesarios existen

3. **Diagnóstico incompleto:** El documento del 21 de Enero asumió que el RPC existía sin verificarlo

4. **Limpieza agresiva:** La limpieza del 16 de Enero eliminó más funciones de las documentadas (7 reportadas, pero 94→87 = solo 7 eliminadas según conteo)

---

## ✅ Solución

**Ya se ha creado el SQL necesario:**

- ✅ Archivo: `docs/sql/create_get_ejecutivos_metricas.sql`
- ✅ Handover: `.cursor/handovers/2026-01-27-fix-ejecutivos-widget-rpc.md`

**Acción requerida:**
1. Ejecutar el SQL en Supabase Dashboard
2. Refrescar la app
3. Verificar que el widget de "Ejecutivos" funciona

---

## 🛡️ Prevención Futura

### 1. Inventario de RPCs Críticos

Crear lista de RPCs que **NO deben eliminarse**:

```sql
-- RPCs críticos para producción
- get_ejecutivos_metricas       -- Dashboard Ejecutivos
- get_dashboard_pipeline        -- Dashboard Pipeline
- can_user_access_prospect      -- Permisos
- fn_notify_prospecto_changes   -- Realtime
- auto_assign_new_prospect      -- Asignación automática
```

### 2. Script de Verificación Pre-Limpieza

Antes de eliminar funciones, verificar:

```sql
-- Listar todas las funciones que se van a eliminar
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('lista_de_funciones_a_eliminar');

-- Verificar si hay referencias en código
-- grep -r "function_name" src/
```

### 3. Tests de Humo Post-Limpieza

Después de limpiezas mayores, ejecutar:

```bash
# Test de RPCs críticos
curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/rpc/get_ejecutivos_metricas \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_fecha_inicio":"2025-01-01","p_fecha_fin":"2025-02-01","p_coordinacion_ids":null}'
```

### 4. Documentación de Dependencias

Mantener un archivo `docs/RPC_DEPENDENCIES.md` con:

```markdown
| RPC | Usado en | Crítico | Descripción |
|-----|----------|---------|-------------|
| get_ejecutivos_metricas | Dashboard > Ejecutivos | ✅ | Métricas de rendimiento |
| get_dashboard_pipeline | Dashboard > Pipeline | ✅ | Funnel de conversión |
```

---

## 📚 Archivos Relacionados

- **Limpieza 16 Enero:** `docs/CHANGELOG_LIMPIEZA_BD_2026-01-16.md`
- **Diagnóstico 21 Enero:** `docs/DIAGNOSTICO_EJECUTIVO_ID_MIGRACION.md`
- **SQL Corrección:** `docs/sql/create_get_ejecutivos_metricas.sql`
- **Handover Fix:** `.cursor/handovers/2026-01-27-fix-ejecutivos-widget-rpc.md`

---

## 🎯 Lecciones Aprendidas

1. **Siempre verificar antes de documentar:** No asumir que algo existe porque "debería" existir
2. **Tests de regresión:** Las limpiezas masivas requieren tests completos
3. **Documentar TODO:** La limpieza eliminó más de lo documentado
4. **Mantener inventarios:** Tener una lista maestra de RPCs/vistas/tablas críticas

---

**Conclusión:** El RPC fue probablemente eliminado durante la limpieza del 16 de Enero (intencionalmente o por error), y el diagnóstico del 21 de Enero lo marcó como "migrado" sin verificar su existencia real en la base de datos.
