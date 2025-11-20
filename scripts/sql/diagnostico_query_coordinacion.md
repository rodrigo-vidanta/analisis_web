# 🔍 Diagnóstico de Consulta de Coordinación

## ❌ Problema Identificado

La consulta original tenía **comentarios con formato incorrecto** que causaban error de sintaxis SQL:

```sql
WHERE coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'  -calidad
```

**Error**: En SQL, los comentarios deben usar `--` (doble guión), no `-` (guión simple).

---

## ✅ Solución

### Opción 1: Eliminar los comentarios (RECOMENDADO)
```sql
WHERE coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'
```

### Opción 2: Usar formato correcto de comentario
```sql
WHERE coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'  -- Calidad
```

---

## 📋 Consulta Corregida Completa

```sql
SELECT
    id,
    email,
    full_name,
    first_name,
    last_name,
    coordinacion_id,
    is_ejecutivo,
    is_coordinator
FROM
    auth_users
WHERE
    coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'
    AND is_active = TRUE
    AND is_ejecutivo = TRUE

UNION

SELECT
    u.id,
    u.email,
    u.full_name,
    u.first_name,
    u.last_name,
    cc.coordinacion_id,
    u.is_ejecutivo,
    u.is_coordinator
FROM
    auth_users u
    JOIN coordinador_coordinaciones cc ON cc.coordinador_id = u.id
WHERE
    cc.coordinacion_id = 'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'
    AND u.is_active = TRUE
    AND u.is_coordinator = TRUE

ORDER BY
    full_name;
```

---

## ✅ Verificación

- ✅ Tabla `auth_users` existe
- ✅ Tabla `coordinador_coordinaciones` existe
- ✅ Columnas requeridas existen (`coordinacion_id`, `is_ejecutivo`, `is_coordinator`, `is_active`)
- ✅ La consulta funciona correctamente sin los comentarios problemáticos

---

## 📝 Archivo con Consulta Corregida

Ver: `scripts/sql/query_coordinacion_final.sql`

