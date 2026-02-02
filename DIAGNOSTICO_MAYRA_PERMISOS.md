# Diagnóstico: Mayra González visualiza leads de BOOM

**Fecha:** 2 de Febrero 2026  
**Usuario afectado:** Gonzalez Serrano Mayra Soledad Jazmin (mayragonzalezs@vidavacations.com)  
**Problema:** Puede visualizar leads que pertenecen a la coordinación BOOM cuando solo debería ver VEN

---

## 📋 Resumen del Problema

Según la documentación actualizada (22 de Enero 2026), Mayra González debería estar asignada a:
- **Coordinación:** VEN (Venice)
- **Rol:** Ejecutivo
- **Teléfono:** +16232536853

Sin embargo, está viendo leads de la coordinación BOOM.

---

## 🔍 Análisis Técnico

### 1. Configuración Esperada

Según `docs/UPDATE_USUARIOS_VIDANTA_2026-01-22.md` y `scripts/update_vidanta_users.sql`:

```sql
-- Configuración actualizada el 22 de Enero 2026
-- VEN UUID: 3f41a10b-60b1-4c2b-b097-a83968353af5
-- Ejecutivo role UUID: fed8bd96-7928-4a3e-bb20-e20384e98f0b
```

### 2. Cómo Funciona el Filtrado

El sistema filtra prospectos en 3 niveles:

#### A. Función RPC `get_user_permissions`
```typescript
// Ubicación: scripts/sql/create_coordinaciones_functions.sql (líneas 372-413)
// Retorna solo UNA coordinacion_id desde auth_users.coordinacion_id
```

#### B. Servicio `permissionsService.getCoordinacionesFilter()`
```typescript
// Ubicación: src/services/permissionsService.ts (líneas 677-747)
// Para ejecutivos: retorna [coordinacion_id] (un array con una coordinación)
// Para coordinadores: consulta auth_user_coordinaciones y retorna múltiples
```

#### C. Componentes (ProspectosManager, LiveChatCanvas, etc.)
```typescript
// Filtran prospectos usando:
// coordinacionesFilter = await permissionsService.getCoordinacionesFilter(userId);
// query.in('coordinacion_id', coordinacionesFilter);
```

### 3. Posibles Causas

El problema puede ser uno de estos:

#### ❌ **Causa 1: Coordinación incorrecta en `auth_users`**
```sql
-- Verificar en BD
SELECT 
  u.id, 
  u.email, 
  u.coordinacion_id,
  c.codigo as coordinacion_codigo
FROM auth_users u
LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.email = 'mayragonzalezs@vidavacations.com';

-- Esperado: coordinacion_codigo = 'VEN'
-- Si muestra 'BOOM', está mal configurado
```

#### ❌ **Causa 2: Coordinaciones adicionales en `auth_user_coordinaciones`**
```sql
-- Verificar múltiples coordinaciones
SELECT 
  uc.user_id,
  c.codigo as coordinacion_codigo
FROM auth_user_coordinaciones uc
JOIN coordinaciones c ON uc.coordinacion_id = c.id
WHERE uc.user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
);

-- Si aparece 'BOOM' aquí, el sistema le está dando acceso adicional
```

#### ❌ **Causa 3: Prospectos BOOM asignados directamente a ella**
```sql
-- Verificar prospectos asignados a ella en BOOM
SELECT 
  p.id,
  p.nombre,
  p.ejecutivo_id,
  c.codigo as coordinacion_codigo
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';

-- Si hay resultados, estos prospectos se le asignaron incorrectamente
```

#### ❌ **Causa 4: Es backup de un ejecutivo de BOOM**
```sql
-- Verificar si es backup de alguien en BOOM
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.backup_id,
  u.has_backup,
  c.codigo as coordinacion_codigo
FROM auth_users u
JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.backup_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';

-- Si hay resultados, ella es backup de ejecutivos de BOOM
```

---

## 🔧 Plan de Acción

### Paso 1: Ejecutar Query de Diagnóstico

He creado un script SQL completo en `/tmp/debug_mayra_permisos.sql` que verifica:
1. Información básica del usuario
2. Coordinaciones asignadas en `auth_user_coordinaciones`
3. Permisos del usuario
4. Información de la coordinación BOOM

Para ejecutarlo:

```bash
# Opción 1: Via MCP SupabaseREST
# (Necesita estar en proyecto correcto: glsmifhkoaifvaegsozd)

# Opción 2: Via Supabase Dashboard
# 1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/editor
# 2. Copiar contenido de /tmp/debug_mayra_permisos.sql
# 3. Ejecutar y revisar resultados
```

### Paso 2: Corregir Según la Causa

#### Si es Causa 1 (coordinacion_id incorrecta):
```sql
-- Corregir coordinacion_id en auth_users
UPDATE auth_users
SET coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5' -- VEN
WHERE email = 'mayragonzalezs@vidavacations.com';
```

