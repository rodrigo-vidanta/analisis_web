# Fix: Vulnerabilidad de Permisos en Widget Llamadas Activas

**Fecha:** 30 de Enero 2026  
**Módulo:** Dashboard → Widget Llamadas Activas  
**Severidad:** 🔴 ALTA - Fuga de información sensible  
**Estado:** ✅ CORREGIDO

---

## 📋 Resumen Ejecutivo

**Problema:** El widget "Llamadas Activas" mostraba notificaciones y sonidos de llamadas entrantes a ejecutivos para prospectos que **NO tenían permisos** de visualizar.

**Impacto:** 
- Ejecutivos veían nombres de prospectos de otras coordinaciones
- Recibían notificaciones sonoras de llamadas ajenas
- Podían hacer clic y ver detalles limitados antes del filtrado

**Usuario reportado:** `gorettigonzalez@vidavacations.com` (Ejecutivo)

---

## 🔍 Diagnóstico Técnico

### Análisis de la Vulnerabilidad

#### 1. **Filtrado en Query Base (liveMonitorService.ts)**

```typescript
// Líneas 320-333
if (ejecutivoFilter) {
  // ❌ NO aplica filtro en la query base para ejecutivos
  // Comentario dice: "filtramos después de obtener los datos"
} else if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  // Solo filtra para coordinadores
  query = query.in('coordinacion_id', coordinacionesFilter);
}
```

**Problema:** Para ejecutivos, `coordinacionesFilter` retorna `null` (permissionsService.ts:698-701), por lo que se cargan las primeras **50 llamadas sin filtrar**.

#### 2. **Filtrado en Memoria (liveMonitorService.ts:395-405)**

```typescript
if (ejecutivoFilter) {
  allProspectos = allProspectos.filter(p => p.ejecutivo_id === ejecutivoFilter);
}
```

**Estado:** ✅ Este filtro funciona correctamente.

#### 3. **Combinación Final (liveMonitorService.ts:414-427)**

```typescript
.filter(call => {
  if (userId) {
    if (prospectosData.length > 0) {
      return prospectosData.some(p => p.id === call.prospecto);
    }
    return false;
  }
  return true;
})
```

**Estado:** ✅ Este filtro funciona correctamente.

#### 4. **🚨 VULNERABILIDAD CRÍTICA: Suscripciones Realtime**

**Archivo:** `src/components/dashboard/widgets/LlamadasActivasWidget.tsx`

**Código vulnerable (líneas 112-138):**

```typescript
.on('postgres_changes', { 
  event: 'INSERT', 
  table: 'llamadas_ventas' 
}, (payload) => {
  const newCall = payload.new as any;
  
  if (newCall?.call_status === 'activa' && !processedCallsRef.current.has(newCall.call_id)) {
    // ❌ REPRODUCE SONIDO SIN VALIDAR PERMISOS
    notificationSoundService.playNotification('call');
    
    // ❌ MUESTRA NOTIFICACIÓN SIN VALIDAR PERMISOS
    systemNotificationService.showCallNotification({
      prospectName: newCall.prospecto_nombre || 'Prospecto',
      callId: newCall.call_id,
      prospectId: newCall.prospecto
    });
    
    loadLlamadas(); // ✅ Recarga CON filtros (pero ya mostró notificación)
  }
})
```

**Flujo del Bug:**

1. Llega llamada nueva del prospecto "Pedro García" (asignado a otro ejecutivo)
2. Supabase Realtime dispara evento `INSERT` → **SIN FILTROS**
3. Widget de Goretti recibe el evento
4. ❌ Reproduce sonido "ring"
5. ❌ Muestra notificación: "Llamada activa: Pedro García"
6. ✅ Llama `loadLlamadas()` que SÍ filtra correctamente
7. La llamada NO aparece en la lista (correctamente filtrada)
8. **Resultado:** Goretti escuchó/vió la notificación pero no puede acceder a la llamada

---

## 🛠️ Solución Implementada

### Cambios en `LlamadasActivasWidget.tsx`

#### 1. **Importar `permissionsService`**

```typescript
import { permissionsService } from '../../../services/permissionsService';
```

#### 2. **Agregar Caché de Permisos**

