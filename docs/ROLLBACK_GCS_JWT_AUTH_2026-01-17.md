# Plan de Rollback: Autenticación JWT en Edge Function generar-url-optimizada

**Fecha:** 17 de Enero 2026  
**Vulnerabilidad corregida:** GCP Storage Access sin autenticación - CVSS 5.3

## Objetivo del Cambio

Agregar verificación JWT a la Edge Function `generar-url-optimizada` para que solo usuarios autenticados puedan generar URLs firmadas de Google Cloud Storage.

## Proyecto Afectado

- `glsmifhkoaifvaegsozd` (PQNC_AI)

## Archivos Modificados

### Edge Function
- `supabase/functions/generar-url-optimizada/index.ts`
  - Agregada función `verifyJWT()` que valida el token de sesión
  - Ahora requiere `Authorization: Bearer <jwt>` con un usuario autenticado
  - Rechaza acceso con solo `anon_key`

### Frontend - Nuevo Servicio
- `src/services/gcsUrlService.ts` (NUEVO)
  - Servicio centralizado para generar URLs de GCS
  - Usa `getAuthHeadersStrict()` para obtener JWT del usuario
  - Incluye cache en memoria y localStorage

### Frontend - Archivos Actualizados
- `src/services/audioService.ts`
- `src/components/chat/LiveChatCanvas.tsx`
- `src/components/chat/MultimediaMessage.tsx`
- `src/components/chat/ImageCatalogModal.tsx`
- `src/components/chat/ImageCatalogModalV2.tsx`
- `src/components/dashboard/DashboardModule.tsx`
- `src/components/dashboard/widgets/ConversacionesWidget.tsx`
- `src/components/admin/WhatsAppTemplatesManager.tsx`
- `src/components/campaigns/plantillas/WhatsAppTemplatesManager.tsx`

## Estado Antes del Cambio

La Edge Function `generar-url-optimizada` era accesible con solo `anon_key`:

```bash
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/generar-url-optimizada" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "bucket": "private"}'

# Resultado: 200 OK con URL firmada
```

## Estado Después del Cambio

La Edge Function ahora requiere JWT de usuario autenticado:

```bash
# Con anon_key:
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/generar-url-optimizada" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "bucket": "private"}'

# Resultado: 401 Unauthorized - "Authentication required. Please login."

# Con JWT de usuario autenticado:
# Resultado: 200 OK con URL firmada
```

## Plan de Rollback

### Opción 1: Revertir Edge Function (Rápido)

Si hay problemas con la autenticación, revertir a la versión sin verificación JWT:

```bash
# 1. Restaurar backup de la Edge Function
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
cp supabase/functions/z_backup_generar-url-optimizada/index.ts supabase/functions/generar-url-optimizada/index.ts

# 2. Desplegar
cat .supabase/access_token | npx supabase login --no-browser
npx supabase functions deploy generar-url-optimizada --project-ref glsmifhkoaifvaegsozd
```

### Opción 2: Revertir Edge Function manualmente

Si no existe backup, reemplazar el contenido de `supabase/functions/generar-url-optimizada/index.ts` con:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const GCS_SERVICE_URL = 'https://function-bun-dev-6d8e.up.railway.app/generar-url'
const GCS_API_TOKEN = Deno.env.get('GCS_API_TOKEN') || Deno.env.get('MEDIA_URL_AUTH') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GCS_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Configuración del servidor incompleta (GCS token)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { filename, bucket, expirationMinutes = 30 } = body

    if (!filename || !bucket) {
      return new Response(
        JSON.stringify({ error: 'filename y bucket son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gcsResponse = await fetch(GCS_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': GCS_API_TOKEN
      },
      body: JSON.stringify({ filename, bucket, expirationMinutes })
    })

    const responseText = await gcsResponse.text()
    
    if (!gcsResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Error del servicio de imágenes', status: gcsResponse.status }),
        { status: gcsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = JSON.parse(responseText)
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

Luego desplegar:
```bash
npx supabase functions deploy generar-url-optimizada --project-ref glsmifhkoaifvaegsozd
```

### Opción 3: Revertir Frontend (Si hay problemas con el servicio)

Si el problema está en el frontend y no en la Edge Function:

1. Eliminar `src/services/gcsUrlService.ts`
2. Revertir cambios en los archivos listados arriba usando `git checkout HEAD~1 -- <archivo>`
3. Build y deploy frontend

## Verificación Post-Cambio

```bash
# 1. Sin autenticación (debe fallar)
curl -X POST "https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/generar-url-optimizada" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "bucket": "private"}'
# Esperado: 401

# 2. Verificar que imágenes cargan en la app (requiere login)
# - Abrir LiveChat
# - Ver que los adjuntos/imágenes cargan correctamente
```

## Notas Importantes

- Los usuarios deben estar logueados para ver imágenes/multimedia
- Si un usuario no está autenticado, las imágenes no cargarán (esto es intencional)
- El cache de URLs sigue funcionando (25 minutos de validez)
- Las sesiones de Supabase duran 1 hora por defecto
