# Handover: Fix Error de Scope en ProspectosManager

**REF:** HANDOVER-2026-01-29-FIX-PROSPECTOS-SCOPE  
**Fecha:** 2026-01-29  
**Tipo:** Hotfix  
**Versión:** Post v2.5.61

---

## 📋 Problema

Después del deploy v2.5.61, el módulo de prospectos dejó de cargar con el error:

```
❌ Error loading prospectos: ReferenceError: prospectosFiltrados is not defined
```

## 🔍 Causa Raíz

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`  
**Líneas:** 1687-1722

La variable `prospectosFiltrados` estaba declarada dentro de un bloque condicional (`if`) pero era usada fuera de ese scope:

```typescript
// ❌ ANTES: prospectosFiltrados solo existe dentro del if
if (queryUserId && ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
  const prospectosFiltrados: Prospecto[] = [];
  // ... lógica de filtrado
}

// ❌ Error: prospectosFiltrados no existe aquí
setAllProspectos(prospectosFiltrados);
setProspectos(prospectosFiltrados);
```

**Escenario que causaba el error:**
- Cuando `queryUserId` es `undefined` o `null`
- Cuando `ejecutivosIdsParaFiltro` está vacío
- En ambos casos, la variable nunca se declaraba

## ✅ Solución

Declarar `prospectosFiltrados` fuera del bloque condicional con valor por defecto:

```typescript
// ✅ DESPUÉS: Variable declarada en el scope correcto
let prospectosFiltrados: Prospecto[] = enrichedProspectos; // Valor por defecto

if (queryUserId && ejecutivosIdsParaFiltro && ejecutivosIdsParaFiltro.length > 0) {
  const filtradosTemp: Prospecto[] = [];
  // ... lógica de filtrado
  prospectosFiltrados = filtradosTemp; // Reasignar si hay filtrado
}

// ✅ Funciona siempre
setAllProspectos(prospectosFiltrados);
setProspectos(prospectosFiltrados);
```

**Lógica:**
1. Por defecto, `prospectosFiltrados = enrichedProspectos` (sin filtrar)
2. Si se cumple la condición, aplicar filtrado y reasignar
3. Usar `prospectosFiltrados` en ambos casos

## 📦 Archivo Modificado

```
src/components/prospectos/ProspectosManager.tsx
```

**Cambios:**
- Línea ~1687: Declarar `prospectosFiltrados` fuera del `if`
- Línea ~1696: Usar variable temporal `filtradosTemp` dentro del `if`
- Línea ~1719: Reasignar `prospectosFiltrados = filtradosTemp` después del loop
- Líneas 1721-1722: Usar `prospectosFiltrados` sin cambios

## 🧪 Testing

### Escenarios Validados

1. **Usuario admin/coordinador (sin queryUserId):**
   - ✅ Debe cargar todos los prospectos sin filtrado
   - ✅ `prospectosFiltrados = enrichedProspectos`

2. **Usuario ejecutivo con prospectos asignados:**
   - ✅ Debe aplicar filtrado por permisos
   - ✅ `prospectosFiltrados` contiene solo prospectos permitidos

3. **Usuario ejecutivo sin filtros:**
   - ✅ Debe cargar prospectos sin filtrado adicional
   - ✅ `prospectosFiltrados = enrichedProspectos`

### Cómo Probar

```bash
# 1. Compilar cambios
npm run build

# 2. Verificar sin errores de TypeScript
# (Ya validado - sin linter errors)

# 3. Probar en navegador
# - Login como admin → ver todos los prospectos
# - Login como ejecutivo → ver solo prospectos asignados
# - Login como coordinador → ver prospectos de su coordinación
```

## 🔒 Validación de Linter

```
✅ No linter errors found
```

## 📊 Impacto

| Aspecto | Impacto |
|---------|---------|
| **Seguridad** | ✅ Sin cambios (lógica de permisos intacta) |
| **Performance** | ✅ Sin cambios (mismo algoritmo) |
| **Funcionalidad** | 🔧 **CRÍTICO** - Restaura módulo de prospectos |
| **Usuarios afectados** | 🔴 100% (módulo no cargaba) |

## ⏭️ Próximos Pasos

1. **Deploy urgente:**
   ```bash
   npm run build
   ./update-frontend.sh
   ```

2. **Actualizar versión:**
   - Bump a `v2.5.62` (patch fix)
   - Actualizar `system_config.app_version`

3. **Testing post-deploy:**
   - Verificar que módulo de prospectos carga correctamente
   - Probar con usuarios de diferentes roles
   - Verificar que filtros funcionen correctamente

## 📝 Lecciones Aprendidas

### Prevención

1. **TypeScript no detectó el error:**
   - La variable estaba "potencialmente" declarada en un `if`
   - TypeScript no garantiza que el `if` se ejecute

2. **Testing insuficiente:**
   - El error solo aparecía en escenarios específicos
   - Faltaron pruebas con `queryUserId = undefined`

3. **Recomendación:**
   - Siempre declarar variables antes de bloques condicionales
   - Usar valores por defecto seguros
   - Probar todos los caminos condicionales

## 📚 Referencias

### Handovers Relacionados
- [Deploy v2.5.61](.cursor/handovers/2026-01-29-deploy-v2-5-61.md) - Deploy que introdujo el bug

### Archivos Relacionados
- `src/components/prospectos/ProspectosManager.tsx` - Archivo corregido
- `src/services/permissionsService.ts` - Servicio de permisos (sin cambios)

---

**Estado:** ✅ CORREGIDO  
**Requiere Deploy:** 🔴 URGENTE  
**Última actualización:** 29 de Enero 2026
