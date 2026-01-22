# Fix Módulo de Programación - Solución Final

**Fecha:** 22 de Enero 2026  
**Versión:** v2.5.38  
**Estado:** ✅ Correcciones aplicadas

---

## 📋 Resumen de Problemas

### Problema 1: Desfase de 1 día en el calendario
**Síntoma:** Al hacer clic en el día 19 de enero, se mostraba el día 18.

**Causa raíz:** `new Date("YYYY-MM-DD")` interpreta el string como UTC medianoche. En zona horaria de Guadalajara (UTC-6), esto resulta en el día anterior a las 6pm.

**Ubicación:** `CalendarSidebar.tsx` línea 207

**Código problemático:**
```typescript
onDateSelect(new Date(dayData.date)); // dayData.date = "2026-01-19"
// new Date("2026-01-19") = 2026-01-19T00:00:00Z = 2026-01-18T18:00:00 en Guadalajara
```

### Problema 2: Inconsistencia en comparación de fechas
**Síntoma:** Las llamadas del 19, 20, 21 de enero no se mostraban.

**Causa raíz:** `getLocalDateString()` restaba 6 horas indiscriminadamente, causando problemas cuando se aplicaba a fechas locales (no UTC) como las del calendario.

**Ubicación:** `CalendarSidebar.tsx`, `WeeklyView.tsx`

### Problema 3: Error de N8N con justificación null
**Síntoma:** Workflow falla con "justificacion es requerida" cuando `data.justificacion = null`.

**Causa raíz:** El workflow lee de tabla `llamadas_programadas` donde algunas llamadas tienen `justificacion_llamada = null`.

---

## ✅ Correcciones Aplicadas

### 1. CalendarSidebar.tsx

#### Cambio A: Creación de fecha al hacer clic
```typescript
// ANTES:
onDateSelect(new Date(dayData.date));

// AHORA:
const [year, month, day] = dayData.date.split('-').map(Number);
onDateSelect(new Date(year, month - 1, day));
```
**Por qué:** `new Date(year, month-1, day)` crea una fecha en hora LOCAL (medianoche del día correcto).

#### Cambio B: Funciones separadas para conversión
```typescript
// ANTES: Una sola función que restaba 6 horas siempre
const getLocalDateString = (date: Date): string => {
  const mexicoTimestamp = date.getTime() - (6 * 60 * 60 * 1000);
  // ...
};

// AHORA: Dos funciones según el tipo de fecha
const utcToGuadalajaraDateString = (date: Date): string => {
  // SOLO para fechas UTC de la BD
  const mexicoTimestamp = date.getTime() - (6 * 60 * 60 * 1000);
  // ...
};

const componentsToDateString = (year: number, month: number, day: number): string => {
  // Para fechas del calendario (ya representan el día correcto)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
```

### 2. WeeklyView.tsx

Mismo patrón que CalendarSidebar:
- `utcToGuadalajaraDateString()` para fechas de la BD
- `localDateToString()` para fechas del calendario

### 3. DailyView.tsx

Este archivo ya estaba correcto. Usa:
- `selectedDate.getDate()` para extraer componentes de la fecha seleccionada
- Conversión manual a Guadalajara para las llamadas de BD

---

## ⚠️ Corrección Pendiente en N8N

### Workflow: "Lógica de llamadas programadas"

**Nodo Code a modificar:**
```javascript
// ANTES:
const justificacionBase = sanitizeComments(data.justificacion);
if (!justificacionBase) {
  validationErrors.push('justificacion es requerida');
}

// DESPUÉS (agregar valor por defecto):
const justificacionBase = sanitizeComments(data.justificacion || data.motivo) || 'Seguimiento programado';
// Eliminar la validación de justificación requerida o hacerla soft
```

**Alternativa en nodo "Formateo datos":**
Mapear `justificacion` desde el campo correcto:
```javascript
justificacion: $json.motivo || $json.justificacion_llamada || 'Seguimiento programado'
```

---

## 📁 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/scheduled-calls/CalendarSidebar.tsx` | Nueva lógica de fechas |
| `src/components/scheduled-calls/views/WeeklyView.tsx` | Nueva lógica de fechas |

