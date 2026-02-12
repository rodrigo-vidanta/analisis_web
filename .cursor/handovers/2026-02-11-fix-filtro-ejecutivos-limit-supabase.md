# Handover: Fix Filtro Ejecutivos - Supabase Limit 1000 + Autocomplete UI

**Fecha:** 2026-02-11
**Sesion:** Diagnóstico y fix del filtro de ejecutivos en ProspectosManager y LiveChatCanvas
**Estado:** Fix aplicado (RPC + frontend ambos módulos), pendiente deploy

---

## Contexto

Al filtrar prospectos por ejecutivo en el módulo Prospectos, **Osmara Partida** (coordinación BOOM) no aparecía en el dropdown. El problema afectaba a **48 de 70 ejecutivos** en total. El mismo bug existía en el módulo WhatsApp (LiveChatCanvas).

Además, con 70 ejecutivos el dropdown clásico no era funcional — se reemplazó por un campo de texto con autocompletado en ambos módulos.

---

## Diagnóstico

### Causa Raíz: Supabase PostgREST LIMIT 1000

Ambos componentes obtenían `ejecutivo_id` de la tabla `prospectos` sin límite explícito:

```typescript
// ProspectosManager.tsx Y LiveChatCanvas.tsx tenían la misma query
const { data } = await analysisSupabase
  .from('prospectos')
  .select('ejecutivo_id')
  .not('ejecutivo_id', 'is', null);
  // ⚠️ PostgREST max-rows default: 1000
```

**Datos clave:**
- Total prospectos con ejecutivo: **2,974** (supera el límite de 1,000)
- Ejecutivos únicos en BD: **70**
- Ejecutivos visibles en dropdown: solo **22** (los que tenían prospectos en las primeras 1,000 filas)
- Ejecutivos ocultos: **48**

### Por qué `.limit(10000)` NO basta

Supabase PostgREST tiene un `max-rows` a nivel servidor (default 1000). Aunque el frontend envíe `.limit(10000)`, el servidor puede capearlo a 1000. La solución correcta es una RPC function que haga `SELECT DISTINCT` en el servidor, devolviendo solo 70 filas.

### Ejecutivos Afectados por Coordinación

| Coordinación | Ejecutivos ocultos |
|---|---|
| APEX | 13 |
| VEN | 11 |
| COB ACA | 9 |
| MVP | 8 |
| BOOM | 4 (incluyendo Osmara Partida) |
| CALIDAD | 3 |

### Flujo del Bug (ambos módulos)

```
loadFilterOptions() / loadEjecutivosForFilter()
  1. Query: SELECT ejecutivo_id FROM prospectos WHERE ejecutivo_id IS NOT NULL
     → PostgREST devuelve solo 1,000 de 2,974 filas (max-rows)
  2. Set(ejecutivo_ids) → solo 22 IDs únicos (de 70 totales)
  3. Query user_profiles_v2 WHERE id IN (22 IDs)
  4. Dropdown solo muestra 22 ejecutivos
  5. Osmara (y 47 más) quedan invisibles
```

---

## Fix Aplicado

### Parte 1: RPC Function (migración BD)

**Migración:** `add_rpc_get_distinct_ejecutivo_ids`

```sql
CREATE OR REPLACE FUNCTION get_distinct_ejecutivo_ids()
RETURNS TABLE(ejecutivo_id uuid) AS $$
  SELECT DISTINCT p.ejecutivo_id
  FROM prospectos p
  WHERE p.ejecutivo_id IS NOT NULL;
$$ LANGUAGE sql SECURITY INVOKER STABLE;

GRANT EXECUTE ON FUNCTION get_distinct_ejecutivo_ids() TO authenticated;
```

- Devuelve 70 filas (vs 2,974 raw) — inmune al max-rows de PostgREST
- SECURITY INVOKER: respeta RLS del usuario autenticado
- STABLE: permite caching en la misma transacción
- Usada por ambos módulos (ProspectosManager + LiveChatCanvas)

### Parte 2: ProspectosManager.tsx

