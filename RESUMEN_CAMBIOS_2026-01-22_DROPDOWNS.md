# Resumen de Cambios - 2026-01-22

**Versión:** v2.5.42  
**Tipo:** UI Enhancement + Bug Fixes Críticos

---

## 🎨 UI: Dropdowns Enriquecidos

### Implementados 3 Dropdowns Desplegables

1. **Selector de Rol** (Purple theme)
   - Dropdown con Shield icon
   - Muestra rol seleccionado
   - Chevron animado

2. **Selector de Coordinación** (Purple theme)
   - Single select para ejecutivos/supervisores
   - Muestra código + nombre
   - Scrollbar invisible

3. **Selector de Grupos de Permisos** (Indigo theme)
   - Multiselect con checkboxes
   - Muestra conteo: "X grupos seleccionados"
   - Badges "Recomendado" y "Sistema"

**Beneficio:** Ahorra espacio vertical significativo en UI.

---

## 🐛 Bug Fixes Críticos

### 1. Rules of Hooks Violation
- **Problema:** `useState` dentro de funciones anónimas
- **Solución:** Estados movidos al nivel superior del componente
- **Error eliminado:** "Rendered more hooks than during the previous render"

### 2. Coordinadores con undefined
- **Problema:** `coordinaciones_ids` podía ser `undefined`
- **Solución:** Array vacío por defecto (`|| []`)
- **Impacto:** Previene crashes en `.map()`

### 3. Identificación de Coordinadores
- **Problema:** Solo se usaba `auth_roles.name`
- **Solución:** 3 campos de verificación:
  - `auth_roles.name === 'coordinador'`
  - `role_name === 'coordinador'`
  - `is_coordinator === true`

### 4. Limpieza coordinacion_id
- **Problema:** Coordinadores mantenían `coordinacion_id` en metadatos
- **Solución:** `null` explícito para limpiar (usan tabla intermedia)

### 5. Modal no se Cerraba
- **Problema:** Modal quedaba abierto después de guardar
- **Solución:** Toast + Refresh + Close automático

---

## 📁 Archivos Modificados

1. **UserEditPanel.tsx**
   - Estados de dropdowns al nivel superior
   - 3 selectores → dropdowns enriquecidos
   - Cierre automático + toast
   - Scrollbar invisible

2. **useUserManagement.ts**
   - Identificación robusta coordinadores
   - Arrays con defaults
   - Logs detallados
   - Limpieza `coordinacion_id` con `null`

3. **Footer.tsx**
   - Versión desde `appVersion.ts`

4. **appVersion.ts**
   - `B10.1.42N2.5.42`
   - Changelog completo

---

## 🧪 Testing Requerido

- [ ] Dropdowns abren/cierran correctamente
- [ ] Chevron anima 180°
- [ ] Coordinadores con 0 coordinaciones (array vacío)
- [ ] Modal se cierra automáticamente después de guardar
- [ ] Lista de usuarios se refresca

---

## 🚀 Deploy

```bash
npm run build && ./update-frontend.sh
```

---

**Status:** ✅ Documentado y listo para deploy  
**Version:** B10.1.42N2.5.42
