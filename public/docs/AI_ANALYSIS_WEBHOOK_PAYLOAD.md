# Payload de Webhook para Análisis de IA de Logs

## 📤 Payload de Request (Enviado al Webhook)

### Endpoint
```
POST https://primary-dev-d75a.up.railway.app/webhook/error-analisis
```

### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}" // Si es necesario
}
```

### Body (JSON)
```json
{
  "analysis_id": "uuid-del-registro-de-analisis",
  "error_log": {
    "id": "uuid-del-log",
    "tipo": "mensaje | llamada | ui",
    "subtipo": "dynamics | n8n | console | etc",
    "severidad": "critica | alta | media | baja",
    "ambiente": "desarrollo | produccion | preproduccion",
    "timestamp": "2025-01-18T15:21:00.000Z",
    "mensaje": "string o objeto JSON del mensaje de error",
    "descripcion": "Descripción del error (opcional)",
    "workflow_id": "ID del workflow si aplica (opcional)",
    "execution_id": "ID de ejecución si aplica (opcional)",
    "prospecto_id": "UUID del prospecto si aplica (opcional)",
    "subcategoria": "live-chat | live-monitor | etc (opcional)"
  },
  "tags": [
    {
      "id": "uuid-de-la-etiqueta",
      "tag_name": "bug",
      "created_at": "2025-01-18T15:20:00.000Z",
      "created_by": "uuid-del-usuario"
    }
  ],
  "annotations": [
    {
      "id": "uuid-de-la-anotacion",
      "annotation_text": "Este error ocurre frecuentemente en producción",
      "created_at": "2025-01-18T15:19:00.000Z",
      "created_by": "uuid-del-usuario",
      "updated_at": "2025-01-18T15:19:00.000Z"
    }
  ],
  "include_suggested_fix": true,
  "requested_at": "2025-01-18T15:21:00.000Z"
}
```

### Ejemplo Completo
```json
{
  "analysis_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "error_log": {
    "id": "18384fd3-99e4-4398-939c-e93dbbe0b95d",
    "tipo": "mensaje",
    "subtipo": "dynamics",
    "severidad": "alta",
    "ambiente": "desarrollo",
    "timestamp": "2025-01-18T15:21:00.000Z",
    "mensaje": "{\"error\":{\"code\":\"ERR_BAD_REQUEST\",\"name\":\"AxiosError\",\"status\":409,\"message\":\"409 \\\"[{\\\\\\\"failedComponent\\\\\\\":\\\\\\\"Insert_Chat\\\\\\\",\\\\\\\"message\\\\\\\":\\\\\\\"The supplied reference link -- leads() is invalid. Expecting a reference link of the form /entityset(key).\\\\\\\"}]\\\"\"}}",
    "descripcion": "Error al insertar chat en Dynamics",
    "workflow_id": "lQebxNjD6sRLIeeA",
    "execution_id": null,
    "prospecto_id": null,
    "subcategoria": "live-chat"
  },
  "tags": [
    {
      "id": "tag-uuid-1",
      "tag_name": "bug",
      "created_at": "2025-01-18T15:20:00.000Z",
      "created_by": "user-uuid-1"
    },
    {
      "id": "tag-uuid-2",
      "tag_name": "dynamics",
      "created_at": "2025-01-18T15:20:30.000Z",
      "created_by": "user-uuid-1"
    }
  ],
  "annotations": [
    {
      "id": "annotation-uuid-1",
      "annotation_text": "Este error ocurre frecuentemente en producción cuando se intenta crear un lead",
      "created_at": "2025-01-18T15:19:00.000Z",
      "created_by": "user-uuid-1",
      "updated_at": "2025-01-18T15:19:00.000Z"
    }
  ],
  "include_suggested_fix": true,
  "requested_at": "2025-01-18T15:22:00.000Z"
}
```

---

## 📥 Payload de Response (Esperado del Webhook)

### Status Code
- **200 OK**: Análisis completado exitosamente
- **400 Bad Request**: Error en el payload enviado
- **500 Internal Server Error**: Error al procesar el análisis

### Body (JSON) - Respuesta Exitosa (Formato Mínimo Simplificado)

**IMPORTANTE**: El webhook debe devolver solo los campos esenciales del análisis. El frontend se encargará de guardar el análisis en la base de datos cuando el usuario lo solicite mediante un botón.

**Formato mínimo requerido:**
```json
{
  "success": true,
  "analysis": {
    "analysis_text": "Análisis completo y detallado del error...",
    "analysis_summary": "Resumen ejecutivo del análisis...",
    "suggested_fix": "Solución sugerida..." o null
  }
}
```

**Campos requeridos:**
- `success`: boolean (true)
- `analysis.analysis_text`: string - Análisis completo del error
- `analysis.analysis_summary`: string - Resumen ejecutivo (puede ser vacío "")
- `analysis.suggested_fix`: string | null - Solo si `include_suggested_fix` era true en el request

**Ejemplo completo:**
```json
{
  "success": true,
  "analysis": {
    "analysis_text": "El error indica un problema con la referencia de entidad en Dynamics 365. El componente 'Insert_Chat' está intentando crear un registro con una referencia inválida usando '-- leads()' en lugar del formato correcto '/entityset(key)'.",
    "analysis_summary": "Error de formato en referencia de entidad Dynamics. El componente Insert_Chat usa '-- leads()' en lugar del formato '/entityset(key)' requerido.",
    "suggested_fix": "1. Revisar el código del workflow n8n que construye la referencia de relación.\n2. Asegurar que se use el formato correcto: '/leads(guid)' en lugar de '-- leads()'.\n3. Validar el mapeo de datos antes de enviar a Dynamics."
  }
}
```

**Nota**: El frontend mostrará el análisis recibido y el usuario decidirá si guardarlo o no mediante un botón "Guardar Análisis". El webhook NO debe guardar nada en la base de datos, solo devolver el análisis.

### Body (JSON) - Respuesta con Error
```json
{
  "success": false,
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "Descripción del error que ocurrió",
    "details": {}
  }
}
```

### Ejemplo Completo de Respuesta Exitosa
```json
{
  "success": true,
  "analysis": {
    "analysis_text": "El error indica un problema con la referencia de entidad en Dynamics 365. El componente 'Insert_Chat' está intentando crear un registro con una referencia inválida usando '-- leads()' en lugar del formato correcto '/entityset(key)'. Esto sugiere que hay un problema en la construcción de la URL o en el mapeo de datos antes de enviar la solicitud a Dynamics. El código de error 409 (Conflict) indica que Dynamics rechazó la solicitud debido a un formato incorrecto en la referencia de relación.",
    "analysis_summary": "Error de formato en referencia de entidad Dynamics. El componente Insert_Chat usa '-- leads()' en lugar del formato '/entityset(key)' requerido.",
    "suggested_fix": "1. Revisar el código del workflow n8n que construye la referencia de relación.\n2. Asegurar que se use el formato correcto: '/leads(guid)' en lugar de '-- leads()'.\n3. Validar el mapeo de datos antes de enviar a Dynamics.\n4. Agregar validación de formato antes de la inserción."
  }
}
```

---

## 📋 Campos Detallados

### Request Payload

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `analysis_id` | string (UUID) | ✅ | ID del registro de análisis creado en la BD |
| `error_log.id` | string (UUID) | ✅ | ID único del log de error |
| `error_log.tipo` | enum | ✅ | Tipo: `mensaje`, `llamada`, `ui` |
| `error_log.subtipo` | string | ✅ | Subtipo específico del error |
| `error_log.severidad` | enum | ✅ | Severidad: `critica`, `alta`, `media`, `baja` |
| `error_log.ambiente` | enum | ✅ | Ambiente: `desarrollo`, `produccion`, `preproduccion` |
| `error_log.timestamp` | string (ISO 8601) | ✅ | Fecha y hora del error |
| `error_log.mensaje` | string/object | ✅ | Mensaje de error (puede ser JSON stringificado) |
| `error_log.descripcion` | string | ❌ | Descripción adicional del error |
| `error_log.workflow_id` | string | ❌ | ID del workflow n8n si aplica |
| `error_log.execution_id` | string | ❌ | ID de ejecución si aplica |
| `error_log.prospecto_id` | string (UUID) | ❌ | ID del prospecto relacionado |
| `error_log.subcategoria` | string | ❌ | Módulo activo cuando ocurrió el error |
| `tags` | array | ✅ | Array de etiquetas asignadas al log (puede estar vacío) |
| `tags[].id` | string (UUID) | ✅ | ID de la etiqueta |
| `tags[].tag_name` | string | ✅ | Nombre de la etiqueta |
| `tags[].created_at` | string (ISO 8601) | ✅ | Fecha de creación de la etiqueta |
| `tags[].created_by` | string (UUID) | ✅ | ID del usuario que creó la etiqueta |
| `annotations` | array | ✅ | Array de anotaciones/comentarios del log (puede estar vacío) |
| `annotations[].id` | string (UUID) | ✅ | ID de la anotación |
| `annotations[].annotation_text` | string | ✅ | Texto de la anotación |
| `annotations[].created_at` | string (ISO 8601) | ✅ | Fecha de creación |
| `annotations[].created_by` | string (UUID) | ✅ | ID del usuario que creó la anotación |
| `annotations[].updated_at` | string (ISO 8601) | ✅ | Fecha de última actualización |
| `include_suggested_fix` | boolean | ✅ | Si se debe incluir solución sugerida |
| `requested_at` | string (ISO 8601) | ✅ | Timestamp de cuando se solicitó el análisis |

### Response Payload (Success) - Formato Mínimo Simplificado

**IMPORTANTE**: El webhook solo debe devolver el análisis. El frontend se encargará de guardarlo en BD cuando el usuario lo solicite.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `success` | boolean | ✅ | `true` si el análisis fue exitoso |
| `analysis.analysis_text` | string | ✅ | Análisis completo del error |
| `analysis.analysis_summary` | string | ✅ | Resumen ejecutivo (puede ser vacío "" si no se genera) |
| `analysis.suggested_fix` | string \| null | ⚠️ | Solución sugerida (solo si `include_suggested_fix: true` en el request, puede ser null) |


### Response Payload (Error)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `success` | boolean | ✅ | `false` si hubo error |
| `error.code` | string | ✅ | Código de error |
| `error.message` | string | ✅ | Mensaje descriptivo del error |
| `error.details` | object | ❌ | Detalles adicionales del error |

---

## 🔄 Flujo de Procesamiento

1. **Cliente envía request** → Webhook recibe payload con información del log
2. **Webhook procesa** → Analiza el error usando IA y genera respuesta estructurada
3. **Cliente recibe response** → Muestra el análisis recibido al usuario
4. **Usuario decide** → El usuario puede revisar el análisis y decidir si guardarlo
5. **Usuario guarda** → El frontend guarda el análisis en la BD cuando el usuario hace clic en "Guardar Análisis"

---

## ⚠️ Notas Importantes

1. **Timeout**: El webhook debe responder en máximo 30 segundos
2. **Retry**: El cliente NO reintentará automáticamente si falla
3. **Formato de mensaje**: El campo `mensaje` puede ser un string o un objeto JSON stringificado
4. **Tokens**: Los límites de tokens son sugerencias, pero el webhook puede ajustarlos según su modelo
5. **Confidence Score**: Debe ser un número entre 0 y 100 (ver explicación arriba)
6. **ISO 8601**: Todos los timestamps deben estar en formato ISO 8601 con timezone
7. **Tags y Anotaciones**: Estos arrays pueden estar vacíos `[]` si el log no tiene etiquetas o anotaciones
8. **NO guardar en BD**: El webhook NO debe guardar nada en la base de datos. Solo debe devolver el análisis en el formato especificado. El frontend se encargará de guardarlo cuando el usuario lo solicite.
9. **Campos mínimos**: El webhook debe devolver solo los campos mínimos requeridos (`success`, `analysis.analysis_text`, `analysis.analysis_summary`, `analysis.suggested_fix`). Los campos opcionales pueden omitirse.
10. **suggested_fix**: Solo debe incluirse si `include_suggested_fix` era `true` en el request. Puede ser `null` si no se genera solución.

