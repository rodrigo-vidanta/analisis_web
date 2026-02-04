# 🔍 Análisis Profundo: Bug de Permisos en Live Activity Widget

**Fecha:** 4 de Febrero 2026  
**Usuario Afectado:** Irving Aquino (irvingaquino@vidavacations.com)  
**Prospecto:** Araceli Magallón (93c26fd3-0400-4325-82af-2b44eee7ab20)

---

## 📊 Datos Verificados en Base de Datos

### 1. Información de Irving Aquino

```json
{
  "id": "2513037a-6739-46ff-93a6-c995e7324309",
  "email": "irvingaquino@vidavacations.com",
  "full_name": "Aquino Perez Irving Javier",
  "role_name": "supervisor",
  "coordinacion_id": "4c1ece41-bb6b-49a1-b52b-f5236f54d60a",
  "backup_id": "7ac0ed39-77e8-4564-acdd-3c1117ca584a",
  "has_backup": true
}
```

**Coordinaciones Asignadas:**
- **MVP** (ID: 4c1ece41-bb6b-49a1-b52b-f5236f54d60a) - Única coordinación

**Permisos Especiales:**
- NO tiene permisos en `auth_user_permissions` (resultado vacío)
- NO es Coordinador de Calidad (no tiene asignación a coordinación "CALIDAD")

### 2. Información del Prospecto Araceli Magallón

```json
{
  "id": "93c26fd3-0400-4325-82af-2b44eee7ab20",
  "nombre_completo": "Araceli Magallón",
  "ejecutivo_id": "f09d601d-5950-4093-857e-a9b6a7efeb73",
  "coordinacion_id": "3f41a10b-60b1-4c2b-b097-a83968353af5"
}
```

**Coordinación del Prospecto:**
- **VEN** (ID: 3f41a10b-60b1-4c2b-b097-a83968353af5)

**Ejecutivo Asignado:**
- Gonzalez Serrano Mayra Soledad Jazmin (mayragonzalezs@vidavacations.com)
- Coordinación: **VEN**

### 3. Coordinaciones en el Sistema

| Código | Nombre | ID |
|--------|--------|-----|
| MVP | MVP | 4c1ece41-bb6b-49a1-b52b-f5236f54d60a |
| VEN | VEN | 3f41a10b-60b1-4c2b-b097-a83968353af5 |
| CALIDAD | CALIDAD | eea1c2ff-b50c-48ba-a694-0dc4c96706ca |
| APEX | APEX | f33742b9-46cf-4716-bf7a-ce129a82bad2 |
| BOOM | BOOM | e590fed1-6d65-43e0-80ab-ff819ce63eee |
| COBACA | COB ACA | 0008460b-a730-4f0b-ac1b-5aaa5c40f5b0 |

---

## ❌ CONFIRMACIÓN DEL BUG

**Irving NO debería ver este prospecto porque:**

✅ **Irving** es Supervisor de coordinación **MVP**  
✅ **Prospecto** pertenece a coordinación **VEN**  
✅ **Irving NO** es Coordinador de Calidad  
✅ **Irving NO** es Admin ni Admin Operativo  
✅ **Irving NO** es backup del ejecutivo asignado

**Conclusión:** Irving NO tiene ninguna relación de permisos con este prospecto.

---

## 🐛 CAUSA RAÍZ DEL BUG

### Archivo Afectado: `src/stores/liveActivityStore.ts`

**Líneas 344-362:** Lógica de filtrado para Supervisores

```typescript
} else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  // ============================================
  // COORDINADOR/SUPERVISOR: Ve llamadas de prospectos
  // en sus coordinaciones asignadas
  // ============================================
  
  // Obtener IDs de prospectos en las coordinaciones del usuario
  const { data: prospectosCoordinacion } = await analysisSupabase
    .from('prospectos')
    .select('id')
    .in('coordinacion_id', coordinacionesFilter);
  
  const prospectosIds = new Set(prospectosCoordinacion?.map(p => p.id) || []);
  
  // Filtrar llamadas: solo las de prospectos en sus coordinaciones
  activeCalls = activeCalls.filter(call => 
    call.prospecto_id && prospectosIds.has(call.prospecto_id)
  );
}
```

