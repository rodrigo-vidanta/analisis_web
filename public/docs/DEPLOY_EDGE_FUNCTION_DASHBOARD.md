# Desplegar Edge Function desde Dashboard - Guía Visual

## ⚠️ IMPORTANTE: Edge Functions vs Database Functions

**NO estás buscando en el lugar correcto.** Estás viendo "Database Functions" pero necesitas "Edge Functions".

### Database Functions (donde estás ahora):
- Son funciones SQL/PostgreSQL
- Se crean en la pestaña "Database Functions"
- Ejemplo: `update_ui_error_log_annotations_updated_at`

### Edge Functions (lo que necesitas):
- Son funciones serverless en Deno
- Se despliegan desde la pestaña "Edge Functions"
- Ejemplo: `error-analisis-proxy`

---

## 📍 Ubicación Correcta en el Dashboard

### Paso 1: Navegar a Edge Functions

1. Ve al dashboard de Supabase: https://supabase.com/dashboard/project/dffuwdzybhypxfzrmdcz
2. En el menú lateral izquierdo, busca la sección **"Edge Functions"** (NO "Database Functions")
3. Haz clic en **"Edge Functions"**

### Paso 2: Buscar o Crear la Función

**Si la función ya existe:**
- Busca `error-analisis-proxy` en la lista
- Haz clic en ella para editarla

**Si la función NO existe:**
- Haz clic en el botón **"Create a new function"** o **"New Function"**
- Nombre: `error-analisis-proxy`
- Crea la función

### Paso 3: Editar el Código

1. Una vez dentro de la función, busca el editor de código
2. Copia TODO el contenido del archivo: `supabase/functions/error-analisis-proxy/index.ts`
3. Pega el código en el editor
4. Guarda los cambios (botón "Save" o "Deploy")

### Paso 4: Configurar Variables de Entorno

1. En la misma página de la función, busca la sección **"Environment Variables"** o **"Secrets"**
2. Agrega estas dos variables:

```
ERROR_ANALISIS_WEBHOOK_URL = https://primary-dev-d75a.up.railway.app/webhook/error-analisis
ERROR_ANALISIS_WEBHOOK_TOKEN = 4@Lt'\o93BSkgA59MH[TSC"gERa+)jlgf|BWIR-7fAmM9o59}3.|W2k-JiRu(oeb
```

3. Guarda las variables

---

## 🔗 Enlaces Directos

### Edge Functions del Proyecto Log Monitor:
https://supabase.com/dashboard/project/dffuwdzybhypxfzrmdcz/functions

### Si no tienes acceso directo, usa esta ruta:
1. https://supabase.com/dashboard
2. Selecciona el proyecto: **dffuwdzybhypxfzrmdcz** (Log Monitor)
3. Menú lateral → **Edge Functions**

---

## 📋 Código Completo para Copiar

El código completo está en: `supabase/functions/error-analisis-proxy/index.ts`

**O copia directamente desde aquí:**

```typescript
// Función Edge de Supabase para actuar como proxy del webhook error-analisis
// Evita problemas de CORS al hacer las llamadas desde el servidor

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar configuración de webhook
    const WEBHOOK_URL = Deno.env.get('ERROR_ANALISIS_WEBHOOK_URL') || 'https://primary-dev-d75a.up.railway.app/webhook/error-analisis'
    const WEBHOOK_TOKEN = Deno.env.get('ERROR_ANALISIS_WEBHOOK_TOKEN')
    
    if (!WEBHOOK_TOKEN) {
      console.error('❌ ERROR_ANALISIS_WEBHOOK_TOKEN no configurada en variables de entorno')
      return new Response(
        JSON.stringify({ 
          error: 'ERROR_ANALISIS_WEBHOOK_TOKEN no configurada. Por favor, configura la variable de entorno en Supabase.',
          success: false,
          details: 'La Edge Function requiere la variable de entorno ERROR_ANALISIS_WEBHOOK_TOKEN en el dashboard de Supabase'
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Leer el payload del request
    let payload;
    try {
      payload = await req.json()
      console.log('📤 Proxy recibió payload para análisis de IA:', JSON.stringify(payload).substring(0, 200))
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Error parseando el payload JSON',
          success: false,
          details: parseError instanceof Error ? parseError.message : 'Error desconocido'
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Validar que el payload tenga los campos requeridos
    if (!payload.analysis_id || !payload.error_log) {
      return new Response(
        JSON.stringify({ 
          error: 'Payload inválido: se requieren los campos "analysis_id" y "error_log"',
          success: false
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    // Hacer request al webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`
      },
      body: JSON.stringify(payload)
    })
    
    console.log('📥 Respuesta del webhook:', response.status, response.statusText)
    
    // Leer el cuerpo de la respuesta (puede ser JSON incluso con status 500)
    let responseText = '';
    try {
      responseText = await response.text()
      console.log('📄 Cuerpo de respuesta del webhook (primeros 500 chars):', responseText.substring(0, 500))
    } catch (readError) {
      console.error('❌ Error leyendo respuesta del webhook:', readError)
      throw new Error(`Error leyendo respuesta del webhook: ${readError instanceof Error ? readError.message : 'Error desconocido'}`)
    }
    
    // Intentar parsear como JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText)
      console.log('✅ Respuesta parseada correctamente')
    } catch (parseError) {
      console.error('❌ Error parseando respuesta JSON:', parseError)
      console.error('📄 Respuesta recibida:', responseText)
      throw new Error(`Error parseando respuesta del webhook: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`)
    }
    
    // Si la respuesta tiene success: true y analysis, retornarla aunque el status sea 500
    // (algunos workflows de n8n pueden devolver 500 pero con datos válidos)
    if (responseData.success === true && responseData.analysis) {
      console.log('✅ Respuesta válida encontrada (success: true con analysis)')
      return new Response(
        JSON.stringify(responseData),
        { 
          status: 200, // Forzar 200 aunque el webhook haya devuelto 500
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    // Si no es exitosa, lanzar error
    if (!response.ok || !responseData.success) {
      console.error('❌ Error del webhook:', responseData)
      throw new Error(`Webhook Error: ${response.status} - ${JSON.stringify(responseData)}`)
    }
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
    
  } catch (error) {
    console.error('❌ Error en proxy error-analisis:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: error instanceof Error ? error.message : 'Error desconocido en el proxy'
        }
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
```

---

## ✅ Verificación Post-Despliegue

Una vez desplegada, prueba con:

```bash
curl -X POST \
  'https://dffuwdzybhypxfzrmdcz.supabase.co/functions/v1/error-analisis-proxy' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTgxNTksImV4cCI6MjA3NTQzNDE1OX0.dduh8ZV_vxWcC3u63DGjPG0U5DDjBpZTs3yjT3clkRc' \
  -d '{
    "analysis_id": "test-id",
    "error_log": {
      "id": "test-log-id",
      "tipo": "ui",
      "subtipo": "test",
      "severidad": "media",
      "ambiente": "desarrollo",
      "timestamp": "2025-01-18T15:21:00.000Z",
      "mensaje": "Test error"
    }
  }'
```

---

## 🆘 Si No Encuentras Edge Functions

Si no ves la opción "Edge Functions" en el menú:

1. Verifica que tengas permisos de administrador en el proyecto
2. Verifica que el proyecto tenga Edge Functions habilitadas
3. Contacta al administrador del proyecto para habilitar Edge Functions

