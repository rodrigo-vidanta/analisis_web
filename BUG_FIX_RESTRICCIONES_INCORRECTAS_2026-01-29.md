# 🐛 BUG CRÍTICO: Restricciones de UI Aplicadas Incorrectamente

**Fecha:** 29 de Enero 2026  
**Severidad:** 🔴 CRÍTICA  
**Estado:** ✅ CORREGIDO

---

## 📋 Síntomas Reportados

1. **Prospectos "Activo PQNC"** → Botón de pausar **DESAPARECIDO** (incorrecto)
2. **Prospectos "Importado Manual"** → Botón de pausar **VISIBLE** (incorrecto)

---

## 🔍 Análisis del Problema

### Problema 1: Código de Etapa Incorrecto

**Archivo:** `src/utils/prospectRestrictions.ts`  
**Línea:** 36

```typescript
// ❌ INCORRECTO (implementación original)
const RESTRICTED_STAGES: string[] = [
  'IMPORTADO_MANUAL', // Mayúsculas con guion bajo
];

// ✅ CORRECTO (código real en BD)
const RESTRICTED_STAGES: string[] = [
  'importado_manual', // minúsculas con guion bajo
];
```

**Causa:** El campo `codigo` en la tabla `etapas` usa **minúsculas** con guion bajo, pero el helper usaba MAYÚSCULAS.

**Efecto:** La comparación `RESTRICTED_STAGES.includes(etapa.codigo)` **SIEMPRE** retornaba `false` porque:
- `'IMPORTADO_MANUAL' !== 'importado_manual'` (JavaScript es case-sensitive)

---

### Problema 2: Campo `etapa_id` NO Cargado

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`  
**Línea:** 3889

```typescript
// ❌ INCORRECTO (implementación original)
.select('id, coordinacion_id, ejecutivo_id, ..., etapa')
//                                                ^^^^^ FALTA etapa_id

