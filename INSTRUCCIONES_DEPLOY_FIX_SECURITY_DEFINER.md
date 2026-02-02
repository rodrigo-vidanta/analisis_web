# 🚀 INSTRUCCIONES DE DEPLOY: Fix SECURITY DEFINER

**Fecha:** 2 de Febrero 2026  
**Criticidad:** 🔴 ALTA - Vulnerabilidad de seguridad  
**Tiempo estimado:** 5 minutos

---

## 📋 RESUMEN EJECUTIVO

### Problema Identificado

1. **Bug de permisos:** Mayra González (VEN) puede ver conversaciones de BOOM
2. **Vulnerabilidad crítica:** La función `get_conversations_ordered` usa `SECURITY DEFINER`, permitiendo bypass de RLS

### Solución Implementada

- ✅ Remover `SECURITY DEFINER` de `get_conversations_ordered`
- ✅ Agregar filtros de coordinaciones basados en `auth.uid()`
- ✅ Cambiar a `SECURITY INVOKER` (ejecuta con permisos del usuario)

---

## 🔧 PASO A PASO: DEPLOY

### 1. Acceder a Supabase SQL Editor

```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

### 2. Copiar y Pegar el Script

**Archivo:** `scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql`

**Contenido completo:**

```sql
-- ============================================
-- FIX CRÍTICO: get_conversations_ordered SIN SECURITY DEFINER
-- ============================================

-- Drop función existente
DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);
DROP FUNCTION IF EXISTS get_conversations_ordered();

