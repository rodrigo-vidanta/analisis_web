# ✅ FIX APLICADO: get_conversations_ordered v6.5.1

**Fecha:** 2 de Febrero 2026  
**Ejecutado por:** AI Assistant  
**Estado:** 🟡 PENDIENTE DE EJECUCIÓN MANUAL

---

## 📋 RESUMEN

El script SQL para corregir el problema de Mayra González viendo conversaciones de BOOM ha sido preparado y está listo para ejecución.

**Problema:** Función RPC `get_conversations_ordered` usa `SECURITY DEFINER`, permitiendo ver conversaciones de otras coordinaciones.

**Solución:** Cambiar a `SECURITY INVOKER` + filtros basados en `auth.uid()`.

---

## 🚀 EJECUCIÓN MANUAL REQUERIDA

### Por qué manual

La API REST de Supabase no permite ejecutar DDL directamente por seguridad. Es necesario usar el SQL Editor del Dashboard.

### Pasos para ejecutar (5 minutos)

#### 1. Abrir SQL Editor

```
https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
```

#### 2. Copiar script completo

**Ubicación local:** `/tmp/fix_conversations.sql`  
**Ubicación proyecto:** `scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql`

**Contenido:**

```sql
DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);
DROP FUNCTION IF EXISTS get_conversations_ordered();

CREATE OR REPLACE FUNCTION is_valid_whatsapp_name(name_text text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  emoji_count integer;
  valid_char_count integer;
BEGIN
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN false;
  END IF;
  
  emoji_count := length(name_text) - length(regexp_replace(name_text, '[[:ascii:]]', '', 'g'));
  valid_char_count := length(regexp_replace(name_text, '[^[:alnum:] [:space:]áéíóúÁÉÍÓÚñÑ]', '', 'g'));
  
  IF valid_char_count < 2 THEN RETURN false; END IF;
  IF emoji_count > valid_char_count THEN RETURN false; END IF;
  IF emoji_count > 5 THEN RETURN false; END IF;
  
  RETURN true;
END;
$$;

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
SECURITY INVOKER  -- ✅ SIN SECURITY DEFINER
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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
  
  SELECT role_name, coordinacion_id, role_name IN ('admin', 'administrador_operativo')
  INTO v_role_name, v_coordinacion_id, v_is_admin
  FROM public.user_profiles_v2 WHERE id = v_user_id;
  
  IF v_role_name IS NULL THEN RAISE EXCEPTION 'Usuario sin rol'; END IF;
  
  v_is_calidad := FALSE;
  IF v_role_name = 'coordinador' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.auth_user_coordinaciones uc
      JOIN public.coordinaciones c ON uc.coordinacion_id = c.id
      WHERE uc.user_id = v_user_id AND UPPER(c.codigo) = 'CALIDAD'
    ) INTO v_is_calidad;
  END IF;
  
  IF v_role_name IN ('coordinador', 'supervisor') AND NOT v_is_calidad THEN
    SELECT ARRAY_AGG(coordinacion_id) INTO v_coordinaciones_ids
    FROM public.auth_user_coordinaciones WHERE user_id = v_user_id;
    
    IF v_coordinaciones_ids IS NULL OR array_length(v_coordinaciones_ids, 1) = 0 THEN
      IF v_coordinacion_id IS NOT NULL THEN
        v_coordinaciones_ids := ARRAY[v_coordinacion_id];
      ELSE
        RAISE EXCEPTION 'Coordinador sin coordinaciones';
      END IF;
    END IF;
  END IF;
  
  IF v_role_name = 'ejecutivo' THEN
    IF v_coordinacion_id IS NOT NULL THEN
      v_coordinaciones_ids := ARRAY[v_coordinacion_id];
    ELSE
      RAISE EXCEPTION 'Ejecutivo sin coordinación';
    END IF;
  END IF;
  
  RETURN QUERY
  WITH mensajes_agrupados AS (
    SELECT m.prospecto_id, MAX(m.fecha_hora) AS fecha_ultimo_mensaje,
           COUNT(*) AS mensajes_totales,
           COUNT(*) FILTER (WHERE m.rol = 'Prospecto' AND (m.leido IS FALSE OR m.leido IS NULL)) AS mensajes_no_leidos,
           (ARRAY_AGG(m.mensaje ORDER BY m.fecha_hora DESC))[1] AS ultimo_mensaje
    FROM public.mensajes_whatsapp m
    WHERE m.prospecto_id IS NOT NULL
    GROUP BY m.prospecto_id
  ),
  telefonos_formateados AS (
    SELECT p.id, p.whatsapp,
           CASE WHEN p.whatsapp IS NOT NULL THEN
             RIGHT(REGEXP_REPLACE(p.whatsapp, '[^0-9]', '', 'g'), 10)
           ELSE NULL END AS telefono_10_digitos
    FROM public.prospectos p
  ),
  prospectos_filtrados AS (
    SELECT p.* FROM public.prospectos p
    WHERE (v_is_admin OR v_is_calidad)
       OR (v_role_name IN ('coordinador', 'supervisor') AND v_coordinaciones_ids IS NOT NULL AND p.coordinacion_id = ANY(v_coordinaciones_ids))
       OR (v_role_name = 'ejecutivo' AND p.ejecutivo_id = v_user_id AND v_coordinaciones_ids IS NOT NULL AND p.coordinacion_id = ANY(v_coordinaciones_ids))
  )
  SELECT p.id, COALESCE(NULLIF(TRIM(p.nombre_completo), ''), 
                       CASE WHEN is_valid_whatsapp_name(p.nombre_whatsapp) THEN TRIM(p.nombre_whatsapp) ELSE NULL END,
                       t.telefono_10_digitos),
         p.nombre_whatsapp, t.telefono_10_digitos, p.etapa, m.fecha_ultimo_mensaje, p.created_at,
         m.mensajes_totales, m.mensajes_no_leidos, m.ultimo_mensaje, p.id_uchat
  FROM mensajes_agrupados m
  INNER JOIN prospectos_filtrados p ON p.id = m.prospecto_id
  LEFT JOIN telefonos_formateados t ON t.id = p.id
  ORDER BY m.fecha_ultimo_mensaje DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION get_conversations_ordered(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_conversations_ordered(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_whatsapp_name(text) TO authenticated;
COMMENT ON FUNCTION get_conversations_ordered IS 'v6.5.1 - SECURITY INVOKER';
```

