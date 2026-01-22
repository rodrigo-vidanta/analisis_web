# Fix: Campo Inbound y Coordinación Persistencia Completa

**Fecha:** 22 de Enero 2026  
**Tipo:** Bugfix Crítico  
**Severidad:** Alta  
**Afecta a:** Todos los roles (especialmente supervisores)  
**Módulo:** UserManagementV2

---

## 🐛 Problema Reportado

El usuario **robertoraya@vidavacations.com** (supervisor) experimentaba:

1. **Coordinación no persistía**: Al editar y seleccionar coordinación "APEX", al reabrir el modal aparecía vacía
2. **Toggle inbound no persistía**: Al activar "Usuario recibe mensajes inbound", al reabrir el modal aparecía desactivado
3. **Data Grid mostraba correctamente**: Los datos SÍ estaban en BD, pero el editor NO los cargaba

**Log de consola al guardar:**
```javascript
Actualizando auth.users metadata con campos: {
  full_name: 'Raya Salas Roberto Alejandro',
  first_name: 'Raya Salas Roberto',
  last_name: 'Alejandro',
  phone: '+16232536877',
  id_dynamics: '0e31e3e4-ae63-ed11-9561-002248081932',
  is_active: true,
  is_coordinator: false,
  is_ejecutivo: false,
  is_operativo: true,
  role_id: "6b9aba23-0f1c-416c-add6-7c0424f21116"
  // ❌ FALTA: coordinacion_id
  // ❌ FALTA: inbound
}
```

---

## 🔍 Análisis del Problema

### Problema 1: Campo `inbound` Faltante en Vista

**Ubicación:** Vista `user_profiles_v2`

La vista `user_profiles_v2` **NO incluía el campo `inbound`**, por lo que:
- ✅ El campo SÍ se guardaba en `auth.users.raw_user_meta_data`
- ❌ El campo NO se exponía en la vista
- ❌ El frontend NO podía leerlo

### Problema 2: Campo `inbound` Faltante en Lista de Metadatos

**Ubicación:** `UserManagementV2/hooks/useUserManagement.ts` - línea 935-937

La lista `metadataFields` **NO incluía `inbound`**:

```typescript
const metadataFields = ['full_name', 'first_name', 'last_name', 'phone', 'id_dynamics', 
  'is_active', 'is_operativo', 'is_coordinator', 'is_ejecutivo', 'coordinacion_id', 
  'role_id', 'archivado', 'must_change_password'];
  // ❌ FALTA: 'inbound'
```

**Resultado:** Aunque el formulario tenía el valor, NO se enviaba en el update a `auth.users`.

---

## ✅ Solución Implementada

### 1. Actualizar Vista `user_profiles_v2`

**Archivo:** `scripts/fix-user-profiles-v2-view.sql`

```sql
-- Agregado campo inbound (línea 47)
COALESCE((au.raw_user_meta_data->>'inbound')::BOOLEAN, false) as inbound,
```

**Ejecutado:**
```bash
DROP VIEW IF EXISTS public.user_profiles_v2 CASCADE;
CREATE VIEW public.user_profiles_v2 AS SELECT ...
GRANT SELECT ON public.user_profiles_v2 TO anon, authenticated, service_role;
```

### 2. Agregar `inbound` a Lista de Metadatos

**Archivo:** `src/components/admin/UserManagementV2/hooks/useUserManagement.ts`

**ANTES (línea 935-937):**
```typescript
const metadataFields = ['full_name', 'first_name', 'last_name', 'phone', 'id_dynamics', 
  'is_active', 'is_operativo', 'is_coordinator', 'is_ejecutivo', 'coordinacion_id', 
  'role_id', 'archivado', 'must_change_password'];
```

**AHORA:**
```typescript
const metadataFields = ['full_name', 'first_name', 'last_name', 'phone', 'id_dynamics', 
  'is_active', 'is_operativo', 'is_coordinator', 'is_ejecutivo', 'coordinacion_id', 
  'role_id', 'archivado', 'must_change_password', 'inbound'];
```

---

## 📊 Cambios Realizados

| Archivo | Cambios | Tipo |
|---------|---------|------|
| `scripts/fix-user-profiles-v2-view.sql` | +1 campo (inbound) | SQL |
| `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` | +1 campo en metadataFields | TypeScript |

**Detalles:**
1. ✅ Vista actualizada con campo `inbound`
2. ✅ Lista `metadataFields` actualizada con `'inbound'`
3. ✅ Tipo `UserV2` ya incluía `inbound` (línea 30 de types.ts)

---

## 🧪 Validación Local

**Servidor corriendo:** http://localhost:5173/

### Prueba Ahora:

1. **Refresca la página** (F5)
2. **Edita a robertoraya@vidavacations.com**
3. **Verifica que aparezca:**
   - Selector de coordinación (debe aparecer para supervisores)
   - Coordinación "APEX" ya seleccionada (viene de BD)
   - Toggle "Usuario recibe mensajes inbound"
4. **Cambia la coordinación** (ej: BOOM)
5. **Activa el toggle inbound**
6. **Guarda**
7. **Refresca la página completa** (F5)
8. **Abre el editor de nuevo**

**✅ Resultado esperado:**
- Coordinación BOOM guardada y visible
- Toggle inbound activo

**Log esperado en consola:**
```javascript
Actualizando auth.users metadata con campos: {
  full_name: '...',
  coordinacion_id: '...', // ✅ PRESENTE
  inbound: true, // ✅ PRESENTE
  ...
}
```

---

## 🔧 Arquitectura Final

### Flujo de Escritura
```
Frontend (UserManagementV2)
    ↓
useUserManagement.updateUser()
    ↓
metadataFields incluye 'inbound'
    ↓
Edge Function: /functions/v1/auth-admin-proxy
    ↓
supabase.auth.admin.updateUserById()
    ↓
auth.users.raw_user_meta_data actualizado
    ↓
Vista user_profiles_v2 refleja cambios
```

### Flujo de Lectura
```
Frontend → SELECT * FROM user_profiles_v2
    ↓
Vista expone: coordinacion_id, inbound, id_dynamics, etc.
    ↓
FormData carga todos los campos
    ↓
Modal muestra valores correctos
```

---

## 📋 Verificación en BD

```sql
-- Verificar datos de Roberto Raya
SELECT id, email, full_name, coordinacion_id, inbound 
FROM public.user_profiles_v2 
WHERE email = 'robertoraya@vidavacations.com';
```

**Resultado actual:**
- `coordinacion_id`: `f33742b9-46cf-4716-bf7a-ce129a82bad2` (APEX)
- `inbound`: `false`

---

## ⚠️ NOTA IMPORTANTE

El sistema usa **UserManagementV2** (no UserManagement.tsx). Esto se controla con:

```typescript
// src/components/admin/AdminDashboardTabs.tsx (línea 24)
const USE_NEW_USER_MANAGEMENT = true;
```

---

## 🚀 Próximos Pasos

1. ✅ Vista actualizada en BD
2. ✅ Código actualizado en UserManagementV2
3. ✅ Build exitoso
4. ✅ Servidor dev corriendo con cambios
5. ⏳ **TU TURNO:** Prueba en http://localhost:5173/
6. ⏳ Commit y deploy a producción cuando valides

---

**Última actualización:** 22 de Enero 2026  
**Estado:** ✅ LISTO PARA PRUEBA LOCAL  
**Servidor:** http://localhost:5173/
