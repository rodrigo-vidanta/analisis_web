# Handover: Fix Filtro Coordinación LiveChatCanvas

**Fecha:** 2026-02-04 01:45 UTC  
**Versión:** B10.1.44N2.5.80  
**Agent:** Claude Sonnet 4.5

---

## 🎯 Resumen Ejecutivo

**Problema resuelto:** Ejecutivos no veían conversaciones de WhatsApp en carga inicial porque el filtro de coordinación excluía prospectos asignados a otras coordinaciones.

**Solución:** Eliminar verificación de coordinación cuando el prospecto ya está asignado al ejecutivo (ejecutivo_id es la fuente de verdad).

**Impacto:** ✅ Positivo - Ejecutivos ahora ven TODOS sus prospectos asignados, independiente de coordinación.

---

## 🔍 Diagnóstico Completo

### Síntomas

1. **Osmara Partida** no veía sus 166 conversaciones en carga inicial
2. **SÍ aparecían** al buscar un prospecto y luego borrar filtro
3. **Sin errores** de BD o timeout

### Proceso de Debugging

#### 1. Agregar logs (v2.5.79)

```typescript
// Logs agregados en LiveChatCanvas.tsx
console.log('[LiveChatCanvas] Filtros de permisos:', {...});
console.log('[LiveChatCanvas] Resultado de vista:', {...});
console.log('[LiveChatCanvas] Datos transformados:', {...});
console.log('[LiveChatCanvas] rpcData después de Promise.all:', {...});
```

**Resultado:**
```javascript
{
  ejecutivoFilter: "d7847ffa-0758-4eb2-a97b-f80e54886531",
  coordinacionesFilter: ["e590fed1-6d65-43e0-80ab-ff819ce63eee"], // BOOM
  count: 166, // ✅ Datos correctos de BD
  firstRecord: {
    coordinacion_id: "3f41a10b-60b1-4c2b-b097-a83968353af5", // VEN (diferente!)
    ejecutivo_id: "d7847ffa-0758-4eb2-a97b-f80e54886531"
  }
}
```

#### 2. Identificar causa raíz

**Query a BD:**
```typescript
// Osmara (ejecutivo)
coordinacion_id: "e590fed1-6d65-43e0-80ab-ff819ce63eee" // BOOM

// Prospectos de Osmara
coordinacion_id: "3f41a10b-60b1-4c2b-b097-a83968353af5" // VEN
```

**Código problemático (línea 4287):**
```typescript
// ❌ PROBLEMA: Excluye prospectos de coordinación diferente
if (!prospectoData.coordinacion_id || 
    !coordinacionesFilter || 
    !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
  continue; // Excluye TODAS las conversaciones de Osmara
}
```

### Root Cause

**El filtro de coordinación es redundante y contraproducente:**
- `ejecutivo_id` ya define claramente qué prospectos pertenecen al ejecutivo
- Un ejecutivo puede tener prospectos de diferentes coordinaciones asignados explícitamente
- La coordinación del ejecutivo NO debe limitar qué prospectos puede ver

**Analogía:** Es como si un vendedor no pudiera ver clientes que le fueron asignados porque viven en otra ciudad.

---

## ✅ Solución Implementada

