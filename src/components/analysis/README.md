# 🧠 Módulo de Análisis

## Descripción
Sistema de análisis de llamadas con IA que incluye dos módulos: Análisis IA y PQNC Humans.

## Componentes
- **AnalysisIAComplete.tsx**: Análisis IA rediseñado con diseño PQNC Humans
- **AnalysisDashboard.tsx**: Dashboard principal de análisis
- **PQNCDashboard.tsx**: Análisis avanzado PQNC Humans
- **DetailedCallView.tsx**: Vista detallada de llamadas PQNC
- **LiveMonitor.tsx**: Monitor en tiempo real de llamadas
- **LiveMonitorKanban.tsx**: Vista Kanban de llamadas activas

## Bases de Datos

### Análisis IA
- **Supabase**: `analysisSupabase` (glsmifhkoaifvaegsozd.supabase.co)
- **Tabla principal**: `call_analysis_summary`
- **Tabla complementaria**: `llamadas_ventas`
- **Tabla prospectos**: `prospectos`

### PQNC Humans
- **Supabase**: `pqncSupabaseAdmin` (hmmfuhqgvsehkizlfzga.supabase.co)
- **Tabla principal**: `calls`
- **Tabla transcripción**: `call_segments`

## Funcionalidades

### Análisis IA
- Tabla con métricas de análisis IA
- Filtros avanzados y búsqueda por Call ID
- Modal detallado con gráfica radar
- Transcripción como chat
- Audio player integrado
- Sidebar de prospecto clickeable
- Navegación desde módulo Prospectos

### PQNC Humans
- Análisis complejo de llamadas
- Sistema de feedback y bookmarks
- Métricas ponderadas
- Vista detallada completa
- Filtros avanzados múltiples

## Dependencias
- **Chart.js**: Gráficas radar y métricas
- **Framer Motion**: Animaciones
- **analysisSupabase**: Datos de análisis IA
- **pqncSupabaseAdmin**: Datos PQNC Humans
- **feedbackService**: Sistema de retroalimentación
- **bookmarkService**: Sistema de marcadores

## Permisos
- **Análisis IA**: Admin y evaluadores con permiso natalia
- **PQNC Humans**: Admin y evaluadores con permiso pqnc
- **Live Monitor**: Admin, evaluators, developers

## Navegación
- **Desde Prospectos**: Click en llamada del historial
- **Sidebar**: "Análisis IA" y "PQNC Humans"
- **Auto-search**: Captura call_id desde localStorage
