# Optimizaciones Posibles Post-Migración

**Fecha:** 13 de Enero 2025  
**Contexto:** Ahora que auth_users, coordinaciones, prospectos, etc. están en PQNC_AI

---

## Oportunidades de Optimización

### 1. JOINs Directos en Lugar de Consultas Separadas

**ANTES (BDs separadas):**
```typescript
// Consulta 1: Prospectos de PQNC_AI
const { data: prospectos } = await pqncSupabase.from('prospectos').select('*');

// Consulta 2: Ejecutivos de System_UI
const { data: ejecutivos } = await systemUISupabase.from('auth_users').select('*');

// Mapeo manual en JS
const prospectosConEjecutivo = prospectos.map(p => ({
  ...p,
  ejecutivo: ejecutivos.find(e => e.id === p.ejecutivo_id)
}));
```

**AHORA (BD unificada - POSIBLE):**
```typescript
// 1 sola consulta con JOIN
const { data } = await analysisSupabase
  .from('prospectos')
  .select(`
    *,
    ejecutivo:ejecutivo_id (full_name, email, phone),
    coordinacion:coordinacion_id (nombre, codigo)
  `);
```

**Beneficios:**
- Menos requests HTTP
- Más rápido (JOIN en servidor)
- Menos procesamiento en cliente
- Sin ERR_INSUFFICIENT_RESOURCES

---

### 2. Vista Materializada para Prospectos Enriquecidos

**Crear vista en PQNC_AI:**
```sql
CREATE MATERIALIZED VIEW prospectos_enriched AS
SELECT 
  p.*,
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  e.backup_id,
  e.has_backup,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  (SELECT COUNT(*) FROM mensajes_whatsapp WHERE prospecto_id = p.id) as total_mensajes,
  (SELECT MAX(timestamp) FROM mensajes_whatsapp WHERE prospecto_id = p.id) as ultimo_mensaje_at
FROM prospectos p
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id;

CREATE UNIQUE INDEX ON prospectos_enriched (id);
REFRESH MATERIALIZED VIEW CONCURRENTLY prospectos_enriched;
```

**Uso en frontend:**
```typescript
// Simple y rápido
const { data } = await analysisSupabase
  .from('prospectos_enriched')
  .select('*')
  .order('ultimo_mensaje_at', { ascending: false });
```

**Beneficios:**
- Query ultra rápida (vista pre-calculada)
- NO need de JOINs en runtime
- Datos denormalizados listos para UI

---

### 3. Batch Loading con Caché Inteligente

**Problema actual en DataGrid:**
- Renderiza 100 filas
- Cada fila consulta `backup_id` individualmente
- 100 requests simultáneos = ERR_INSUFFICIENT_RESOURCES

**Solución:**
```typescript
// Pre-cargar todos los ejecutivos del batch
const ejecutivoIds = prospectos.map(p => p.ejecutivo_id).filter(Boolean);
await permissionsService.preloadBackupData(ejecutivoIds);

// Luego renderizar sin consultas adicionales
// El caché ya tiene los datos
```

**Dónde aplicar:**
- `ProspectosManager.tsx` (DataGrid)
- `LiveChatCanvas.tsx` (lista de conversaciones)
- Cualquier componente que renderice listas largas

---

### 4. Función RPC para Prospectos con Metadatos

**Crear función RPC:**
```sql
CREATE OR REPLACE FUNCTION get_prospectos_with_metadata(
  p_user_id uuid,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(...) AS $$
BEGIN
  -- Aplicar filtros de permisos
  -- Hacer JOINs
  -- Retornar datos completos
END;
$$;
```

**Uso:**
```typescript
const { data } = await analysisSupabase.rpc('get_prospectos_with_metadata', {
  p_user_id: user.id,
  p_limit: 100,
  p_offset: 0
});
```

**Beneficios:**
- Lógica de permisos en servidor
- JOINs optimizados en PostgreSQL
- 1 sola llamada HTTP

---

### 5. Reducir Consultas de Validación

**Problema:**
`permissionsService.canUserAccessProspect()` hace consultas cada vez que se verifica acceso.

**Solución:**
Usar RLS (Row Level Security) + vistas:

```sql
-- Habilitar RLS en prospectos
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus prospectos permitidos
CREATE POLICY prospectos_select_policy ON prospectos
FOR SELECT USING (
  -- Admin ve todo
  auth.jwt() ->> 'role' = 'admin'
  OR
  -- Ejecutivo ve sus asignados
  (ejecutivo_id = auth.uid())
  OR
  -- Coordinador ve su coordinación
  (coordinacion_id IN (
    SELECT coordinacion_id FROM auth_user_coordinaciones WHERE user_id = auth.uid()
  ))
);
```

**Beneficios:**
- NO need de `canUserAccessProspect()` manual
- Seguridad a nivel de BD
- Consultas automáticamente filtradas

---

## Priorización

### Alta Prioridad (Fix ERR_INSUFFICIENT_RESOURCES)
1. ✅ Implementar batch loading en DataGrid de Prospectos
2. ✅ Usar `permissionsService.preloadBackupData()`
3. ✅ Aplicar caché

### Media Prioridad (Rendimiento)
4. Crear vista `prospectos_enriched`
5. Implementar función RPC `get_prospectos_with_metadata`

### Baja Prioridad (Refactoring)
6. Implementar RLS completo
7. Migrar a vistas materializadas

---

## Implementación Inmediata Sugerida

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`

**Cambio:**
```typescript
// Después de cargar prospectos
const prospectos = await loadProspectos();

// PRE-CARGAR datos de backup en batch (1 sola consulta)
const ejecutivoIds = prospectos
  .map(p => p.ejecutivo_id)
  .filter(Boolean);

if (ejecutivoIds.length > 0) {
  await permissionsService.preloadBackupData(ejecutivoIds);
}

// Ahora renderizar - el caché ya tiene los datos
// NO más consultas individuales
```

---

**¿Implemento esto ahora o documentamos para después?**
