-- ============================================
-- SEGURIDAD: RLS PARA OTROS PROYECTOS SUPABASE
-- ============================================
-- Fecha: 16 Enero 2026
-- Propósito: Habilitar RLS en PQNC_QA y LOGMONITOR
-- Respuesta a: PENTEST-REPORT-2026-01-16

-- ============================================
-- PROYECTO: PQNC_QA (hmmfuhqgvsehkizlfzga)
-- ============================================
-- Ejecutar en: https://supabase.com/dashboard/project/hmmfuhqgvsehkizlfzga/sql/new

-- Tablas de llamadas y análisis
ALTER TABLE IF EXISTS calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_performance ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo usuarios autenticados
CREATE POLICY IF NOT EXISTS calls_authenticated ON calls
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS call_segments_authenticated ON call_segments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS call_feedback_authenticated ON call_feedback
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS call_bookmarks_authenticated ON call_bookmarks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS call_results_authenticated ON call_results
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS call_analysis_authenticated ON call_analysis
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS agent_performance_authenticated ON agent_performance
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role siempre tiene acceso completo (para multi-db-proxy)
CREATE POLICY IF NOT EXISTS calls_service ON calls
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS call_segments_service ON call_segments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- (Repetir para todas las tablas...)

-- ============================================
-- PROYECTO: LOGMONITOR (dffuwdzybhypxfzrmdcz)
-- ============================================
-- Ejecutar en: https://supabase.com/dashboard/project/dffuwdzybhypxfzrmdcz/sql/new

-- Tablas de logs
ALTER TABLE IF EXISTS error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ui_error_log_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ui_error_log_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ui_error_log_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ui_error_log_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo usuarios autenticados
CREATE POLICY IF NOT EXISTS error_log_authenticated ON error_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS ui_error_log_status_authenticated ON ui_error_log_status
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS ui_error_log_annotations_authenticated ON ui_error_log_annotations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS ui_error_log_tags_authenticated ON ui_error_log_tags
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS ui_error_log_ai_analysis_authenticated ON ui_error_log_ai_analysis
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role siempre tiene acceso completo
CREATE POLICY IF NOT EXISTS error_log_service ON error_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- (Repetir para todas las tablas...)

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Ver políticas creadas
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