```typescript
// Caché de filtros de permisos para validación en realtime
const permissionsCache = useRef<{
  coordinacionesFilter: string[] | null;
  ejecutivoFilter: string | null;
  timestamp: number;
} | null>(null);
const PERMISSIONS_CACHE_TTL = 60000; // 1 minuto
```

**Razón:** Evitar llamadas repetidas a `permissionsService` en cada evento de realtime.

#### 3. **Helper para Obtener Permisos**

```typescript
const getPermissionsFilters = useCallback(async () => {
  if (!userId) return { coordinacionesFilter: null, ejecutivoFilter: null };
  
  // Verificar caché
  const now = Date.now();
  if (permissionsCache.current && (now - permissionsCache.current.timestamp < PERMISSIONS_CACHE_TTL)) {
    return {
      coordinacionesFilter: permissionsCache.current.coordinacionesFilter,
      ejecutivoFilter: permissionsCache.current.ejecutivoFilter
    };
  }
  
  // Cargar filtros
  const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
  const ejecutivoFilter = await permissionsService.getEjecutivoFilter(userId);
  
  // Actualizar caché
  permissionsCache.current = { coordinacionesFilter, ejecutivoFilter, timestamp: now };
  
  return { coordinacionesFilter, ejecutivoFilter };
}, [userId]);
```

#### 4. **Helper para Validar Permisos**

```typescript
const canUserSeeCall = useCallback(async (call: any): Promise<boolean> => {
  if (!userId) return true; // Sin userId, no hay restricciones
  
  const { coordinacionesFilter, ejecutivoFilter } = await getPermissionsFilters();
  
  // Admin: sin filtros
  if (!coordinacionesFilter && !ejecutivoFilter) return true;
  
  // Necesitamos datos del prospecto para validar permisos
  if (!call.prospecto) return false;
  
  try {
    const { data: prospecto, error } = await analysisSupabase
      .from('prospectos')
      .select('ejecutivo_id, coordinacion_id')
      .eq('id', call.prospecto)
      .single();
    
    if (error || !prospecto) return false;
    
    // Ejecutivo: solo sus prospectos asignados
    if (ejecutivoFilter) {
      return prospecto.ejecutivo_id === ejecutivoFilter;
    }
    
    // Coordinador/Supervisor: prospectos de sus coordinaciones
    if (coordinacionesFilter && coordinacionesFilter.length > 0) {
      return prospecto.coordinacion_id && coordinacionesFilter.includes(prospecto.coordinacion_id);
    }
    
    return false;
  } catch (error) {
    console.error('Error validando permisos de llamada:', error);
    return false;
  }
}, [userId, getPermissionsFilters]);
```

**Lógica:**
1. Si no hay `userId`, permitir (admin o sin autenticación)
2. Si no hay filtros, permitir (admin/coordinador calidad)
3. Cargar datos del prospecto (solo `ejecutivo_id` y `coordinacion_id`)
4. Validar según rol:
   - **Ejecutivo:** `prospecto.ejecutivo_id === userId`
   - **Coordinador/Supervisor:** `prospecto.coordinacion_id IN coordinaciones_asignadas`

#### 5. **Validar Permisos en Handler INSERT**

```typescript
.on('postgres_changes', { event: 'INSERT', table: 'llamadas_ventas' },
  async (payload) => {
    const newCall = payload.new as any;
    
    if (newCall?.call_status === 'activa' && newCall?.call_id && !processedCallsRef.current.has(newCall.call_id)) {
      // 🔒 VALIDACIÓN DE PERMISOS antes de notificar
      const canSee = await canUserSeeCall(newCall);
      
      if (!canSee) {
        // Usuario NO tiene permisos - ignorar completamente
        console.debug(`[LlamadasActivasWidget] Llamada ${newCall.call_id.slice(-8)} filtrada por permisos`);
        return;
      }
      
      // Usuario SÍ tiene permisos - proceder con notificación
      processedCallsRef.current.add(newCall.call_id);
      notificationSoundService.playNotification('call');
      systemNotificationService.showCallNotification({ ... });
      loadLlamadas();
    }
  }
)
```

**Cambio clave:** Validar `canUserSeeCall()` **ANTES** de reproducir sonido o mostrar notificación.

#### 6. **Validar Permisos en Handler UPDATE**

