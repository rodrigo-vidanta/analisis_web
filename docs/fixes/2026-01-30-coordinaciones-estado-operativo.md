# Fix: Botón de Estado Operativo en Coordinaciones

**Fecha:** 2026-01-30  
**Módulo:** Administración > Coordinaciones  
**Componente:** `src/components/admin/CoordinacionesManager.tsx`

## Problema Identificado

El botón Power/PowerOff en la tabla de coordinaciones mostraba el toast de éxito pero **no actualizaba el estado en la base de datos**.

### Causa Raíz

1. **Row Level Security (RLS)** habilitado en tabla `coordinaciones`
2. Cliente `supabaseSystemUI` usa `anon_key` sin permisos de UPDATE
3. No existe función RPC segura para actualizar coordinaciones
4. No existen políticas RLS que permitan UPDATE a usuarios autenticados

## Solución Implementada

### 1. Función RPC Segura (Recomendado)

Creada función `update_coordinacion_safe` con `SECURITY DEFINER`:

```sql
-- Archivo: supabase/migrations/create_update_coordinacion_safe.sql
CREATE OR REPLACE FUNCTION update_coordinacion_safe(
  p_id UUID,
  p_codigo TEXT DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_descripcion TEXT DEFAULT NULL,
  p_archivado BOOLEAN DEFAULT NULL,
  p_is_operativo BOOLEAN DEFAULT NULL
)
RETURNS TABLE(...) -- Ver archivo completo
```

**Características:**
- ✅ `SECURITY DEFINER` para ejecutar con permisos elevados
- ✅ Sincroniza automáticamente `is_active` con `is_operativo`
- ✅ Actualiza solo campos no-NULL
- ✅ Grant a `authenticated`, `anon` y `service_role`

### 2. Políticas RLS (Alternativa Temporal)

Archivo: `supabase/migrations/add_coordinaciones_rls_policies.sql`

```sql
CREATE POLICY "Allow authenticated users to update coordinaciones"
ON coordinaciones FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);
```

## Código Actualizado

### CoordinacionesManager.tsx (líneas 573-626)

```typescript
// Intentar usar función RPC segura primero
let success = false;
try {
  const { data: rpcData, error: rpcError } = await supabaseSystemUI.rpc('update_coordinacion_safe', {
    p_id: coord.id,
    p_codigo: null,
    p_nombre: null,
    p_descripcion: null,
    p_archivado: null,
    p_is_operativo: nuevoEstado,
  });

  if (!rpcError && rpcData) {
    success = true;
  }
} catch (rpcErr) {
  console.warn('RPC no disponible, usando método directo:', rpcErr);
}

// Fallback: método directo (requiere políticas RLS)
if (!success) {
  const { error } = await supabaseSystemUI
    .from('coordinaciones')
    .update({ 
      is_operativo: nuevoEstado,
      is_active: nuevoEstado,
      updated_at: new Date().toISOString() 
    })
    .eq('id', coord.id);
  
  if (error) {
    console.error('Error al actualizar coordinación:', error);
    toast.error(error.message || 'Error al actualizar estado');
    return;
  }
}
```

## Pasos para Aplicar la Solución

### Opción A: Función RPC (Recomendado)

1. Abrir Supabase Dashboard de PQNC_AI (glsmifhkoaifvaegsozd)
2. Ir a SQL Editor
3. Ejecutar contenido de: `supabase/migrations/create_update_coordinacion_safe.sql`
4. Verificar que la función se creó: `SELECT * FROM pg_proc WHERE proname = 'update_coordinacion_safe'`

### Opción B: Políticas RLS (Temporal)

1. Abrir Supabase Dashboard de PQNC_AI
2. Ir a SQL Editor
3. Ejecutar contenido de: `supabase/migrations/add_coordinaciones_rls_policies.sql`
4. Verificar políticas en: Authentication > Policies > coordinaciones

## Verificación

Después de aplicar **cualquiera** de las soluciones:

1. Recargar la aplicación
2. Ir a Administración > Coordinaciones
3. Hacer clic en botón Power/PowerOff de una coordinación
4. Verificar en consola del navegador que no hay errores
5. Verificar en BD que `is_operativo` e `is_active` se actualizaron

```sql
-- Verificar en BD
SELECT id, codigo, nombre, is_active, is_operativo, archivado 
FROM coordinaciones 
ORDER BY codigo;
```

## Archivos Modificados

- ✅ `src/components/admin/CoordinacionesManager.tsx` (botón actualizado)
- ✅ `supabase/migrations/create_update_coordinacion_safe.sql` (función RPC)
- ✅ `supabase/migrations/add_coordinaciones_rls_policies.sql` (políticas RLS)
- ✅ `docs/fixes/2026-01-30-coordinaciones-estado-operativo.md` (este documento)

## Notas de Seguridad

### Solución RPC (Preferida)
- ✅ Más segura: `SECURITY DEFINER` controla permisos
- ✅ Lógica centralizada en BD
- ✅ Sincronización automática de campos
- ⚠️ Requiere mantenimiento de función SQL

### Solución RLS (Temporal)
- ⚠️ Permite UPDATE a TODOS los usuarios autenticados
- ⚠️ No verifica si el usuario es admin
- ⚠️ Debe refinarse para verificar roles
- ✅ Más simple de implementar

## Recomendación Final

**Usar Opción A (Función RPC)** y eliminar las políticas RLS abiertas una vez que la función esté implementada.

---

**Estado:** ✅ Código actualizado en frontend  
**Pendiente:** Ejecutar SQL en base de datos PQNC_AI
