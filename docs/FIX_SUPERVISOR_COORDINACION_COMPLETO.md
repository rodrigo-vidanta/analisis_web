# Fix Completo: Coordinación e Inbound para Supervisor

**Fecha:** 22 de Enero 2026  
**Usuario afectado:** Roberto Raya (supervisor)  
**Problema:** Coordinación e inbound no persistían al guardar

---

## 🐛 Bugs Identificados

### 1. Campo `inbound` no se guardaba
**Causa:** Faltaba en arrays de validación
**Archivos:**
- `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`
  - Línea 925: Agregado a `validFields`
  - Línea 940: Agregado a `metadataFields`

### 2. Supervisores tratados como coordinadores
**Causa:** Lógica de coordinaciones incorrecta
**Archivos:**
- `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`
  - Línea 898: Supervisores ahora usan `coordinacion_id` único (no array)
  - Línea 906: Inserta en `auth_user_coordinaciones`

### 3. `coordinacion_id` no persistía en tabla intermedia
**Causa:** Se guardaba en metadata pero NO en `auth_user_coordinaciones`
**Solución:** Agregada inserción en tabla intermedia (línea 906-917)

### 4. UI no mostraba selector para supervisores
**Causa:** Condición solo para ejecutivos
**Archivos:**
- `src/components/admin/UserManagementV2/components/UserEditPanel.tsx`
  - Línea 1113: Agregado `|| selectedRole?.name === 'supervisor'`
- `src/components/admin/UserManagementV2/components/UserCreateModal.tsx`
  - Línea 541: Agregado supervisor a condición
  - Línea 574: Removido supervisor de selector múltiple
  - Línea 177: Agregada validación para supervisor
  - Línea 267: Supervisor inserta en tabla intermedia

### 5. Tipo `RoleName` incompleto
**Causa:** Faltaba `'supervisor'`
**Archivos:**
- `src/components/admin/UserManagementV2/types.ts`
  - Línea 52: Agregado `'supervisor'` al tipo

---

## ✅ Cambios Implementados

### Archivos Modificados

1. **`src/components/admin/UserManagementV2/hooks/useUserManagement.ts`**
   - ✅ `inbound` en `validFields` y `metadataFields`
   - ✅ Lógica de coordinaciones para supervisores
   - ✅ Inserción en `auth_user_coordinaciones`
   - ✅ Logs detallados para debugging

2. **`src/components/admin/UserManagementV2/components/UserEditPanel.tsx`**
   - ✅ Selector de coordinación visible para supervisores
   - ✅ Logs de carga y guardado

3. **`src/components/admin/UserManagementV2/components/UserCreateModal.tsx`**
   - ✅ Validación de coordinación para supervisores
   - ✅ Selector único para supervisores (no múltiple)
   - ✅ Inserción correcta en tabla intermedia

4. **`src/components/admin/UserManagementV2/types.ts`**
   - ✅ Tipo `RoleName` incluye `'supervisor'`

---

## 🔍 Flujo Correcto (Post-Fix)

### Guardado
1. Usuario edita supervisor → selecciona coordinación
2. `UserEditPanel.tsx` construye `updates` con `coordinacion_id`
3. `useUserManagement.ts` detecta rol `supervisor`
4. **Limpia** `auth_user_coordinaciones`
5. **Inserta** nueva coordinación en `auth_user_coordinaciones`
6. **Guarda** en metadata (`auth.users`)

### Carga
1. `loadUsers()` consulta `user_profiles_v2`
2. Vista incluye `coordinacion_id` de metadata
3. `UserEditPanel.tsx` carga `coordinacion_id` en formData
4. **Selector aparece** para supervisores
5. **Valor seleccionado** coincide con UUID

---

## 📊 Verificación

### SQL para verificar datos
```sql
-- Ver coordinación del supervisor
SELECT 
  au.email,
  au.raw_user_meta_data->>'coordinacion_id' as metadata_coordinacion_id,
  auc.coordinacion_id as tabla_coordinacion_id,
  c.nombre as coordinacion_nombre
FROM auth.users au
LEFT JOIN public.auth_user_coordinaciones auc ON au.id = auc.user_id
LEFT JOIN public.coordinaciones c ON auc.coordinacion_id = c.id
WHERE au.email = 'robertoraya@vidavacations.com';
```

### Resultado esperado
```
email: robertoraya@vidavacations.com
metadata_coordinacion_id: f33742b9-46cf-4716-bf7a-ce129a82bad2
tabla_coordinacion_id: f33742b9-46cf-4716-bf7a-ce129a82bad2
coordinacion_nombre: APEX
```

---

## 🧪 Testing

### Casos de prueba
- [x] Supervisor puede ver selector de coordinación
- [x] Coordinación seleccionada se guarda en metadata
- [x] Coordinación se guarda en `auth_user_coordinaciones`
- [x] Toggle `inbound` persiste correctamente
- [x] Al recargar, coordinación aparece seleccionada
- [x] Crear nuevo supervisor con coordinación funciona

---

## 📝 Notas Técnicas

### Diferencias por rol
| Rol | Campo usado | Tabla intermedia | Selector UI |
|-----|-------------|------------------|-------------|
| Coordinador | `coordinaciones_ids` (array) | `auth_user_coordinaciones` | Múltiple (checkboxes) |
| Supervisor | `coordinacion_id` (único) | `auth_user_coordinaciones` | Único (select) |
| Ejecutivo | `coordinacion_id` (único) | `auth_user_coordinaciones` | Único (select) |

### Fuentes de verdad
1. **Metadata (`auth.users`):** Almacena `coordinacion_id`, `inbound`, etc.
2. **Tabla intermedia (`auth_user_coordinaciones`):** Gestiona relaciones N:N
3. **Vista (`user_profiles_v2`):** Expone datos combinados

---

## 🚀 Deploy

```bash
# Commit
git add .
git commit -m "fix(admin): Coordinación e inbound para supervisores"

# Deploy frontend
./update-frontend.sh

# Verificar versión
# Footer debe mostrar nueva versión
```

---

**Estado:** ✅ Resuelto  
**Versión:** v2.1.27+
