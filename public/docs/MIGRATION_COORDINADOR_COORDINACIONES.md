# 🔄 MIGRACIÓN: coordinador_coordinaciones → auth_user_coordinaciones

**Fecha:** 29 Diciembre 2025  
**Estado:** ANÁLISIS COMPLETO - PENDIENTE EJECUCIÓN  
**Criticidad:** 🔴 ALTA - Afecta producción  
**Entorno:** Desarrollo + Producción

---

## 📋 RESUMEN EJECUTIVO

### Objetivo
Migrar TODOS los usos de la tabla legacy `coordinador_coordinaciones` a la nueva tabla `auth_user_coordinaciones` para eliminar la duplicidad de datos y evitar desincronización.

### ⚠️ CONTEXTO: Por qué existían DOS tablas idénticas

Este problema surgió de una **migración incompleta** en Diciembre 2025:

1. **Tabla original:** `coordinador_coordinaciones` (Nov 2025)
   - Funcionaba correctamente
   - Nombre específico: `coordinador_id`
   
2. **Refactorización:** Se creó `auth_user_coordinaciones` (Dic 2025)
   - Mejora nomenclatura: `user_id` (más genérico)
   - Agregar auditoría: `assigned_by`
   - Preparar para supervisores
   
3. **❌ ERROR:** NO se migró el código existente
   - Servicios críticos siguieron usando tabla legacy
   - UI usaba tabla nueva
   - Escritura dual como "solución temporal"
   
4. **Resultado:** Desincronización de datos (ver POST-MORTEM)

### Problema Actual
- **Dos tablas activas** almacenando las mismas coordinaciones
- **Escritura dual** en 7 archivos diferentes
- **Riesgo de desincronización** (caso real: Barbara Paola tiene 2 coordinaciones en tabla nueva, 1 en legacy)
- **Servicios críticos** aún dependen de tabla legacy

**Ver:** `docs/POSTMORTEM_DUAL_TABLES.md` para análisis completo

---

## 🗂️ ANÁLISIS DE IMPACTO

### Archivos Afectados (7 total)

| Archivo | Líneas | Impacto | Criticidad |
|---------|--------|---------|------------|
| `permissionsService.ts` | 563, 698 | 🔴 CRÍTICO | Permisos y filtros de coordinaciones |
| `coordinacionService.ts` | 717, 844, 967 | 🔴 CRÍTICO | Obtener coordinadores/supervisores |
| `authService.ts` | 677 | 🔴 CRÍTICO | Carga de coordinaciones al login |
| `useInactivityTimeout.ts` | 63 | 🟡 MEDIO | Registro de eventos |
| `UserManagement.tsx` | 380, 416, 1146 | 🟡 MEDIO | Fallback en catch + limpieza |
| `UserManagementV2/UserCreateModal.tsx` | 246 | 🟢 BAJO | Escritura dual |
| `UserManagementV2/hooks/useUserManagement.ts` | 858, 896 | 🟢 BAJO | Escritura dual + limpieza |

---

## 🔍 ANÁLISIS DETALLADO POR ARCHIVO

### 1. permissionsService.ts (CRÍTICO ⚠️)

**Función:** `getCoordinacionesFilter(userId: string)`  
**Línea:** 562-565  
**Uso:**
```typescript
const { data, error } = await supabaseSystemUIAdmin
  .from('coordinador_coordinaciones')
  .select('coordinacion_id')
  .eq('coordinador_id', userId);
```

**Impacto:**
- Determina QUÉ PROSPECTOS puede ver un coordinador/supervisor
- Filtra llamadas y datos en Live Monitor
- Usado en TODA la aplicación para validar permisos

**Función:** `isCoordinadorCalidad(userId: string)`  
**Línea:** 697-705  
**Uso:**
```typescript
const { data, error } = await supabaseSystemUIAdmin
  .from('coordinador_coordinaciones')
  .select(`
    coordinacion_id,
    coordinaciones:coordinacion_id (codigo)
  `)
  .eq('coordinador_id', userId);
```