---

## 🧪 Verificación

### Prueba 1: Selección de fecha en calendario
1. Abrir módulo de programación
2. Hacer clic en día 19 de enero
3. **Esperado:** El header muestra "19 de enero" (no 18)

### Prueba 2: Visualización de llamadas
1. Abrir módulo de programación
2. Navegar a días 19, 20, 21 de enero
3. **Esperado:** Se muestran las llamadas programadas para esos días

### Prueba 3: Conteo en calendario
1. Revisar badges de cantidad en el calendario
2. **Esperado:** El conteo coincide con las llamadas mostradas

---

## 📚 Contexto Técnico

### Por qué `new Date("YYYY-MM-DD")` es problemático

```javascript
// Este string se interpreta como UTC medianoche
new Date("2026-01-19")
// Resultado: 2026-01-19T00:00:00.000Z

// En Guadalajara (UTC-6), esto es:
// 2026-01-18T18:00:00.000-06:00 (18 de enero a las 6pm!)

// Solución: crear con componentes (usa hora LOCAL)
new Date(2026, 0, 19) // Enero es mes 0
// Resultado en Guadalajara: 2026-01-19T00:00:00.000-06:00 ✓
```

### Zona Horaria de Guadalajara

- **Standard Time:** UTC-6 (CST)
- **Daylight Saving:** UTC-5 (CDT, de abril a octubre aproximadamente)

**Nota:** El código actual usa UTC-6 fijo. Para manejar DST correctamente, considerar usar `Intl.DateTimeFormat` con `timeZone: 'America/Mexico_City'`.

---

## 🔗 Referencias

- [Handover original](.cursor/handovers/2026-01-22-fix-modulo-programacion.md)
- [Bug inicial](docs/BUG_LLAMADAS_PROGRAMADAS_2026-01-22.md)
- [Fix zona horaria anterior](docs/FIX_ZONA_HORARIA_GUADALAJARA_2026-01-22.md)

---

---

## 🚀 Optimización de Carga (23-Ene-2026)

### Problema
Con +1000 registros, el módulo cargaba TODO en memoria y luego filtraba en frontend.

### Solución

#### Nuevos métodos en `scheduledCallsService.ts`:
```typescript
// Counts ligeros para el calendario
getCallsCountByMonth(userId, year, month): Promise<Record<string, {total, programadas, ejecutadas}>>

// Llamadas filtradas por día (SQL)
getCallsByDate(userId, date): Promise<ScheduledCall[]>

// Llamadas filtradas por semana (SQL)
getCallsByWeek(userId, weekStart): Promise<ScheduledCall[]>
```

#### Estado optimizado en `ScheduledCallsManager.tsx`:
```typescript
// Separación de responsabilidades
const [dayCalls, setDayCalls] = useState<ScheduledCall[]>([]); // Solo del día
const [calendarCounts, setCalendarCounts] = useState<Record<...>>({}); // Solo counts
```

#### Calendario con navegación:
- Recibe `callCounts` precalculados
- Navegación de meses con flechas
- Click en título va a "Hoy"

---

## 🐛 Fix: Loop Infinito (23-Ene-2026)

### Problema
Después de la optimización, se generó un loop infinito:
```
Maximum update depth exceeded
```

### Causa
El `useEffect` en `CalendarSidebar` que llamaba `onMonthChange` causaba re-renders infinitos.

### Solución
1. **CalendarSidebar**: Llamar `onMonthChange` directamente en navegación, no en `useEffect`
2. **ScheduledCallsManager**: Usar refs para trackear cambios reales

---

## 📁 Archivos Modificados (Final)

| Archivo | Cambio |
|---------|--------|
| `src/services/scheduledCallsService.ts` | +3 métodos optimizados |
| `src/components/scheduled-calls/ScheduledCallsManager.tsx` | Carga por día, refs para evitar loops |
| `src/components/scheduled-calls/CalendarSidebar.tsx` | Counts precalculados, navegación de meses |
| `src/components/scheduled-calls/views/WeeklyView.tsx` | Lógica de fechas corregida |

---

**Última actualización:** 23 de Enero 2026 ~01:15