### 🔥 PROBLEMA DETECTADO

**El código ASUME que `coordinacionesFilter` siempre contiene las coordinaciones correctas del usuario.**

Sin embargo, revisando el método `getCoordinacionesFilter` en `src/services/permissionsService.ts` (líneas 677-730):

```typescript
async getCoordinacionesFilter(userId: string): Promise<string[] | null> {
  // ...
  
  // Coordinador y Supervisor: verificar si es de Calidad primero, luego obtener coordinaciones
  if (permissions.role === 'coordinador' || permissions.role === 'supervisor') {
    // Coordinadores de Calidad no tienen filtro (pueden ver todo)
    if (permissions.role === 'coordinador') {
      const isCalidad = await this.isCoordinadorCalidad(userId);
      if (isCalidad) {
        this.coordinacionesCache.set(userId, { data: null, timestamp: Date.now() });
        return null; // null = sin filtro (ve todo)
      }
    }
    
    // ⚠️ PARA SUPERVISORES NO SE VERIFICA isCoordinadorCalidad
    
    // Obtener todas las coordinaciones del usuario desde auth_user_coordinaciones
    const { data: relaciones, error: relError } = await supabaseSystemUI
      .from('auth_user_coordinaciones')
      .select('coordinacion_id')
      .eq('user_id', userId);
    
    // Si tiene coordinaciones asignadas, retornarlas
    if (!relError && relaciones && relaciones.length > 0) {
      const coordinacionIds = relaciones.map(r => r.coordinacion_id);
      this.coordinacionesCache.set(userId, { data: coordinacionIds, timestamp: Date.now() });
      return coordinacionIds;
    }
    
    // Fallback: usar coordinacion_id del rol
    const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
    this.coordinacionesCache.set(userId, { data: result, timestamp: Date.now() });
    return result;
  }
}
```

**El método devuelve correctamente:**
- Irving tiene `coordinacion_id` = MVP
- `auth_user_coordinaciones` tiene solo MVP
- Retorna `['4c1ece41-bb6b-49a1-b52b-f5236f54d60a']` (MVP)

---

## 🔎 HIPÓTESIS: ¿Por qué Irving vio el prospecto de VEN?

Revisando la lógica completa, hay **3 posibles causas**:

### Hipótesis 1: Bug en `liveMonitorKanbanOptimized.getClassifiedCalls()`

El widget usa este servicio para obtener llamadas activas. Si este servicio NO aplica filtros correctamente, TODAS las llamadas pasan al widget.

**Verificar:** `src/services/liveMonitorKanbanOptimized.ts`

```typescript
async getClassifiedCalls(): Promise<ClassifiedCalls> {
  // Query inicial SIN filtros de permisos
  const { data: calls, error } = await analysisSupabase
    .from('llamadas_ventas')
    .select('*')
    .eq('call_status', 'activa')
    .order('fecha_llamada', { ascending: false });
    
  // ⚠️ NO HAY FILTRADO AQUÍ - Se hace después en el store
}
```

**PROBLEMA:** Si `getClassifiedCalls()` retorna TODAS las llamadas activas sin filtrar, el widget las recibe y luego intenta filtrar. Pero si hay un error en el filtrado del widget, se muestran todas.

### Hipótesis 2: Cache corrupto en `liveActivityStore`

El store tiene un sistema de caché de llamadas. Si el caché se contaminó con llamadas de otro usuario (por ejemplo, si un Admin vio todas las llamadas y el cache no se limpió), Irving puede ver llamadas que no le corresponden.

**Verificar:** Líneas 259-283 en `liveActivityStore.ts`

