# Bug Report: Round Robin de Coordinaciones No Funciona

**Fecha:** 8 de febrero 2026
**Severidad:** Alta - Afecta distribucion de prospectos en produccion
**Workflow:** `[sub] Round Robin Asignar Ejecutivo` + `New contact / contact info [PROD]`
**Estado:** Activo en produccion desde 22 dic 2025

---

## Resumen Ejecutivo

Se identificaron **2 bugs** en el sistema de asignacion de prospectos:

1. **Bug 1 (Critico):** El round robin de coordinaciones nunca ha funcionado. Un campo mal nombrado causa que todas las coordinaciones se evaluen con conteo = 0, y el desempate alfabetico hace que **APEX reciba el ~87.5% de los prospectos**.

2. **Bug 2 (Riesgo):** El sub-workflow Round Robin de ejecutivos consulta la tabla `auth_users` que **ya no existe** en la BD. Actualmente funciona porque usa la credencial `System_UI` (que apunta a una conexion donde la tabla aun es accesible), pero si esa credencial se actualiza o la tabla legacy se elimina, el round robin de ejecutivos dejara de funcionar completamente.

---

## Evidencia

### Distribucion actual (ultimos 200 prospectos organicos, 6-9 Feb 2026)

| Coordinacion | Prospectos | % |
|---|---|---|
| APEX | 175 | 87.5% |
| MVP | 8 | 4.0% |
| COBACA | 7 | 3.5% |
| VEN | 7 | 3.5% |
| Sin asignar | 2 | 1.0% |
| CALIDAD | 1 | 0.5% |

*Nota: Excluye importados manuales (origen = IMPORTADO_MANUAL). Solo Facebook Ads.*

### Acumulado del mes (Feb 2026)

| Coordinacion | Asignaciones mes |
|---|---|
| APEX | 313 |
| VEN | 73 |
| MVP | 64 |
| COBACA | 63 |
| BOOM | 47 |

APEX tiene **5-6x mas prospectos** que cualquier otra coordinacion.

---

## Causa Raiz

### Flujo de asignacion

```
Crear contacto en DB Supabase
  → Obtener coordinaciones activas (query: coordinaciones WHERE is_operativo = TRUE)
  → Aggregate
  → Conteo asignaciones este mes (query: COUNT prospectos por coordinacion del mes)
  → Asignar coordinacion (codigo JS: selecciona la de menor conteo)
  → Actualizar DB con asignacion
```

### El bug: nombre de campo incorrecto

**Archivo:** Nodo `Asignar coordinacion` en workflow `IpyOAEayWSfGkHuT`

El nodo "Conteo asignaciones este mes" retorna los datos con el campo **`asignaciones_mes`**:

```sql
-- Query del nodo "Conteo asignaciones este mes"
SELECT
    c.id AS coordinacion_id,
    c.codigo,
    c.nombre AS coordinacion_nombre,
    COALESCE(COUNT(p.id), 0) AS asignaciones_mes   -- ← campo: asignaciones_mes
FROM ...
```

Pero el nodo "Asignar coordinacion" lee el campo **`asignaciones_hoy`** (que no existe):

```javascript
// Nodo "Asignar coordinacion" - LINEAS 5-6
coordinaciones.sort((a, b) => {
  const countA = parseInt(a.json.asignaciones_hoy) || 0;  // ← BUG: campo incorrecto
  const countB = parseInt(b.json.asignaciones_hoy) || 0;  // ← BUG: campo incorrecto

  if (countA !== countB) {
    return countA - countB;
  }

  // Desempate alfabetico
  return a.json.coordinacion_nombre.localeCompare(b.json.coordinacion_nombre);
});

const coordinacionSeleccionada = coordinaciones[0].json;
```

### Que sucede en runtime

1. `parseInt(a.json.asignaciones_hoy)` → el campo no existe → `NaN`
2. `NaN || 0` → todas las coordinaciones obtienen conteo `0`
3. `countA !== countB` → `0 !== 0` → `false` para todas
4. Entra al desempate: `coordinacion_nombre.localeCompare()`
5. Orden alfabetico: **APEX** < BOOM < COB ACA < MVP < VEN
6. `coordinaciones[0]` → **siempre APEX**

