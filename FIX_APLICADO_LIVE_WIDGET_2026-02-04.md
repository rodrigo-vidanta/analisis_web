# ✅ FIX APLICADO: Bug de Permisos en Live Activity Widget

**Fecha:** 4 de Febrero 2026  
**Archivo Modificado:** `src/stores/liveActivityStore.ts`  
**Commits:** Pendiente

---

## 🔧 Cambios Implementados

### Fix 1: Validación Estricta en Filtrado por Coordinaciones (Líneas 345-387)

**Problema Original:**
```typescript
// ❌ ANTES: Sin validación de errores
const { data: prospectosCoordinacion } = await analysisSupabase
  .from('prospectos')
  .select('id')
  .in('coordinacion_id', coordinacionesFilter);

const prospectosIds = new Set(prospectosCoordinacion?.map(p => p.id) || []);
```

**Solución Implementada:**
```typescript
// ✅ DESPUÉS: Con validación estricta y manejo de errores
try {
  const { data: prospectosCoordinacion, error: prospectosError } = await analysisSupabase
    .from('prospectos')
    .select('id')
    .in('coordinacion_id', coordinacionesFilter);
  
  // Si hay error, NO mostrar NADA (seguridad primero)
  if (prospectosError) {
    console.error('[LiveActivityStore] Error obteniendo prospectos por coordinación:', prospectosError);
    console.warn('[LiveActivityStore] Por seguridad, no se mostrarán llamadas hasta resolver el error');
    set({ widgetCalls: [], isLoadingCalls: false });
    return;
  }
  
  // Si no hay prospectos, no hay llamadas que mostrar
  if (!prospectosCoordinacion || prospectosCoordinacion.length === 0) {
    console.warn('[LiveActivityStore] No hay prospectos en las coordinaciones del usuario:', coordinacionesFilter);
    set({ widgetCalls: [], isLoadingCalls: false });
    return;
  }
  
  const prospectosIds = new Set(prospectosCoordinacion.map(p => p.id));
  activeCalls = activeCalls.filter(call => 
    call.prospecto_id && prospectosIds.has(call.prospecto_id)
  );
  
  console.log(`[LiveActivityStore] Filtrado por coordinaciones [${coordinacionesFilter.join(', ')}]: ${activeCalls.length} llamadas permitidas de ${prospectosIds.size} prospectos`);
} catch (err) {
  console.error('[LiveActivityStore] Excepción crítica filtrando por coordinación:', err);
  // En caso de excepción, NO mostrar NADA (seguridad primero)
  set({ widgetCalls: [], isLoadingCalls: false });
  return;
}
```

**Beneficios:**
- ✅ Detecta errores de base de datos inmediatamente
- ✅ Previene mostrar llamadas no autorizadas si la query falla
- ✅ Logging detallado para debugging
- ✅ Política de "denegar por defecto" en caso de error

---

### Fix 2: Validación Final de Seguridad (Líneas 502-542)

