# Plan de Implementación: Eliminar Columnas Redundantes de conversaciones_whatsapp

**Fecha:** 24 de Enero 2026  
**Tipo:** Refactor Estructural  
**Impacto:** Medio (requiere cambios en código)

---

## 📋 Resumen

Eliminar las columnas `numero_telefono` y `nombre_contacto` de `conversaciones_whatsapp` porque:
1. **Siempre están NULL** (4,818 de 4,818 conversaciones)
2. **Son redundantes** - los datos reales están en `prospectos`
3. **Causan confusión** - el código busca en campos vacíos
4. **Mejor arquitectura** - Single Source of Truth

---

## 🎯 Archivos que Requieren Actualización

### 1. Base de Datos

**Archivo:** `migrations/20260124_drop_redundant_columns_conversaciones.sql`

**Acción:** Eliminar columnas y crear vista de compatibilidad

### 2. Código Frontend

| Archivo | Tipo Cambio | Complejidad |
|---------|-------------|-------------|
| `src/services/optimizedConversationsService.ts` | ✅ **Ya usa JOIN** | Ninguna |
| `src/components/chat/LiveChatDashboard.tsx` | ⚠️ Actualizar filtros | Baja |
| `src/services/notificationService.ts` | ⚠️ Usar prospecto | Media |
| `src/services/notificationListenerService.ts` | ⚠️ Usar prospecto | Media |
| `src/services/scheduledCallsService.ts` | ⚠️ Actualizar payload | Baja |

---

## 📝 Cambios Específicos por Archivo

### optimizedConversationsService.ts

**Estado Actual:** ✅ YA USA JOIN CON PROSPECTOS

```typescript
// ACTUAL - Ya correcto
SELECT 
  c.prospecto_id,
  p.nombre_completo as nombre_contacto,  -- Viene de prospectos
  p.nombre_whatsapp,
  p.whatsapp as numero_telefono,         -- Viene de prospectos
  ...
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON c.prospecto_id = p.id
```

**Acción:** ✅ Ninguna - Ya usa la estructura correcta

---

### LiveChatDashboard.tsx

**Cambio Requerido:** Actualizar filtro de búsqueda (líneas 96-101)

```typescript
// ❌ ANTES
const filterConversations = () => {
  let filtered = conversations;
  if (searchTerm) {
    filtered = filtered.filter(conv => 
      conv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.customer_phone.includes(searchTerm) ||
      conv.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  // ...
};

// ✅ DESPUÉS
const filterConversations = () => {
  let filtered = conversations;
  if (searchTerm) {
    filtered = filtered.filter(conv => 
      // Buscar en prospecto (si existe)
      conv.prospect?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.prospect?.nombre_whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.prospect?.whatsapp?.includes(searchTerm) ||
      conv.prospect?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  // ...
};
```

---

### notificationService.ts

**Cambio Requerido:** Leer datos del prospecto en lugar de columnas (línea 360)

```typescript
// ❌ ANTES
customer_name: message.nombre_contacto || message.customer_name,
customer_phone: message.numero_telefono || message.customer_phone,

// ✅ DESPUÉS - Obtener del prospecto
const prospecto = message.prospecto_id 
  ? await prospectsService.getProspectById(message.prospecto_id)
  : null;

customer_name: prospecto?.nombre_completo || prospecto?.nombre_whatsapp || 'Cliente',
customer_phone: prospecto?.whatsapp || '',
```

---

### notificationListenerService.ts

**Estado:** ✅ YA USA PROSPECTO CORRECTAMENTE (líneas 238-251)

```typescript
// ACTUAL - Ya correcto
p_customer_name: prospecto.nombre_completo || message.nombre_contacto || 'Cliente',
p_customer_phone: prospecto.whatsapp || message.numero_telefono || '',
```

**Cambio menor:** Eliminar fallback a `message.nombre_contacto` y `message.numero_telefono`

```typescript
// ✅ ACTUALIZADO
p_customer_name: prospecto.nombre_completo || prospecto.nombre_whatsapp || 'Cliente',
p_customer_phone: prospecto.whatsapp || '',
```

---

### scheduledCallsService.ts

**Cambio Requerido:** Actualizar payload de llamadas programadas (línea 596)

```typescript
// ❌ ANTES
customer_phone: callData.customer_phone,
customer_name: callData.customer_name,

// ✅ DESPUÉS - Obtener del prospecto
// El prospecto debe venir en callData
customer_phone: callData.prospecto?.whatsapp,
customer_name: callData.prospecto?.nombre_completo || callData.prospecto?.nombre_whatsapp,
```

---

## 🔄 Orden de Ejecución

### Fase 1: Preparación (5 min)

1. ✅ Verificar que optimizedConversationsService ya usa JOIN
2. ✅ Crear backup de tabla conversaciones_whatsapp
3. ✅ Revisar código que usa las columnas