**Query fix (línea ~1098):**
```typescript
// ANTES (bug):
const { data } = await analysisSupabase
  .from('prospectos').select('ejecutivo_id').not('ejecutivo_id', 'is', null);

// DESPUÉS (fix):
const { data } = await analysisSupabase.rpc('get_distinct_ejecutivo_ids');
```

**UI — Dropdown reemplazado por Autocomplete:**
- Input de texto que filtra ejecutivos conforme se escribe
- Dropdown aparece al enfocar el input, se cierra al hacer click fuera
- Botón ✕ para limpiar selección
- Filtro por coordinación se mantiene (si coordinación seleccionada, solo muestra ejecutivos de esa coordinación)
- Scrollbar invisible (`scrollbar-hide` + estilos inline)
- Limpiar filtros también resetea el texto de búsqueda

**Estados nuevos:**
```typescript
const [ejecutivoSearchText, setEjecutivoSearchText] = useState('');
const [showEjecutivoDropdown, setShowEjecutivoDropdown] = useState(false);
const ejecutivoInputRef = useRef<HTMLInputElement>(null);
const ejecutivoDropdownRef = useRef<HTMLDivElement>(null);
```

### Parte 3: LiveChatCanvas.tsx

**Query fix (línea ~4692):**
```typescript
// ANTES (bug) - Admin path:
const { data } = await analysisSupabase
  .from('prospectos').select('ejecutivo_id').not('ejecutivo_id', 'is', null);

// ANTES (bug) - Coordinador/Supervisor path:
const { data: prospectData } = await analysisSupabase
  .from('prospectos').select('ejecutivo_id').in('ejecutivo_id', memberIds)...

// DESPUÉS (fix) - Una sola RPC para ambos paths:
const { data: rpcData } = await analysisSupabase.rpc('get_distinct_ejecutivo_ids');
const allEjecutivoIds = (rpcData || []).map(d => d.ejecutivo_id).filter(Boolean);
// Luego filtra por coordinación si es coordinador/supervisor
```

**UI — Botón+Dropdown reemplazado por Autocomplete:**
- Input con icono Users a la izquierda y placeholder "Buscar ejecutivo..."
- Dropdown animado (Framer Motion) con filtro en tiempo real
- Opción "Todos los ejecutivos" visible solo cuando no hay texto de búsqueda
- Botón ✕ para limpiar selección
- Scrollbar invisible
- Click-outside handler actualizado para limpiar texto de búsqueda

**Estado nuevo:**
```typescript
const [ejecutivoSearchText, setEjecutivoSearchText] = useState('');
```

---

## Verificación

- RPC devuelve **70 ejecutivos** totales
- BOOM muestra **8 ejecutivos** (antes solo 3): incluyendo **Partida Bernal Osmara**
- Build exitoso en ambos cambios (`vite build` sin errores)

---

## Lección Aprendida

**Supabase PostgREST tiene `max-rows` a nivel servidor (default 1000).** El `.limit()` del cliente NO puede superar este tope. Para queries que necesitan resultados completos de tablas grandes:

1. **Usar RPC functions** con `SELECT DISTINCT` o agregaciones — devuelve el mínimo de filas
2. **NO confiar en `.limit(N)` grande** — será capeado por el servidor
3. **Queries que buscan IDs únicos en tablas grandes** son candidatas ideales para RPC

### Otras queries que podrían tener el mismo problema

Buscar en el codebase: queries a `prospectos`, `mensajes_whatsapp`, `llamadas_venta` u otras tablas grandes sin `.limit()` que esperen resultados completos.

---

## Archivos Involucrados

| Archivo | Cambio |
|---|---|
| BD: migración `add_rpc_get_distinct_ejecutivo_ids` | Nueva función RPC `get_distinct_ejecutivo_ids()` |
| `src/components/prospectos/ProspectosManager.tsx` | RPC + autocomplete ejecutivo + click-outside + limpieza filtros |
| `src/components/chat/LiveChatCanvas.tsx` | RPC + autocomplete ejecutivo + click-outside + scrollbar-hide |
