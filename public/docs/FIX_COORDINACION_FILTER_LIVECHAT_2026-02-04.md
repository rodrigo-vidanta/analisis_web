# Fix: Filtro de Coordinación en LiveChatCanvas

**Fecha:** 2026-02-04 01:45 UTC  
**Versión:** B10.1.44N2.5.80  
**Tipo:** HOTFIX Crítico  
**Commit:** `cb772cb`, `65d97ed`

---

## 🔴 Problema

**Síntoma:** Ejecutivos no veían sus conversaciones de WhatsApp en la carga inicial del módulo, pero SÍ aparecían al buscar un prospecto específico y luego borrar el filtro.

**Usuario afectado:** Osmara Partida (osmarapartida@vidavacations.com) y posiblemente otros ejecutivos.

### Diagnóstico

1. **Logs mostraban datos correctos:**
   - Query a `mv_conversaciones_dashboard` devolvía **166 conversaciones**
   - Filtro ejecutivo aplicado correctamente: `d7847ffa-0758-4eb2-a97b-f80e54886531`
   - Sin errores de BD

2. **Problema identificado:**
   - El código en `LiveChatCanvas.tsx` aplicaba **doble filtro**:
     - ✅ Filtro 1: `ejecutivo_id = userId` (correcto)
     - ❌ Filtro 2: `coordinacion_id IN (coordinaciones del ejecutivo)` (incorrecto)

3. **Causa raíz:**
   - **Osmara** está asignada a coordinación **BOOM** (`e590fed1-6d65-43e0-80ab-ff819ce63eee`)
   - Pero sus **prospectos** están en coordinación **VEN** (`3f41a10b-60b1-4c2b-b097-a83968353af5`)
   - El filtro de coordinación excluía TODAS sus conversaciones

### Por qué funcionaba al buscar

Cuando el usuario buscaba un prospecto:
1. La búsqueda **ignoraba el filtro de coordinación**
2. Solo aplicaba filtro por `ejecutivo_id`
3. Las conversaciones aparecían correctamente

---

## ✅ Solución

**Eliminar la verificación de coordinación** cuando el prospecto ya está asignado al ejecutivo.

### Rationale

- **`ejecutivo_id` es la fuente de verdad** para determinar si un ejecutivo puede ver un prospecto
- **Un ejecutivo puede tener prospectos de diferentes coordinaciones** asignados explícitamente
- **La coordinación del ejecutivo NO debe limitar** qué prospectos puede ver si ya están asignados a él

### Código Cambiado

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

**Antes (líneas 4182-4198 y 4278-4295):**
```typescript
if (ejecutivoFilter) {
  // Validación estricta: debe tener ejecutivo_id asignado
  // CRÍTICO: También debe pertenecer a su coordinación
  if (!prospectoData?.ejecutivo_id) {
    continue; // Prospecto sin ejecutivo asignado, ejecutivo NO puede verlo
  }
  
  // CRÍTICO: Verificar que pertenezca a la coordinación del ejecutivo
  if (!prospectoData.coordinacion_id || !coordinacionesFilter || !coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
    continue; // Prospecto no pertenece a la coordinación del ejecutivo, excluir
  }
  
  // Verificar que el ejecutivo_id coincida con el ejecutivo actual o sus backups
  if (ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
    whatsappConversations.push(conv);
  }
}
```

**Después (FIX 2026-02-04):**
```typescript
if (ejecutivoFilter) {
  // Validación estricta: debe tener ejecutivo_id asignado
  if (!prospectoData?.ejecutivo_id) {
    continue; // Prospecto sin ejecutivo asignado, ejecutivo NO puede verlo
  }
  
  // ✅ FIX 2026-02-04: NO verificar coordinación si el prospecto ya está asignado al ejecutivo
  // Razón: Un ejecutivo puede tener prospectos de diferentes coordinaciones asignados explícitamente
  // La asignación de ejecutivo_id es la fuente de verdad, NO la coordinación
  
  // Verificar que el ejecutivo_id coincida con el ejecutivo actual o sus backups
  if (ejecutivosIdsParaFiltrar.includes(prospectoData.ejecutivo_id)) {
    whatsappConversations.push(conv);
  }
}
```

