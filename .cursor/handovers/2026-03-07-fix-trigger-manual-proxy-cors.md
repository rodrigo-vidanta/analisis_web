# Fix: trigger-manual-proxy Edge Function CORS 404

**Fecha:** 2026-03-07
**Tipo:** Bug fix (infraestructura)
**Impacto:** Eliminación de llamadas programadas no funcionaba

## Problema

Al intentar eliminar una llamada programada desde el frontend, se obtenía error CORS:

```
Access to fetch at '.../functions/v1/trigger-manual-proxy' blocked by CORS policy:
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

## Diagnóstico

Los logs de Edge Functions mostraban:

```
OPTIONS | 404 | trigger-manual-proxy | function_id: null | version: null
```

La función estaba **listada como ACTIVE** (v21, última actualización 2026-01-29) pero el runtime de Supabase no la encontraba — `function_id: null` indica que el deployment estaba "muerto". Otras funciones como `send-message-proxy`, `paraphrase-proxy`, etc. respondían correctamente con `function_id` válido y OPTIONS 200.

**Causa raíz:** Edge Function se desincronizó del runtime de Supabase después de ~5 semanas sin actividad/redeploy. El código CORS era correcto (maneja OPTIONS con corsHeaders), pero la función nunca llegaba a ejecutarse.

## Solución

Re-deploy de la Edge Function via MCP `deploy_edge_function` con el mismo código existente:

- **Antes:** v21 (2026-01-29) — OPTIONS retornaba 404
- **Después:** v22 (2026-03-07) — OPTIONS retorna 200

No se modificó el código, solo se re-desplegó.

## Edge Function afectada también: error-log-proxy

`error-log-proxy` tiene el **mismo problema** (OPTIONS 404, function_id: null). Necesita re-deploy cuando sea necesario.

## Archivos involucrados

- `supabase/functions/trigger-manual-proxy/index.ts` — Edge Function (sin cambios)
- `src/services/scheduledCallsService.ts:616` — Frontend que llama a la Edge Function

## Flujo: Eliminar llamada programada

```
Frontend (deleteScheduledCall)
  → POST trigger-manual-proxy (Edge Function, action: 'DELETE')
    → POST N8N webhook /webhook/trigger-manual (workflow: ZkXIDdyfqkHCIHgW)
      → UPDATE llamadas_programadas SET estatus = 'cancelada'
```

## Nota: Timeout del webhook

El frontend tiene un AbortController con timeout de 15s (`scheduledCallsService.ts:605`). Si el workflow N8N tarda más, el frontend reporta timeout aunque la operación se complete en backend. Considerar aumentar el timeout si el problema recurre.

## Lección aprendida

Las Edge Functions de Supabase pueden volverse "muertas" (404 en runtime con function_id: null) después de periodos largos sin deploys. **Solución: re-desplegar la función sin cambiar código.** Monitorear funciones que no se actualizan frecuentemente.
