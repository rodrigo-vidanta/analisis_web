# ✅ MIGRACIÓN COMPLETADA: coordinador_coordinaciones → auth_user_coordinaciones

**Fecha:** 29 Diciembre 2025  
**Estado:** ✅ COMPLETADA - PENDIENTE PRUEBAS  
**Criticidad:** 🔴 ALTA

---

## 📋 RESUMEN EJECUTIVO

### ✅ Completado
- Sincronización de datos entre tablas (15 registros en tabla nueva)
- Migración de 7 archivos críticos
- Eliminación de escritura dual innecesaria
- Plan de rollback documentado

### ⚠️ Pendiente
- Pruebas exhaustivas en desarrollo
- Validación en producción
- Deprecación de tabla legacy (después de validar)

---

## 🔧 ARCHIVOS MIGRADOS

| # | Archivo | Estado | Cambios |
|---|---------|--------|---------|
| 1 | `src/services/permissionsService.ts` | ✅ Migrado | 2 consultas actualizadas |
| 2 | `src/services/coordinacionService.ts` | ✅ Migrado | 3 funciones actualizadas |
| 3 | `src/services/authService.ts` | ✅ Migrado | Login actualizado |
| 4 | `src/hooks/useInactivityTimeout.ts` | ✅ Migrado | Timeout actualizado |
| 5 | `src/components/admin/UserManagement.tsx` | ✅ Migrado | Fallbacks actualizados |
| 6 | `src/components/admin/UserManagementV2/components/UserCreateModal.tsx` | ✅ Simplificado | Escritura dual eliminada |
| 7 | `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` | ✅ Simplificado | Escritura dual eliminada |

---

## 📊 DATOS SINCRONIZADOS

```
Tabla Legacy: coordinador_coordinaciones
- 14 registros originales

Tabla Nueva: auth_user_coordinaciones  
- 8 registros existentes
- 7 registros migrados
- 15 registros totales (más registros = OK, pueden haberse agregado manualmente)

Resumen por coordinación:
- CALIDAD: 5 coordinadores/supervisores
- COBACA:  5 coordinadores/supervisores
- I360:    1 coordinador/supervisor
- MVP:     2 coordinadores/supervisores
- VEN:     2 coordinadores/supervisores
```

---

## 🔄 CAMBIOS REALIZADOS

### 1. permissionsService.ts

**Función:** `getCoordinacionesFilter()`
```typescript
// ANTES:
.from('coordinador_coordinaciones')
.eq('coordinador_id', userId)

// DESPUÉS:
.from('auth_user_coordinaciones')
.eq('user_id', userId)
```

**Función:** `isCoordinadorCalidad()`
```typescript
// ANTES:
.from('coordinador_coordinaciones')
.eq('coordinador_id', userId)

// DESPUÉS:
.from('auth_user_coordinaciones')
.eq('user_id', userId)
```

---

### 2. coordinacionService.ts

**Función:** `getSupervisoresByCoordinacion()`
```typescript
// ANTES:
.from('coordinador_coordinaciones')
.map(sc => sc.coordinador_id)
.find(sc => sc.coordinador_id === user.id)

// DESPUÉS:
.from('auth_user_coordinaciones')
.map(sc => sc.user_id)
.find(sc => sc.user_id === user.id)
```

**Función:** `getCoordinadoresByCoordinacion()`  
**Función:** `getAllCoordinadores()`  
(Cambios idénticos)

---

### 3. authService.ts

**Función:** `loadUserData()`
```typescript
// ANTES:
.from('coordinador_coordinaciones')
.eq('coordinador_id', sessionData.user_id)

// DESPUÉS:
.from('auth_user_coordinaciones')
.eq('user_id', sessionData.user_id)
```

---

### 4. useInactivityTimeout.ts

```typescript
// ANTES:
.from('coordinador_coordinaciones')
.eq('coordinador_id', currentUser.id)

// DESPUÉS:
.from('auth_user_coordinaciones')
.eq('user_id', currentUser.id)
```

---

### 5. UserManagement.tsx

- Fallback 1 (línea 380): ✅ Migrado
- Fallback 2 (línea 416): ✅ Migrado
- Limpieza 1 (línea 1146): ⚠️ Mantiene compatibilidad con tabla legacy
- Limpieza 2 (línea 1179): ⚠️ Mantiene compatibilidad con tabla legacy

---

### 6. UserCreateModal.tsx

```typescript
// ANTES: Escribía en AMBAS tablas
INSERT INTO auth_user_coordinaciones...
INSERT INTO coordinador_coordinaciones...

// DESPUÉS: Solo escribe en tabla nueva
INSERT INTO auth_user_coordinaciones...
// (Escritura dual eliminada)
```

---

### 7. useUserManagement.ts

- Escritura dual ELIMINADA
- Limpieza de tabla legacy CONSERVADA (para transición)

---

## ✅ CHECKLIST DE PRUEBAS

### Pre-Deployment
- [x] Datos sincronizados
- [x] Código migrado
- [x] Escritura dual eliminada
- [ ] Pruebas locales

### Pruebas Críticas (EJECUTAR ANTES DE VALIDAR)