**Implementación:**
```typescript
// ============================================
// FIX 2: VALIDACIÓN FINAL DE SEGURIDAD
// Verificar que cada llamada pertenece a prospectos con permisos
// ============================================
if (permissions && !hasFullAccess && activeCalls.length > 0) {
  console.log(`[LiveActivityStore] Ejecutando validación final de seguridad para ${activeCalls.length} llamadas...`);
  
  // Verificar permisos de cada llamada en paralelo
  const verificacionPromises = activeCalls.map(async (call) => {
    if (!call.prospecto_id) {
      console.warn(`[LiveActivityStore] ALERTA: Llamada ${call.call_id} sin prospecto_id`);
      return false;
    }
    
    try {
      const check = await permissionsService.canUserAccessProspect(userId, call.prospecto_id);
      if (!check.canAccess) {
        console.warn(`[LiveActivityStore] 🔒 ALERTA DE SEGURIDAD: Usuario ${userId} no tiene permisos para prospecto ${call.prospecto_id}`, {
          reason: check.reason,
          call_id: call.call_id,
          nombre_completo: call.nombre_completo
        });
      }
      return check.canAccess;
    } catch (err) {
      console.error(`[LiveActivityStore] Error verificando permisos para prospecto ${call.prospecto_id}:`, err);
      // En caso de error, denegar por seguridad
      return false;
    }
  });
  
  const verificacionResultados = await Promise.all(verificacionPromises);
  const llamadasAntesValidacion = activeCalls.length;
  activeCalls = activeCalls.filter((_, index) => verificacionResultados[index]);
  const llamadasDespuesValidacion = activeCalls.length;
  
  if (llamadasAntesValidacion !== llamadasDespuesValidacion) {
    console.warn(`[LiveActivityStore] ⚠️ Validación final bloqueó ${llamadasAntesValidacion - llamadasDespuesValidacion} llamadas sin permisos`);
  } else {
    console.log(`[LiveActivityStore] ✅ Validación final aprobó todas las ${llamadasDespuesValidacion} llamadas`);
  }
}

set({ widgetCalls: activeCalls });
```

**Beneficios:**
- ✅ Doble verificación de permisos con `canUserAccessProspect()`
- ✅ Catch-all para detectar cualquier llamada que pasó el filtro inicial por error
- ✅ Logging de alertas de seguridad con detalles del prospecto
- ✅ Verificación en paralelo para mantener performance
- ✅ Solo se ejecuta para usuarios sin `hasFullAccess` (Admin, AdminOp, CoordCalidad)

---

### Cambio Adicional: Scope de `hasFullAccess` (Línea 296)

**Antes:**
```typescript
if (permissions) {
  // ...
  const hasFullAccess = isAdmin || isAdminOperativo || isCoordinadorCalidad;
  // hasFullAccess solo disponible dentro del if
}
```

**Después:**
```typescript
const permissions = await permissionsService.getUserPermissions(userId);
let hasFullAccess = false; // Declarar fuera para usar en validación final

if (permissions) {
  // ...
  hasFullAccess = isAdmin || isAdminOperativo || isCoordinadorCalidad;
  // hasFullAccess disponible para Fix 2
}
```

---

## 🎯 Impacto del Fix

### Escenarios Bloqueados

| Escenario | Antes | Después |
|-----------|-------|---------|
| Query de prospectos falla | ⚠️ Muestra todas las llamadas | ✅ NO muestra nada |
| Query retorna `null` | ⚠️ Muestra todas las llamadas | ✅ NO muestra nada |
| Prospecto sin permisos pasa filtro inicial | ⚠️ Se muestra la llamada | ✅ Bloqueado en validación final |
| Excepción durante filtrado | ⚠️ Comportamiento indefinido | ✅ NO muestra nada |

### Caso de Irving Aquino

**Antes del Fix:**
- Irving (supervisor MVP) veía llamada de prospecto VEN
- Query de prospectos podía fallar silenciosamente
- Set vacío `prospectosIds = Set([])` no filtraba nada

**Después del Fix:**
- ✅ Si query falla → NO se muestran llamadas
- ✅ Si no hay prospectos en MVP → NO se muestran llamadas
- ✅ Si llamada pasa filtro inicial por error → Bloqueada en validación final
- ✅ Logging detallado en consola para debugging

---

## 📊 Logging Añadido

### Console Logs Normales

```
[LiveActivityStore] Filtrado por coordinaciones [MVP]: 3 llamadas permitidas de 45 prospectos
[LiveActivityStore] Ejecutando validación final de seguridad para 3 llamadas...
[LiveActivityStore] ✅ Validación final aprobó todas las 3 llamadas
```

### Console Warnings (Alertas)

```
[LiveActivityStore] No hay prospectos en las coordinaciones del usuario: ['MVP']
[LiveActivityStore] ⚠️ Validación final bloqueó 1 llamadas sin permisos
```