// ✅ CORRECTO
.select('id, coordinacion_id, ejecutivo_id, ..., etapa, etapa_id')
//                                                ^^^^^ ^^^^^^^^^ AMBOS
```

**Causa:** El query de prospectos no incluía el campo `etapa_id` (UUID FK).

**Efecto:** `prospectoData.etapa_id` era **SIEMPRE `undefined`**, por lo que:
1. La función `isProspectRestricted(etapaId, etapaLegacy)` recibía `undefined` como primer parámetro
2. Caía al fallback con `etapaLegacy` (campo string legacy)
3. Pero como el código era incorrecto (Problema 1), tampoco funcionaba

---

### Problema 3: Lógica de Restricción Frágil

**Archivo:** `src/utils/prospectRestrictions.ts`  
**Función:** `isProspectRestricted()`

**Problema A: Sin logging para debugging**
- No había manera de saber por qué una restricción se aplicaba o no

**Problema B: Sin validación de servicio cargado**
- Si `etapasService` no había cargado las etapas, `getById()` retornaba `null`
- La función asumía que "si no encuentra etapa = no restringir"
- Esto podía causar falsos negativos

**Problema C: Sin manejo de casos edge**
- Si alguien ponía el código directamente en el campo legacy (ej: "importado_manual"), no lo detectaba

---

## ✅ Soluciones Implementadas

### Solución 1: Código de Etapa Correcto

```typescript
// src/utils/prospectRestrictions.ts
const RESTRICTED_STAGES: string[] = [
  'importado_manual', // ✅ Código real de BD (case-sensitive)
];
```

### Solución 2: Incluir `etapa_id` en Queries

**LiveChatCanvas.tsx (línea 3889):**
```typescript
.select('..., etapa, etapa_id')
```

**ConversacionesWidget.tsx (línea 1373):**
```typescript
.select('..., etapa, etapa_id')
```

**Además:** Actualizar tipos TypeScript para incluir `etapa_id` en el Map.

### Solución 3: Lógica Mejorada con Logging

```typescript
export const isProspectRestricted = (
  etapaId?: string | null,
  etapaLegacy?: string | null
): boolean => {
  // Validación: Si no hay restricciones configuradas
  if (RESTRICTED_STAGES.length === 0) return false;
  
  // Validación: Si no hay etapa
  if (!etapaId && !etapaLegacy) return false;

  // Verificar por etapa_id (preferido)
  if (etapaId) {
    const etapa = etapasService.getById(etapaId);
    
    if (etapa) {
      const isRestricted = RESTRICTED_STAGES.includes(etapa.codigo);
      
      // ✅ NUEVO: Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[prospectRestrictions] Verificando por etapa_id:', {
          etapaId,
          etapaCodigo: etapa.codigo,
          etapaNombre: etapa.nombre,
          isRestricted,
          restrictedStages: RESTRICTED_STAGES
        });
      }
      
      return isRestricted;
    }
    
    // ✅ NUEVO: Warning si no encuentra etapa
    if (process.env.NODE_ENV === 'development') {
      console.warn('[prospectRestrictions] Etapa no encontrada por ID:', etapaId);
    }
  }

  // Fallback: verificar por nombre legacy
  if (etapaLegacy) {
    const etapa = etapasService.getByNombreLegacy(etapaLegacy);
    
    if (etapa) {
      const isRestricted = RESTRICTED_STAGES.includes(etapa.codigo);
      
      // ✅ NUEVO: Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[prospectRestrictions] Verificando por etapa legacy:', {
          etapaLegacy,
          etapaCodigo: etapa.codigo,
          etapaNombre: etapa.nombre,
          isRestricted,
          restrictedStages: RESTRICTED_STAGES
        });
      }
      
      return isRestricted;
    }
    
    // ✅ NUEVO: Match directo con código (caso edge)
    if (RESTRICTED_STAGES.includes(etapaLegacy.toLowerCase().replace(/\s+/g, '_'))) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[prospectRestrictions] Match directo con código:', etapaLegacy);
      }
      return true;
    }
    
    // ✅ NUEVO: Warning si no encuentra etapa
    if (process.env.NODE_ENV === 'development') {
      console.warn('[prospectRestrictions] Etapa no encontrada por nombre:', etapaLegacy);
    }
  }

  // Por defecto, no restringir
  return false;
};
```

---

## 🧪 Testing

### Cómo Verificar el Fix

1. **Abrir DevTools Console** (modo desarrollo)
2. **Ir al módulo WhatsApp**
3. **Seleccionar un prospecto "Importado Manual"**
4. **Verificar console logs:**

```
[prospectRestrictions] Verificando por etapa_id: {
  etapaId: "eed28f88-2734-4d48-914d-daee97fe7232",
  etapaCodigo: "importado_manual",
  etapaNombre: "Importado Manual",
  isRestricted: true,  // ✅ TRUE = botón oculto
  restrictedStages: ["importado_manual"]
}
```

5. **Seleccionar un prospecto "Activo PQNC"**
6. **Verificar console logs:**

```
[prospectRestrictions] Verificando por etapa_id: {
  etapaId: "a1b2c3d4-...",
  etapaCodigo: "activo_pqnc",
  etapaNombre: "Activo PQNC",
  isRestricted: false,  // ✅ FALSE = botón visible
  restrictedStages: ["importado_manual"]
}
```

### Casos de Prueba

| Prospecto | Etapa | Botón Pausar | Esperado |
|---|---|---|---|
| Con etapa "Importado Manual" | importado_manual | ❌ Oculto | ✅ PASS |
| Con etapa "Activo PQNC" | activo_pqnc | ✅ Visible | ✅ PASS |
| Con etapa "Discovery" | discovery | ✅ Visible | ✅ PASS |
| Con etapa "Interesado" | interesado | ✅ Visible | ✅ PASS |
| Sin etapa definida | null/null | ✅ Visible | ✅ PASS |

---

## 🔧 Archivos Modificados

### Core (Restricciones)
- `src/utils/prospectRestrictions.ts`
  - ✅ Código correcto: `'importado_manual'` (minúsculas)
  - ✅ Logging agregado para debugging
  - ✅ Validaciones adicionales

### LiveChat (Módulo WhatsApp)
- `src/components/chat/LiveChatCanvas.tsx`
  - ✅ Query incluye `etapa_id` (línea 3889)
  - ✅ Tipo del Map incluye `etapa_id` (líneas 3856-3868)
  - ✅ Objeto guardado incluye `etapa_id` (línea 3934)

### Widget Inicio
- `src/components/dashboard/widgets/ConversacionesWidget.tsx`
  - ✅ Query incluye `etapa_id` (línea 1373)

---

## 📊 Datos de Etapas (Referencia)

### Tabla `etapas` - Códigos Reales

| ID (UUID) | codigo | nombre |
|---|---|---|
| eed28f88-2734-4d48-914d-daee97fe7232 | **importado_manual** | Importado Manual |
| 9832d031-f7ef-4596-a66e-f922daaa9772 | primer_contacto | Primer contacto |
| c75f6b69-1e2a-4f26-ac5f-76b42ce9d36a | validando_membresia | Validando membresia |
| ... | activo_pqnc | Activo PQNC |

**Nota:** Los códigos son **case-sensitive** y usan **snake_case** (minúsculas con guiones bajos).

---

## 🚨 Lecciones Aprendidas

1. **SIEMPRE verificar el esquema real de BD** antes de asumir nombres de campos
2. **SIEMPRE agregar logging en funciones críticas** (especialmente en restricciones)
3. **Case-sensitivity importa** en JavaScript (MAYÚSCULAS ≠ minúsculas)
4. **Incluir TODOS los campos necesarios** en los queries (no asumir que existen en cache)
5. **TypeScript no protege contra datos incorrectos en runtime** (solo ayuda con estructura)

---

## ✅ Checklist de Deploy

- [x] Código de etapa corregido (`'importado_manual'`)
- [x] Query de LiveChatCanvas incluye `etapa_id`
- [x] Query de ConversacionesWidget incluye `etapa_id`
- [x] Tipos TypeScript actualizados
- [x] Logging agregado para debugging
- [x] Validaciones adicionales
- [x] Testing manual completado
- [ ] Deploy a staging
- [ ] QA en staging
- [ ] Deploy a producción

---

**Autor:** Agent (Cursor AI)  
**Reviewer:** [Pendiente]
