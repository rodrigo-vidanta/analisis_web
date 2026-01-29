# Hotfix v2.5.65 - Fix Permisos Supervisor

**Fecha:** 2026-01-29 18:52 UTC  
**Commit:** `ac0e80b`  
**Deploy:** ✅ Completado

---

## 🐛 Problema Identificado

**Usuario afectado:** Roberto Raya (robertoraya@vidavacations.com)
- Rol: `supervisor`
- Coordinación: APEX (`f33742b9-46cf-4716-bf7a-ce129a82bad2`)
- **No podía importar prospectos de APEX**

**Lead rechazado:**
- Nombre: LIZETH ARITEZ BALDENEGRO
- Coordinación: APEX
- Teléfono: (624) 358-2221

### Causa Raíz

La lógica de permisos **NO contemplaba el rol `supervisor`**:

```typescript
// ❌ SOLO verificaba coordinador y ejecutivo
const isCoordinador = user?.is_coordinador || user?.role_name === 'coordinador';
// Supervisores no pasaban esta validación
```

**Datos de Roberto en BD:**
```json
{
  "role_name": "supervisor",
  "is_coordinator": false,
  "is_ejecutivo": false,
  "coordinacion_id": "f33742b9-46cf-4716-bf7a-ce129a82bad2" // APEX
}
```

---

## ✅ Solución Aplicada

### 1. Agregar Supervisor a Validación

**Ambas funciones de validación actualizadas:**

```typescript
// ✅ CORRECTO - Incluye supervisor
const isCoordinador = user?.is_coordinador || 
                      user?.role_name === 'coordinador' || 
                      user?.role_name === 'supervisor';
```

### 2. Archivos Modificados

**`src/components/chat/ImportWizardModal.tsx`**

**Cambios en `validateProspectPermissions` (línea 412):**
- Agregado `|| user?.role_name === 'supervisor'`

**Cambios en `validateDynamicsLeadPermissions` (línea 461):**
- Agregado `|| user?.role_name === 'supervisor'`

---

## 📋 Jerarquía de Permisos Actualizada

| Rol | Puede Importar | Restricción |
|---|---|---|
| **Admin** | ✅ Cualquier coordinación | Ninguna |
| **Administrador Operativo** | ✅ Cualquier coordinación | Ninguna |
| **Coordinador Calidad** | ✅ Cualquier coordinación | Ninguna |
| **Coordinador** | ✅ Solo su coordinación | Match de coord |
| **Supervisor** | ✅ Solo su coordinación | Match de coord |
| **Ejecutivo** | ✅ Solo su coordinación | Match de coord |

### Equivalencias de Coordinación

El sistema normaliza estas variantes:
- `COB ACAPULCO` = `COB Aca` = `COBACA`
- `APEX` = `i360`
- `MVP` = `mvp`
- `VEN` = `VENTAS`
- `BOOM` = `boom`

---

## ✅ Validación

**Caso de prueba:**
- **Usuario:** Roberto Raya (supervisor APEX)
- **Lead:** LIZETH ARITEZ BALDENEGRO (APEX)
- **Resultado esperado:** ✅ Debe permitir importar

**ANTES del fix:**
```
❌ Sin permisos para importar
No tienes permisos para importar prospectos. Contacta al administrador.
```

**DESPUÉS del fix:**
```
✅ Tienes permisos para importar este prospecto
```

---

## 🧪 Testing Requerido

1. Roberto debe **recargar la página** (Cmd+R o F5)
2. Intentar importar lead APEX (ej: 6243582221)
3. **Resultado Esperado:**
   - ✅ Paso 2 debe mostrar "Tienes permisos para importar"
   - ✅ Botón "Importar" debe estar habilitado

---

## 📦 Deploy

- **Versión:** B10.1.43N2.5.65
- **Commit:** ac0e80b
- **AWS:** ✅ 123s
- **BD:** ✅ Actualizada

---

## 🔗 Fixes Relacionados

| Versión | Problema | Solución |
|---|---|---|
| v2.5.53 | Fallback permisivo | Cambiar a restrictivo |
| v2.5.54 | `is_ejecutivo` no cargaba | Agregar campos User interface |
| v2.5.55 | Datos no desde BD | Cargar user_profiles_v2 |
| v2.5.56 | UUID vs nombre | Mapa coordinaciones |
| v2.5.57 | Variantes coordinación | Regex normalización |
| **v2.5.65** | **Rol supervisor faltante** | **Agregar supervisor a validación** |

---

**Estado:** ✅ Desplegado  
**Aprobación QA:** Pendiente (Roberto debe probar)