#### 3. Ejecutar (Click "Run")

Resultado esperado:
```
Success. No rows returned
```

#### 4. Verificar

```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'get_conversations_ordered';
```

Esperado: `prosecdef = false` (SECURITY INVOKER)

---

## ✅ TESTING POST-DEPLOY

### Test con Mayra

1. Logout de Mayra
2. Login nuevamente
3. Ir a módulo WhatsApp
4. **Verificar:**
   - ✅ Ve conversaciones de VEN
   - ❌ NO ve "Adriana Baeza" (4111573556) de BOOM

### Test con Admin

1. Login como admin
2. **Verificar:**
   - ✅ Ve TODAS las conversaciones

---

## 📊 IMPACTO

| Antes | Después |
|-------|---------|
| SECURITY DEFINER | SECURITY INVOKER ✅ |
| Trae 1294+ conversaciones | Trae ~50-300 según usuario |
| Mayra ve BOOM ❌ | Mayra NO ve BOOM ✅ |
| Vulnerable | Seguro ✅ |

---

## 🔄 ROLLBACK (Si necesario)

```sql
\i scripts/sql/update_get_conversations_ordered_v3_pagination.sql
```

---

## 📁 ARCHIVOS GENERADOS

1. ✅ `/tmp/fix_conversations.sql` - Script temporal
2. ✅ `scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql` - Script definitivo
3. ✅ `REPORTE_FINAL_FIX_CONVERSACIONES_BOOM.md` - Análisis completo
4. ✅ `AUDITORIA_SECURITY_DEFINER_COMPLETA.md` - Auditoría de seguridad
5. ✅ `INSTRUCCIONES_DEPLOY_FIX_SECURITY_DEFINER.md` - Guía de deploy
6. ✅ Este archivo - Registro de ejecución

---

**Estado final:** 🟡 Script preparado, requiere ejecución manual en SQL Editor  
**Próximo paso:** Ejecutar en https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new  
**Tiempo estimado:** 2 minutos
