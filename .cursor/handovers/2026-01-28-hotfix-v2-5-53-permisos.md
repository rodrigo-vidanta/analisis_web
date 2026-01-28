# Handover: HOTFIX v2.5.53 - Validación Estricta Permisos

**REF:** HANDOVER-2026-01-28-HOTFIX-v2.5.53  
**Fecha:** 2026-01-28  
**Tipo:** 🚨 HOTFIX CRÍTICO (Seguridad)  
**Commit:** db14802  
**Versión:** B10.1.43N2.5.53  
**Tiempo Deploy:** ~28s

---

## 🚨 CRITICIDAD: ALTA

**Vulnerabilidad:** Ejecutivos podían importar prospectos de **cualquier coordinación** debido a un fallback permisivo en la validación de permisos.

**Impacto:** 
- ✅ **Severidad:** Alta - Violación de políticas de acceso por coordinación
- ✅ **Alcance:** Wizard de Importación WhatsApp (v2.5.51+)
- ✅ **Usuarios Afectados:** Todos los ejecutivos
- ✅ **Datos:** Prospectos de otras coordinaciones accesibles

---

## 🐛 Bug Identificado

### Caso Real Reportado

**Usuario:** Kenia Magalli (keniamartineza@vidavacations.com)  
**Rol:** Ejecutivo  
**Su Coordinación:** ??? (no Telemarketing)  

**Prospecto:** Darig Samuel Rosales Robledo  
**Coordinación:** Telemarketing  
**Propietario Dynamics:** Vanessa Valentina Perez Moreno  

**Resultado:** ❌ **Sistema permitió importar** (INCORRECTO)

### Código Vulnerable

**Archivo:** `src/components/chat/ImportWizardModal.tsx`  
**Función:** `validateDynamicsLeadPermissions()`  
**Línea:** 454 (versión anterior)

```typescript
// ❌ CÓDIGO VULNERABLE (v2.5.51 - v2.5.52)
const validateDynamicsLeadPermissions = (lead: DynamicsLeadInfo) => {
  // Admin, Coordinador de Calidad y Operativo: pueden importar cualquier coordinación
  if (isAdmin || isCoordinadorCalidad || isOperativo) {
    return { canImport: true, reason: null };
  }

  // Coordinador: verificar coordinación
  if (user?.is_coordinador && user?.coordinacion_id && lead.Coordinacion) {
    const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
    const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
    
    if (userCoordNorm === leadCoordNorm) {
      return { canImport: true, reason: null };
    }
    
    return {
      canImport: false,
      reason: `Este prospecto pertenece a ${lead.Coordinacion}, no a tu coordinación (${user.coordinacion_id})`,
    };
  }

  // Ejecutivo: verificar coordinación
  if (user?.is_ejecutivo && user?.coordinacion_id && lead.Coordinacion) {
    const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
    const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
    
    if (userCoordNorm === leadCoordNorm) {
      return { canImport: true, reason: null };
    }
    
    return {
      canImport: false,
      reason: `Este prospecto es de ${lead.Coordinacion}. Solo puedes importar de ${user.coordinacion_id}`,
    };
  }

  // 🚨 VULNERABILIDAD: Fallback permisivo
  return { canImport: true, reason: null }; // ⚠️ PERMITE TODO POR DEFECTO
};
```

### Escenarios Vulnerables

1. **Ejecutivo sin flag `is_ejecutivo` correctamente seteado:**
   - No entra en el bloque `if (user?.is_ejecutivo)`
   - Cae al fallback → **Permite importar cualquier coordinación** ❌

2. **Ejecutivo sin `coordinacion_id` asignado:**
   - No cumple condición `user?.coordinacion_id`
   - Cae al fallback → **Permite importar cualquier coordinación** ❌

3. **Lead sin `Coordinacion` en Dynamics:**
   - No cumple condición `lead.Coordinacion`
   - Cae al fallback → **Permite importar sin validación** ❌

4. **Usuario con rol no reconocido:**
   - No es admin/coordinador/ejecutivo
   - Cae al fallback → **Permite importar** ❌

---

## ✅ Corrección Aplicada

### Código Corregido

