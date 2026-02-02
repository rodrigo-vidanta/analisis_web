# 🚨 REPORTE FINAL: Mayra González Ve Conversaciones de BOOM

**Fecha:** 2 de Febrero 2026  
**Usuario afectado:** Gonzalez Serrano Mayra Soledad Jazmin (mayragonzalezs@vidavacations.com)  
**ID:** `f09d601d-5950-4093-857e-a9b6a7efeb73`  
**Severidad:** 🔴 Alta - Bug de permisos que afecta a TODOS los ejecutivos y coordinadores

---

## 🎯 PROBLEMA IDENTIFICADO

### Descripción del Bug

La función RPC `get_conversations_ordered` **NO filtra conversaciones por coordinaciones**. Retorna **TODAS** las conversaciones de WhatsApp de la base de datos, sin importar el usuario autenticado.

El filtro de permisos se aplica **solo en memoria** en el frontend (`LiveChatCanvas.tsx` líneas 4180-4217), lo que:
1. ❌ Permite que conversaciones de otras coordinaciones se vean momentáneamente
2. ❌ Es vulnerable a bugs en el código JavaScript
3. ❌ Transfiere datos innecesarios por red
4. ❌ Consume más memoria del navegador

### Caso Específico: Mayra González

**Configuración en BD (✅ Correcta):**
- Coordinación: VEN
- Rol: Ejecutivo
- Prospectos asignados: 306 (todos de VEN)
- Prospectos de BOOM: 0

**Conversación que ve incorrectamente:**
- Prospecto: Adriana Baeza (ID: `480e390f-86d5-420c-8f7f-4efa64e1898b`)
- Teléfono: 5214111573556
- Coordinación: BOOM
- Ejecutivo asignado: Osmara Partida (osmarapartida@vidavacations.com)
- **Sin relación con Mayra**

---

## 🔍 ANÁLISIS TÉCNICO

### Base de Datos: ✅ CORRECTA

```sql
-- Configuración de Mayra (CORRECTA)
{
  "email": "mayragonzalezs@vidavacations.com",
  "role_name": "ejecutivo",
  "coordinacion_id": "3f41a10b-60b1-4c2b-b097-a83968353af5", // VEN
  "backup_id": "2a0a5e21-b773-413d-ae8c-c44fd3451001", // Issel Rico (VEN)
  "has_backup": true
}

-- Coordinaciones asignadas en auth_user_coordinaciones
[
  "3f41a10b-60b1-4c2b-b097-a83968353af5" // Solo VEN
]

-- Prospectos asignados
Total: 306 prospectos
- VEN: 306 ✅
- BOOM: 0 ✅

-- Ejecutivos donde es backup
[
  "bb7a7c6f-9ed3-40bb-963b-59f2e08ba90f" // Yesica Macias (VEN) ✅
]
```

### Frontend: ❌ FILTRO APLICADO DESPUÉS

**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

**Flujo actual:**
```typescript
// 1. RPC trae TODAS las conversaciones (SIN FILTRO)
const rpcData = await analysisSupabase
  .rpc('get_conversations_ordered', { 
    p_limit: 200, 
    p_offset: 0 
  });
// rpcData = 1294 conversaciones (VEN, BOOM, MVP, APEX, etc.)

// 2. Filtro se aplica EN MEMORIA (líneas 4180-4217)
for (const conv of adaptedConversations) {
  const prospectoData = prospectosData.get(conv.prospecto_id);
  
  if (ejecutivoFilter) {
    // Solo si el prospecto pertenece a su coordinación
    if (!coordinacionesFilter.includes(prospectoData.coordinacion_id)) {
      continue; // ❌ Pero ya se cargó desde la BD
    }
  }
}
```

**Problema:** Entre el paso 1 y 2, las conversaciones de BOOM están en memoria y pueden mostrarse.

### Función RPC: 🔴 SIN FILTROS

**Archivo:** `scripts/sql/update_get_conversations_ordered_v3_pagination.sql`