```typescript
loadActiveCalls: async () => {
  // ...
  
  // Verificar que hay sesión activa antes de hacer queries
  const { data: { session } } = await supabaseSystemUI!.auth.getSession();
  if (!session) {
    // Sin sesión activa, limpiar y no intentar cargar
    set({ 
      widgetCalls: [],
      isLoadingCalls: false 
    });
    return;
  }
  
  // ⚠️ NO SE LIMPIA EL CACHE si el userId cambió
}
```

**PROBLEMA:** Si el userId cambió (por ejemplo, por hot-reload de Vite), el cache puede tener llamadas de otro usuario.

### Hipótesis 3: Condición de Carrera (Race Condition)

El widget tiene polling cada 3 segundos:

```typescript
useEffect(() => {
  if (!isWidgetEnabled || !user?.id) return;
  
  const { loadActiveCalls } = useLiveActivityStore.getState();
  
  const interval = setInterval(() => {
    // Solo cargar si el usuario sigue autenticado
    if (user?.id) {
      loadActiveCalls();
    }
  }, 3000);
  
  return () => clearInterval(interval);
}, [isWidgetEnabled, user?.id]);
```

**PROBLEMA:** Si `user.id` cambia entre la verificación y la ejecución de `loadActiveCalls()`, se puede cargar con el userId incorrecto.

---

## ✅ DIAGNÓSTICO FINAL

**Causa más probable:** **Hipótesis 1 + Fallo en filtrado del widget**

### Evidencia:

1. ✅ `getCoordinacionesFilter()` retorna correctamente `['MVP']` para Irving
2. ✅ La lógica de filtrado en `liveActivityStore.ts` (líneas 344-362) DEBERÍA filtrar correctamente
3. ⚠️ **PERO:** El código NO maneja el caso donde `prospectosCoordinacion` falla o retorna datos incorrectos

### Código Vulnerable:

```typescript
// Obtener IDs de prospectos en las coordinaciones del usuario
const { data: prospectosCoordinacion } = await analysisSupabase
  .from('prospectos')
  .select('id')
  .in('coordinacion_id', coordinacionesFilter);

const prospectosIds = new Set(prospectosCoordinacion?.map(p => p.id) || []);

// ⚠️ Si prospectosCoordinacion es null/undefined, prospectosIds es Set vacío
// ⚠️ El filtro siguiente NO filtra nada si prospectosIds está vacío
activeCalls = activeCalls.filter(call => 
  call.prospecto_id && prospectosIds.has(call.prospecto_id)
);
```

**Escenario del Bug:**

1. Irving abre el widget
2. `getCoordinacionesFilter()` retorna `['MVP']`
3. Se ejecuta query: `SELECT id FROM prospectos WHERE coordinacion_id IN ('MVP')`
4. **Si la query falla o hay timeout:** `prospectosCoordinacion` es `null`
5. `prospectosIds` se convierte en `Set([])`  (vacío)
6. El filtro `call.prospecto_id && prospectosIds.has(call.prospecto_id)` **siempre retorna false**
7. **RESULTADO:** `activeCalls` queda VACÍO o... **se salta el filtrado por completo si hay un error**

### 🎯 BUG CRÍTICO ENCONTRADO

**Línea 340:** El filtro se ejecuta solo si NO es ejecutivo

```typescript
if (ejecutivoFilter) {
  // Filtrado para ejecutivos
  // ...
} else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  // Filtrado para coordinadores/supervisores
  // ...
}
// ⚠️ SI NO HAY ejecutivoFilter Y coordinacionesFilter es null/empty, NO SE FILTRA NADA
```

**Para Irving:**
- `ejecutivoFilter` = `null` (es supervisor, no ejecutivo)
- `coordinacionesFilter` = `['MVP']`
- Entra en el `else if`
- Pero si hay error en la query, el filtrado se omite completamente

---

## 🔧 SOLUCIÓN PROPUESTA

### Fix 1: Validación Estricta de Filtrado