```typescript
// ✅ CÓDIGO SEGURO (v2.5.53+)
const validateDynamicsLeadPermissions = (lead: DynamicsLeadInfo) => {
  // Admin, Coordinador de Calidad y Operativo: pueden importar cualquier coordinación
  if (isAdmin || isCoordinadorCalidad || isOperativo) {
    return { canImport: true, reason: null };
  }

  // Coordinador: verificar coordinación
  if (user?.is_coordinador) {
    if (!user.coordinacion_id) {
      return {
        canImport: false,
        reason: 'No tienes coordinación asignada. Contacta al administrador.',
      };
    }

    if (!lead.Coordinacion) {
      return {
        canImport: false,
        reason: 'Este prospecto no tiene coordinación asignada en Dynamics',
      };
    }

    const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
    const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
    
    if (userCoordNorm === leadCoordNorm) {
      return { canImport: true, reason: null };
    }
    
    return {
      canImport: false,
      reason: `Este prospecto pertenece a ${lead.Coordinacion}, no a tu coordinación (${user.coordinacion_id})`,
    };
  }

  // Ejecutivo: verificar coordinación (VALIDACIÓN ESTRICTA)
  if (user?.is_ejecutivo) {
    // ✅ Validar que tenga coordinación asignada
    if (!user.coordinacion_id) {
      return {
        canImport: false,
        reason: 'No tienes coordinación asignada. Contacta al administrador.',
      };
    }

    // ✅ Validar que el lead tenga coordinación
    if (!lead.Coordinacion) {
      return {
        canImport: false,
        reason: 'Este prospecto no tiene coordinación asignada en Dynamics',
      };
    }

    const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
    const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
    
    // ✅ Solo permitir si coordinaciones coinciden
    if (userCoordNorm === leadCoordNorm) {
      return { canImport: true, reason: null };
    }
    
    return {
      canImport: false,
      reason: `Este prospecto es de ${lead.Coordinacion}. Solo puedes importar de tu coordinación (${user.coordinacion_id})`,
    };
  }

  // ✅ FALLBACK SEGURO: Si no tiene rol reconocido, BLOQUEAR
  return {
    canImport: false,
    reason: 'No tienes permisos para importar prospectos. Contacta al administrador.',
  };
};
```

### Cambios Clave

| Antes | Ahora |
|-------|-------|
| Fallback permisivo: `return { canImport: true }` | Fallback restrictivo: `return { canImport: false }` |
| No validaba `user.coordinacion_id` | Valida explícitamente si existe |
| No validaba `lead.Coordinacion` | Valida explícitamente si existe |
| Mensaje genérico | Mensajes específicos por escenario |

---

## 🧪 Testing

### Casos de Prueba

#### ✅ **Caso 1: Ejecutivo con coordinación correcta**
- Usuario: Ejecutivo de "APEX"
- Prospecto: Coordinación "APEX"
- **Resultado Esperado:** ✅ Permite importar
- **Status:** ✅ PASS

#### ✅ **Caso 2: Ejecutivo intenta importar de otra coordinación**
- Usuario: Ejecutivo de "MVP"
- Prospecto: Coordinación "Telemarketing"
- **Resultado Esperado:** ❌ Bloquea con mensaje claro
- **Status:** ✅ PASS

#### ✅ **Caso 3: Ejecutivo sin coordinación asignada**
- Usuario: `is_ejecutivo: true`, `coordinacion_id: null`
- Prospecto: Cualquiera
- **Resultado Esperado:** ❌ Bloquea: "No tienes coordinación asignada"
- **Status:** ✅ PASS

#### ✅ **Caso 4: Lead sin coordinación en Dynamics**
- Usuario: Ejecutivo con coordinación
- Prospecto: `Coordinacion: null`
- **Resultado Esperado:** ❌ Bloquea: "Este prospecto no tiene coordinación asignada"
- **Status:** ✅ PASS

#### ✅ **Caso 5: Usuario sin rol reconocido**
- Usuario: NO es admin/coordinador/ejecutivo
- Prospecto: Cualquiera
- **Resultado Esperado:** ❌ Bloquea: "No tienes permisos para importar"
- **Status:** ✅ PASS

#### ✅ **Caso 6: Equivalencias de coordinación**
- Usuario: Ejecutivo de "COBACA"
- Prospecto: Coordinación "COB ACAPULCO"
- **Resultado Esperado:** ✅ Permite importar (equivalencia)
- **Status:** ✅ PASS

---

## 📊 Impacto del Fix

### Usuarios Afectados
- **Total ejecutivos:** ~50 usuarios
- **Potencialmente afectados:** Todos los que intentaron importar de otra coordinación
- **Acción requerida:** Ninguna - Fix automático al recargar

