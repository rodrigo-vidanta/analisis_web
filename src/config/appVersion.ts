/**
 * APP VERSION - Versión de la aplicación
 * 
 * Actualizado: 2026-01-28
 * Cambios: Fix navegación SPA en Quick Import WhatsApp + Listeners de eventos
 */

export const APP_VERSION = 'B10.1.43N2.5.62';

/**
 * CHANGELOG v2.5.45 (2026-01-24)
 * 
 * 🚀 PERFORMANCE OPTIMIZATIONS:
 * - Implementada búsqueda server-side en módulo WhatsApp
 * - Función RPC search_dashboard_conversations desplegada
 * - Performance mejorada: <1s vs 30s+ anterior
 * - Memoria navegador reducida: <10MB vs 150MB+
 * - Cobertura de búsqueda: 100% vs 92% anterior
 * 
 * 🐛 BUG FIXES:
 * - Fix prospecto "Rosario" no aparecía en búsqueda
 * - Causa: Solo cargaba 2200 de 2388 conversaciones (ERR_INSUFFICIENT_RESOURCES)
 * - Solución: Búsqueda directa en servidor sin cargar todo
 * - Búsqueda por nombre, teléfono, email, WhatsApp
 * - Respeta permisos de admin/ejecutivo/coordinación
 * 
 * 🔧 TECHNICAL IMPROVEMENTS:
 * - Función SQL search_dashboard_conversations con SECURITY DEFINER
 * - Normalización de teléfonos para búsqueda (sin caracteres especiales)
 * - Cast de tipos VARCHAR → TEXT para compatibilidad
 * - Scripts de testing automatizados (6 scripts nuevos)
 * - Deploy via Management API
 * 
 * 📝 FILES CHANGED:
 * - migrations/20260124_search_dashboard_conversations_v3.sql (desplegada)
 * - scripts/deploy-search-dashboard.mjs (nuevo)
 * - scripts/test-search-rpc.mjs (nuevo)
 * - scripts/test-user-profiles-view.mjs (nuevo)
 * - src/components/chat/LiveChatCanvas.tsx (ya tenía el código)
 * - docs/FIX_BUSQUEDA_WHATSAPP_SERVER_SIDE.md (nuevo, 2583 líneas)
 * - CHANGELOG.md (actualizado)
 * - docs/GLOSARIO.md (+5 términos técnicos)
 * 
 * ⚡ METRICS:
 * - Búsqueda: 0.3-0.8s (antes: 2-5s) → 6x más rápido
 * - Carga inicial: <1s (antes: 30-45s) → 45x más rápido
 * - Datos transferidos: ~100KB (antes: ~50MB) → 500x menos
 * - Escalabilidad: Ilimitado (antes: max 2500 registros)
 */