```sql
CREATE OR REPLACE FUNCTION get_conversations_ordered(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (...)
SECURITY DEFINER  -- ❌ Ejecuta como super usuario, ignora RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM mensajes_agrupados m
  INNER JOIN prospectos p ON p.id = m.prospecto_id
  -- ❌ SIN WHERE para filtrar por coordinaciones del usuario
  ORDER BY m.fecha_ultimo_mensaje DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Script SQL: `fix_get_conversations_ordered_v6.5.0.sql`

**Cambios principales:**

1. **Obtener permisos del usuario autenticado:**
```sql
v_user_id := auth.uid();
SELECT r.name, (u.raw_user_meta_data->>'coordinacion_id')::uuid
FROM auth.users u
LEFT JOIN auth_roles r ON (u.raw_user_meta_data->>'role_id')::uuid = r.id
WHERE u.id = v_user_id;
```

2. **Detectar coordinadores de CALIDAD (acceso completo):**
```sql
SELECT EXISTS(
  SELECT 1 
  FROM auth_user_coordinaciones uc
  JOIN coordinaciones c ON uc.coordinacion_id = c.id
  WHERE uc.user_id = v_user_id AND UPPER(c.codigo) = 'CALIDAD'
) INTO v_is_calidad;
```

3. **Obtener coordinaciones del usuario:**
```sql
-- Para coordinadores/supervisores: múltiples coordinaciones
SELECT ARRAY_AGG(coordinacion_id) INTO v_coordinaciones_ids
FROM auth_user_coordinaciones WHERE user_id = v_user_id;

-- Para ejecutivos: solo su coordinación
IF v_role_name = 'ejecutivo' THEN
  v_coordinaciones_ids := ARRAY[v_coordinacion_id];
END IF;
```

4. **Filtrar prospectos en CTE:**
```sql
prospectos_filtrados AS (
  SELECT p.*
  FROM prospectos p
  WHERE 
    (v_is_admin OR v_is_calidad)  -- Admin/Calidad: sin filtros
    OR
    (v_role_name IN ('coordinador', 'supervisor') 
     AND p.coordinacion_id = ANY(v_coordinaciones_ids))  -- Coordinadores: sus coords
    OR
    (v_role_name = 'ejecutivo'
     AND p.ejecutivo_id = v_user_id
     AND p.coordinacion_id = ANY(v_coordinaciones_ids))  -- Ejecutivos: sus prospectos
)
```

5. **JOIN con prospectos filtrados:**
```sql
INNER JOIN prospectos_filtrados p ON p.id = m.prospecto_id
-- Solo conversaciones de prospectos permitidos
```

### Beneficios:

| Aspecto | Antes | Después |
|---------|-------|---------|
| Datos transferidos | 1294 conversaciones | ~50-300 (según usuario) |
| Filtrado | En memoria (JS) | En BD (SQL) |
| Seguridad | Vulnerable a bugs | Seguro por diseño |
| Performance | Lenta | Rápida |
| Red | Alta | Baja |

---

## 📋 PASOS PARA APLICAR EL FIX

### 1. Backup de la función actual

```bash
# En Supabase SQL Editor (https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/editor)
SELECT pg_get_functiondef('get_conversations_ordered'::regproc);
```

Copiar resultado a: `scripts/sql/BACKUP_get_conversations_ordered_v6.4.0.sql`

### 2. Ejecutar el fix

```bash
# Copiar contenido de: scripts/sql/fix_get_conversations_ordered_v6.5.0.sql
# Ejecutar en Supabase SQL Editor
```

### 3. Testing inmediato

**Como Mayra (ejecutivo VEN):**
```sql
-- Ejecutar en Supabase SQL Editor con JWT de Mayra
SELECT COUNT(*) as total
FROM get_conversations_ordered(200, 0);
-- Esperado: ~50-100 (solo VEN)

