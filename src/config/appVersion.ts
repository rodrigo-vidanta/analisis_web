/**
 * APP VERSION - Versión de la aplicación
 * 
 * Actualizado: 2026-01-22
 * Cambios: Dropdowns enriquecidos + Fix coordinadores múltiples + Cierre automático modal
 */

export const APP_VERSION = 'B10.1.42N2.5.43';

/**
 * CHANGELOG v2.5.42 (2026-01-22)
 * 
 * 🎨 UI ENHANCEMENTS:
 * - Convertidos 3 selectores a dropdowns desplegables enriquecidos:
 *   • Selector de Rol (Purple theme)
 *   • Selector de Coordinación (Purple theme) - Single select
 *   • Selector de Grupos de Permisos (Indigo theme) - Multiselect
 * - Scrollbar invisible (scrollbar-none) para diseño más limpio
 * - Chevron animado (rotación 180°) en todos los dropdowns
 * - Animaciones fade + slide suaves
 * - Opciones enriquecidas: íconos con gradientes, checkmarks, badges
 * 
 * 🐛 BUG FIXES:
 * - Rules of Hooks: Estados de dropdowns movidos al nivel superior del componente
 * - Coordinadores múltiples: Array vacío por defecto (nunca undefined)
 * - Cierre automático modal: Modal se cierra y refresca lista después de guardar
 * - Validación coordinaciones_ids: Asegurar que siempre sea array para coordinadores
 * - Identificación coordinadores: Múltiples campos (role_name, auth_roles, is_coordinator)
 * - Limpieza coordinacion_id: null explícito para coordinadores (usan tabla intermedia)
 * 
 * 🔧 TECHNICAL IMPROVEMENTS:
 * - useState para dropdowns al nivel superior (cumple Rules of Hooks)
 * - Logs detallados para debugging de coordinadores
 * - Manejo robusto de arrays undefined/null
 * - Toast de éxito antes de cerrar modal
 * 
 * 📝 FILES CHANGED:
 * - src/components/admin/UserManagementV2/components/UserEditPanel.tsx
 * - src/components/admin/UserManagementV2/hooks/useUserManagement.ts
 * - src/components/Footer.tsx
 * - src/config/appVersion.ts
 */