**Cambios aplicados en 2 lugares:**
1. Filtro de conversaciones de uchat (línea ~4182)
2. Filtro de conversaciones de WhatsApp (línea ~4278)

---

## 🧪 Testing

### Caso de Prueba 1: Osmara Partida

**Setup:**
- Usuario: osmarapartida@vidavacations.com
- Coordinación ejecutivo: BOOM
- Coordinación prospectos: VEN
- Prospectos asignados: 29
- Conversaciones esperadas: 166

**Resultado esperado:**
- ✅ Carga inicial muestra 166 conversaciones
- ✅ Widget "Últimas Conversaciones" muestra datos
- ✅ Sin errores de timeout

### Caso de Prueba 2: Ejecutivo Normal

**Setup:**
- Usuario con coordinación = coordinación de sus prospectos

**Resultado esperado:**
- ✅ Sin cambios en comportamiento
- ✅ Sigue viendo sus conversaciones normalmente

### Caso de Prueba 3: Coordinador

**Setup:**
- Usuario coordinador con múltiples coordinaciones

**Resultado esperado:**
- ✅ Sin cambios (coordinadores usan filtro de coordinación correctamente)

---

## 📊 Logs de Debug (Se mantienen temporalmente)

Se agregaron logs de debugging en `LiveChatCanvas.tsx` para diagnosticar el problema:

```typescript
console.log('[LiveChatCanvas] Filtros de permisos:', { 
  queryUserId, 
  ejecutivoFilter, 
  coordinacionesFilter, 
  isUserAdmin,
  from,
  batchSize: CONVERSATIONS_BATCH_SIZE
});

console.log('[LiveChatCanvas] Resultado de vista:', { 
  count: data?.length || 0, 
  error: error?.message,
  firstRecord: data?.[0]
});

console.log('[LiveChatCanvas] Datos transformados:', {
  count: transformedData.length,
  first: transformedData[0],
  sample: transformedData.slice(0, 3).map(d => d.prospecto_id)
});

console.log('[LiveChatCanvas] rpcData después de Promise.all:', {
  count: rpcData.length,
  hasError: !!rpcDataResult.error,
  error: rpcDataResult.error,
  first: rpcData[0]
});
```

**⚠️ Estos logs deben ser removidos en v2.5.81** una vez confirmado que el fix funciona correctamente.

---

## 🔄 Deploy

### v2.5.79 (Logs de debug)
- **Commit:** `3bca2f9`
- **Cambios:** Agregados logs de debugging para diagnosticar el problema
- **Resultado:** Identificada la causa raíz (filtro de coordinación)

### v2.5.80 (Fix)
- **Commit:** `65d97ed`
- **Cambios:** Eliminado filtro de coordinación para ejecutivos
- **AWS Deploy:** ✅ Completado en 40s
- **BD Version:** ✅ Actualizada a B10.1.44N2.5.80

---

## 🎯 Próximos Pasos

1. **Verificar con Osmara:**
   - Recarga (Cmd+Shift+R)
   - Verifica versión: `B10.1.44N2.5.80`
   - Confirma que ve sus 166 conversaciones

2. **Monitoreo (24 horas):**
   - Verificar que otros ejecutivos no se vean afectados
   - Confirmar que coordinadores siguen funcionando correctamente
   - Buscar reportes de conversaciones faltantes

3. **Limpieza (v2.5.81):**
   - Remover logs de debug de `LiveChatCanvas.tsx`
   - Actualizar documentación si no hay problemas

---

## 📚 Documentación Relacionada

- [FIX_IS_OPERATIVO_WHATSAPP_2026-02-04.md](FIX_IS_OPERATIVO_WHATSAPP_2026-02-04.md) - Fix anterior relacionado
- [FIX_TIMEOUT_GET_CONVERSATIONS_ORDERED.md](FIX_TIMEOUT_GET_CONVERSATIONS_ORDERED.md) - Migración a vista materializada
- [NUEVA_ARQUITECTURA_BD_UNIFICADA.md](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) - Arquitectura de BD

---

**Estado:** ✅ Desplegado en Producción  
**Requiere rollback:** ❌ No  
**Breaking changes:** ❌ No  
**Impacto:** 🟢 Bajo (solo mejora, no rompe nada)