# 🔴 PROBLEMA IDENTIFICADO: get_conversations_ordered SIN FILTRO

**Fecha:** 2 de Febrero 2026  
**Usuario afectado:** Todos los ejecutivos y coordinadores  
**Caso específico:** Mayra González ve conversaciones de BOOM

---

## 🎯 CAUSA RAÍZ CONFIRMADA

### Problema en la Función RPC `get_conversations_ordered`

**Archivo:** `scripts/sql/update_get_conversations_ordered_v3_pagination.sql`  
**Línea:** 47-122

**El problema:**
```sql
CREATE OR REPLACE FUNCTION get_conversations_ordered(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER  -- ❌ Se ejecuta como super usuario, ignora RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM mensajes_agrupados m
  INNER JOIN prospectos p ON p.id = m.prospecto_id
  -- ❌ SIN FILTRO DE COORDINACIONES NI EJECUTIVOS
  ORDER BY m.fecha_ultimo_mensaje DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

**Consecuencias:**
1. La función trae **TODAS** las conversaciones de la BD (sin filtrar por coordinación)
2. El filtro se aplica **EN MEMORIA** en el frontend (líneas 4180-4217 de `LiveChatCanvas.tsx`)
3. **Hay una ventana de tiempo** entre que se cargan los datos y se aplica el filtro donde las conversaciones se muestran
4. Si hay algún bug en el filtro en memoria, las conversaciones se cuelan

---

## ✅ SOLUCIÓN: Filtrar en la RPC Directamente

### Opción 1: Modificar RPC para Filtrar por auth.uid() (RECOMENDADO)

**Ventajas:**
- ✅ Filtro aplicado en la BD (más rápido)
- ✅ Menos datos transferidos por red
- ✅ Usa RLS nativo de Supabase
- ✅ Imposible que se cuelen conversaciones

**Script SQL:**

```sql
-- ============================================
-- FIX: get_conversations_ordered CON FILTROS DE PERMISOS
-- ============================================
-- Versión: v6.5.0
-- Fecha: 2 de Febrero 2026
-- Cambio: Agregar filtros de coordinaciones y ejecutivos según auth.uid()

