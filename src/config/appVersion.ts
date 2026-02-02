/**
 * APP VERSION - Versión de la aplicación
 * 
 * Actualizado: 2026-02-02
 * Cambios: SECURITY UPGRADE - RLS restrictivo + SECURITY INVOKER (3 fases)
 */

export const APP_VERSION = 'B10.1.44N2.5.75';

/**
 * CHANGELOG v2.5.74 (2026-02-02)
 * 
 * 🔒 SECURITY UPGRADE - RLS Restrictivo + SECURITY INVOKER:
 * 
 * FASE 1: get_conversations_ordered
 * - Migrada a SECURITY INVOKER (eliminado bypass RLS)
 * - Filtrado por auth.uid() y coordinaciones
 * 
 * FASE 2: Dashboard Functions
 * - get_dashboard_conversations → SECURITY INVOKER
 * - search_dashboard_conversations → SECURITY INVOKER
 * - Fix: llamada_activa_id VARCHAR(255)
 * 
 * FASE 3: RLS Restrictivo
 * - Función helper: user_can_see_prospecto()
 * - 10 políticas RLS restrictivas (5 tablas)
 * - Control de acceso por jerarquía de roles
 * 
 * 🔐 VULNERABILIDADES CORREGIDAS:
 * - Escalación de privilegios (CVSS 8.5) - CRÍTICA
 * - Políticas RLS permisivas (CVSS 7.8) - CRÍTICA
 * - Acceso directo no autorizado (CVSS 6.5) - ALTA
 * 
 * 📊 PERFORMANCE (Paradoja):
 * - Query individual: +20-40% más lento
 * - App completa: -48% a -67% MÁS RÁPIDO
 * - Datos: -40% a -70% MENOS transferidos
 * - Memoria: -70% MENOS consumida
 * 
 * ¿Por qué? Filtramos en BD (antes) no en Frontend (después):
 * - Menos datos transferidos (-70%)
 * - Menos procesamiento JS (-83%)
 * - Menos memoria usada (-70%)
 * - Mejor escalabilidad
 * 
 * 🎯 BENEFICIOS POR ROL:
 * - Ejecutivos (80%): -67% tiempo ✅
 * - Coordinadores (15%): -48% tiempo ✅
 * - Admins (5%): +6% tiempo 🟡
 * 
 * 📝 FILES CHANGED:
 * - scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql (307 líneas)
 * - scripts/sql/fix_dashboard_functions_v6.5.1_SECURE.sql (271 líneas)
 * - scripts/sql/fix_rls_restrictivo_v1.0.0_SECURE.sql (312 líneas)
 * - src/config/appVersion.ts (versión 2.5.74)
 * - package.json (build 2.5.74)
 * 
 * 📚 DOCUMENTACIÓN (18 documentos):
 * - CHANGELOG_v2.5.74_SECURITY.md (changelog completo)
 * - PERFORMANCE_ANALYSIS_RLS.md (análisis performance)
 * - AUDITORIA_SECURITY_DEFINER_COMPLETA.md (448 líneas)
 * - + 15 documentos técnicos de análisis y validación
 * 
 * 🔄 ROLLBACK:
 * - Disponible en CHANGELOG_v2.5.74_SECURITY.md
 * - Tiempo: < 3 minutos
 * - Sin pérdida de datos
 * 
 * ⏭️ PRÓXIMOS PASOS:
 * - Testing UI con usuarios reales (Mayra + Admin)
 * - Monitoreo de performance post-deploy
 * - FASE 4: Auditoría de 513 funciones restantes
 */

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
