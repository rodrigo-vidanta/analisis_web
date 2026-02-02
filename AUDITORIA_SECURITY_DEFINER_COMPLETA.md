# 🔐 AUDITORÍA COMPLETA: SECURITY DEFINER

**Fecha:** 2 de Febrero 2026  
**Severidad:** 🔴 CRÍTICA - Posible vulnerabilidad masiva

---

## 🚨 HALLAZGOS

### Resumen Ejecutivo

Se encontraron **516 menciones de SECURITY DEFINER** en el codebase, incluyendo:
- Scripts SQL activos
- Documentación
- Migraciones
- Código TypeScript

---

## 📊 CATEGORIZACIÓN DE FUNCIONES

### 🔴 CATEGORÍA 1: FUNCIONES CRÍTICAS DE SEGURIDAD (REVISAR AHORA)

#### 1.1 Auth y Sesiones
| Función | Archivo | ¿Necesita DEFINER? | Alternativa |
|---------|---------|-------------------|-------------|
| `authenticate_user` | `update_authenticate_user_*.sql` | ⚠️ SÍ | RLS + policies |
| `change_password` | `create_change_password_function.sql` | ⚠️ SÍ | Edge Function |
| `log_user_login` | `fix_log_user_login.sql` | ❌ NO | SECURITY INVOKER |

#### 1.2 Permisos
| Función | Archivo | ¿Necesita DEFINER? | Alternativa |
|---------|---------|-------------------|-------------|
| `get_user_permissions` | `create_coordinaciones_functions.sql` | ⚠️ PARCIAL | Migrar a `user_profiles_v2` view |
| `can_user_access_prospect` | `create_coordinaciones_functions.sql` | ⚠️ PARCIAL | RLS policies |
| `is_support_admin` | `migrations/20260120_fix_rls_policies.sql` | ⚠️ SÍ | Solo lectura, OK |

#### 1.3 Conversaciones y Mensajes
| Función | Archivo | ¿Necesita DEFINER? | Alternativa |
|---------|---------|-------------------|-------------|
| `get_conversations_ordered` | **🔴 ESTE** | ❌ NO | **Remover DEFINER + RLS** |
| `search_dashboard_conversations` | `EJECUTAR_search_dashboard_conversations_FINAL.sql` | ❌ NO | **Remover DEFINER + RLS** |
| `get_dashboard_conversations` | `EJECUTAR_get_dashboard_conversations_FINAL.sql` | ❌ NO | **Remover DEFINER + RLS** |
| `mark_messages_as_read` | `create_mark_messages_read_rpc.sql` | ⚠️ SÍ | Bypass RLS necesario |

#### 1.4 Notificaciones
| Función | Archivo | ¿Necesita DEFINER? | Alternativa |
|---------|---------|-------------------|-------------|
| `notify_template_approval` | `function_notify_template_approval.sql` | ⚠️ SÍ | Trigger system |
| `create_system_ticket` | `migrations/20260124_fix_create_system_ticket_rpc.sql` | ⚠️ SÍ | Sistema automatizado |

---

## ⚠️ ANÁLISIS: ¿Por qué SECURITY DEFINER es peligroso?

### Riesgos de SECURITY DEFINER

```sql
CREATE FUNCTION vulnerable_function()
SECURITY DEFINER  -- ⚠️ Ejecuta como postgres (super usuario)
AS $$
BEGIN
  -- Cualquier usuario puede ejecutar esto con permisos de admin
  DELETE FROM sensitive_table WHERE id = ANY_ID;
END;
$$;
```

**Consecuencias:**
1. ❌ Bypass completo de RLS
2. ❌ Acceso a tablas restringidas (`auth.users`, `api_auth_tokens`)
3. ❌ Posibilidad de SQL injection si no se sanitizan inputs
4. ❌ Escalación de privilegios

---

## ✅ SOLUCIÓN: Estrategia de Migración

### Opción 1: Remover DEFINER + Habilitar RLS (RECOMENDADO)

**Para funciones de consulta simple:**

```sql
-- ❌ ANTES
CREATE FUNCTION get_conversations_ordered(...)
SECURITY DEFINER  -- Super usuario
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM mensajes_whatsapp m
  INNER JOIN prospectos p ON p.id = m.prospecto_id;
END;
$$;

-- ✅ DESPUÉS
CREATE FUNCTION get_conversations_ordered(...)
SECURITY INVOKER  -- Ejecuta como usuario actual
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM mensajes_whatsapp m
  INNER JOIN prospectos p ON p.id = m.prospecto_id
  WHERE p.coordinacion_id IN (
    SELECT coordinacion_id 
    FROM auth_user_coordinaciones 
    WHERE user_id = auth.uid()
  );
END;
$$;

-- ✅ RLS en las tablas
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_coordination"
ON mensajes_whatsapp FOR SELECT
TO authenticated
USING (
  prospecto_id IN (
    SELECT id FROM prospectos WHERE coordinacion_id IN (
      SELECT coordinacion_id FROM auth_user_coordinaciones WHERE user_id = auth.uid()
    )
  )
);
```

**Ventajas:**
- ✅ RLS protege incluso si el código tiene bugs
- ✅ Múltiples capas de seguridad
- ✅ Auditable con Supabase Dashboard

### Opción 2: DEFINER Solo para Casos Especiales