**Impacto:**
- Verifica si coordinador pertenece a coordinación "CALIDAD"
- Determina si puede ver TODOS los prospectos sin filtro
- Afecta permisos especiales

**Migración:**
- ✅ Cambiar `coordinador_coordinaciones` → `auth_user_coordinaciones`
- ✅ Cambiar `coordinador_id` → `user_id`
- ✅ Mantener lógica de cache intacta
- ✅ Conservar fallbacks

---

### 2. coordinacionService.ts (CRÍTICO ⚠️)

**Función:** `getSupervisoresByCoordinacion(coordinacionId: string)`  
**Línea:** 716-727  
**Uso:**
```typescript
const { data: supervisorCoordinaciones } = await supabaseSystemUI
  .from('coordinador_coordinaciones')
  .select(`
    coordinador_id,
    coordinacion_id,
    coordinaciones:coordinacion_id (codigo, nombre)
  `)
  .eq('coordinacion_id', coordinacionId);
```

**Impacto:**
- Obtiene lista de supervisores de una coordinación específica
- Usado en dropdowns y asignación de backups
- Filtra por coordinación

**Función:** `getCoordinadoresByCoordinacion(coordinacionId: string)`  
**Línea:** 843-853  
**Uso:** (idéntico a getSupervisoresByCoordinacion)

**Impacto:**
- Obtiene lista de coordinadores de una coordinación
- Usado en UI de administración
- Crítico para asignaciones

**Función:** `getAllCoordinadores()`  
**Línea:** 966-975  
**Uso:** (mismo patrón)

**Impacto:**
- Obtiene TODOS los coordinadores activos
- Usado por administradores
- Pobla listas desplegables

**Migración:**
- ✅ Cambiar tabla en las 3 funciones
- ✅ Actualizar columna `coordinador_id` → `user_id`
- ✅ Conservar JOINs con `coordinaciones`
- ✅ Mantener filtros y validaciones

---

### 3. authService.ts (CRÍTICO ⚠️)

**Función:** `loadUserData()`  
**Línea:** 672-687  
**Uso:**
```typescript
// Para coordinadores y supervisores, cargar coordinaciones
if (userData.role_name === 'coordinador' || userData.role_name === 'supervisor') {
  const { data: coordinacionesData } = await supabase
    .from('coordinador_coordinaciones')
    .select('coordinacion_id')
    .eq('coordinador_id', sessionData.user_id);
  
  coordinacionesIds = coordinacionesData.map(c => c.coordinacion_id);
}
```

**Impacto:**
- Carga coordinaciones al INICIAR SESIÓN
- Establece `currentUser.coordinaciones_ids`
- Afecta TODA la sesión del usuario
- Si falla, usuario no verá sus prospectos

**Migración:**
- ✅ Cambiar tabla y columna
- ✅ Mantener try-catch para robustez
- ✅ Conservar mapeo a array
- ⚠️ PROBAR EXHAUSTIVAMENTE (afecta login)

---

### 4. useInactivityTimeout.ts (MEDIO ⚠️)

**Función:** Hook de inactividad  
**Línea:** 61-68  
**Uso:**
```typescript
// Supervisor: obtener primera coordinación
const { data: coordData } = await supabaseSystemUIAdmin
  .from('coordinador_coordinaciones')
  .select('coordinacion_id')
  .eq('coordinador_id', currentUser.id)
  .limit(1);
```

**Impacto:**
- Obtiene coordinación para asignación automática de backup al cerrar sesión por inactividad
- Solo usa la primera coordinación
- No crítico si falla (solo logging)

**Migración:**
- ✅ Cambiar tabla y columna
- ✅ Mantener limit(1)
- ✅ Conservar fallback a null

---

### 5. UserManagement.tsx (MEDIO ⚠️)

