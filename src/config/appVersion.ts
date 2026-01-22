/**
 * Versión actual de la aplicación
 * 
 * Esta es la versión que se muestra en el Footer y se usa para comparación
 * en el sistema de control de versiones forzado.
 * 
 * Formato: "BX.X.XNX.X.X" (ej: "B10.1.39N2.5.39")
 * - Primera parte (antes de "N"): Versión del backend/build
 * - Segunda parte (después de "N"): Versión del frontend/package.json
 * 
 * IMPORTANTE: Esta versión debe coincidir con:
 * - Footer.tsx (hardcoded)
 * - system_config.app_version en BD (actualizada automáticamente en deploy)
 */
export const APP_VERSION = 'B10.1.39N2.5.39';

/**
 * Versión del package.json (solo para referencia)
 * Se obtiene de package.json via vite.config.ts (VITE_APP_VERSION)
 */
export const PACKAGE_VERSION = import.meta.env.VITE_APP_VERSION || '2.5.39';