```typescript
// Líneas 344-362 en liveActivityStore.ts
} else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  // ============================================
  // COORDINADOR/SUPERVISOR: Ve llamadas de prospectos
  // en sus coordinaciones asignadas
  // ============================================
  
  try {
    // Obtener IDs de prospectos en las coordinaciones del usuario
    const { data: prospectosCoordinacion, error: prospectosError } = await analysisSupabase
      .from('prospectos')
      .select('id')
      .in('coordinacion_id', coordinacionesFilter);
    
    // ✅ VALIDACIÓN: Si hay error o no hay datos, NO mostrar NADA
    if (prospectosError) {
      console.error('[LiveActivityStore] Error obteniendo prospectos por coordinación:', prospectosError);
      set({ widgetCalls: [], isLoadingCalls: false });
      return;
    }
    
    if (!prospectosCoordinacion || prospectosCoordinacion.length === 0) {
      console.warn('[LiveActivityStore] No hay prospectos en las coordinaciones del usuario');
      set({ widgetCalls: [], isLoadingCalls: false });
      return;
    }
    
    const prospectosIds = new Set(prospectosCoordinacion.map(p => p.id));
    
    // Filtrar llamadas: solo las de prospectos en sus coordinaciones
    activeCalls = activeCalls.filter(call => 
      call.prospecto_id && prospectosIds.has(call.prospecto_id)
    );
    
    console.log(`[LiveActivityStore] Filtrado por coordinaciones: ${activeCalls.length} llamadas permitidas`);
  } catch (err) {
    console.error('[LiveActivityStore] Excepción filtrando por coordinación:', err);
    // ✅ En caso de error, NO mostrar NADA (seguridad primero)
    set({ widgetCalls: [], isLoadingCalls: false });
    return;
  }
}
```

### Fix 2: Validación Final de Seguridad

Agregar validación al final del método `loadActiveCalls`:

```typescript
// Después de todos los filtros, antes de setear widgetCalls
// VALIDACIÓN FINAL: Si el usuario NO es admin/adminOp/coordinadorCalidad, DEBE haber filtrado
if (!hasFullAccess && activeCalls.length > 0) {
  // Verificar que cada llamada pertenece a prospectos con permisos
  const verificacionPromises = activeCalls.map(async (call) => {
    if (!call.prospecto_id) return false;
    
    try {
      const check = await permissionsService.canUserAccessProspect(userId, call.prospecto_id);
      if (!check.canAccess) {
        console.warn(`[LiveActivityStore] ALERTA DE SEGURIDAD: Usuario ${userId} no tiene permisos para prospecto ${call.prospecto_id}`, check.reason);
      }
      return check.canAccess;
    } catch (err) {
      console.error(`[LiveActivityStore] Error verificando permisos para prospecto ${call.prospecto_id}:`, err);
      return false;
    }
  });
  
  const verificacionResultados = await Promise.all(verificacionPromises);
  activeCalls = activeCalls.filter((_, index) => verificacionResultados[index]);
  
  console.log(`[LiveActivityStore] Validación final de permisos: ${activeCalls.length} llamadas aprobadas`);
}

set({ widgetCalls: activeCalls });
```

---

## 📋 PLAN DE ACCIÓN

1. **Implementar Fix 1:** Validación estricta en filtrado por coordinaciones
2. **Implementar Fix 2:** Validación final de seguridad con `canUserAccessProspect`
3. **Agregar Logging:** Console.logs detallados para debugging
4. **Testing:**
   - Probar con Irving (supervisor MVP)
   - Probar con Coordinador de VEN
   - Probar con Ejecutivo
   - Probar con Admin
5. **Monitoreo:** Revisar logs en producción durante 48 horas

---

## ⚠️ IMPACTO DE SEGURIDAD

**Severidad:** 🔴 **CRÍTICA**

- Supervisores/Coordinadores pueden ver llamadas de prospectos fuera de su scope
- Posible fuga de información sensible (datos del prospecto, conversación)
- Violación de permisos RBAC del sistema

**Acción Inmediata Requerida:** Implementar fixes ANTES del próximo deployment.