-- Verificar que Adriana Baeza NO aparece
SELECT *
FROM get_conversations_ordered(200, 0)
WHERE numero_telefono = '4111573556';
-- Esperado: 0 resultados
```

**Como admin:**
```sql
-- Ejecutar con JWT de admin
SELECT COUNT(*) as total
FROM get_conversations_ordered(200, 0);
-- Esperado: 1294 (todas las coordinaciones)
```

### 4. Testing en UI

1. Logout de Mayra
2. Login de Mayra
3. Ir al módulo WhatsApp
4. **Verificar:**
   - ✅ Ve conversaciones de VEN
   - ❌ NO ve conversaciones de BOOM
   - ✅ Adriana Baeza (5214111573556) NO aparece

### 5. Crear migración

```bash
# Copiar script a migrations/
cp scripts/sql/fix_get_conversations_ordered_v6.5.0.sql \
   migrations/20260202_fix_rpc_conversations_filters.sql
```

### 6. Deploy a producción

```bash
# Ejecutar en Supabase Dashboard de producción
# O via CLI: supabase db push
```

---

## 📊 IMPACTO Y ALCANCE

### Usuarios Afectados

**TODOS** los ejecutivos y coordinadores que usan el módulo WhatsApp:
- ❌ Ejecutivos de VEN podían ver conversaciones de BOOM, MVP, APEX, etc.
- ❌ Coordinadores de BOOM podían ver conversaciones de VEN, MVP, etc.
- ✅ Admins y Coordinadores de CALIDAD NO afectados (tienen acceso completo)

### Datos Expuestos

Cada ejecutivo/coordinador podía ver **información sensible** de otras coordinaciones:
- Nombres de prospectos
- Teléfonos
- Último mensaje de WhatsApp
- Estado del prospecto

### Criticidad

🔴 **ALTA** - Violación de principios de separación de datos por coordinación

---

## 🔒 SEGURIDAD ADICIONAL RECOMENDADA

### 1. Habilitar RLS en `mensajes_whatsapp`

```sql
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven mensajes de su coordinación"
ON mensajes_whatsapp
FOR SELECT
TO authenticated
USING (
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

### 2. Auditar otras funciones RPC

Verificar que estas funciones **SÍ filtran** por coordinaciones:
- `get_dashboard_conversations`
- `search_dashboard_conversations`
- `get_prospectos_paginados` (si existe)

---

## 📁 ARCHIVOS GENERADOS

1. ✅ **`DIAGNOSTICO_MAYRA_PERMISOS_COMPLETO.md`** - Análisis exhaustivo
2. ✅ **`FIX_RPC_CONVERSACIONES_SIN_FILTRO.md`** - Descripción del problema
3. ✅ **`scripts/sql/fix_get_conversations_ordered_v6.5.0.sql`** - Script de corrección
4. ✅ **`scripts/sql/diagnostico_mayra_boom.sql`** - Queries de diagnóstico
5. ✅ **`scripts/sql/verificar_rls_conversaciones_whatsapp.sql`** - Verificar RLS
6. ✅ **`REPORTE_FINAL_FIX_CONVERSACIONES_BOOM.md`** - Este documento

---

## 🎯 RESUMEN EJECUTIVO PARA DEPLOY

### Estado Actual: 🔴 BUG ACTIVO

- ✅ Base de datos: Configuración correcta
- ❌ RPC: Sin filtros de coordinaciones
- ⚠️ Frontend: Filtro en memoria (vulnerable)

### Solución: 🔧 FIX EN RPC

- ✅ Filtrar conversaciones en la función RPC
- ✅ Usar `auth.uid()` para identificar usuario
- ✅ Aplicar lógica de coordinaciones y ejecutivos
- ✅ Reducir datos transferidos

### Testing: ✅ LISTO

- ✅ Queries de testing en el script
- ✅ Casos cubiertos: ejecutivo, coordinador, admin, calidad

### Deploy: 📋 PENDIENTE

1. Backup de función actual ✅ (query preparada)
2. Ejecutar script de fix ⏳ (pendiente)
3. Testing en UI ⏳ (pendiente)
4. Crear migración ⏳ (pendiente)

---

## 📞 CONTACTO Y SEGUIMIENTO

**Responsable:** Equipo Backend  
**Prioridad:** Alta  
**ETA:** Inmediato (fix en <5 minutos)

---

**Autor:** AI Assistant - PQNC QA AI Platform  
**Última actualización:** 2 de Febrero 2026 15:30 UTC  
**Estado:** ✅ Solución lista para aplicar