**Uso 1:** Fallback en catch (línea 379-386)  
**Uso 2:** Fallback en catch (línea 415-422)  
**Uso 3:** Limpieza al cambiar rol (línea 1143-1151)

**Impacto:**
- Código de recuperación cuando falla la consulta principal
- Limpieza de datos legacy al editar usuario
- No crítico (código de respaldo)

**Migración:**
- ✅ Cambiar tabla en fallbacks
- ✅ Actualizar limpieza (limpiar AMBAS tablas durante transición)
- ⚠️ Conservar try-catch para evitar errores si tabla legacy se elimina

---

### 6. UserManagementV2/UserCreateModal.tsx (BAJO ⚠️)

**Línea:** 237-250  
**Uso:** Escritura DUAL (tabla nueva + legacy)

**Impacto:**
- Ya escribe en auth_user_coordinaciones (principal)
- También escribe en coordinador_coordinaciones (compatibilidad)
- Puede generar desincronización si una falla

**Migración:**
- ✅ ELIMINAR escritura en tabla legacy
- ✅ Conservar solo escritura en tabla nueva
- ✅ Simplificar código

---

### 7. UserManagementV2/hooks/useUserManagement.ts (BAJO ⚠️)

**Uso 1:** Limpieza (línea 854-864)  
**Uso 2:** Escritura dual (línea 887-900)

**Impacto:** (idéntico a UserCreateModal)

**Migración:**
- ✅ ELIMINAR escritura en tabla legacy
- ✅ Conservar limpieza de AMBAS tablas (durante transición)
- ✅ Simplificar código

---

## 📊 ESTRUCTURA DE TABLAS

### Tabla LEGACY: coordinador_coordinaciones
```sql
CREATE TABLE coordinador_coordinaciones (
  id UUID PRIMARY KEY,
  coordinador_id UUID REFERENCES auth_users(id),  -- ⚠️ Nombre antiguo
  coordinacion_id UUID REFERENCES coordinaciones(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Tabla NUEVA: auth_user_coordinaciones
```sql
CREATE TABLE auth_user_coordinaciones (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id),  -- ✅ Nombre estándar
  coordinacion_id UUID REFERENCES coordinaciones(id),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth_users(id)
);
```

### Diferencias Clave
| Campo | Legacy | Nueva | Cambio |
|-------|--------|-------|--------|
| Usuario | `coordinador_id` | `user_id` | ✅ Renombrar |
| Fecha creación | `created_at` | `assigned_at` | ⚠️ Diferente semántica |
| Fecha actualización | `updated_at` | - | ❌ No existe en nueva |
| Asignado por | - | `assigned_by` | ✅ Campo nuevo (auditoría) |

---

## 🔄 PLAN DE MIGRACIÓN

### FASE 1: Sincronización de Datos ✅
```sql
-- Migrar datos faltantes de legacy a nueva tabla
INSERT INTO auth_user_coordinaciones (user_id, coordinacion_id, assigned_at, assigned_by)
SELECT 
    cc.coordinador_id as user_id,
    cc.coordinacion_id,
    cc.created_at as assigned_at,
    NULL as assigned_by
FROM coordinador_coordinaciones cc
WHERE NOT EXISTS (
    SELECT 1 FROM auth_user_coordinaciones auc
    WHERE auc.user_id = cc.coordinador_id 
      AND auc.coordinacion_id = cc.coordinacion_id
);
```

### FASE 2: Migración de Código (Orden Quirúrgico)

#### 2.1 Servicios de Lectura (CRÍTICO)
1. ✅ `permissionsService.ts` - 2 funciones
2. ✅ `coordinacionService.ts` - 3 funciones
3. ✅ `authService.ts` - 1 función

#### 2.2 Hooks y Componentes (MEDIO)
4. ✅ `useInactivityTimeout.ts` - 1 uso
5. ✅ `UserManagement.tsx` - 3 usos

#### 2.3 Escritura Dual (BAJO - simplificar)
6. ✅ `UserManagementV2/UserCreateModal.tsx` - eliminar escritura legacy
7. ✅ `UserManagementV2/hooks/useUserManagement.ts` - eliminar escritura legacy

### FASE 3: Validación ⚠️
- [ ] Probar login de coordinador
- [ ] Verificar filtrado de prospectos
- [ ] Validar asignación de backups
- [ ] Confirmar dropdowns de coordinadores
- [ ] Revisar permisos de coordinador de calidad
- [ ] Probar edición de usuarios

### FASE 4: Deprecación (NO eliminar aún)
```sql
-- Renombrar tabla para prevenir usos accidentales
ALTER TABLE coordinador_coordinaciones 
RENAME TO coordinador_coordinaciones_deprecated_20251229;

