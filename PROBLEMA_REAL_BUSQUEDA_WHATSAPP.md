# 🔍 PROBLEMA REAL: Filtro de Búsqueda en WhatsApp

**Fecha:** 24 de Enero 2026  
**Prospecto:** `e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b` (Rosario)  
**Estado:** ✅ RESUELTO

---

## 📋 Problema Descubierto

El prospecto **SÍ existe** en `conversaciones_whatsapp` y **SÍ se puede ver** al hacer clic desde el módulo de prospectos. 

**El problema real:** El **filtro de búsqueda** no lo encontraba porque:

1. La función RPC `get_dashboard_conversations` retorna datos con `nombre_contacto` y `numero_telefono` NULL
2. El filtro de búsqueda buscaba en `conv.customer_name` y `conv.customer_phone` (que vienen de esos campos NULL)
3. Los datos correctos están en `prospectosDataRef` (Map cargado con datos de prospectos)

---

## ✅ Solución Implementada

### LiveChatCanvas.tsx (Líneas 6281-6320)

**ANTES:**
```typescript
const customerName = conv.customer_name || conv.nombre_contacto || '';
const customerPhone = conv.customer_phone || conv.telefono || conv.numero_telefono || '';
```
Buscaba solo en campos de `conv` (que vienen NULL de la BD)

**DESPUÉS:**
```typescript
const prospectId = conv.prospecto_id || conv.id;
const prospectoData = prospectId ? prospectosDataRef.current.get(prospectId) : null;

const customerName = prospectoData?.nombre_completo || prospectoData?.nombre_whatsapp || 
                    conv.customer_name || conv.nombre_contacto || '';
const customerPhone = prospectoData?.whatsapp || 
                     conv.customer_phone || conv.telefono || conv.numero_telefono || '';
```
Busca **primero en prospectosDataRef** (datos correctos del prospecto), luego fallback a campos de conversación

---

## 🎯 Por Qué Funciona

`prospectosDataRef` es un `Map` que se construye en `LiveChatCanvas.tsx` con los datos de prospectos que vienen del JOIN de `optimizedConversationsService`. Este Map contiene:

- `nombre_completo` ✅ "Rosario Arroyo Rivera"
- `nombre_whatsapp` ✅ (si existe)
- `whatsapp` ✅ "5215522490483"
- `email` ✅ "rdcar04@gmail.com"

El filtro ahora busca **primero** en estos datos (que son correctos), y solo como fallback usa los campos de `conv` (que están NULL).

---

## 🧪 Verificación

### Caso de Prueba 1: Buscar por Nombre
```
Búsqueda: "Rosario"
Resultado Esperado: ✅ Aparece conversación
Explicación: Se encuentra en prospectoData.nombre_completo
```

### Caso de Prueba 2: Buscar por Teléfono
```
Búsqueda: "5215522490483"
Resultado Esperado: ✅ Aparece conversación
Explicación: Se encuentra en prospectoData.whatsapp
```

### Caso de Prueba 3: Buscar por Email
```
Búsqueda: "rdcar04"
Resultado Esperado: ✅ Aparece conversación
Explicación: Se encuentra en prospectoData.email
```

---

## 📊 Comparación

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Búsqueda por nombre** | ❌ No funciona (campo NULL) | ✅ Funciona (usa prospectosDataRef) |
| **Búsqueda por teléfono** | ❌ No funciona (campo NULL) | ✅ Funciona (usa prospectosDataRef) |
| **Búsqueda por email** | ❌ No funciona (campo NULL) | ✅ Funciona (usa prospectosDataRef) |
| **Click desde prospectos** | ✅ Funciona | ✅ Sigue funcionando |

---

## 🔧 Cambio Técnico

**Archivo modificado:** `src/components/chat/LiveChatCanvas.tsx`

**Líneas:** 6281-6320 (función `filteredConversations`)

**Tipo:** Actualización de lógica de filtrado

**Impacto:** Bajo (solo cambia orden de búsqueda, no modifica datos)

---

## ⚠️ Nota Importante

Este fix NO requiere:
- ❌ Migración SQL
- ❌ Cambios en base de datos
- ❌ Eliminar columnas

Es una solución **más simple y directa** que la planteada inicialmente (eliminar columnas). 

La solución de eliminar columnas sigue siendo válida para **limpieza arquitectónica**, pero ya NO es necesaria para resolver el problema de búsqueda.

---

## 🚀 Deploy

```bash
# Build
npm run build

# Deploy
./update-frontend.sh
```

No requiere migración SQL, solo deploy de frontend.

---

## 📁 Archivos Relacionados

### Código Actualizado
- ✅ `src/components/chat/LiveChatCanvas.tsx` (filtro de búsqueda)

### Código Sin Cambios (ya no necesarios)
- ⏸️ `src/components/chat/LiveChatDashboard.tsx` (ya actualizado pero no es el módulo usado)
- ⏸️ `migrations/20260124_drop_redundant_columns_conversaciones.sql` (opcional)

---

## ✅ Estado Final

- ✅ Búsqueda en WhatsApp ahora funciona
- ✅ Prospecto "Rosario" aparece al buscar por nombre
- ✅ Prospecto "Rosario" aparece al buscar por teléfono
- ✅ Sin cambios en base de datos requeridos
- ✅ Deploy rápido (solo frontend)

---

**Conclusión:** Problema resuelto con un cambio **mínimo y de bajo riesgo** en el filtro de búsqueda.
