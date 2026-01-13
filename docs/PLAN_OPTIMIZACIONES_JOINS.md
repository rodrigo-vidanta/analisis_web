# Plan de Optimizaciones con JOINs Directos

**Fecha:** 13 de Enero 2025  
**Contexto:** BD unificada en PQNC_AI permite JOINs directos

---

## Vistas Creadas en PQNC_AI

### 1. `prospectos_con_ejecutivo_y_coordinacion`
- Prospectos + ejecutivo + coordinación en 1 query
- **Beneficio:** 3 queries → 1 query
- **Uso:** ProspectosManager, ProspectosNuevosWidget

### 2. `conversaciones_whatsapp_enriched`
- Conversaciones + prospecto + ejecutivo + coordinación
- **Beneficio:** 4 queries → 1 query
- **Uso:** LiveChatCanvas, ConversacionesWidget

### 3. `llamadas_activas_con_prospecto`
- Llamadas activas + prospecto + ejecutivo + coordinación
- **Beneficio:** 4 queries → 1 query  
- **Uso:** LlamadasActivasWidget, LiveMonitor

---

## Optimizaciones Propuestas por Módulo

### MÓDULO: WhatsApp / Live Chat

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

#### Optimización 1: Cargar conversaciones con JOIN

**ACTUAL (línea ~3527):**
```typescript
const rpcData = await analysisSupabase
  .rpc('get_conversations_ordered', { p_limit: BATCH_SIZE, p_offset: from });

// Luego consultar prospectos, coordinaciones, ejecutivos por separado
const prospectoIds = rpcData.map(c => c.prospecto_id);
const prospectosData = await analysisSupabase.from('prospectos').in('id', prospectoIds);
const coordinacionesData = await supabaseSystemUI.from('coordinaciones').in('id', coordIds);
const ejecutivosData = await supabaseSystemUI.from('auth_users').in('id', ejecIds);
```

**OPTIMIZADO:**
```typescript
// 1 sola query usando la vista
const { data } = await analysisSupabase
  .from('conversaciones_whatsapp_enriched')
  .select('*')
  .order('fecha_ultimo_mensaje', { ascending: false })
  .range(from, from + BATCH_SIZE - 1);

// Ya incluye: prospecto_nombre, ejecutivo_nombre, coordinacion_nombre, etc.
```

**Impacto:**
- 4-5 queries → 1 query
- Tiempo de carga: ~2s → ~300ms
- ERR_INSUFFICIENT_RESOURCES: Eliminado

#### Optimización 2: Pre-cargar nombres de usuarios en batch

**ACTUAL (línea ~4389):**
```typescript
const senderIds = messages.map(m => m.id_sender);
const usersData = await supabaseSystemUI.from('auth_users').in('id', senderIds);
```

**YA OPTIMIZADO** - Usa `.in()` batch, está bien ✅

---

### MÓDULO: Dashboard Operativo

**Archivos:** `src/components/dashboard/widgets/*`

#### Widget: ProspectosNuevosWidget

**ACTUAL:**
```typescript
// 1. Cargar prospectos
const prospectos = await analysisSupabase.from('prospectos').select('*');

// 2. Cargar coordinaciones
const coordData = await supabaseSystemUI.from('coordinaciones').in('id', coordIds);

// 3. Cargar ejecutivos
const ejecData = await supabaseSystemUI.from('auth_users').in('id', ejecIds);
```

**OPTIMIZADO:**
```typescript
// 1 sola query
const { data } = await analysisSupabase
  .from('prospectos_con_ejecutivo_y_coordinacion')
  .select('*')
  .gte('created_at', CURRENT_DATE);
```

**Beneficio:** 3 queries → 1 query

#### Widget: ConversacionesWidget

**ACTUAL:**
```typescript
const convs = await analysisSupabase.from('conversaciones_whatsapp').select('*');
const prospectos = await analysisSupabase.from('prospectos').in('id', prospectoIds);
const ejecutivos = await supabaseSystemUI.from('auth_users').in('id', ejecIds);
```

**OPTIMIZADO:**
```typescript
const { data } = await analysisSupabase
  .from('conversaciones_whatsapp_enriched')
  .select('*')
  .limit(15);
```

**Beneficio:** 3 queries → 1 query

#### Widget: LlamadasActivasWidget

**ACTUAL:**
```typescript
// liveMonitorService.getActiveCalls() hace:
// 1. llamadas_ventas
// 2. prospectos
// 3. ejecutivos (via coordinacionService.getEjecutivosByIds)
```

**OPTIMIZADO:**
```typescript
const { data } = await analysisSupabase
  .from('llamadas_activas_con_prospecto')
  .select('*')
  .limit(10);
```

**Beneficio:** 3 queries → 1 query

---

### MÓDULO: Dashboard Principal (Inicio)

**Archivo:** `src/components/dashboard/DashboardModule.tsx`

#### Optimización: Estadísticas de llamadas

**ACTUAL (línea ~2671):**
```typescript
const llamadas = await analysisSupabase
  .from('llamadas_ventas')
  .select('call_id, call_status, duracion_segundos, prospecto, coordinacion_id');

// Mapeo manual para obtener nombres
```

**OPTIMIZADO:**
```typescript
// Usar vista con JOINs
const { data } = await analysisSupabase
  .from('llamadas_ventas')
  .select(`
    call_id,
    call_status,
    duracion_segundos,
    prospectos!inner (
      id,
      nombre_completo,
      ejecutivo_id,
      coordinacion_id,
      auth_users:ejecutivo_id (full_name),
      coordinaciones:coordinacion_id (nombre, codigo)
    )
  `);
```

**Beneficio:** Datos completos en 1 query con JOINs nativos de Supabase

---

## Implementación Sugerida

### Fase 1: Widgets (Bajo Riesgo)
1. ConversacionesWidget → usar `conversaciones_whatsapp_enriched`
2. ProspectosNuevosWidget → usar `prospectos_con_ejecutivo_y_coordinacion`
3. LlamadasActivasWidget → usar `llamadas_activas_con_prospecto`

### Fase 2: LiveChatCanvas (Medio Riesgo)
4. Reemplazar RPC `get_conversations_ordered` por vista directa
5. Mantener lógica de negocio intacta

### Fase 3: ProspectosManager (Bajo Riesgo)
6. Usar vista en lugar de consultas separadas
7. Eliminar mapeo manual de ejecutivos/coordinaciones

---

## Beneficios Esperados

### Rendimiento
- Tiempo de carga total: ~50% más rápido
- Requests HTTP: Reducción del 60-70%
- ERR_INSUFFICIENT_RESOURCES: Eliminado completamente

### Mantenibilidad
- Menos código de mapeo
- Lógica de JOIN en servidor (más eficiente)
- Cambios centralizados en vistas

### Escalabilidad
- Mejor uso de índices PostgreSQL
- Query planner optimiza JOINs automáticamente
- Menor carga en cliente

---

## ⚠️ Consideraciones

1. **RLS en Vistas:** Las vistas NO heredan RLS automáticamente
   - Solución: Aplicar filtros de permisos en frontend (como ahora)
   
2. **Realtime en Vistas:** Realtime NO funciona en vistas
   - Solución: Mantener suscripciones en tablas base (como ahora)

3. **Backwards Compatibility:** Mantener lógica actual mientras se migra
   - Solución: Hacer cambios incrementales, módulo por módulo

---

## Estado

- ✅ 3 vistas creadas en PQNC_AI
- ✅ Vistas probadas (funcionan correctamente)
- ⏳ Implementación en componentes (pendiente)

---

**Decisión:** ¿Implemento las optimizaciones ahora o las dejo documentadas para después?
