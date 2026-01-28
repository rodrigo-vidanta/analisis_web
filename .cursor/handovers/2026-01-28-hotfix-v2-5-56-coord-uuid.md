# Hotfix v2.5.56 - Fix Coordinación UUID vs Nombre

**Fecha:** 2026-01-28 23:59 UTC  
**Commit:** `8f42b2a`  
**Deploy:** ✅ Completado

---

## 🐛 Problema Identificado

En el paso 2 del wizard (validación de permisos), el código comparaba **UUID de coordinación** con **nombre de coordinación**:

```typescript
// ❌ INCORRECTO
const userCoordNorm = normalizeCoordinacion(user.coordinacion_id);
// user.coordinacion_id = "f33742b9-46cf-4716-bf7a-ce129a82bad2" (UUID)

const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
// lead.Coordinacion = "APEX" (nombre)

if (userCoordNorm === leadCoordNorm) { ... }
// Comparación siempre FALSE
```

**Resultado:**
- Kenia (ejecutiva APEX) no podía importar prospectos de APEX
- Mensaje de error mostraba UUID en vez de nombre: "Solo puedes importar de tu coordinación (f33742b9-46cf-4716-bf7a-ce129a82bad2)"

---

## ✅ Solución Aplicada

### 1. Cargar Mapa de Coordinaciones

```typescript
// Estado para mapa UUID -> Nombre
const [coordinacionesMap, setCoordinacionesMap] = useState<Map<string, string>>(new Map());

// useEffect para cargar al abrir modal
useEffect(() => {
  const loadCoordinaciones = async () => {
    const { data } = await analysisSupabase
      .from('coordinaciones')
      .select('id, nombre');
    
    const map = new Map<string, string>();
    data?.forEach(coord => {
      map.set(coord.id, coord.nombre);
    });
    setCoordinacionesMap(map);
  };

  if (isOpen) {
    loadCoordinaciones();
  }
}, [isOpen]);
```

### 2. Usar Nombre en Validaciones

```typescript
// ✅ CORRECTO
const userCoordName = coordinacionesMap.get(user.coordinacion_id) || user.coordinacion_id;
// userCoordName = "APEX"

const userCoordNorm = normalizeCoordinacion(userCoordName);
// userCoordNorm = "i360" (normalizado)

const leadCoordNorm = normalizeCoordinacion(lead.Coordinacion);
// leadCoordNorm = "i360" (normalizado)

if (userCoordNorm === leadCoordNorm) { ... }
// ✅ Comparación correcta
```

### 3. Mejorar Mensajes de Error

```typescript
return {
  canImport: false,
  reason: `Este prospecto es de ${lead.Coordinacion}. Solo puedes importar de tu coordinación (${userCoordName})`
};
// Ahora muestra: "Solo puedes importar de tu coordinación (APEX)"
// En vez de: "Solo puedes importar de tu coordinación (f33742b9-46cf-4716-bf7a-ce129a82bad2)"
```

---

## 📝 Archivos Modificados

### `src/components/chat/ImportWizardModal.tsx`

**Cambios:**
1. Agregado estado `coordinacionesMap: Map<string, string>`
2. Agregado `useEffect` para cargar coordinaciones al abrir modal
3. Actualizada función `validateDynamicsLeadPermissions`:
   - Buscar nombre de coordinación del usuario en `coordinacionesMap`
   - Usar nombre (no UUID) para comparación
   - Mensajes de error con nombres legibles
4. Actualizada función `validateProspectPermissions` (mismo fix)

**Líneas afectadas:** 141-145, 151-169, 439-481

---

## ✅ Validación

**Caso de prueba:**
- **Usuario:** Kenia (ejecutiva APEX, UUID: `f33742b9-46cf-4716-bf7a-ce129a82bad2`)
- **Prospecto:** NOE GARCIA RODRIGUEZ (coordinación: APEX)
- **Resultado esperado:** ✅ Debe permitir importar

**ANTES del fix:**
```
❌ Sin permisos para importar
Este prospecto es de APEX. Solo puedes importar de tu coordinación (f33742b9-46cf-4716-bf7a-ce129a82bad2)
```

**DESPUÉS del fix:**
```
✅ Tienes permisos para importar este prospecto
```

---

## 🧪 Testing Requerido

1. Kenia debe **recargar la página** (Cmd+R o F5)
2. Intentar importar prospecto de APEX (ej: NOE GARCIA RODRIGUEZ, tel: 1122334455)
3. **Resultado Esperado:**
   - ✅ Paso 2 debe mostrar "Tienes permisos para importar"
   - ✅ Botón "Importar" debe estar habilitado
   - ✅ Mensaje de error debe mostrar nombre "APEX" (no UUID) si aplica

---

## 🔗 Enlaces

- **Versión:** B10.1.43N2.5.56
- **Commit:** 8f42b2a
- **AWS CloudFront:** https://d3m6zgat40u0u1.cloudfront.net
- **Hotfix Previo:** v2.5.55 (loadUserData desde user_profiles_v2)

---

## 📊 Historial de Fixes Relacionados

| Versión | Problema | Solución |
|---|---|---|
| v2.5.53 | Fallback permisivo permitía importar sin permisos | Cambiar fallback a restrictivo |
| v2.5.54 | `is_ejecutivo` no se cargaba desde metadata | Agregar campos al User interface |
| v2.5.55 | Datos de usuario no incluían campos de BD | Cargar desde `user_profiles_v2` |
| **v2.5.56** | **UUID vs nombre en validación coordinación** | **Cargar mapa coordinaciones** |

---

**Estado:** ✅ Desplegado  
**Aprobación QA:** Pendiente (Kenia debe probar)
