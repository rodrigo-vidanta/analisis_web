# Nota Importante: PQNCDashboard Usa BD Separada

**Fecha:** 13 de Enero 2025  
**Módulo:** Llamadas PQNC (PQNCDashboard)

---

## ⚠️ EXCEPCIÓN A LA MIGRACIÓN

El módulo **"Llamadas PQNC"** (PQNCDashboard) **NO fue migrado** a PQNC_AI porque:

1. Usa su propia base de datos: **hmmfuhqgvsehkizlfzga.supabase.co**
2. Tiene su propia tabla `calls` (diferente de `llamadas_ventas`)
3. Es un sistema separado de evaluación de calidad
4. NO debe mezclarse con las llamadas de Natalia/Live Monitor

---

## Archivos que Usan pqncSupabase (CORRECTO)

Estos archivos SÍ deben usar `pqncSupabase`:

1. **src/components/analysis/PQNCDashboard.tsx**
   - Consulta tabla `calls` de hmmfuhqgvsehkizlfzga
   - Sistema de calificación PQNC

2. **src/services/feedbackService.ts**
   - Feedback de llamadas PQNC
   - Tabla `call_feedback` en hmmfuhqgvsehkizlfzga

3. **src/services/bookmarkService.ts**
   - Bookmarks de llamadas PQNC
   - Tabla `call_bookmarks` en hmmfuhqgvsehkizlfzga

---

## Arquitectura Final Correcta

```
Frontend
  │
  ├─ Auth, Permisos, Coordinaciones ──► PQNC_AI (glsmifhkoaifvaegsozd)
  ├─ Prospectos, Llamadas Natalia ────► PQNC_AI (glsmifhkoaifvaegsozd)
  ├─ WhatsApp, Mensajería ────────────► PQNC_AI (glsmifhkoaifvaegsozd)
  │
  ├─ Llamadas PQNC (calls) ───────────► SupaPQNC (hmmfuhqgvsehkizlfzga) ✅
  │
  └─ Edge Functions ──────────────────► System_UI (zbylezfyagwrxoecioup)
```

---

## Bases de Datos Activas

### 1. PQNC_AI (glsmifhkoaifvaegsozd) - PRINCIPAL
- Auth, usuarios, permisos
- Prospectos
- Llamadas de ventas (Natalia/Live Monitor)
- WhatsApp
- Configuración

### 2. SupaPQNC (hmmfuhqgvsehkizlfzga) - SISTEMA PQNC
- Llamadas de calidad (tabla `calls`)
- Feedback y bookmarks
- Sistema de evaluación separado

### 3. System_UI (zbylezfyagwrxoecioup) - BACKUP + EDGE FUNCTIONS
- Solo backup de datos históricos
- Edge Functions desplegadas

---

## Reglas Actualizadas

**NO aplicar migración a:**
- PQNCDashboard
- feedbackService
- bookmarkService

**Estos módulos pertenecen al sistema PQNC separado.**

---

**Última actualización:** 13 de Enero 2025
