# Plan: Reenvío silencioso de plantillas fallidas

**Fecha:** 2026-02-19
**Tipo:** Plan aprobado, pendiente implementación
**Estado:** NO EJECUTADO - requiere crear scripts y autorización para ejecutar

## Objetivo

Reenviar silenciosamente (sin crear nuevos registros en BD) todas las plantillas que fallaron por errores de payment (131042) y ecosistema (131049, 130472, 131050). Después, actualizar los status en BD para reflejar el resultado real.

## Datos del problema

| Error | Descripción | Reenviables | Skip |
|-------|-------------|-------------|------|
| 131042 | Payment issue (ya resuelto por Meta) | 1,624 | 12 |
| 131049 | Ecosystem health | 244 | 1 |
| 130472 | User in experiment | 18 | 0 |
| 131050 | User opted out marketing | 1 | 0 |
| **Total** | | **1,887** | **13** |

- **0 ya reenviadas** manualmente por ejecutivos
- **13 a omitir**: `intento_llamada_no_exitoso` (variable `fecha_personalizada` irrecuperable)
- **Todas las plantillas son solo texto** (sin header image)
- **Todas siguen APPROVED y activas** en WhatsApp

## Análisis del workflow N8N

### Workflow: `[api]-whatsapp-templates-envio-v2` (pZSsb89s4ZqN8Pl6)
- **34 nodos**, activo
- Flujo: Webhook → Validate → Get Template + Prospecto → IF Header Image → Build Payload → uChat Send → Registrar Mensaje → Vincular Conversación

### Nodo clave: `uChat Send Template`
```
URL: https://www.uchat.com.au/api/subscriber/send-whatsapp-template
Method: POST
Auth: Bearer token (credential: "UChat Whatsapp PQNC", ID: tDlskgNuqrLMOPEU)
Body: { user_ns, content: { namespace, name, lang, params } }
```

### Payload UChat (sin imagen)
```json
{
  "user_ns": "f190385uXXXXXX",
  "content": {
    "namespace": "template_name",
    "name": "template_name",
    "lang": "es_MX",
    "params": {
      "BODY_{{1}}": "valor1",
      "BODY_{{2}}": "valor2"
    }
  }
}
```

## Reconstrucción de variables

Las `variables` en `whatsapp_template_sends` están vacías (`{}`) para todos los registros fallidos. Se reconstruyen usando `variable_mappings` de `whatsapp_templates` + datos de `prospectos` y `user_profiles_v2`.

### Mapeo por template

| Template | `{{1}}` | `{{2}}` | `{{3}}` | Total |
|----------|---------|---------|---------|-------|
| curiosidad_pura_1 | - | - | - | ~28 |
| reenganche_suave | - | - | - | ~104 |
| retomar_saludo | - | - | - | ~47 |
| ultima_oportunidad | - | - | - | ~23 |
| el_buki_en_vidanta | prospectos.nombre | - | - | ~245 |
| michael_buble_en_vidanta | prospectos.nombre | - | - | ~298 |
| intrigante_y_con_oportunidad | prospectos.nombre | - | - | ~205 |
| invitacion_al_concierto_1 | prospectos.nombre | - | - | ~108 |
| retomar_conversacion | prospectos.nombre | - | - | ~86 |
| nueva_oferta_outbound | ejecutivo_nombre* | - | - | ~354 |
| reactivacion_por_outbound | ejecutivo_nombre* | - | - | ~87 |
| estancia_pendiente | prospectos.nombre | ejecutivo_nombre* | - | ~39 |
| seguimiento_contacto_utilidad | prospectos.nombre | ejecutivo_nombre* | - | ~99 |
| vidantaworlds_concert_series_2026 | prospectos.titulo | prospectos.nombre | - | ~99 |
| ~~intento_llamada_no_exitoso~~ | ~~prospectos.titulo~~ | ~~prospectos.apellido_paterno~~ | ~~fecha_personalizada~~ | ~~13 SKIP~~ |

*`ejecutivo_nombre`: Se obtiene de `triggered_by_user` → `user_profiles_v2.full_name`. Fallback: `prospectos.ejecutivo_id` → `user_profiles_v2.full_name`. **100% de cobertura con fallback.**

## Scripts a crear

### Script 1: `scripts/resend-templates.cjs`

**Función:** Reenvío silencioso directo a UChat API.

**Algoritmo:**
1. Query Supabase: obtener los 1,887 registros deduplicados con:
   - `mensaje_id`, `template_send_id` (para actualizar después)
   - `subscriber_ns` o `id_uchat` (destino UChat)
   - `template_name`, `language` (para el payload)
   - `prospectos.nombre`, `titulo`, `apellido_paterno` (variables de prospecto)
   - `triggered_by_user` o `ejecutivo_id` → resolver nombre ejecutivo
2. Para cada registro, reconstruir variables según `variable_mappings`
3. Validación pre-envío: si falta un dato requerido (nombre, ejecutivo), skip con log
4. POST a `https://www.uchat.com.au/api/subscriber/send-whatsapp-template`
5. Rate limiting: 1 req/segundo (~31 min total)
6. Guardar resultados en `scripts/resend-results-YYYY-MM-DD.json`

**Modos:**
- `--dry-run` (default): Solo muestra qué se enviaría, no envía
- `--execute`: Envía de verdad
- `--limit N`: Solo procesa N registros (para pruebas)
- `--error-code 131042`: Solo reenvía un tipo de error específico