CREATE OR REPLACE FUNCTION get_conversations_ordered(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  prospecto_id uuid,
  nombre_contacto text,
  nombre_whatsapp text,
  numero_telefono text,
  estado_prospecto text,
  fecha_ultimo_mensaje timestamptz,
  fecha_creacion_prospecto timestamptz,
  mensajes_totales bigint,
  mensajes_no_leidos bigint,
  ultimo_mensaje text,
  id_uchat text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_coordinacion_id uuid;
  v_coordinaciones_ids uuid[];
  v_is_admin boolean;
  v_is_calidad boolean;
BEGIN
  -- Obtener usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Obtener rol y coordinación del usuario
  SELECT 
    r.name,
    (u.raw_user_meta_data->>'coordinacion_id')::uuid
  INTO v_role_name, v_coordinacion_id
  FROM auth.users u
  LEFT JOIN auth_roles r ON (u.raw_user_meta_data->>'role_id')::uuid = r.id
  WHERE u.id = v_user_id;
  
  -- Verificar si es admin o administrador operativo (acceso completo)
  v_is_admin := v_role_name IN ('admin', 'administrador_operativo');
  
  -- Verificar si es coordinador de CALIDAD (acceso completo)
  v_is_calidad := FALSE;
  IF v_role_name = 'coordinador' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM auth_user_coordinaciones uc
      JOIN coordinaciones c ON uc.coordinacion_id = c.id
      WHERE uc.user_id = v_user_id
      AND UPPER(c.codigo) = 'CALIDAD'
    ) INTO v_is_calidad;
  END IF;
  
  -- Si es coordinador o supervisor (no de Calidad), obtener todas sus coordinaciones
  IF v_role_name IN ('coordinador', 'supervisor') AND NOT v_is_calidad THEN
    SELECT ARRAY_AGG(coordinacion_id)
    INTO v_coordinaciones_ids
    FROM auth_user_coordinaciones
    WHERE user_id = v_user_id;
    
    -- Si no tiene coordinaciones en la tabla intermedia, usar coordinacion_id del metadata
    IF v_coordinaciones_ids IS NULL OR array_length(v_coordinaciones_ids, 1) = 0 THEN
      IF v_coordinacion_id IS NOT NULL THEN
        v_coordinaciones_ids := ARRAY[v_coordinacion_id];
      END IF;
    END IF;
  END IF;
  
  -- Si es ejecutivo, usar solo su coordinación
  IF v_role_name = 'ejecutivo' THEN
    IF v_coordinacion_id IS NOT NULL THEN
      v_coordinaciones_ids := ARRAY[v_coordinacion_id];
    END IF;
  END IF;
  
  -- QUERY PRINCIPAL CON FILTROS
  RETURN QUERY
  WITH mensajes_agrupados AS (
    SELECT
      m.prospecto_id,
      MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
      COUNT(*) AS mensajes_totales,
      COUNT(*) FILTER (WHERE m.rol = 'Prospecto' AND (m.leido IS FALSE OR m.leido IS NULL)) AS mensajes_no_leidos,
      (ARRAY_AGG(m.mensaje ORDER BY m.fecha_hora DESC))[1] AS ultimo_mensaje
    FROM mensajes_whatsapp m
    WHERE m.prospecto_id IS NOT NULL
    GROUP BY m.prospecto_id
  ),
  telefonos_formateados AS (
    SELECT
      p.id,
      p.whatsapp,
      CASE 
        WHEN p.whatsapp IS NOT NULL THEN
          RIGHT(REGEXP_REPLACE(p.whatsapp, '[^0-9]', '', 'g'), 10)
        ELSE NULL
      END AS telefono_10_digitos
    FROM prospectos p
  ),
  prospectos_filtrados AS (
    SELECT p.*
    FROM prospectos p
    WHERE 
      -- Admin, Administrador Operativo y Coordinadores de Calidad ven todo
      (v_is_admin OR v_is_calidad)
      OR
      -- Coordinadores/Supervisores ven prospectos de sus coordinaciones
      (
        v_role_name IN ('coordinador', 'supervisor') 
        AND v_coordinaciones_ids IS NOT NULL
        AND p.coordinacion_id = ANY(v_coordinaciones_ids)
      )
      OR
      -- Ejecutivos ven solo sus prospectos asignados de su coordinación
      (
        v_role_name = 'ejecutivo'
        AND p.ejecutivo_id = v_user_id
        AND v_coordinaciones_ids IS NOT NULL
        AND p.coordinacion_id = ANY(v_coordinaciones_ids)
      )
  )
  SELECT
    p.id AS prospecto_id,
    COALESCE(
      NULLIF(TRIM(p.nombre_completo), ''),
      CASE 
        WHEN is_valid_whatsapp_name(p.nombre_whatsapp) THEN
          TRIM(p.nombre_whatsapp)
        ELSE NULL
      END,
      t.telefono_10_digitos
    ) AS nombre_contacto,
    p.nombre_whatsapp AS nombre_whatsapp,
    t.telefono_10_digitos AS numero_telefono,
    p.etapa AS estado_prospecto,
    m.fecha_ultimo_mensaje,
    p.created_at AS fecha_creacion_prospecto,
    m.mensajes_totales,
    m.mensajes_no_leidos,
    m.ultimo_mensaje,
    p.id_uchat
  FROM
    mensajes_agrupados m
  INNER JOIN
    prospectos_filtrados p ON p.id = m.prospecto_id
  LEFT JOIN
    telefonos_formateados t ON t.id = p.id
  ORDER BY
    m.fecha_ultimo_mensaje DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Mantener permisos
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO anon;