**Casos legítimos de SECURITY DEFINER:**

1. **Triggers automáticos** (sin input del usuario)
   - `notify_template_approval()` - OK
   - `sync_coordinaciones()` - OK

2. **Funciones de sistema** (validación interna)
   - `is_support_admin()` - OK (solo retorna boolean)
   - `authenticate_user()` - ⚠️ Requiere sanitización estricta

3. **Bypass RLS controlado** (casos específicos)
   - `mark_messages_as_read()` - OK (el usuario solo puede marcar sus mensajes)
   - `create_system_ticket()` - OK (crea tickets como sistema)

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### Fase 1: Funciones de Conversaciones (HOY)

**Funciones a modificar:**

1. ✅ `get_conversations_ordered` - **Remover DEFINER + filtrar por auth.uid()**
2. ✅ `search_dashboard_conversations` - **Remover DEFINER + filtrar por auth.uid()**
3. ✅ `get_dashboard_conversations` - **Remover DEFINER + filtrar por auth.uid()**

**Script consolidado:**

```sql
-- ============================================
-- FIX SECURITY: Remover DEFINER + Filtrar por Usuario
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Criticidad: ALTA

-- 1. get_conversations_ordered
DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);

CREATE OR REPLACE FUNCTION get_conversations_ordered(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY INVOKER  -- ✅ CAMBIADO: Ejecuta como usuario actual
AS $$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_coordinaciones_ids uuid[];
  -- ... resto de variables
BEGIN
  -- Obtener usuario autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Obtener coordinaciones del usuario (desde user_profiles_v2 o auth.users)
  -- ... lógica de filtrado ...
  
  RETURN QUERY
  WITH prospectos_filtrados AS (
    SELECT p.*
    FROM prospectos p
    WHERE p.coordinacion_id = ANY(v_coordinaciones_ids)
  )
  SELECT ... FROM prospectos_filtrados;
END;
$$;
```

### Fase 2: Habilitar RLS en Tablas Críticas (MAÑANA)

```sql
-- mensajes_whatsapp
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_coordination_messages" ...

-- conversaciones_whatsapp
ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_coordination_convs" ...

-- prospectos
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_see_own_coordination_prospects" ...
```

### Fase 3: Auditar Funciones Restantes (ESTA SEMANA)

- [ ] Auditar todas las funciones en `scripts/sql/create_coordinaciones_functions.sql`
- [ ] Revisar funciones de notificaciones
- [ ] Revisar funciones de auth
- [ ] Documentar cuáles DEFINER son legítimos

---

## 🔧 SCRIPT DE FIX INMEDIATO

### Versión SIN SECURITY DEFINER

```sql
-- ============================================
-- FIX: get_conversations_ordered SIN SECURITY DEFINER
-- ============================================
-- Versión: v6.5.1 (SEGURA)
-- Fecha: 2 de Febrero 2026

DROP FUNCTION IF EXISTS get_conversations_ordered(integer, integer);

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
SECURITY INVOKER  -- ✅ Ejecuta con permisos del usuario actual
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
  
  -- Obtener rol y coordinación desde user_profiles_v2
  SELECT 
    role_name,
    coordinacion_id,
    role_name IN ('admin', 'administrador_operativo') as is_admin_user
  INTO v_role_name, v_coordinacion_id, v_is_admin
  FROM user_profiles_v2
  WHERE id = v_user_id;
  
  IF v_role_name IS NULL THEN
    RAISE EXCEPTION 'Usuario sin rol asignado';
  END IF;
  
  -- Verificar si es coordinador de CALIDAD
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

GRANT EXECUTE ON FUNCTION get_conversations_ordered(integer, integer) TO authenticated;
COMMENT ON FUNCTION get_conversations_ordered IS 'Obtiene conversaciones de WhatsApp con filtros de coordinación. v6.5.1 - SECURITY INVOKER (seguro)';
```

---

## 📋 TESTING

### 1. Testing como Mayra (Ejecutivo VEN)

```sql
-- Login como Mayra y ejecutar:
SELECT COUNT(*) FROM get_conversations_ordered(200, 0);
-- Esperado: Solo VEN (~50-100)

SELECT * FROM get_conversations_ordered(200, 0) WHERE numero_telefono = '4111573556';
-- Esperado: 0 resultados (Adriana Baeza es BOOM)
```

### 2. Testing como Admin

```sql
-- Login como admin y ejecutar:
SELECT COUNT(*) FROM get_conversations_ordered(200, 0);
-- Esperado: TODAS (~1294)
```

---

## 🎯 DECISIÓN REQUERIDA

¿Qué versión aplicar?

### Opción A: SECURITY INVOKER (MÁS SEGURA) ✅ RECOMENDADA

- ✅ Sin riesgo de escalación de privilegios
- ✅ RLS puede actuar como segunda capa
- ⚠️ Requiere que `user_profiles_v2` sea accesible a usuarios autenticados

### Opción B: SECURITY DEFINER CON FILTROS (MENOS SEGURA)

- ⚠️ Mantiene riesgo de bypass RLS
- ✅ Más fácil de implementar
- ⚠️ Requiere auditoría constante

---

**Última actualización:** 2 de Febrero 2026  
**Estado:** 🔴 CRÍTICO - Decisión requerida antes de deploy