---

## Fix Requerido

### Bug 1: Campo incorrecto en asignacion de coordinacion

**Donde:** Nodo **"Asignar coordinacion"** del workflow `IpyOAEayWSfGkHuT` (`New contact / contact info [PROD]`)

Cambiar las lineas 5 y 6:

**Antes (bug):**
```javascript
const countA = parseInt(a.json.asignaciones_hoy) || 0;
const countB = parseInt(b.json.asignaciones_hoy) || 0;
```

**Despues (fix):**
```javascript
const countA = parseInt(a.json.asignaciones_mes) || 0;
const countB = parseInt(b.json.asignaciones_mes) || 0;
```

### Bug 2: Tabla `auth_users` deprecada en sub-workflow de ejecutivos

**Donde:** Nodo **"Usuarios Activos"** del sub-workflow `FmZYz99NMttjgPxE` (`[sub] Round Robin Asignar Ejecutivo`)

La query actual usa `auth_users` con credencial `System_UI` (`nJKk9tWCSG0aVd0M`):

**Antes (deprecated):**
```sql
SELECT
  u.id, u.full_name, u.email, u.coordinacion_id,
  c.nombre AS coordinacion_nombre, u.id_dynamics
FROM auth_users u
LEFT JOIN coordinaciones c ON c.id = u.coordinacion_id
WHERE u.is_active = true
  AND u.id_dynamics IS NOT NULL
  AND u.id_dynamics != ''
ORDER BY u.full_name;
```

**Despues (fix):** Migrar a `user_profiles_v2` y usar credencial `PQNC_AI`:
```sql
SELECT
  u.id, u.full_name, u.email, u.coordinacion_id,
  c.nombre AS coordinacion_nombre, u.id_dynamics
FROM user_profiles_v2 u
LEFT JOIN coordinaciones c ON c.id = u.coordinacion_id
WHERE u.is_active = true
  AND u.id_dynamics IS NOT NULL
  AND u.id_dynamics != ''
ORDER BY u.full_name;
```

Ademas, cambiar la credencial del nodo de `System_UI` (`nJKk9tWCSG0aVd0M`) a `PQNC_AI` (`eG7d1DxZimF5cbdR`) para consistencia con el resto del workflow.

---

## Impacto

### Bug 1 - Campo incorrecto
- **Activo desde:** 22 dic 2025 (fecha de creacion del workflow)
- **Prospectos afectados:** Todos los organicos desde esa fecha
- **Efecto:** APEX sobrecargada, demas coordinaciones sub-utilizadas
- **Ejecutivos sin prospectos:** 114 de 175 prospectos APEX recientes (65%) quedan sin ejecutivo asignado, probablemente porque el round robin de ejecutivos dentro de APEX no da abasto con la carga

### Bug 2 - Tabla auth_users deprecada
- **Riesgo:** Si se elimina la tabla legacy `auth_users` o se revoca la credencial `System_UI`, el round robin de ejecutivos deja de funcionar por completo (0 ejecutivos disponibles = 0 asignaciones)
- **Efecto actual:** Funciona por ahora, pero depende de infraestructura legacy

---

## Informacion Adicional

### Coordinaciones operativas (is_operativo = TRUE)

| Codigo | Ejecutivos activos (con id_dynamics) |
|---|---|
| APEX | 12 |
| BOOM | 8 |
| COBACA | 8 |
| MVP | 10 |
| VEN | 11 |

### IDs de referencia

- **Workflow principal:** `IpyOAEayWSfGkHuT` (New contact / contact info [PROD])
- **Sub-workflow Round Robin:** `FmZYz99NMttjgPxE` ([sub] Round Robin Asignar Ejecutivo)
- **Nodo con bug:** "Asignar coordinacion" (tipo: Code, 39 lineas)
- **BD:** PQNC_AI (`glsmifhkoaifvaegsozd`)
