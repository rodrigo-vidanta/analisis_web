# 🔑 Configurar API Key de Anthropic en Supabase

## Problema
El error 500 al usar la función de parafraseo indica que la variable de entorno `ANTHROPIC_API_KEY` no está configurada en la Edge Function `anthropic-proxy`.

## Solución

### Paso 1: Obtener API Key de Anthropic
1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Inicia sesión o crea una cuenta
3. Ve a **API Keys** en el menú lateral
4. Crea una nueva API key o copia una existente

### Paso 2: Configurar en Supabase
1. Ve al dashboard de Supabase: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto: `zbylezfyagwrxoecioup`
3. Ve a **Edge Functions** en el menú lateral
4. Haz clic en la función `anthropic-proxy`
5. Ve a la pestaña **Settings** o **Secrets**
6. Agrega una nueva variable de entorno:
   - **Nombre**: `ANTHROPIC_API_KEY`
   - **Valor**: Tu API key de Anthropic (comienza con `sk-...`)
7. Guarda los cambios

### Paso 3: Verificar
Después de configurar la variable, la función debería funcionar correctamente. Puedes probarla desde la consola del navegador o usando el script de prueba:

```bash
curl -X POST \
  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/anthropic-proxy' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "claude-3-5-sonnet-20240620",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hola"}]
  }'
```

## Nota Importante
- La API key debe configurarse en el **dashboard de Supabase**, no como variable de entorno local
- Después de agregar la variable, puede tomar unos segundos para que se propague
- Si el error persiste, verifica los logs de la Edge Function en Supabase

## Error: "model not found" o "not_found_error"

Si recibes un error que indica que el modelo no se encuentra, puede ser por:

1. **API Key sin acceso al modelo**: Tu API key de Anthropic puede no tener acceso a Claude 3.5 Sonnet. Verifica tu plan en [console.anthropic.com](https://console.anthropic.com)
2. **Créditos agotados**: Verifica que tu cuenta de Anthropic tenga créditos disponibles
3. **Modelo incorrecto**: Si el modelo sigue fallando, prueba cambiando a `claude-3-sonnet-20240229` en el código

Para verificar qué modelos están disponibles con tu API key, puedes consultar la documentación de Anthropic o contactar su soporte.

