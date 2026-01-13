# Desplegar Función Edge error-analisis-proxy - Log Monitor

## Proyecto: dffuwdzybhypxfzrmdcz (Log Monitor)

### Opción 1: Desde el Dashboard de Supabase (Más Fácil)

1. **Ve al dashboard:**
   - URL: https://supabase.com/dashboard/project/dffuwdzybhypxfzrmdcz/functions

2. **Busca la función `error-analisis-proxy`**

3. **Edita el código:**
   - Haz clic en "Edit" o "Edit Function"
   - Copia y pega el contenido completo del archivo: `supabase/functions/error-analisis-proxy/index.ts`
   - Guarda los cambios

4. **Verifica las variables de entorno:**
   - Asegúrate de que estas variables estén configuradas:
     - `ERROR_ANALISIS_WEBHOOK_URL` = `https://primary-dev-d75a.up.railway.app/webhook/error-analisis`
     - `ERROR_ANALISIS_WEBHOOK_TOKEN` = `4@Lt'\o93BSkgA59MH[TSC"gERa+)jlgf|BWIR-7fAmM9o59}3.|W2k-JiRu(oeb`

### Opción 2: Usando Supabase CLI

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
brew install supabase/tap/supabase

# 2. Login
supabase login

# 3. Vincular proyecto
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
supabase link --project-ref dffuwdzybhypxfzrmdcz

# 4. Desplegar función
supabase functions deploy error-analisis-proxy --project-ref dffuwdzybhypxfzrmdcz
```

### Opción 3: Usando el Script Automatizado

```bash
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
bash deploy-error-analisis-proxy.sh
```

---

## Cambios Realizados en la Función

### Mejoras en el Manejo de Respuestas:

1. **Lectura del cuerpo de respuesta incluso con status 500:**
   - Ahora lee el texto completo de la respuesta antes de verificar el status

2. **Detección de respuestas válidas con status 500:**
   - Si encuentra `success: true` y `analysis` en la respuesta, la retorna con status 200
   - Esto maneja el caso donde n8n devuelve un error pero también devuelve los datos válidos

3. **Mejor logging:**
   - Logs más detallados para diagnosticar problemas
   - Muestra los primeros 500 caracteres de la respuesta del webhook

### Código Actualizado:

```typescript
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
```

---

## Verificación Post-Despliegue

### Probar la función:

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

### Resultado Esperado:

Si el webhook responde correctamente (incluso con status 500), deberías recibir:

```json
{
  "success": true,
  "analysis": {
    "analysis_text": "...",
    "analysis_summary": "...",
    "suggested_fix": "..."
  }
}
```

Con status HTTP 200 (aunque el webhook haya devuelto 500).

---

## Credenciales del Proyecto

- **Project ID**: `dffuwdzybhypxfzrmdcz`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTgxNTksImV4cCI6MjA3NTQzNDE1OX0.dduh8ZV_vxWcC3u63DGjPG0U5DDjBpZTs3yjT3clkRc`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZnV3ZHp5Ymh5cHhmenJtZGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg1ODE1OSwiZXhwIjoyMDc1NDM0MTU5fQ.GplT_sFvgkLjNDNg50MaXVI759u8LAMeS9SbJ6pf2yc`

