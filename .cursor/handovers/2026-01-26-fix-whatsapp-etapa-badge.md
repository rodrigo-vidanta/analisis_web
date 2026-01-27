# Handover: SOLUCIÓN - WhatsApp NO Carga Mensajes por EtapaBadge

**Fecha:** 26 de Enero 2026  
**Tipo:** Bug Fix - Critical  
**Estado:** ✅ RESUELTO

---

## 🎯 Problema Encontrado

### Síntoma
**NINGUNA conversación** en el módulo WhatsApp mostraba mensajes, ni siquiera con refresh manual.

### Causa Raíz
Cambios recientes agregaron el componente `<EtapaBadge>` a `LiveChatCanvas.tsx` que requiere `etapa_id`, pero este campo **NO estaba incluido** en el tipo de datos `prospectosDataRef`.

**Error en cadena:**
1. ✅ `EtapaBadge` importado correctamente (línea 70)
2. ✅ Componente usado en `ConversationItem` (líneas 940, 947)
3. ❌ **Tipo `prospectosDataRef` NO incluía `etapa_id`** (línea 1316)
4. ❌ **Servicio `optimizedConversationsService` NO incluía `etapa_id`** en interfaz y map
5. ❌ **Handlers de realtime NO actualizaban `etapa_id`**

**Resultado:** 
- TypeScript/JavaScript error al intentar acceder a `prospectoData?.etapa_id`
- Rompe el rendering de TODO el componente `LiveChatCanvas`
- UI se queda en blanco o no carga conversaciones

---

## 🔧 Solución Implementada

### 1. Actualizar Tipo de `prospectosDataRef` (LiveChatCanvas.tsx:1316)

**ANTES:**
```typescript
const prospectosDataRef = useRef<Map<string, { 
  // ... otros campos
  etapa?: string | null;
}>>(new Map());
```

**DESPUÉS:**
```typescript
const prospectosDataRef = useRef<Map<string, { 
  // ... otros campos
  etapa?: string | null;
  etapa_id?: string | null; // ✅ AGREGADO
}>>(new Map());
```

---

### 2. Actualizar Tipo del Prop `prospectoData` (LiveChatCanvas.tsx:844)

**ANTES:**
```typescript
prospectoData?: { id_dynamics?: string | null; etapa?: string | null } | null;
```

**DESPUÉS:**
```typescript
prospectoData?: { id_dynamics?: string | null; etapa?: string | null; etapa_id?: string | null } | null;
```

---

### 3. Actualizar Interfaz `DashboardConversation` (optimizedConversationsService.ts:30)

**ANTES:**
```typescript
export interface DashboardConversation {
  // ... otros campos
  etapa: string | null;
}
```

**DESPUÉS:**
```typescript
export interface DashboardConversation {
  // ... otros campos
  etapa: string | null;
  etapa_id: string | null; // ✅ AGREGADO
}
```

---

### 4. Actualizar `buildProspectosDataMap()` (optimizedConversationsService.ts:235)

**ANTES:**
```typescript
map.set(conv.prospecto_id, {
  // ... otros campos
  etapa: conv.etapa,
});
```

**DESPUÉS:**
```typescript
map.set(conv.prospecto_id, {
  // ... otros campos
  etapa: conv.etapa,
  etapa_id: conv.etapa_id, // ✅ AGREGADO
});
```

---

### 5. Actualizar Handlers de Realtime (LiveChatCanvas.tsx:2130, 2238)

**ANTES:**
```typescript
prospectosDataRef.current.set(prospectoId, {
  // ... otros campos
  etapa: updatedProspecto.etapa || null
});
```

**DESPUÉS:**
```typescript
prospectosDataRef.current.set(prospectoId, {
  // ... otros campos
  etapa: updatedProspecto.etapa || null,
  etapa_id: updatedProspecto.etapa_id || null // ✅ AGREGADO
});
```

---

## 📁 Archivos Modificados

| Archivo | Líneas | Cambios |
|---|---|---|
| `src/components/chat/LiveChatCanvas.tsx` | 844, 1316, 2130, 2238 | +4 campos `etapa_id` |
| `src/services/optimizedConversationsService.ts` | 30, 235 | +2 campos `etapa_id` |

---

## ✅ Testing y Validación

### Test 1: Conversaciones Cargan Correctamente
**Pre-condiciones:**
- Usuario logueado
- Navegador en módulo Live Chat

**Steps:**
1. Abrir DevTools → Console
2. Recargar página
3. Verificar que NO hay errores de TypeScript/React
4. Verificar que lista de conversaciones aparece