**Output JSON:**
```json
[
  {
    "mensaje_id": "uuid",
    "template_send_id": "uuid",
    "template_name": "string",
    "subscriber_ns": "string",
    "uchat_status": 200,
    "uchat_response": {},
    "success": true,
    "error": null
  }
]
```

### Script 2: `scripts/update-resend-status.cjs`

**Función:** Actualizar BD con resultados del reenvío.

**Algoritmo:**
1. Leer `scripts/resend-results-YYYY-MM-DD.json`
2. Para cada envío exitoso (`success: true`):
   - `mensajes_whatsapp.status`: `bloqueado_whatsapp`/`bloqueo_meta` → `enviado`
   - `whatsapp_template_sends.status`: `FAILED` → `SENT`
3. Para envíos fallidos: NO cambiar status, logear el error
4. Reporte final con conteo de exitosos/fallidos/omitidos

**Modos:**
- `--dry-run` (default): Solo muestra qué actualizaría
- `--execute`: Actualiza de verdad
- `--file path`: Ruta al JSON de resultados

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| 131049/131050 vuelvan a fallar (ecosistema) | Alta | Script registra resultado, no cambia status si falla. Edge Function v6 re-clasifica el error entrante |
| Rate limiting UChat API | Media | 1 req/s, ~31 min total. Si UChat responde 429, backoff exponencial |
| Doble envío accidental | Baja | Dry-run por defecto + dedup DISTINCT ON (prospecto_id, template_id) |
| Variables mal reconstruidas | Baja | Validación pre-envío: skip + log si falta dato. 100% cobertura verificada en consultas |
| Prospecto ya no existe en UChat | Baja | UChat responderá error, script lo registra, no se actualiza status |

## Datos técnicos para implementación

### UChat API
- **URL:** `https://www.uchat.com.au/api/subscriber/send-whatsapp-template`
- **Auth:** Bearer token (`UCHAT_API_KEY` en `~/.zshrc`)
- **Method:** POST
- **Content-Type:** application/json

### Query SQL para obtener datos de reenvío
```sql
WITH failed AS (
  SELECT DISTINCT ON (mw.prospecto_id, wts.template_id)
    mw.id as mensaje_id,
    mw.prospecto_id,
    mw.status as msg_status,
    wts.id as template_send_id,
    wts.template_id,
    wts.subscriber_ns,
    wts.triggered_by_user,
    t.name as template_name,
    t.language,
    t.variable_mappings,
    p.id_uchat,
    p.nombre,
    p.nombre_completo,
    p.titulo,
    p.apellido_paterno,
    p.ejecutivo_id,
    e.error_code
  FROM mensajes_whatsapp mw
  JOIN prospectos p ON p.id = mw.prospecto_id
  JOIN whatsapp_delivery_errors e ON e.uchat_user_ns = p.id_uchat
    AND e.detected_date = mw.fecha_hora::date
    AND e.error_code IN ('131042', '131049', '130472', '131050')
  JOIN whatsapp_template_sends wts ON wts.mensaje_id = mw.id
  JOIN whatsapp_templates t ON t.id = wts.template_id
  WHERE mw.status IN ('bloqueado_whatsapp', 'bloqueo_meta')
    AND mw.rol = 'Plantilla'
    AND t.name != 'intento_llamada_no_exitoso'  -- skip irrecuperable
  ORDER BY mw.prospecto_id, wts.template_id, mw.fecha_hora DESC
)
SELECT f.*,
  COALESCE(
    up_trigger.full_name,
    up_ejecutivo.full_name,
    'Vacation Planner'
  ) as ejecutivo_nombre
FROM failed f
LEFT JOIN user_profiles_v2 up_trigger ON up_trigger.id = f.triggered_by_user
LEFT JOIN user_profiles_v2 up_ejecutivo ON up_ejecutivo.id = f.ejecutivo_id;
```

### Reconstrucción de params UChat
```javascript
function buildParams(templateName, variableMappings, record) {
  const params = {};
  const mappings = variableMappings?.mappings || variableMappings || [];

  for (const mapping of mappings) {
    const varKey = `BODY_{{${mapping.variable_number}}}`;

    if (mapping.table_name === 'prospectos') {
      if (mapping.field_name === 'nombre') params[varKey] = record.nombre || '';
      else if (mapping.field_name === 'titulo') params[varKey] = record.titulo || '';
      else if (mapping.field_name === 'apellido_paterno') params[varKey] = record.apellido_paterno || '';
    } else if (mapping.table_name === 'system') {
      if (mapping.field_name === 'ejecutivo_nombre') params[varKey] = record.ejecutivo_nombre || '';
    }
  }
  return params;
}
```

## Prerequisitos antes de ejecutar
1. Verificar que el problema de payment (131042) fue resuelto por Meta
2. Decidir si reenviar también los de ecosistema (131049, 130472, 131050) o solo los de payment
3. Considerar horario de envío (evitar enviar 1,887 plantillas de noche)
4. Deploy del frontend primero (para que los status se visualicen correctamente)

## Archivos a crear
- `scripts/resend-templates.cjs`
- `scripts/update-resend-status.cjs`

## NO se modifica
- Edge Function `receive-uchat-error` (ya maneja clasificación)
- N8N workflow (bypass completo)
- Frontend (ya soporta ambos status)
- BD (migraciones ya aplicadas)
