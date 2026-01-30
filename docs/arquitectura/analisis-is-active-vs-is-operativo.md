# Análisis: Confusión entre `is_active` vs `is_operativo`

**Fecha:** 2026-01-30  
**Autor:** Sistema PQNC QA Platform  
**Estado:** 🔴 Problema Arquitectónico Identificado

---

## 📋 El Problema

Existen **DOS campos booleanos** en las tablas `coordinaciones` y `auth_users` que causan confusión:

| Campo | Propósito Original | Uso Real Actual |
|-------|-------------------|-----------------|
| `is_active` | Control de acceso (login permitido/bloqueado) | ⚠️ **Legacy/Deprecated** - Se mantiene por compatibilidad |
| `is_operativo` | Estado lógico operativo (para asignación de trabajo) | ✅ **Uso actual** - Indica si puede recibir asignaciones |

---

## 🕰️ Historia (Deuda Técnica)

### Fase 1: Sistema Original (2025-09)
- Solo existía `is_active`
- Propósito: Usuario puede/no puede acceder al sistema
- **Problema:** No había forma de "pausar" usuarios sin bloquear su acceso

### Fase 2: Introducción de `is_operativo` (2025-10 - v5.7.0)
- Se agregó `is_operativo` para diferenciar estados
- **Intención:**
  - `is_active = false` → Usuario bloqueado (no puede entrar)
  - `is_operativo = false` → Usuario activo pero "pausado" (no recibe asignaciones)

### Fase 3: Introducción de `archivado` (2025-12)
- Se agregó campo `archivado` para borrado lógico
- **Ahora hay 3 campos:**
  - `is_active` → ¿Puede entrar?
  - `is_operativo` → ¿Puede recibir trabajo?
  - `archivado` → ¿Está archivado/eliminado lógicamente?

---

## 🔴 Problemas Actuales

### 1. **Redundancia Semántica**
```typescript
// ❌ Confuso: ¿Cuál usar?
if (user.is_active && user.is_operativo && !user.archivado) {
  // Usuario "realmente" disponible
}
```

### 2. **Inconsistencia en Sincronización**
```typescript
// En coordinacionService.ts línea 111
archivado: coord.archivado !== undefined ? coord.archivado : !coord.is_active
// ¿Por qué mapear is_active a archivado?
```

### 3. **Lógica Duplicada**
```typescript
// En múltiples lugares:
is_active = nuevoEstado;
is_operativo = nuevoEstado; // ¿Por qué sincronizar si son diferentes?
```

### 4. **Código con Fallbacks Complejos**
```typescript
// coordinacionService.ts línea 106-127
try {
  // Intentar con archivado
  const { data } = await query.eq('archivado', false);
} catch {
  // Fallback a is_active
  const { data } = await query.eq('is_active', true);
}
```

---

## 💡 Casos de Uso Reales

### Para Coordinaciones

| Caso | `is_active` | `is_operativo` | `archivado` | Resultado |
|------|-------------|----------------|-------------|-----------|
| Coordinación nueva | `true` | `true` | `false` | ✅ Operativa |
| Pausada temporalmente | `true` | `false` | `false` | ⚠️ Pausada (no recibe prospectos) |
| Archivada | `false` | `false` | `true` | ❌ Inactiva (no aparece) |

### Para Usuarios

| Caso | `is_active` | `is_operativo` | `archivado` | Resultado |
|------|-------------|----------------|-------------|-----------|
| Usuario activo | `true` | `true` | `false` | ✅ Puede entrar y recibir trabajo |
| Usuario pausado | `true` | `false` | `false` | ⚠️ Puede entrar pero no recibe trabajo |
| Usuario bloqueado | `false` | `false` | `false` | 🔒 No puede entrar al sistema |
| Usuario archivado | `false` | `false` | `true` | ❌ Eliminado lógicamente |

---

## ✅ Propuesta de Refactorización

### Opción A: **Eliminar `is_active`** (Recomendado)

**Razón:** El campo `archivado` + `is_operativo` son suficientes.

