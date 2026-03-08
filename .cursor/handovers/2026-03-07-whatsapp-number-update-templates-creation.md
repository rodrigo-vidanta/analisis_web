# Handover: Creacion de Plantillas WhatsApp - Actualizacion de Numero

**Fecha:** 7 Marzo 2026
**Tipo:** Feature
**Estado:** Completado

## Contexto

Se necesitaban plantillas WhatsApp UTILITY para notificar a prospectos sobre el cambio de numero de WhatsApp de Vidanta. Las plantillas debian ser psicologicamente optimizadas para maximizar reply rate, sin variables, cumpliendo con los estandares de salud de Meta.

## Estrategias Psicologicas Aplicadas

Se diseñaron 7 variantes finales, cada una con un trigger psicologico distinto:

| Plantilla | Estrategia | Trigger |
|-----------|-----------|---------|
| `act_numero_pregunta_idioma` | Pregunta obvia irresistible | "¿prefiere español?" - reply rate alto por obvedad |
| `act_numero_eleccion_canal` | Eleccion falsa | WhatsApp o llamada (ambas = si) |
| `act_numero_validacion_contacto` | Validacion de identidad | "¿este numero sigue siendo su contacto principal?" |
| `act_numero_fecha_vacaciones` | Zeigarnik + dopamina aspiracional | "¿ya tiene fecha para sus proximas vacaciones?" |
| `act_numero_saludo_cortesia` | Cortesia cultural mexicana | "¿Como ha estado?" - imposible no responder |
| `act_numero_preferencia_contacto` | Completar patron | "¿prefiere escribirnos o que le contactemos?" |
| `act_numero_confirmacion_recibido` | Friccion cero absoluto | "¿Recibio bien este mensaje?" |

### Principios de diseño:
- **Sin variables** - texto fijo, UTILITY category
- **Meta health optimized** - sin lenguaje de ventas directo
- **Pregunta al final** - cada plantilla termina con una pregunta que activa respuesta
- **Variantes descartadas:** ventas frias (V4), tono agresivo (V5), "todo bien?" generico (V8), facilmente ignorables (V9)

## Implementacion Tecnica

### Pipeline de creacion
1. Script `scripts/create-number-update-templates.cjs` → N8N webhook directo
2. Webhook: `https://primary-dev-d75a.up.railway.app/webhook/whatsapp-templates`
3. Auth: `WHATSAPP_TEMPLATES_AUTH` token en header `Auth`
4. Grupo existente: "Actualizacion de Numero" (`6e84976c-c70b-4917-bea9-3f1bcf5d29cb`)

### Tags asignados
- `cambio_numero` (renombrado de `actualizacion_numero` por limite 18 chars)
- `utility`
- `cambio_whatsapp`

### Fix N8N Workflow
- Workflow `wO1v8JecWHtXVdzg` (`[twilio] Templates Envio WhatsApp-v2`)
- **Bug encontrado:** plantillas nuevas (health_status = `no_data`) tenian weight 0.3 vs 0.5 de `warning`
- **Fix:** `no_data` weight cambiado a 1.0, `ELSE` a 0.5
- Nodo afectado: "Get Group Candidates" (SQL de seleccion ponderada)

### Modos de envio
- **GROUP mode**: Seleccion ponderada aleatoria del grupo (round robin por salud)
- **DIRECT mode**: Envio de plantilla especifica via `template_name` param

## Archivos

| Archivo | Cambio |
|---------|--------|
| `scripts/create-number-update-templates.cjs` | Creado - script de creacion masiva |

## Notas

- Las 7 plantillas fueron creadas exitosamente en Meta via N8N
- Se probo envio DIRECT a prospecto real - entrega exitosa
- Prospecto Flor (f151cd19) tiene bloqueado_whatsapp=true, plantillas no se entregan
- Prospecto Darig (3333243333) recibio plantilla correctamente y respondio
