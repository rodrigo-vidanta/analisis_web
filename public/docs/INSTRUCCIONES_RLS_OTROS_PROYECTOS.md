# RLS para Otros Proyectos Supabase

**Acción Requerida:** Ejecutar scripts SQL en proyectos secundarios

## Proyectos a Actualizar

### 1. PQNC_QA (hmmfuhqgvsehkizlfzga)

**Dashboard:** https://supabase.com/dashboard/project/hmmfuhqgvsehkizlfzga/sql/new

**Script:** `SEGURIDAD_OTROS_PROYECTOS.sql` (sección PQNC_QA)

**Tablas:**
- calls, call_segments, call_feedback, call_bookmarks
- call_results, call_analysis, agent_performance

### 2. LOGMONITOR (dffuwdzybhypxfzrmdcz)

**Dashboard:** https://supabase.com/dashboard/project/dffuwdzybhypxfzrmdcz/sql/new

**Script:** `SEGURIDAD_OTROS_PROYECTOS.sql` (sección LOGMONITOR)

**Tablas:**
- error_log, ui_error_log_status, ui_error_log_annotations
- ui_error_log_tags, ui_error_log_ai_analysis

## Política Aplicada

**Regla:** Solo usuarios autenticados + service_role
```sql
-- authenticated: Usuarios con JWT válido
-- service_role: multi-db-proxy usa service_key
```

## Estado

**PQNC_AI:** ✅ Completado (hoy)
**PQNC_QA:** ⏳ Pendiente ejecución manual
**LOGMONITOR:** ⏳ Pendiente ejecución manual