```typescript
interface Coordinacion {
  id: string;
  codigo: string;
  nombre: string;
  // ❌ ELIMINAR: is_active: boolean;
  is_operativo: boolean;  // true = recibe asignaciones, false = pausada
  archivado: boolean;      // true = borrado lógico, false = existe
  created_at: string;
  updated_at: string;
}

// Lógica simplificada:
function isAvailableForAssignment(coord: Coordinacion): boolean {
  return !coord.archivado && coord.is_operativo;
}

function isVisible(coord: Coordinacion): boolean {
  return !coord.archivado;
}
```

### Opción B: **Consolidar en un solo campo de estado**

```typescript
type CoordinacionStatus = 
  | 'active'      // Operativa
  | 'paused'      // Pausada
  | 'archived';   // Archivada

interface Coordinacion {
  id: string;
  codigo: string;
  nombre: string;
  status: CoordinacionStatus;  // UN SOLO CAMPO
  created_at: string;
  updated_at: string;
}
```

---

## 🚀 Plan de Migración (Opción A)

### Fase 1: Deprecar `is_active` (Inmediato)
```typescript
// Marcar como deprecated
/**
 * @deprecated Use `archivado` para control de existencia y `is_operativo` para estado operativo
 */
is_active?: boolean;
```

### Fase 2: Actualizar Código (1-2 días)
- Eliminar todos los fallbacks `is_active`
- Reemplazar `is_active` por `!archivado`
- Eliminar sincronización `is_active = is_operativo`

### Fase 3: Migración de BD (Coordinado)
```sql
-- 1. Asegurar que todos los registros tienen archivado e is_operativo
UPDATE coordinaciones 
SET 
  archivado = COALESCE(archivado, NOT is_active),
  is_operativo = COALESCE(is_operativo, is_active)
WHERE archivado IS NULL OR is_operativo IS NULL;

-- 2. Hacer NOT NULL los campos importantes
ALTER TABLE coordinaciones 
  ALTER COLUMN archivado SET DEFAULT false,
  ALTER COLUMN archivado SET NOT NULL,
  ALTER COLUMN is_operativo SET DEFAULT true,
  ALTER COLUMN is_operativo SET NOT NULL;

-- 3. (Opcional futuro) Eliminar is_active
-- ALTER TABLE coordinaciones DROP COLUMN is_active;
```

### Fase 4: Actualizar Documentación
- README
- Interfaces TypeScript
- Comentarios en código

---

## 📊 Impacto de NO Arreglar

| Problema | Impacto | Gravedad |
|----------|---------|----------|
| Confusión de desarrolladores | ⏱️ Tiempo perdido debugueando | 🟡 Media |
| Bugs de sincronización | 🐛 Estados inconsistentes | 🔴 Alta |
| Código con fallbacks complejos | 🧹 Deuda técnica creciente | 🟡 Media |
| Documentación desactualizada | 📚 Onboarding más difícil | 🟢 Baja |

---

## 🎯 Recomendación Final

### ✅ Acción Inmediata (HOY)

1. **Documentar claramente** el propósito de cada campo (este documento)
2. **Estandarizar uso** en código nuevo:
   ```typescript
   // ✅ CORRECTO (usar siempre):
   if (!coord.archivado && coord.is_operativo) {
     // Coordinación disponible para asignaciones
   }
   
   // ❌ EVITAR:
   if (coord.is_active) { ... }
   ```

3. **Marcar `is_active` como deprecated** en interfaces TypeScript

### 🔧 Acción a Corto Plazo (Esta semana)

1. Crear migration SQL que sincroniza `archivado` e `is_operativo`
2. Actualizar función RPC `update_coordinacion_safe` para NO tocar `is_active`
3. Eliminar código de fallback `is_active` en servicios

### 🏗️ Acción a Largo Plazo (Próximo sprint)

1. Plan de eliminación completa de `is_active`
2. Testing exhaustivo de asignaciones
3. Deploy coordinado con migración de BD

---

## 📚 Referencias

- **Changelog:** `public/docs/CHANGELOG_PQNC_HUMANS.md` (líneas 52-75)
- **Servicio:** `src/services/coordinacionService.ts` (líneas 34-36)
- **Componente:** `src/components/admin/CoordinacionesManager.tsx`
- **Fix reciente:** `docs/fixes/2026-01-30-coordinaciones-estado-operativo.md`

---

**Conclusión:** `is_active` es **deuda técnica legacy** que debe eliminarse. Usar solo `archivado` (para existencia) e `is_operativo` (para estado operativo).