```typescript
.on('postgres_changes', { event: 'UPDATE', table: 'llamadas_ventas' },
  async (payload) => {
    const newCall = payload.new as any;
    const oldCall = payload.old as any;
    
    if ((oldCall?.call_status === 'activa' && newCall?.call_status !== 'activa') ||
        (oldCall?.call_status !== 'activa' && newCall?.call_status === 'activa')) {
      
      // 🔒 VALIDACIÓN DE PERMISOS antes de notificar
      if (oldCall?.call_status !== 'activa' && newCall?.call_status === 'activa' && 
          newCall?.call_id && !processedCallsRef.current.has(newCall.call_id)) {
        
        const canSee = await canUserSeeCall(newCall);
        
        if (!canSee) {
          console.debug(`[LlamadasActivasWidget] Llamada actualizada ${newCall.call_id.slice(-8)} filtrada por permisos`);
          return;
        }
        
        processedCallsRef.current.add(newCall.call_id);
        notificationSoundService.playNotification('call');
        systemNotificationService.showCallNotification({ ... });
      }
      
      loadLlamadas();
    }
    // ... resto del handler (actualizaciones de estado)
  }
)
```

---

## ✅ Verificación de la Corrección

### Caso de Prueba 1: Ejecutivo Recibe Llamada Propia

**Escenario:**
- Usuario: Goretti González (ejecutivo)
- Llamada entrante: Prospecto asignado a Goretti

**Resultado Esperado:**
- ✅ Reproduce sonido "ring"
- ✅ Muestra notificación con nombre del prospecto
- ✅ Llamada aparece en el widget
- ✅ Puede hacer clic y ver detalles

**Validación en código:**
```typescript
prospecto.ejecutivo_id === userId // true
→ canSee = true
→ Notificación permitida
```

### Caso de Prueba 2: Ejecutivo Recibe Llamada Ajena (BUG ORIGINAL)

**Escenario:**
- Usuario: Goretti González (ejecutivo)
- Llamada entrante: Prospecto asignado a otro ejecutivo (ej: Juan Pérez)

**Resultado Esperado (CORREGIDO):**
- ❌ NO reproduce sonido
- ❌ NO muestra notificación
- ❌ Llamada NO aparece en el widget
- ✅ Console log: "Llamada [ID] filtrada por permisos"

**Validación en código:**
```typescript
prospecto.ejecutivo_id === otroEjecutivoId // false
→ canSee = false
→ return; (antes de notificar)
```

### Caso de Prueba 3: Coordinador Recibe Llamada de Su Coordinación

**Escenario:**
- Usuario: Coordinador de CDMX
- Llamada entrante: Prospecto de coordinación CDMX

**Resultado Esperado:**
- ✅ Reproduce sonido "ring"
- ✅ Muestra notificación con nombre del prospecto
- ✅ Llamada aparece en el widget

**Validación en código:**
```typescript
prospecto.coordinacion_id IN ['uuid-cdmx'] // true
→ canSee = true
→ Notificación permitida
```

### Caso de Prueba 4: Coordinador Recibe Llamada de Otra Coordinación

**Escenario:**
- Usuario: Coordinador de CDMX
- Llamada entrante: Prospecto de coordinación Guadalajara

**Resultado Esperado:**
- ❌ NO reproduce sonido
- ❌ NO muestra notificación
- ❌ Llamada NO aparece en el widget

**Validación en código:**
```typescript
prospecto.coordinacion_id IN ['uuid-cdmx'] // false (es uuid-guadalajara)
→ canSee = false
→ return; (antes de notificar)
```

---

## 🧪 Testing Manual

### Script de Prueba

```javascript
// 1. Abrir consola del navegador en Dashboard
// 2. Obtener userId del ejecutivo
const userId = 'uuid-de-goretti'; // Obtener de AuthContext

// 3. Crear llamada de prueba de otro ejecutivo
const testCall = {
  call_id: crypto.randomUUID(),
  call_status: 'activa',
  prospecto: 'uuid-prospecto-de-otro-ejecutivo',
  prospecto_nombre: 'Pedro García (Ejecutivo Ajeno)',
  fecha_llamada: new Date().toISOString()
};

// 4. Insertar en BD (requiere acceso admin)
await supabase.from('llamadas_ventas').insert(testCall);

// 5. Verificar en consola del ejecutivo:
// - ✅ Console log: "Llamada [ID] filtrada por permisos"
// - ❌ NO debería sonar notificación
// - ❌ NO debería aparecer toast/notificación
```