-- Recrear helper
CREATE OR REPLACE FUNCTION is_valid_whatsapp_name(name_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  emoji_count integer;
  valid_char_count integer;
BEGIN
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN false;
  END IF;
  
  emoji_count := length(name_text) - length(regexp_replace(name_text, '[[:ascii:]]', '', 'g'));
  valid_char_count := length(regexp_replace(name_text, '[^[:alnum:] [:space:]áéíóúÁÉÍÓÚñÑ]', '', 'g'));
  
  IF valid_char_count < 2 THEN
    RETURN false;
  END IF;
  
  IF emoji_count > valid_char_count THEN
    RETURN false;
  END IF;
  
  IF emoji_count > 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Nueva función SECURITY INVOKER
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
SECURITY INVOKER  -- ✅ CRÍTICO: Sin DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_coordinacion_id uuid;
  v_coordinaciones_ids uuid[];
  v_is_admin boolean;
  v_is_calidad boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  SELECT 
    role_name,
    coordinacion_id,
    role_name IN ('admin', 'administrador_operativo') as is_admin_user
  INTO v_role_name, v_coordinacion_id, v_is_admin
  FROM public.user_profiles_v2
  WHERE id = v_user_id;
  
  IF v_role_name IS NULL THEN
    RAISE EXCEPTION 'Usuario sin rol asignado';
  END IF;
  
  v_is_calidad := FALSE;
  IF v_role_name = 'coordinador' THEN
    SELECT EXISTS(
      SELECT 1 
      FROM public.auth_user_coordinaciones uc
      JOIN public.coordinaciones c ON uc.coordinacion_id = c.id
      WHERE uc.user_id = v_user_id
      AND UPPER(c.codigo) = 'CALIDAD'
    ) INTO v_is_calidad;
  END IF;
  
  IF v_role_name IN ('coordinador', 'supervisor') AND NOT v_is_calidad THEN
    SELECT ARRAY_AGG(coordinacion_id)
    INTO v_coordinaciones_ids
    FROM public.auth_user_coordinaciones
    WHERE user_id = v_user_id;
    
    IF v_coordinaciones_ids IS NULL OR array_length(v_coordinaciones_ids, 1) = 0 THEN
      IF v_coordinacion_id IS NOT NULL THEN
        v_coordinaciones_ids := ARRAY[v_coordinacion_id];
      ELSE
        RAISE EXCEPTION 'Coordinador sin coordinaciones asignadas';
      END IF;
    END IF;
  END IF;
  
  IF v_role_name = 'ejecutivo' THEN
    IF v_coordinacion_id IS NOT NULL THEN
      v_coordinaciones_ids := ARRAY[v_coordinacion_id];
    ELSE
      RAISE EXCEPTION 'Ejecutivo sin coordinación asignada';
    END IF;
  END IF;
  
  RETURN QUERY
  WITH mensajes_agrupados AS (
    SELECT
      m.prospecto_id,
      MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
      COUNT(*) AS mensajes_totales,
      COUNT(*) FILTER (WHERE m.rol = 'Prospecto' AND (m.leido IS FALSE OR m.leido IS NULL)) AS mensajes_no_leidos,
      (ARRAY_AGG(m.mensaje ORDER BY m.fecha_hora DESC))[1] AS ultimo_mensaje
    FROM public.mensajes_whatsapp m
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
    FROM public.prospectos p
  ),
  prospectos_filtrados AS (
    SELECT p.*
    FROM public.prospectos p
    WHERE 
      (v_is_admin OR v_is_calidad)
      OR
      (
        v_role_name IN ('coordinador', 'supervisor') 
        AND v_coordinaciones_ids IS NOT NULL
        AND p.coordinacion_id = ANY(v_coordinaciones_ids)
      )
      OR
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

-- Permisos
REVOKE ALL ON FUNCTION get_conversations_ordered(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_conversations_ordered(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO authenticated;

COMMENT ON FUNCTION get_conversations_ordered IS 'v6.5.1 - SECURITY INVOKER';
```

### 3. Ejecutar (Click en "Run")

**Resultado esperado:**
```
Success. No rows returned
```

### 4. Verificar que la función fue actualizada

```sql
-- Ejecutar esta query para verificar
SELECT 
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'get_conversations_ordered';
```

**Resultado esperado:**
```
function_name               | security_mode
get_conversations_ordered   | SECURITY INVOKER   ← ✅ Correcto
```

---

## ✅ TESTING INMEDIATO

### Test 1: Como Mayra (Ejecutivo VEN)

1. Logout de Mayra en la UI
2. Login nuevamente
3. Ir al módulo WhatsApp
4. **Verificar:**
   - ✅ Ve conversaciones de VEN
   - ❌ NO ve "Adriana Baeza" (4111573556) de BOOM

### Test 2: Como Admin

1. Login como admin
2. Ir al módulo WhatsApp
3. **Verificar:**
   - ✅ Ve TODAS las conversaciones (VEN, BOOM, MVP, etc.)

### Test 3: Como Coordinador BOOM

1. Login como coordinador de BOOM
2. Ir al módulo WhatsApp
3. **Verificar:**
   - ✅ Ve conversaciones de BOOM
   - ❌ NO ve conversaciones de VEN

---

## 🚨 ROLLBACK (Si Hay Problemas)

Si después del deploy hay errores, ejecutar el rollback:

```sql
-- Restaurar versión anterior (CON SECURITY DEFINER)
-- Archivo: scripts/sql/update_get_conversations_ordered_v3_pagination.sql
-- Copiar y pegar el contenido completo de ese archivo
```

---

## 📊 IMPACTO ESPERADO

| Antes | Después |
|-------|---------|
| Función usa SECURITY DEFINER | Función usa SECURITY INVOKER |
| Trae TODAS las conversaciones (1294+) | Trae solo conversaciones permitidas (~50-300) |
| Filtro en memoria (JS) | Filtro en BD (SQL) |
| Mayra ve BOOM | Mayra NO ve BOOM ✅ |
| Vulnerable a bypass RLS | Seguro |

---

## 📁 ARCHIVOS RELACIONADOS

1. `scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql` - Script principal
2. `REPORTE_FINAL_FIX_CONVERSACIONES_BOOM.md` - Análisis completo
3. `AUDITORIA_SECURITY_DEFINER_COMPLETA.md` - Auditoría de seguridad
4. `FIX_RPC_CONVERSACIONES_SIN_FILTRO.md` - Descripción del problema

---

## 🔐 PRÓXIMOS PASOS (Opcional - Mañana)

### Auditar otras funciones con SECURITY DEFINER

```bash
# Buscar todas las funciones con SECURITY DEFINER
grep -r "SECURITY DEFINER" scripts/sql/ | grep "CREATE.*FUNCTION"
```

**Funciones a revisar:**
- `search_dashboard_conversations`
- `get_dashboard_conversations`
- `mark_messages_as_read` (puede necesitar DEFINER)
- `authenticate_user` (puede necesitar DEFINER)

---

**Última actualización:** 2 de Febrero 2026  
**Estado:** ✅ LISTO PARA DEPLOY  
**Ejecutar:** AHORA (CRÍTICO)
