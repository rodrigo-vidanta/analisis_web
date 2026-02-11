# Handover: Fix RLS - Coordinación Huérfana Bloquea Acceso a Ejecutivo

**Fecha:** 2026-02-11
**Sesion:** Diagnóstico y fix de acceso RLS para ejecutivo Rodrigo Meza
**Estado:** Resuelto en producción (fix de datos directo en BD)

---

## Contexto

El ejecutivo **Meza Mendoza Rodrigo Ismael** (`rodrigomeza@vidavacations.com`, auth ID: `8eb6a28c-ec40-4318-ae9e-b6fb3ba88acb`) no podía ver los mensajes de su prospecto asignado **Maria Teresa** (`59e8ac42-be78-4cf6-b0f7-ace0b7329b6f`).

Error visible en consola:
```
GET .../v_prospectos_ai_config?select=...&id=eq.59e8ac42... 406 (Not Acceptable)
PGRST116: JSON object requested, multiple (or no) rows returned
```

Desde cuenta admin, los mensajes sí eran visibles.

---

## Diagnóstico

### Cadena RLS involucrada

```
v_prospectos_ai_config (SECURITY INVOKER)
  → prospectos (RLS: user_can_see_prospecto())
    → mensajes_whatsapp (RLS: JOIN prospectos + user_can_see_prospecto())
    → conversaciones_whatsapp (RLS: JOIN prospectos + user_can_see_prospecto())
```

### Función `user_can_see_prospecto()` — Nivel Ejecutivo

```sql
IF v_role_name = 'ejecutivo' THEN
    RETURN prospecto_ejecutivo_id = v_user_id
           AND (prospecto_coordinacion_id = v_user_coordinacion_id
                OR v_user_coordinacion_id IS NULL);
END IF;
```

Requiere **dos condiciones**:
1. Que el prospecto esté asignado al ejecutivo (`ejecutivo_id` match)
2. Que la `coordinacion_id` del prospecto coincida con la del ejecutivo

### Causa Raíz

| Campo | Valor |
|-------|-------|
| Prospecto `ejecutivo_id` | `8eb6a28c...` (Rodrigo) ✅ |
| Prospecto `coordinacion_id` | `7b43a7b1-9d7c-4390-9884-5a84f06b6ed0` |
| Ejecutivo `coordinacion_id` | `4c1ece41-bb6b-49a1-b52b-f5236f54d60a` (MVP) |
| Coordinación `7b43a7b1...` existe en tabla `coordinaciones`? | **NO** — ID huérfano |

La `coordinacion_id` del prospecto apuntaba a un registro que **no existe** en la tabla `coordinaciones`. No coincidía con MVP (la coordinación del ejecutivo), por lo que `user_can_see_prospecto()` retornaba `false`.

### Efecto Cascada

Al no poder leer el prospecto por RLS:
- `v_prospectos_ai_config` → 0 filas → error 406 PGRST116
- `mensajes_whatsapp` → 0 filas → no se muestran mensajes previos
- `conversaciones_whatsapp` → 0 filas → no se carga la conversación

Admin sí podía ver todo porque `user_can_see_prospecto()` retorna `true` para admin/calidad sin verificar coordinación.

---

## Fix Aplicado

### SQL ejecutado (producción directa)

```sql
UPDATE prospectos
SET coordinacion_id = '4c1ece41-bb6b-49a1-b52b-f5236f54d60a'  -- MVP
WHERE id = '59e8ac42-be78-4cf6-b0f7-ace0b7329b6f';
```

**1 registro actualizado.** Coordinación del prospecto ahora es MVP = coordinación de Rodrigo.

---

## Hallazgos Adicionales

### 5 prospectos más con coordinaciones huérfanas

```
0f2ae7e4... → coord 7f024e10... (sin ejecutivo)
bc2ef13d... → coord 9f482a89... (sin ejecutivo) — "Maryam"
06ba992a... → coord bec48e4b... (sin ejecutivo)
a9c3900e... → coord c2cb77fe... (sin ejecutivo) — "Estefany"
e27ac383... → coord 5652dd66... (sin ejecutivo) — "Tania"
```

**No son problema activo**: ninguno tiene `ejecutivo_id` asignado, así que ningún ejecutivo intenta acceder a ellos. Solo admins los ven.

### Consideración futura

La función `user_can_see_prospecto()` para ejecutivos exige match de coordinación **además** de match de ejecutivo. Si se reasignan prospectos entre coordinaciones sin actualizar `coordinacion_id`, este problema puede repetirse. Opciones:

1. **Preventiva (datos):** Asegurar que al asignar ejecutivo, se actualice `coordinacion_id` del prospecto a la del ejecutivo
2. **Preventiva (RLS):** Relajar la condición para ejecutivos — si el prospecto está asignado a ellos, permitir acceso sin verificar coordinación
3. **Preventiva (BD):** Agregar foreign key constraint de `prospectos.coordinacion_id` → `coordinaciones.id` para evitar IDs huérfanos

---

## Archivos Relevantes (solo lectura, no se modificó código)

- Función RLS: `user_can_see_prospecto()` en BD
- Vista: `v_prospectos_ai_config` (SECURITY INVOKER)
- Políticas RLS: `prospectos`, `mensajes_whatsapp`, `conversaciones_whatsapp`

---

## Verificación

Pedir a Rodrigo que recargue la página y abra la conversación de Maria Teresa. Debe poder ver:
- Datos del prospecto en el panel
- Configuración AI (sin error 406)
- Mensajes previos de la conversación