---

## 📊 Impacto de Rendimiento

### Query Adicional por Evento Realtime

**Query ejecutada:**
```sql
SELECT ejecutivo_id, coordinacion_id 
FROM prospectos 
WHERE id = $1
LIMIT 1;
```

**Análisis:**
- **Índices existentes:** `prospectos.id` (PK, indexado)
- **Tiempo estimado:** ~5-10ms
- **Caché:** TTL de 60 segundos para filtros de permisos
- **Frecuencia:** Solo cuando llega llamada nueva activa (~1-5 por minuto en horarios pico)

**Conclusión:** Impacto mínimo, acceptable para la seguridad adicional.

### Optimización Futura (Opcional)

Si el volumen de llamadas aumenta significativamente, considerar:

1. **Filtros en Supabase Realtime:**
   ```typescript
   .channel('llamadas-activas')
   .on('postgres_changes', {
     event: 'INSERT',
     table: 'llamadas_ventas',
     filter: `coordinacion_id=in.(${coordinaciones.join(',')})` // Solo disponible en v2.50+
   })
   ```

2. **Edge Function para Broadcasting:**
   - Crear función que valide permisos server-side
   - Enviar eventos solo a usuarios autorizados
   - Requiere refactor mayor

---

## 📝 Archivos Modificados

### 1. `src/components/dashboard/widgets/LlamadasActivasWidget.tsx`

**Líneas modificadas:**
- **Línea 16:** Agregado import `permissionsService`
- **Líneas 46-51:** Agregado caché de permisos
- **Líneas 53-109:** Agregados helpers `getPermissionsFilters` y `canUserSeeCall`
- **Líneas 186-224:** Handler INSERT con validación de permisos
- **Líneas 226-268:** Handler UPDATE con validación de permisos

**Líneas de código agregadas:** ~90

---

## ⚠️ Consideraciones de Seguridad

### Vulnerabilidades NO Corregidas en Este Fix

Este fix **SOLO afecta al widget de Llamadas Activas**. Los siguientes módulos **NO están protegidos** y requieren auditoría:

1. **LiveMonitorKanban.tsx**
   - Suscripciones realtime sin validación de permisos
   - Archivo: `src/components/analysis/LiveMonitorKanban.tsx`
   - Líneas: ~3184-3247

2. **LiveChatCanvas.tsx**
   - Notificaciones de mensajes WhatsApp sin validación
   - Archivo: `src/components/chat/LiveChatCanvas.tsx`
   - Verificar handlers de realtime

3. **ConversacionesWidget.tsx**
   - Widget de últimas conversaciones
   - Verificar si aplica filtros en realtime

4. **NotificationListener.tsx**
   - Sistema global de notificaciones
   - Validar que respete permisos

### Recomendación: Auditoría de Seguridad Completa

Crear un script de auditoría para encontrar todos los `analysisSupabase.channel()` sin validación de permisos:

```bash
grep -r "analysisSupabase.channel" src/ | grep -v "LlamadasActivasWidget"
```

---

## 🔄 Próximos Pasos

### Inmediato (Esta Sesión)
- [x] Implementar fix en `LlamadasActivasWidget.tsx`
- [ ] Testing manual con usuario ejecutivo
- [ ] Verificar logs en consola

### Corto Plazo (1-2 días)
- [ ] Auditar otros widgets con suscripciones realtime
- [ ] Aplicar mismo patrón de validación
- [ ] Testing con múltiples roles

### Mediano Plazo (1 semana)
- [ ] Crear utility centralizado para validación de permisos en realtime
- [ ] Documentar patrón en `.cursor/rules/`
- [ ] Actualizar guías de desarrollo

---

## 📚 Referencias

- **Documentación Supabase Realtime:** https://supabase.com/docs/guides/realtime
- **Security Rules:** `.cursor/rules/security-rules.mdc`
- **Permissions Service:** `src/services/permissionsService.ts`
- **MCP Rules:** `.cursor/rules/mcp-rules.mdc`

---

**Última actualización:** 30 de Enero 2026  
**Autor:** AI Agent (Cursor)  
**Revisión requerida:** Sí (Testing manual pendiente)
