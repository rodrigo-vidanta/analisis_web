# Estructura del Payload de Error Logs

## Payload JSON Completo

Cada error enviado al webhook tiene la siguiente estructura JSON:

```json
{
  "error_id": "1763490207981-5102l9l3z",
  "error_type": "STRING_ERROR",
  "error_code": null,
  "mensaje": "Error obteniendo workflows:",
  "stack_trace": "TypeError: Failed to fetch\n    at window.fetch...",
  "error_details": {
    "args": ["Error obteniendo workflows:", {...}]
  },
  "module": "console",
  "component": "ConsoleInterceptor",
  "function": "console.error",
  "user_id": null,
  "user_email": null,
  "user_role": null,
  "environment": "desarrollo",
  "browser": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "url": "http://localhost:5173/",
  "timestamp": "2025-11-18T18:23:27.981Z",
  "severity": "medio",
  "session_id": null,
  "request_id": "fgyeczouvte",
  "category": "aplicacion",
  "subcategoria": "live-chat",
  "tags": []
}
```

## Campos del Payload

### Campos Obligatorios (siempre presentes)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `error_id` | string | ID único del error (timestamp-random) | `"1763490207981-5102l9l3z"` |
| `error_type` | string | Tipo de error | `"STRING_ERROR"`, `"TypeError"`, `"API_ERROR"` |
| `mensaje` | string | Mensaje descriptivo del error (en español para N8N) | `"Error obteniendo workflows:"` |
| `module` | string | Módulo donde ocurrió | `"console"`, `"auth"`, `"agent-studio"` |
| `environment` | string | Entorno: `"desarrollo"`, `"produccion"`, `"staging"` | `"desarrollo"` |
| `timestamp` | string | ISO 8601 timestamp | `"2025-11-18T18:23:27.981Z"` |
| `severity` | string | Severidad: `"critico"`, `"alto"`, `"medio"`, `"bajo"` | `"medio"` |
| `category` | string | Categoría del error | `"aplicacion"`, `"autenticacion"`, `"api"` |
| `request_id` | string | ID único de la request | `"fgyeczouvte"` |

### Campos Opcionales (pueden ser null)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `error_code` | string \| null | Código de error si existe | `"ECONNREFUSED"`, `"404"`, `null` |
| `stack_trace` | string \| null | Stack trace completo | `"TypeError: Failed to fetch\n    at..."` o `null` |
| `error_details` | object | Detalles adicionales (siempre presente, puede ser `{}`) | `{"args": [...], "custom": "data"}` |
| `component` | string \| null | Componente específico | `"ConsoleInterceptor"`, `null` |
| `function` | string \| null | Función donde ocurrió | `"console.error"`, `null` |
| `user_id` | string \| null | ID del usuario autenticado | `"uuid-del-usuario"`, `null` |
| `user_email` | string \| null | Email del usuario | `"user@example.com"`, `null` |
| `user_role` | string \| null | Rol del usuario | `"admin"`, `null` |
| `browser` | string \| null | User agent del navegador | `"Mozilla/5.0..."`, `null` |
| `url` | string \| null | URL donde ocurrió el error | `"http://localhost:5173/"`, `null` |
| `session_id` | string \| null | ID de sesión si existe | `"session-uuid"`, `null` |
| `subcategoria` | string \| null | Módulo activo cuando ocurrió el error | `"live-chat"`, `"live-monitor"`, `"agent-studio"`, `null` |
| `tags` | array | Tags adicionales (siempre presente, puede ser `[]`) | `["urgent", "payment"]` o `[]` |

## Valores Posibles

### `environment`
- `"desarrollo"`
- `"produccion"`
- `"staging"`

### `severity`
- `"critico"`
- `"alto"`
- `"medio"`
- `"bajo"`

### `category` (valores comunes)
- `"autenticacion"`
- `"api"`
- `"base_datos"`
- `"validacion"`
- `"servicio_externo"`
- `"infraestructura"`
- `"aplicacion"`

### `subcategoria` (valores posibles - módulo activo)
- `"agent-studio"`
- `"live-chat"`
- `"live-monitor"`
- `"admin"`
- `"academia"`
- `"ai-models"`
- `"prompts-manager"`
- `"aws-manager"`
- `"log-server"`
- `"prospectos"`
- `"pqnc"`
- `"natalia"`
- `null` (si no se puede determinar)

### `error_type` (valores comunes)
- `"STRING_ERROR"`
- `"TypeError"`
- `"ReferenceError"`
- `"API_ERROR"`
- `"AUTH_ERROR"`
- `"DB_ERROR"`
- `"NETWORK_ERROR"`
- `"VALIDATION_ERROR"`
- `"UNKNOWN_ERROR"`

## Notas Importantes

1. **`error_id`**: Formato `{timestamp}-{random}` donde timestamp es `Date.now()` y random es `Math.random().toString(36).substr(2, 9)`
2. **`timestamp`**: Siempre en formato ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`)
3. **`error_details`**: Siempre es un objeto JSON, puede estar vacío `{}` pero nunca es `null`
4. **`tags`**: Siempre es un array, puede estar vacío `[]` pero nunca es `null`
5. **Campos opcionales**: Los campos que pueden ser `null` pueden omitirse del JSON o enviarse como `null`