### Console Errors (Errores Críticos)

```
[LiveActivityStore] Error obteniendo prospectos por coordinación: {...}
[LiveActivityStore] Por seguridad, no se mostrarán llamadas hasta resolver el error
[LiveActivityStore] Excepción crítica filtrando por coordinación: {...}
[LiveActivityStore] 🔒 ALERTA DE SEGURIDAD: Usuario 2513037a-... no tiene permisos para prospecto 93c26fd3-...
```

---

## ✅ Testing Requerido

### Test 1: Usuario Normal (Supervisor MVP)
- **Usuario:** Irving Aquino
- **Esperado:** 
  - Solo ve llamadas de prospectos en coordinación MVP
  - NO ve llamadas de VEN, APEX, etc.
- **Verificar logs:** Debería mostrar `Filtrado por coordinaciones [MVP]: X llamadas`

### Test 2: Coordinador Calidad
- **Usuario:** Coordinador de Calidad
- **Esperado:** Ve TODAS las llamadas activas (sin filtro)
- **Verificar logs:** NO debería ejecutar validación final

### Test 3: Admin
- **Usuario:** Admin o Admin Operativo
- **Esperado:** Ve TODAS las llamadas activas (sin filtro)
- **Verificar logs:** NO debería ejecutar validación final

### Test 4: Ejecutivo
- **Usuario:** Cualquier ejecutivo
- **Esperado:** Solo ve llamadas de SUS prospectos + prospectos donde es backup
- **Verificar logs:** Debería mostrar filtrado por ejecutivo_id

### Test 5: Error en Query
- **Simular:** Desconectar internet momentáneamente
- **Esperado:** 
  - Widget muestra 0 llamadas
  - Console error: "Error obteniendo prospectos por coordinación"
  - Widget NO crashea

### Test 6: Prospecto sin Permisos (Forzado)
- **Simular:** Modificar temporalmente BD para que un prospecto pase filtro inicial pero falle en `canUserAccessProspect`
- **Esperado:**
  - Validación final bloquea la llamada
  - Console warning: "🔒 ALERTA DE SEGURIDAD"

---

## 📋 Checklist de Deployment

- [ ] **Testing local:** Verificar los 6 escenarios de test
- [ ] **Revisión de logs:** Asegurar que logging no expone información sensible
- [ ] **Performance:** Verificar que validación final no cause delays perceptibles
- [ ] **Monitoreo:** Configurar alertas para "ALERTA DE SEGURIDAD" en producción
- [ ] **Documentación:** Actualizar CHANGELOG.md con este fix
- [ ] **Commit:** Git commit con mensaje descriptivo
- [ ] **Deploy:** Push a producción
- [ ] **Monitoreo post-deploy:** Revisar logs durante 48 horas

---

## 🔒 Severidad del Bug Original

**Nivel:** 🔴 **CRÍTICO - VULNERABILIDAD DE SEGURIDAD**

- Supervisores/Coordinadores podían ver llamadas fuera de su scope
- Fuga de información sensible (datos personales, conversaciones)
- Violación de RBAC (Role-Based Access Control)
- Potencial incumplimiento de GDPR/privacidad

**Prioridad:** **ALTA - Deploy inmediato requerido**

---

## 📚 Archivos Relacionados

- `src/stores/liveActivityStore.ts` - Archivo modificado
- `src/services/permissionsService.ts` - Servicio usado en Fix 2
- `ANALISIS_BUG_LIVE_WIDGET_IRVING.md` - Análisis completo del bug
- `FIX_PERMISOS_LLAMADAS_ACTIVAS_2026-01-30.md` - Referencia de fix similar en otro componente

---

**Fix implementado por:** Agent Claude  
**Fecha:** 4 de Febrero 2026  
**Estado:** ✅ Completado - Pendiente testing y deployment
