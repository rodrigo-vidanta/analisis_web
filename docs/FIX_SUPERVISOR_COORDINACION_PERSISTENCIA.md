# Fix: Persistencia de Coordinación para Supervisores

**Fecha:** 22 de Enero 2026  
**Tipo:** Bugfix  
**Severidad:** Media  
**Afecta a:** Rol Supervisor

---

## 🐛 Problema Reportado

El usuario **robertoraya@vidavacations.com** (rol: supervisor) no podía guardar su coordinación "APEX":
- Al editar el usuario en Admin > Usuarios
- Seleccionar coordinación "APEX"
- Guardar cambios
- Al volver a abrir el modal de edición, la coordinación no estaba guardada

---

## 🔍 Análisis del Problema

### Código Afectado
`src/components/admin/UserManagement.tsx`

### Causa Raíz

La lógica de actualización de usuarios tenía 3 casos condicionales:

1. **Coordinador** (línea 1248) → ✅ Funciona
2. **Ejecutivo** (línea 1300) → ✅ Funciona  
3. **Otros roles** (línea 1340) → ⚠️ Limpia coordinación

**El rol "supervisor" NO entraba en ninguno de estos casos**, cayendo en "otros roles" que limpiaba la `coordinacion_id`.

### Flujo Incorrecto

```typescript
// ANTES (línea 1300)
} else if (selectedRole?.name === 'ejecutivo' && formData.coordinacion_id) {
  // Actualizar coordinacion_id SOLO para ejecutivos
} else if (selectedRole && selectedRole.name !== 'coordinador' && selectedRole.name !== 'ejecutivo') {
  // Supervisores caían aquí y se limpiaba su coordinacion_id
  coordinacion_id: null
}
```

---

## ✅ Solución Implementada

### 1. Actualizar Lógica de Edición

```typescript
// DESPUÉS (línea 1286)
} else if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && formData.coordinacion_id) {
  // Ahora supervisores Y ejecutivos actualizan coordinacion_id
  await authAdminProxyService.updateUserMetadata(selectedUser.id, {
    coordinacion_id: formData.coordinacion_id,
    is_coordinator: false,
    is_ejecutivo: selectedRole?.name === 'ejecutivo',
  });
} else if (selectedRole && selectedRole.name !== 'coordinador' && selectedRole.name !== 'ejecutivo' && selectedRole.name !== 'supervisor') {
  // Ahora supervisores NO caen aquí
}
```

### 2. Mostrar Selector en Modal de Edición

```typescript
// ANTES (línea 3352)
{permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'ejecutivo' && (
  <select>...</select>
)}

// DESPUÉS
{(permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'ejecutivo' || 
  permissionGroups.find(g => g.id === selectedGroupId)?.base_role === 'supervisor') && (
  <select>...</select>
)}
```

### 3. Mostrar Selector en Modal de Creación

```typescript
// Mismo cambio aplicado en el modal de creación (línea 2725)
```

### 4. Actualizar Lógica de Creación

```typescript
// ANTES (línea 909)
if (selectedRole?.name === 'ejecutivo' && formData.coordinacion_id) {

// DESPUÉS
if ((selectedRole?.name === 'ejecutivo' || selectedRole?.name === 'supervisor') && formData.coordinacion_id) {
```

### 5. Refactorización Adicional

Aproveché para reemplazar 3 llamadas `fetch` directas a Edge Function por `authAdminProxyService`:

- Línea 1251: Actualizar flags de coordinador
- Línea 1300: Actualizar coordinacion_id de ejecutivo/supervisor
- Línea 1353: Limpiar coordinacion_id de otros roles

---

## 🧪 Escenarios de Prueba

### Caso 1: Supervisor Edita su Coordinación ✅
1. Login como admin
2. Admin > Usuarios
3. Editar `robertoraya@vidavacations.com` (supervisor)
4. Seleccionar coordinación "APEX"
5. Guardar
6. **Resultado esperado:** Al reabrir, coordinación persiste

### Caso 2: Crear Nuevo Supervisor con Coordinación ✅
1. Crear usuario con rol "supervisor"
2. Seleccionar coordinación "APEX"
3. Guardar
4. **Resultado esperado:** Usuario creado con coordinación

### Caso 3: Cambiar Rol de Supervisor a Otro ✅
1. Editar supervisor con coordinación
2. Cambiar rol a "evaluador"
3. **Resultado esperado:** coordinacion_id se limpia (correcto)

---

## 📊 Cambios Realizados

| Archivo | Líneas Modificadas | Tipo de Cambio |
|---------|-------------------|----------------|
| `UserManagement.tsx` | 4 secciones | Lógica + UI |

**Cambios específicos:**
- ✅ Lógica de actualización (línea 1286)
- ✅ Lógica de creación (línea 909)
- ✅ Modal de edición - selector (línea 3352)
- ✅ Modal de creación - selector (línea 2725)
- ✅ Refactor 3 fetch a authAdminProxyService

---

## 🔐 Validaciones de Seguridad

- ✅ Se mantiene el uso de `authAdminProxyService`
- ✅ Se mantiene la validación de permisos en Edge Function
- ✅ Solo usuarios con permisos admin pueden modificar coordinaciones
- ✅ La `coordinacion_id` se guarda en `auth.users.raw_user_meta_data`
- ✅ La vista `user_profiles_v2` refleja los cambios automáticamente

---

## 📋 Datos del Usuario Afectado

| Campo | Valor |
|-------|-------|
| Email | robertoraya@vidavacations.com |
| Rol | supervisor |
| Coordinación | APEX |
| Skill | PQNC_AI_10 |
| DID | +16232536877 |

---

## 🚀 Deploy

```bash
# Build exitoso
npm run build
# ✓ built in 19.28s

# Commit
git add src/components/admin/UserManagement.tsx
git commit -m "fix: Permitir persistencia de coordinación para rol supervisor"
git push origin main
```

---

## 📚 Documentación Relacionada

- [Arquitectura BD Unificada](.cursor/rules/arquitectura-bd-unificada.mdc)
- [Refactor authAdminProxyService](REFACTOR_AUTH_ADMIN_PROXY_SERVICE.md)
- [Reglas de Seguridad](.cursor/rules/security-rules.mdc)

---

**Última actualización:** 22 de Enero 2026  
**Estado:** ✅ RESUELTO - Listo para deploy