COMMENT ON FUNCTION get_conversations_ordered IS 'Obtiene conversaciones de WhatsApp ordenadas por fecha, filtrando según permisos del usuario autenticado (v6.5.0)';
```

### Opción 2: Habilitar RLS en `mensajes_whatsapp` (COMPLEMENTO)

Además de la RPC, habilitar RLS para prevenir accesos directos:

```sql
-- Habilitar RLS
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política para ejecutivos
CREATE POLICY "Ejecutivos ven mensajes de su coordinación"
ON mensajes_whatsapp
FOR SELECT
TO authenticated
USING (
  -- Admin y Administrador Operativo ven todo
  (
    SELECT r.name 
    FROM auth.users u
    JOIN auth_roles r ON (u.raw_user_meta_data->>'role_id')::uuid = r.id
    WHERE u.id = auth.uid()
  ) IN ('admin', 'administrador_operativo')
  OR
  -- Coordinadores de Calidad ven todo
  EXISTS(
    SELECT 1
    FROM auth_user_coordinaciones uc
    JOIN coordinaciones c ON uc.coordinacion_id = c.id
    WHERE uc.user_id = auth.uid()
    AND UPPER(c.codigo) = 'CALIDAD'
  )
  OR
  -- Ejecutivos y Coordinadores ven solo de sus coordinaciones
  prospecto_id IN (
    SELECT p.id 
    FROM prospectos p
    WHERE p.coordinacion_id IN (
      SELECT coordinacion_id 
      FROM auth_user_coordinaciones 
      WHERE user_id = auth.uid()
      UNION
      SELECT (raw_user_meta_data->>'coordinacion_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  )
);
```

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### ✅ Paso 1: Backup de la función actual

```bash
# Ejecutar en Supabase SQL Editor
SELECT pg_get_functiondef('get_conversations_ordered'::regproc);
-- Copiar resultado a: scripts/sql/BACKUP_get_conversations_ordered_v6.4.0.sql
```

### ✅ Paso 2: Aplicar nueva función

```bash
# Copiar script completo arriba a:
# scripts/sql/fix_get_conversations_ordered_v6.5.0.sql

# Ejecutar en Supabase SQL Editor
```

### ✅ Paso 3: Testing con Mayra

1. Logout de Mayra
2. Aplicar cambios en BD
3. Login de Mayra
4. **Verificar que NO ve conversaciones de BOOM**
5. **Verificar que SÍ ve conversaciones de VEN**

### ✅ Paso 4: Testing con otros usuarios

- **Admin:** Debe ver TODAS las conversaciones
- **Coordinador VEN:** Solo VEN
- **Coordinador BOOM:** Solo BOOM
- **Ejecutivo VEN:** Solo sus prospectos de VEN
- **Coordinador Calidad:** TODAS las conversaciones

---

## 📊 IMPACTO ESPERADO

### Antes del Fix:
- ❌ RPC trae 1000+ conversaciones sin filtrar
- ❌ Filtro se aplica en memoria (vulnerable a bugs)
- ❌ Conversaciones de otras coordinaciones se cuelan
- ❌ Mayor uso de red y memoria

### Después del Fix:
- ✅ RPC filtra en la BD (solo trae conversaciones permitidas)
- ✅ Menos datos transferidos
- ✅ Imposible que se cuelen conversaciones
- ✅ Mejor performance

---

## 📁 ARCHIVOS A CREAR

1. **`scripts/sql/fix_get_conversations_ordered_v6.5.0.sql`** - Nueva función con filtros
2. **`scripts/sql/BACKUP_get_conversations_ordered_v6.4.0.sql`** - Backup de función actual
3. **`migrations/20260202_fix_rpc_conversations_filters.sql`** - Migración para producción

---

## ⚠️ NOTAS IMPORTANTES

1. **SECURITY DEFINER se mantiene** porque necesitamos acceder a `auth.users` y `auth_roles`
2. **auth.uid() es seguro** - Supabase lo maneja con el JWT del usuario
3. **El filtro en memoria del frontend se mantiene** como capa adicional de seguridad
4. **RLS en `mensajes_whatsapp`** es opcional pero recomendado

---

**Última actualización:** 2 de Febrero 2026  
**Estado:** ✅ Solución identificada y documentada  
**Próximo paso:** Aplicar fix en BD