#### 1. Login de Coordinador ⚠️ CRÍTICO
- [ ] Coordinador puede hacer login
- [ ] `currentUser.coordinaciones_ids` se carga correctamente
- [ ] No hay errores en consola

#### 2. Filtrado de Prospectos ⚠️ CRÍTICO
- [ ] Coordinador ve solo prospectos de sus coordinaciones
- [ ] Coordinador de CALIDAD ve todos los prospectos
- [ ] Supervisor ve prospectos de su coordinación

#### 3. Dropdowns de Coordinadores ⚠️ CRÍTICO
- [ ] Lista de coordinadores se carga correctamente
- [ ] Dropdown muestra coordinadores por coordinación
- [ ] Asignación de coordinadores funciona

#### 4. Creación/Edición de Usuarios
- [ ] Crear coordinador asigna coordinaciones correctamente
- [ ] Editar coordinador actualiza coordinaciones
- [ ] Cambiar rol de coordinador a ejecutivo limpia coordinaciones

#### 5. Backups Automáticos
- [ ] Timeout de inactividad obtiene coordinación de supervisor
- [ ] Asignación automática de backup funciona

---

## 🔙 PLAN DE ROLLBACK

### Si falla en DESARROLLO:

```bash
# 1. Revertir código
git revert HEAD
git push origin main

# 2. Re-sincronizar datos si es necesario
# Ver scripts/migration/sync-coordinaciones-legacy-to-new.sql
```

### Si falla en PRODUCCIÓN:

```bash
# 1. Rollback inmediato
git revert <commit_hash>
git push origin main
./update-frontend.sh

# 2. Restaurar datos si se perdieron
# Ejecutar script de restauración desde backup
```

### Restauración de Datos (SQL)

```sql
-- Restaurar desde tabla legacy
INSERT INTO auth_user_coordinaciones (user_id, coordinacion_id, assigned_at)
SELECT coordinador_id, coordinacion_id, created_at
FROM coordinador_coordinaciones
ON CONFLICT (user_id, coordinacion_id) DO NOTHING;
```

---

## 📝 NOTAS IMPORTANTES

### ⚠️ Tabla Legacy AÚN ACTIVA

**NO se ha eliminado la tabla `coordinador_coordinaciones`**

Razones:
1. Código de limpieza aún la usa (UserManagement.tsx, useUserManagement.ts)
2. Permite rollback rápido si algo falla
3. Se deprecará después de 30 días de validación exitosa

### 🔄 Compatibilidad Durante Transición

Código de limpieza mantiene compatibilidad:
- Limpia tabla nueva (auth_user_coordinaciones)
- También limpia tabla legacy (coordinador_coordinaciones)
- Si tabla legacy no existe, solo genera warning (no crítico)

### ✅ Ventajas de la Migración

1. **Nomenclatura consistente:** `user_id` en lugar de `coordinador_id`
2. **Sin escritura dual:** Elimina riesgo de desincronización
3. **Auditoría:** Campo `assigned_by` para rastrear quién asignó
4. **Escalabilidad:** Preparado para roles futuros (supervisores, etc.)

---

## 🎯 CRITERIOS DE ÉXITO

### Antes de validar como exitosa:

- [ ] Todos los coordinadores pueden ver sus prospectos
- [ ] Filtros por coordinación funcionan correctamente
- [ ] Dropdowns de coordinadores se llenan
- [ ] Coordinadores de CALIDAD ven todo
- [ ] Asignación de backups funciona
- [ ] Sin errores en logs relacionados a coordinaciones
- [ ] Performance igual o mejor que antes

### Después de 30 días exitosos:

- [ ] Deprecar tabla legacy con RENAME
- [ ] Eliminar código de compatibilidad
- [ ] Eliminar TODOs en código
- [ ] Actualizar documentación final

---

## 📂 SCRIPTS CREADOS

1. **`scripts/migration/sync-coordinaciones-legacy-to-new.sql`**
   - Script SQL completo de sincronización
   - Verificación de integridad
   - Backup automático

2. **`scripts/migration/verify-and-sync-coordinaciones.ts`**
   - Script TypeScript ejecutable
   - Verifica y sincroniza datos
   - Genera reporte detallado

3. **`docs/MIGRATION_COORDINADOR_COORDINACIONES.md`**
   - Análisis completo de impacto
   - Plan de migración detallado
   - Documentación técnica

---

## 🚀 PRÓXIMOS PASOS

1. **Inmediato:**
   - [ ] Ejecutar pruebas locales
   - [ ] Verificar que no hay errores en consola
   - [ ] Probar login de coordinador

2. **Antes de deploy:**
   - [ ] Revisar todos los puntos de CHECKLIST DE PRUEBAS
   - [ ] Notificar al equipo del deployment
   - [ ] Preparar rollback si es necesario

3. **Post-deployment:**
   - [ ] Monitorear logs por 24h
   - [ ] Validar con usuarios reales
   - [ ] Documentar cualquier issue

4. **Después de 30 días:**
   - [ ] Deprecar tabla legacy
   - [ ] Eliminar código de transición
   - [ ] Cerrar migración

---

**Migración realizada por:** AI Assistant (Cursor)  
**Supervisión:** Samuel Rosales  
**Fecha:** 29 Diciembre 2025

