/**
 * ============================================
 * CONFIGURACIÓN SUPABASE - CLIENTE UNIFICADO
 * ============================================
 *
 * ⚠️ FIX CRÍTICO (5 Febrero 2026):
 * - ANTES: Dos clientes independientes (supabaseSystemUI + analysisSupabase) 
 *   ambos con autoRefreshToken:true al mismo proyecto PQNC_AI
 * - PROBLEMA: Race condition por refresh token rotation (tokens de un solo uso).
 *   Cuando un cliente refrescaba, invalidaba el refresh token del otro,
 *   causando pérdida silenciosa de sesión.
 * - SOLUCIÓN: Un solo cliente. analysisSupabase re-exporta supabaseSystemUI.
 *   Elimina toda posibilidad de race condition.
 *
 * ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
 *
 * 1. Para cualquier duda consultar el archivo README: src/components/analysis/README_LIVEMONITOR.md
 *    para información técnica completa del módulo y sus funciones
 *
 * 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
 *    src/components/analysis/README_LIVEMONITOR.md
 *
 * 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/analysis/CHANGELOG_LIVEMONITOR.md
 *    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
 * 
 * 🔒 SEGURIDAD (Actualizado 2026-02-05):
 * - Las keys DEBEN estar en variables de entorno (.env)
 * - NO usar fallbacks hardcodeados
 * - Cliente único elimina race conditions de refresh tokens
 * 
 * ✅ CONFIGURACIÓN REQUERIDA EN .env:
 * VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
 * VITE_ANALYSIS_SUPABASE_ANON_KEY=<tu_anon_key>
 */

import { supabaseSystemUI } from './supabaseSystemUI';

// ============================================
// CLIENTE UNIFICADO - Misma instancia que supabaseSystemUI
// ============================================
// Ambos clientes apuntan a PQNC_AI (glsmifhkoaifvaegsozd) desde la migración 2025-01-13.
// Usar una sola instancia elimina el race condition de refresh tokens
// que causaba pérdida silenciosa de sesión en producción.
//
// ⚠️ NO crear un segundo createClient() aquí. 
// Si necesitas un cliente independiente, usa autoRefreshToken: false.
export const analysisSupabase = supabaseSystemUI;

export default analysisSupabase;
