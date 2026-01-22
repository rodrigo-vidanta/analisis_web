# Fix N8N Workflow: Lógica de Llamadas Programadas

**Fecha:** 22 de Enero 2026  
**Workflow ID:** `HYRGSVN86YY64pBS`  
**Estado:** ⚠️ Requiere corrección manual en N8N

---

## 🐛 Error Identificado

```json
{
  "validationErrors": ["justificacion es requerida"],
  "receivedData": {
    "justificacion": null,
    "accion": "INSERT"
  }
}
```

---

## 🔍 Causa Raíz

### Problema de Mapeo de Campos

La Edge Function (`trigger-manual-proxy`) envía:
```javascript
{
  motivo: "Mejor momento de llamada",  // Siempre tiene valor
  action: "INSERT"  // En inglés
}
```

Pero el nodo Code busca:
```javascript
data.justificacion  // No existe, es null
data.accion  // El campo se llama "action", no "accion"
```

### Posible Trigger de BD

El campo `accion` (con 'c' en español) sugiere que hay un **trigger de base de datos** que se activa en INSERT de `llamadas_programadas` y lee datos directamente de la tabla, donde `justificacion_llamada` puede ser null.

---

## ✅ Solución Recomendada

### Opción 1: Corregir Nodo "Formateo datos" (RECOMENDADO)

Agregar mapeo de fallback para `justificacion`:

```javascript
// En el nodo Set/Code "Formateo datos"
{
  "justificacion": "{{ $json.motivo || $json.justificacion_llamada || 'Seguimiento programado' }}",
  "accion": "{{ $json.action || $json.accion || 'INSERT' }}"
}
```

### Opción 2: Corregir Nodo Code de Validación

Modificar el nodo Code que valida la justificación:

```javascript
// ANTES:
const justificacionBase = sanitizeComments(data.justificacion);
if (!justificacionBase) {
  validationErrors.push('justificacion es requerida');
}

// DESPUÉS:
const justificacionBase = sanitizeComments(
  data.justificacion || data.motivo || 'Seguimiento programado'
);
// Eliminar o comentar la validación de justificación requerida
// if (!justificacionBase) {
//   validationErrors.push('justificacion es requerida');
// }
```

### Opción 3: Agregar valor por defecto en trigger de BD

Si el workflow usa un trigger de BD, asegurar que `justificacion_llamada` siempre tenga valor:

```sql
-- Agregar DEFAULT a la columna
ALTER TABLE llamadas_programadas 
ALTER COLUMN justificacion_llamada 
SET DEFAULT 'Seguimiento programado';

-- Actualizar registros existentes sin justificación
UPDATE llamadas_programadas 
SET justificacion_llamada = 'Seguimiento programado' 
WHERE justificacion_llamada IS NULL;
```

---

## 📋 Mapeo de Campos Correcto

| Campo en Edge Function | Campo esperado en N8N | Solución |
|------------------------|----------------------|----------|
| `motivo` | `justificacion` | Mapear en Formateo datos |
| `action` | `accion` | Mapear en Formateo datos |
| `user_id` | `id_usuario` | OK (si está mapeado) |
| `scheduled_timestamp` | `fecha_programada` | OK (si está mapeado) |

---

## 🧪 Verificación

Después de aplicar las correcciones:

1. Programar una llamada desde el módulo de programación
2. Verificar en N8N que el workflow ejecuta sin errores
3. Confirmar que la llamada se crea en Dynamics

---

## 📊 Impacto

- **Llamadas afectadas:** Todas las que no tienen `justificacion_llamada` en BD
- **Usuarios afectados:** Cualquiera que programe llamadas
- **Módulos afectados:** Módulo de Programación, ManualCallModal

---

## 🔗 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `supabase/functions/trigger-manual-proxy/index.ts` | Edge Function que llama al webhook |
| `src/components/shared/ManualCallModal.tsx` | Modal de programación |
| `src/services/scheduledCallsService.ts` | Servicio de llamadas programadas |

---

**Última actualización:** 22 de Enero 2026