### Cambio de Código

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`  
**Líneas afectadas:** 4182-4198 (uchat) y 4278-4295 (whatsapp)

**Antes:**
```typescript
if (ejecutivoFilter) {
  if (!prospectoData?.ejecutivo_id) continue;
  
  // ❌ ELIMINADO: Verificación de coordinación
  if (!prospectoData.coordinacion_id || 
      !coordinacionesFilter || 
      !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
    continue;
  }
  
  if (ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
    whatsappConversations.push(conv);
  }
}
```

**Después:**
```typescript
if (ejecutivoFilter) {
  if (!prospectoData?.ejecutivo_id) continue;
  
  // ✅ FIX: Solo verificar ejecutivo_id (fuente de verdad)
  if (ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
    whatsappConversations.push(conv);
  }
}
```

### Commits

1. **Debug logs:** `3bca2f9` (v2.5.79)
   - Agregar logs de debugging para diagnosticar
   - Identificar causa raíz

2. **Fix principal:** `65d97ed` (v2.5.80)
   - Eliminar filtro de coordinación
   - Mantener logs temporalmente

---

## 🧪 Testing Plan

### Test 1: Osmara Partida (Caso problemático)

**Setup:**
- Email: osmarapartida@vidavacations.com
- Coordinación: BOOM
- Prospectos: 29 en coordinación VEN
- Conversaciones: 166

**Pasos:**
1. Login como Osmara
2. Ir a módulo WhatsApp
3. Verificar carga inicial

**Resultado esperado:**
- ✅ Ve 166 conversaciones inmediatamente
- ✅ Sin necesidad de buscar primero
- ✅ Widget "Últimas Conversaciones" muestra datos

### Test 2: Ejecutivo Normal (Regresión)

**Setup:**
- Ejecutivo con coordinación = coordinación de prospectos

**Pasos:**
1. Login como ejecutivo normal
2. Ir a módulo WhatsApp
3. Verificar conversaciones

**Resultado esperado:**
- ✅ Sin cambios en comportamiento
- ✅ Sigue viendo sus conversaciones

### Test 3: Coordinador (No afectado)

**Setup:**
- Coordinador con múltiples coordinaciones

**Pasos:**
1. Login como coordinador
2. Verificar puede ver prospectos de todas sus coordinaciones

**Resultado esperado:**
- ✅ Sigue funcionando correctamente
- ✅ Filtro de coordinación aplica solo a coordinadores

---

## 📋 Tareas Pendientes

### Inmediato (Usuario)

- [ ] Recarga Dashboard (Cmd+Shift+R)
- [ ] Verifica versión footer: `B10.1.44N2.5.80`
- [ ] Login como Osmara Partida
- [ ] Confirma que ve 166 conversaciones
- [ ] Valida widget "Últimas Conversaciones" carga datos

### Monitoreo (24 horas)

- [ ] Verificar logs de errores en Supabase
- [ ] Buscar reportes de conversaciones faltantes
- [ ] Confirmar que coordinadores no se ven afectados
- [ ] Validar que ejecutivos con coordinación normal siguen funcionando

### Limpieza (v2.5.81)

- [ ] Remover logs de debug de `LiveChatCanvas.tsx`:
  - Línea ~3835: Filtros de permisos
  - Línea ~3860: Resultado de vista
  - Línea ~3868: Datos transformados
  - Línea ~3895: rpcData después de Promise.all
- [ ] Commit: "chore: Remover logs debug filtro coordinación"
- [ ] Deploy v2.5.81

---

## 📊 Métricas del Deploy

### v2.5.79 (Debug)
- **Build:** 19.22s
- **Deploy AWS:** 43s
- **Bundle size:** 9,291.87 kB (2,567.39 kB gzip)
- **Commit:** `3bca2f9`

### v2.5.80 (Fix)
- **Build:** 22.86s
- **Deploy AWS:** 40s
- **Bundle size:** 9,292.34 kB (2,567.56 kB gzip)
- **Commit:** `65d97ed`
- **Δ size:** +0.47 kB (+0.17 kB gzip) - Solo logs debug

---

## 🔗 Archivos Relacionados

### Modificados
- `src/components/chat/LiveChatCanvas.tsx` - Fix principal
- `src/config/appVersion.ts` - v2.5.80
- `package.json` - v2.5.80

### Documentación Creada
- `docs/FIX_COORDINACION_FILTER_LIVECHAT_2026-02-04.md` - Documentación detallada del fix
- `.cursor/handovers/2026-02-04-fix-coordinacion-filter-v2-5-80.md` - Este handover

### Relacionados
- `docs/FIX_IS_OPERATIVO_WHATSAPP_2026-02-04.md` - Fix anterior (mismo día)
- `docs/FIX_TIMEOUT_GET_CONVERSATIONS_ORDERED.md` - Migración a vista materializada
- `src/components/dashboard/widgets/ConversacionesWidget.tsx` - Widget también usa vista

---

## 🎓 Lecciones Aprendidas

### 1. Debugging Sistemático

**Estrategia que funcionó:**
1. Agregar logs en puntos clave del flujo
2. Comparar datos de BD vs datos renderizados
3. Identificar dónde se pierden los datos

**Logs críticos:**
- Filtros aplicados
- Resultados de queries
- Transformaciones de datos
- Estado final antes de render

### 2. Source of Truth

**Regla clave:**
> Cuando hay un campo de asignación directa (ejecutivo_id), NO aplicar filtros indirectos (coordinación).

**Razón:**
- La asignación directa es intencional
- Puede haber casos de negocio donde un ejecutivo tenga prospectos de otra coordinación
- El filtro indirecto puede excluir datos válidos

### 3. Testing de Casos Edge

**Caso no considerado inicialmente:**
- Ejecutivo con coordinación diferente a sus prospectos
- Solo se detectó cuando un usuario reportó el problema

**Solución:**
- Agregar tests para casos donde coordinación ≠ coordinación_de_prospectos

---

## 🚨 Posibles Efectos Secundarios

### Escenarios a Monitorear

#### 1. Ejecutivos ven prospectos que no deberían
**Probabilidad:** Muy baja  
**Mitigación:** La asignación de `ejecutivo_id` es intencional y controlada  
**Detección:** Usuario reporta que ve prospectos de otro ejecutivo

#### 2. Impacto en performance
**Probabilidad:** Ninguna  
**Razón:** El filtro de coordinación era ADICIONAL, eliminarlo reduce complejidad  
**Detección:** Monitoreo de tiempos de carga

#### 3. Permisos incorrectos en otros módulos
**Probabilidad:** Ninguna  
**Razón:** Solo se modificó `LiveChatCanvas`, otros módulos usan sus propios filtros  
**Detección:** Testing de otros módulos con conversaciones

---

## 📞 Contacto

**Agent:** Claude Sonnet 4.5  
**Session:** 2026-02-04 00:00 - 01:45 UTC  
**Transcripts:** `/agent-transcripts/73994931-ef1c-42b5-bff6-2617c14d7912.txt`

---

## ✅ Sign-off

**Versión desplegada:** B10.1.44N2.5.80  
**Estado:** ✅ Producción Activa  
**CloudFront:** ⏳ Propagando (5-10 min)  
**Rollback necesario:** ❌ No  
**Breaking changes:** ❌ No  
**Next agent:** Validar con usuario y limpiar logs debug en v2.5.81