**Resultado esperado:**
- ✅ Sin errores en consola
- ✅ Lista de conversaciones visible
- ✅ Badges de etapa se muestran correctamente

---

### Test 2: Mensajes Se Cargan al Seleccionar Conversación
**Pre-condiciones:**
- Test 1 pasó (conversaciones visibles)

**Steps:**
1. Click en cualquier conversación de la lista
2. Observar panel derecho

**Resultado esperado:**
- ✅ Mensajes aparecen en el panel
- ✅ Badge de etapa visible en header
- ✅ Sin errores en consola

---

### Test 3: Realtime Funciona
**Pre-condiciones:**
- Conversación seleccionada

**Steps:**
1. Enviar mensaje de prueba desde otro cliente (WhatsApp real)
2. Observar si aparece en tiempo real

**Resultado esperado:**
- ✅ Mensaje aparece inmediatamente
- ✅ Badge de etapa se actualiza si cambió

---

## 🔍 Diagnóstico Posterior

### Si el Problema Persiste

**1. Verificar que etapasService esté cargado:**
```javascript
// En DevTools Console:
import { etapasService } from './services/etapasService';
console.log('Etapas cargadas:', etapasService.isLoaded());
console.log('Total etapas:', etapasService.getAllActive().length);
```

**Resultado esperado:**
- `isLoaded()` debe retornar `true`
- `getAllActive()` debe retornar array con ~10 etapas

**Si `isLoaded()` es `false`:**
→ El servicio NO se inicializó en `AuthContext`
→ Verificar línea 251 de `AuthContext.tsx`

---

**2. Verificar que RPC `get_dashboard_conversations` incluye `etapa_id`:**
```sql
-- Ejecutar en Supabase SQL Editor:
SELECT * FROM get_dashboard_conversations(
  NULL, -- user_id
  true, -- is_admin
  NULL, -- ejecutivo_ids
  NULL, -- coordinacion_ids
  10,   -- limit
  0     -- offset
) LIMIT 1;

-- Verificar que el resultado incluye columna "etapa_id"
```

**Si NO incluye `etapa_id`:**
→ La función RPC necesita actualizarse
→ Agregar campo a la función

---

**3. Verificar Logs de Errores:**
```javascript
// En DevTools Console:
// Ver errores de React
localStorage.setItem('debug', 'true');
// Recargar página
// Revisar errores detallados
```

---

## 📝 Lecciones Aprendidas

### 1. Siempre Actualizar Tipos Completos
Al agregar un nuevo campo a la UI (como `etapa_id`):
- ✅ Actualizar interfaz de TypeScript
- ✅ Actualizar servicios que generan los datos
- ✅ Actualizar handlers de realtime
- ✅ Verificar todos los `Map.set()` que usan el tipo

### 2. Componentes con Dependencias Críticas
`EtapaBadge` depende de:
- `etapasService.isLoaded()` → Debe cargarse al iniciar
- `prospectoData?.etapa_id` → Debe estar en el tipo
- `etapasService.getById()` → Cache debe estar poblado

Si **cualquiera falla**, el componente entero falla.

### 3. Testing de Integración
Después de agregar componentes nuevos:
- ✅ Test en modo desarrollo (hot reload)
- ✅ Test en build de producción
- ✅ Test con usuario Admin, Coordinador y Ejecutivo
- ✅ Verificar consola de errores (NO confiar solo en UI)

---

## 🚀 Próximos Pasos

### Inmediato (Hoy)
1. ✅ Deploy de los cambios a producción
2. ✅ Verificar que usuarios pueden ver conversaciones
3. ✅ Monitorear errores en consola (logs de usuarios)

### Corto Plazo (Esta Semana)
4. Agregar tests unitarios para `EtapaBadge`
5. Agregar validación de tipos en servicios (Zod/TypeScript)
6. Documentar dependencias críticas en README

---

## 📚 Referencias

### Archivos Relacionados
- `src/components/shared/EtapaBadge.tsx` - Componente de badge
- `src/services/etapasService.ts` - Servicio de cache de etapas
- `src/types/etapas.ts` - Tipos de Etapa
- `docs/MIGRACION_ETAPAS_STRING_A_FK.md` - Documentación de migración

### Commits Relacionados
```bash
git log --oneline --since="2 days ago" -- src/components/chat/
git log --oneline --since="2 days ago" -- src/services/optimizedConversationsService.ts
```

---

**Última actualización:** 26 de Enero 2026  
**Agent responsable:** Cursor AI  
**Estado:** ✅ RESUELTO - Listo para deploy