### Datos Comprometidos
- **Prospectos importados incorrectamente:** Pendiente auditoría
- **Recomendación:** Revisar importaciones de últimas 24h (desde v2.5.51)

```sql
-- Query para auditar importaciones sospechosas
SELECT 
  p.id,
  p.nombre_completo,
  p.coordinacion_id as prospecto_coord,
  p.ejecutivo_id,
  u.coordinacion_id as ejecutivo_coord,
  p.created_at
FROM prospectos p
JOIN auth_users u ON p.ejecutivo_id = u.id
WHERE 
  p.created_at >= '2026-01-28 19:00:00' -- Desde v2.5.51
  AND p.coordinacion_id != u.coordinacion_id
  AND u.is_ejecutivo = true
  AND u.is_admin = false
ORDER BY p.created_at DESC;
```

---

## 🚀 Deploy Realizado

### Git
- **Commit:** db14802
- **Mensaje:** `v2.5.53: HOTFIX: Validación estricta de permisos en wizard importación`
- **Archivos Modificados:** 4 archivos, 27 inserciones, 15 eliminaciones

### AWS
- **Build:** 17.74s
- **Upload:** ~3s
- **Invalidación:** ~4s
- **Total:** 25s
- **Bundle:** 9.28 MB (gzip: 2.56 MB)

### Base de Datos
- **Versión:** B10.1.43N2.5.53
- **Force Update:** true
- **Updated:** 2026-01-28T23:23:41+00:00

---

## ⏭️ Acciones Requeridas

### Inmediatas (Usuario Final)
1. ⏱️ Esperar 5-10 min (CloudFront)
2. 🔄 Limpiar cache (Cmd+Shift+R)
3. ✅ Verificar versión: `B10.1.43N2.5.53`
4. 🧪 Probar wizard con distintos escenarios

### Post-Deploy (Administración)
1. 📊 **Auditar importaciones sospechosas** (usar query SQL arriba)
2. 🔍 **Verificar flags de usuarios:**
   - Todos los ejecutivos tienen `is_ejecutivo: true`
   - Todos tienen `coordinacion_id` válido
3. 📧 **Notificar a usuarios** si se encuentran importaciones incorrectas
4. 📝 **Documentar lecciones aprendidas**

---

## 🎓 Lecciones Aprendidas

### 1. Fallbacks Seguros
**Regla:** Los fallbacks en validaciones de seguridad SIEMPRE deben ser **restrictivos por defecto**.

```typescript
// ❌ MAL: Permisivo por defecto
return { canImport: true };

// ✅ BIEN: Restrictivo por defecto
return { 
  canImport: false, 
  reason: 'No tienes permisos suficientes' 
};
```

### 2. Validaciones Explícitas
**Regla:** No asumir que los datos existen. Validar explícitamente cada condición.

```typescript
// ❌ MAL: Asume que existen
if (user?.is_ejecutivo && user?.coordinacion_id && lead.Coordinacion) { ... }
// Si NO cumple, cae al fallback

// ✅ BIEN: Valida cada condición por separado
if (user?.is_ejecutivo) {
  if (!user.coordinacion_id) return { error: 'Sin coordinación' };
  if (!lead.Coordinacion) return { error: 'Lead sin coordinación' };
  // ... resto de validación
}
```

### 3. Testing de Casos Edge
**Regla:** Probar SIEMPRE los casos donde los datos faltan o no son los esperados.

**Casos críticos:**
- Usuario sin rol
- Usuario sin coordinación
- Lead sin coordinación
- Flags booleanos en `null` o `undefined`

### 4. Mensajes de Error Claros
**Regla:** Los mensajes de error deben ser específicos y accionables.

```typescript
// ❌ MAL: Genérico
reason: 'No puedes importar'

// ✅ BIEN: Específico y accionable
reason: 'No tienes coordinación asignada. Contacta al administrador.'
```

---

## 📚 Referencias

- **Bug Report:** Usuario Kenia Magalli (2026-01-28 23:00)
- **Deploy Anterior:** [v2.5.51](2026-01-28-deploy-v2-5-51.md)
- **Código Vulnerable:** ImportWizardModal.tsx línea 454 (v2.5.52)
- **Security Rules:** `.cursor/rules/security-rules.mdc`

---

**Deploy Status:** ✅ COMPLETADO  
**Severidad Bug:** 🚨 ALTA  
**Tiempo de Resolución:** ~15 minutos (reporte → fix → deploy)  
**Impacto Mitigado:** ✅ Inmediato tras recargar app