#### Si es Causa 2 (coordinaciones adicionales):
```sql
-- Eliminar coordinación BOOM de auth_user_coordinaciones
DELETE FROM auth_user_coordinaciones
WHERE user_id IN (SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com')
AND coordinacion_id IN (SELECT id FROM coordinaciones WHERE codigo = 'BOOM');

-- Asegurar que solo tenga VEN
INSERT INTO auth_user_coordinaciones (user_id, coordinacion_id)
SELECT 
  u.id,
  '3f41a10b-60b1-4c2b-b097-a83968353af5' -- VEN
FROM auth_users u
WHERE u.email = 'mayragonzalezs@vidavacations.com'
ON CONFLICT DO NOTHING;
```

#### Si es Causa 3 (prospectos mal asignados):
```sql
-- Reasignar prospectos de BOOM que tiene asignados
-- CRÍTICO: Solo si estos prospectos NO deberían estar con ella
UPDATE prospectos
SET ejecutivo_id = NULL -- O asignar a otro ejecutivo de BOOM
WHERE ejecutivo_id IN (SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com')
AND coordinacion_id IN (SELECT id FROM coordinaciones WHERE codigo = 'BOOM');
```

#### Si es Causa 4 (es backup en BOOM):
```sql
-- Remover como backup de ejecutivos de BOOM
UPDATE auth_users
SET backup_id = NULL,
    has_backup = false
WHERE backup_id IN (SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com')
AND coordinacion_id IN (SELECT id FROM coordinaciones WHERE codigo = 'BOOM');
```

### Paso 3: Verificar Corrección

Después de aplicar el fix, verificar:

```sql
-- 1. Coordinación en auth_users
SELECT 
  u.email,
  c.codigo as coordinacion_principal
FROM auth_users u
LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.email = 'mayragonzalezs@vidavacations.com';
-- Esperado: 'VEN'

-- 2. Coordinaciones adicionales
SELECT 
  c.codigo
FROM auth_user_coordinaciones uc
JOIN coordinaciones c ON uc.coordinacion_id = c.id
WHERE uc.user_id IN (SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com');
-- Esperado: solo 'VEN' (o vacío si es ejecutivo simple)

-- 3. Prospectos de BOOM
SELECT COUNT(*) as prospectos_boom
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com')
AND c.codigo = 'BOOM';
-- Esperado: 0
```

---

## 📊 Contexto Técnico Adicional

### Flujo de Filtrado en Código

```typescript
// 1. ProspectosManager.tsx (línea 1577)
const coordinacionesFilter = await permissionsService.getCoordinacionesFilter(queryUserId);

// 2. permissionsService.ts (línea 698-701)
if (permissions.role === 'ejecutivo') {
  const result = permissions.coordinacion_id ? [permissions.coordinacion_id] : null;
  return result; // Solo retorna su coordinación única
}

// 3. Query final (línea 1587-1588)
if (coordinacionesFilter && coordinacionesFilter.length > 0) {
  coordinacionesIdsParaFiltro = coordinacionesFilter;
}
```

### Documentos de Referencia

- `docs/UPDATE_USUARIOS_VIDANTA_2026-01-22.md` - Configuración actualizada
- `scripts/update_vidanta_users.sql` (líneas 127-149) - Script de actualización de Mayra
- `src/services/permissionsService.ts` (líneas 677-747) - Lógica de filtrado
- `.cursor/rules/arquitectura-bd-unificada.mdc` - Arquitectura de BD
- `.cursor/rules/security-rules.mdc` - Reglas de seguridad

---

## ⚠️ Notas Importantes

1. **Coordinadores vs Ejecutivos:**
   - Coordinadores PUEDEN tener múltiples coordinaciones en `auth_user_coordinaciones`
   - Ejecutivos solo tienen su `auth_users.coordinacion_id` (una sola)

2. **Sistema de Backups:**
   - Si un ejecutivo es backup de otro, ve los prospectos del ejecutivo principal
   - Backup se configura en `auth_users.backup_id` y `has_backup`

3. **Caché de Permisos:**
   - El servicio usa caché de 30 segundos
   - Después de corregir, puede tardar hasta 30s en reflejarse
   - O forzar logout/login para limpiar caché

4. **RLS:**
   - RLS está HABILITADO desde 16 de Enero 2026
   - Las tablas `auth_users` y `auth_user_coordinaciones` requieren `service_role` o authenticated
   - Los queries de diagnóstico deben ejecutarse con credenciales admin

---

## 🎯 Próximos Pasos

1. **Ejecutar** `/tmp/debug_mayra_permisos.sql` en Supabase Dashboard
2. **Revisar** resultados para identificar causa exacta
3. **Aplicar** fix correspondiente según la causa
4. **Verificar** que ya no vea leads de BOOM
5. **Documentar** hallazgo en este archivo

---

**Última actualización:** 2 de Febrero 2026  
**Estado:** En investigación - Pendiente ejecutar queries de diagnóstico