-- Agregar comentario
COMMENT ON TABLE coordinador_coordinaciones_deprecated_20251229 
IS 'DEPRECADA: Migrada a auth_user_coordinaciones el 29-12-2025. Mantener 30 días para rollback.';
```

---

## ⚠️ RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Usuario no puede ver prospectos tras login | Media | 🔴 Crítico | Mantener try-catch, probar exhaustivamente |
| Coordinadores desaparecen de dropdowns | Baja | 🔴 Crítico | Migrar datos antes de código |
| Permisos de calidad fallan | Baja | 🟡 Alto | Validar query con JOINs |
| Asignación de backup falla | Media | 🟡 Alto | Mantener fallback a null |
| Desincronización durante migración | Alta | 🟡 Alto | Escribir en ambas durante transición |

---

## 🔙 PLAN DE ROLLBACK

Si algo falla durante la migración:

### Rollback Inmediato (código)
```bash
git revert <commit_hash>
git push origin main
./update-frontend.sh
```

### Rollback de Datos (SQL)
```sql
-- Si se perdieron datos, restaurar desde legacy
INSERT INTO auth_user_coordinaciones (user_id, coordinacion_id, assigned_at)
SELECT coordinador_id, coordinacion_id, created_at
FROM coordinador_coordinaciones_deprecated_20251229
ON CONFLICT (user_id, coordinacion_id) DO NOTHING;
```

---

## ✅ CHECKLIST DE EJECUCIÓN

### Pre-Migración
- [x] Análisis completo de impacto
- [x] Identificar todos los archivos afectados
- [x] Documentar plan de migración
- [ ] Backup completo de tabla legacy
- [ ] Sincronizar datos entre tablas
- [ ] Validar que no hay datos huérfanos

### Durante Migración
- [ ] Migrar permissionsService.ts
- [ ] Migrar coordinacionService.ts
- [ ] Migrar authService.ts
- [ ] Migrar useInactivityTimeout.ts
- [ ] Migrar UserManagement.tsx
- [ ] Simplificar UserCreateModal
- [ ] Simplificar useUserManagement

### Post-Migración
- [ ] Probar login completo
- [ ] Verificar filtros de prospectos
- [ ] Validar dropdowns
- [ ] Confirmar asignación de backups
- [ ] Monitorear logs por 24h
- [ ] Deprecar tabla legacy (sin eliminar)

---

## 📝 NOTAS IMPORTANTES

1. **NO ELIMINAR** tabla legacy hasta validar completamente
2. **PROBAR** exhaustivamente en desarrollo antes de producción
3. **MONITOREAR** logs de errores tras deployment
4. **MANTENER** escritura dual durante 48h si es necesario
5. **COMUNICAR** a equipo antes de deployment

---

## 🎯 CRITERIOS DE ÉXITO

- ✅ Todos los coordinadores pueden ver sus prospectos
- ✅ Dropdowns muestran coordinadores correctamente
- ✅ Backups se asignan automáticamente
- ✅ Coordinadores de calidad ven todo
- ✅ Sin errores en consola relacionados a coordinaciones
- ✅ Performance igual o mejor

---

**Siguiente paso:** Ejecutar FASE 1 (Sincronización de datos)

