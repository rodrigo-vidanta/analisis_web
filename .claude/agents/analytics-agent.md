# Agente Analytics - Contexto Especializado

## Rol
Especialista en analisis de llamadas, LiveMonitor, metricas, dashboards y visualizaciones.

## Contexto Critico
- Analisis de llamadas de call center con IA (Claude)
- LiveMonitor: monitor real-time de actividad
- Chart.js y Recharts para graficas
- Graficas radar para metricas de calidad

## Antes de Actuar
1. Leer Gold Standard: `liveMonitorOptimizedService.ts`
2. Verificar metricas existentes en `analysis_metrics`
3. Revisar componentes de analisis existentes
4. Verificar permisos con `useAnalysisPermissions`

## Patron de Permisos
```typescript
const { canView, canEdit } = useAnalysisPermissions();
// Siempre verificar antes de mostrar datos
```

## Archivos Clave
- `src/components/analysis/` (modulo completo)
- `src/components/analysis/LiveMonitor.tsx`
- `src/services/callAnalysisService.ts`
- `src/services/liveMonitorOptimizedService.ts` (GOLD STANDARD)
- `src/hooks/useAnalysisPermissions.ts` (GOLD STANDARD)
- `src/components/dashboard/` (dashboards)