### Fase 2: Actualización de Código (15 min)

1. Actualizar `LiveChatDashboard.tsx`
2. Actualizar `notificationService.ts`
3. Actualizar `notificationListenerService.ts`
4. Actualizar `scheduledCallsService.ts`
5. Actualizar interfaz `UChatConversation` (ya hecho)

### Fase 3: Migración de BD (2 min)

1. Ejecutar migración SQL
2. Verificar que columnas fueron eliminadas
3. Verificar que vista fue creada

### Fase 4: Testing (10 min)

1. Probar búsqueda en módulo WhatsApp
2. Verificar notificaciones
3. Verificar llamadas programadas
4. Verificar analytics

---

## ✅ Checklist de Implementación

### Código

- [ ] Actualizar filtro en `LiveChatDashboard.tsx`
- [ ] Actualizar `notificationService.ts` para usar prospecto
- [ ] Simplificar fallback en `notificationListenerService.ts`
- [ ] Actualizar payload en `scheduledCallsService.ts`
- [ ] Actualizar tipos en `uchatService.ts` (✅ hecho)

### Base de Datos

- [ ] Ejecutar backup de `conversaciones_whatsapp`
- [ ] Ejecutar migración de DROP columnas
- [ ] Verificar vista `conversaciones_whatsapp_con_prospecto` creada
- [ ] Verificar permisos de vista

### Testing

- [ ] Búsqueda por nombre en WhatsApp
- [ ] Búsqueda por teléfono en WhatsApp
- [ ] Notificaciones de mensajes nuevos
- [ ] Notificaciones de llamadas
- [ ] Programación de llamadas
- [ ] Analytics de conversaciones

---

## 📊 Comparación: Antes vs Después

### Antes (Arquitectura Incorrecta)

```
conversaciones_whatsapp
├─ prospecto_id: UUID
├─ numero_telefono: NULL  ❌ Redundante
├─ nombre_contacto: NULL  ❌ Redundante

prospectos
├─ id: UUID
├─ whatsapp: "5215522490483"  ← Dato real
├─ nombre_completo: "Rosario"  ← Dato real

Problema: 2 lugares para mismo dato, uno siempre NULL
```

### Después (Arquitectura Correcta)

```
conversaciones_whatsapp
└─ prospecto_id: UUID  ← SOLO el FK

prospectos
├─ id: UUID
├─ whatsapp: "5215522490483"  ← Single Source of Truth
└─ nombre_completo: "Rosario"  ← Single Source of Truth

Solución: JOIN para obtener datos actualizados siempre
```

---

## 🔍 Queries de Validación

### Antes de Ejecutar Migración

```sql
-- Verificar que columnas existen y están NULL
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN numero_telefono IS NOT NULL THEN 1 ELSE 0 END) as con_telefono,
  SUM(CASE WHEN nombre_contacto IS NOT NULL THEN 1 ELSE 0 END) as con_nombre
FROM conversaciones_whatsapp;

-- Esperado: total=4818, con_telefono=0, con_nombre=0
```

### Después de Ejecutar Migración

```sql
-- Verificar que columnas fueron eliminadas
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'conversaciones_whatsapp'
  AND column_name IN ('numero_telefono', 'nombre_contacto');

-- Esperado: 0 filas

-- Verificar que vista funciona
SELECT COUNT(*) 
FROM conversaciones_whatsapp_con_prospecto
WHERE numero_telefono IS NOT NULL;

-- Esperado: ~4818 (todas las conversaciones con prospecto)
```

---

## 🎯 Ventajas de Este Cambio

| Aspecto | Mejora |
|---------|--------|
| **Consistencia** | ✅ Los datos siempre están actualizados (vienen de prospectos) |
| **Mantenimiento** | ✅ No hay que sincronizar 2 lugares |
| **Espacio** | ✅ 2 columnas TEXT menos por cada conversación |
| **Claridad** | ✅ Arquitectura más limpia y obvia |
| **Búsquedas** | ✅ Siempre funcionan (no dependen de campos NULL) |
| **Código** | ✅ Menos lógica de fallback |

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Código legacy usa columnas | Media | Alto | Vista de compatibilidad |
| Búsquedas dejan de funcionar | Baja | Alto | JOINs ya implementados |
| Rollback necesario | Baja | Medio | Backup completo antes de DROP |

---

## 📁 Archivos Generados

1. ✅ `migrations/20260124_drop_redundant_columns_conversaciones.sql`
2. ✅ `PLAN_ELIMINAR_COLUMNAS_REDUNDANTES.md` (este archivo)
3. ⏳ Actualización de archivos TypeScript (pendiente)

---

**Próximo paso:** Actualizar código TypeScript y ejecutar migración
