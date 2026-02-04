# 🔍 Diagnóstico: ERR_CONNECTION_RESET en Imágenes GCS

**Fecha:** 3 de Febrero 2026  
**Módulo:** WhatsApp Chat (LiveChatCanvas, MultimediaMessage)  
**Error:** `net::ERR_CONNECTION_RESET`  
**Servicio:** Google Cloud Storage (GCS) via Railway

---

## 📋 Problema

Las imágenes de WhatsApp no se están cargando desde Google Cloud Storage. El navegador muestra:

```
GET https://storage.googleapis.com/whatsapp_pqnc_multimedia/86a7ecaba12fc2d59973a192807dfc19.jpeg?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=storage-service...
net::ERR_CONNECTION_RESET
```

### Logs del Navegador

```
86a7ecaba12fc2d59973a192807dfc19.jpeg?X-Goog-Algorithm=GOOG4-RSA-SHA256&...
GET https://storage.googleapis.com/whatsapp_pqnc_multimedia/86a7ecaba12fc2d59973a192807dfc19.jpeg
net::ERR_CONNECTION_RESET

2999e920defaf5cffe96f6140c613a08.jpeg?X-Goog-Algorithm=GOOG4-RSA-SHA256&...
GET https://storage.googleapis.com/whatsapp_pqnc_multimedia/2999e920defaf5cffe96f6140c613a08.jpeg
net::ERR_CONNECTION_RESET
```

**Patrón:** Múltiples imágenes fallan con el mismo error.

---

## 🔎 Análisis

### 1. Flujo Actual de URLs Firmadas

```typescript
// Frontend solicita imagen
getSignedGcsUrl(filename, bucket, 30)
  ↓
// Edge Function: generar-url-optimizada (Supabase)
// Verifica JWT del usuario
  ↓
// Servicio Railway: function-bun-dev-6d8e.up.railway.app/generar-url
// Genera URL firmada de GCS
  ↓
// Retorna URL con signature de Google
  ↓
// Frontend intenta cargar imagen desde:
// https://storage.googleapis.com/whatsapp_pqnc_multimedia/{filename}?X-Goog-...
  ↓
// ❌ ERR_CONNECTION_RESET
```

### 2. Posibles Causas

#### A. **Problema de Red/Firewall**
- El servidor de Google Cloud Storage rechaza conexiones
- Puede ser por:
  - Rate limiting (demasiadas peticiones)
  - Bloqueo geográfico
  - Certificado SSL inválido
  - Problema de DNS

#### B. **URLs Firmadas Inválidas**
- El servicio de Railway genera URLs pero con signatures incorrectas
- Google rechaza la conexión por autenticación fallida
- Posible expiración inmediata

#### C. **Problema del Servicio en Railway**
- El servicio `function-bun-dev-6d8e.up.railway.app` está caído
- O genera URLs mal formadas

#### D. **Problema de CORS**
- Las URLs de GCS no tienen headers CORS correctos
- El navegador bloquea la carga por policy

### 3. Verificación del Flujo

**Edge Function `generar-url-optimizada`:**

✅ Verifica JWT del usuario (líneas 81-92)  
✅ Llama a Railway con `GCS_API_TOKEN` (líneas 134-145)  
✅ Retorna respuesta del servicio (línea 178)

**⚠️ Falta:** Logs para ver si la Edge Function se ejecuta correctamente.

---

## 🎯 Plan de Diagnóstico

### Paso 1: Verificar Estado del Servicio Railway

```bash
# Test directo al servicio de Railway
curl -X POST https://function-bun-dev-6d8e.up.railway.app/generar-url \
  -H "Content-Type: application/json" \
  -H "x-api-token: VALOR-DEL-TOKEN" \
  -d '{
    "filename": "86a7ecaba12fc2d59973a192807dfc19.jpeg",
    "bucket": "whatsapp_pqnc_multimedia",
    "expirationMinutes": 30
  }'
```

**Verificar:**
- ✅ Status code 200
- ✅ Respuesta contiene `url` con signature de Google
- ✅ URL tiene formato: `https://storage.googleapis.com/...?X-Goog-Algorithm=...`

### Paso 2: Verificar Edge Function en Supabase

Agregar logs verbose en `generar-url-optimizada/index.ts`:

```typescript
// Después de línea 148
const responseText = await gcsResponse.text()
console.log(`📥 Respuesta de Railway (status ${gcsResponse.status}):`, responseText.substring(0, 300))

if (!gcsResponse.ok) {
  console.error('❌ Error del servicio GCS:', gcsResponse.status, responseText)
  // ... existing error handling
}
```

### Paso 3: Verificar URLs Generadas

Capturar una URL firmada completa en el navegador:

```javascript
// En consola del navegador (mientras falla)
const url = 'https://storage.googleapis.com/whatsapp_pqnc_multimedia/86a7ecaba12fc2d59973a192807dfc19.jpeg?X-Goog-Algorithm=GOOG4-RSA-SHA256&...'

// Intentar cargar manualmente
fetch(url, { mode: 'no-cors' })
  .then(r => console.log('✅ Fetch exitoso:', r.status))
  .catch(e => console.error('❌ Fetch falló:', e))
```

**Verificar:**
- ¿La URL expira inmediatamente?
- ¿El archivo existe en GCS?
- ¿La signature es válida?

### Paso 4: Verificar Logs de Supabase Edge Function

1. Ir a: Supabase Dashboard → Edge Functions → `generar-url-optimizada`
2. Ver logs de ejecución
3. Buscar:
   - ✅ Llamadas exitosas (status 200)
   - ❌ Errores de Railway
   - ⚠️ Warnings de JWT

### Paso 5: Test de Conectividad a GCS

```bash
# Ping a Google Cloud Storage
ping storage.googleapis.com

# Curl directo (debería fallar sin signature, pero probar conectividad)
curl -I https://storage.googleapis.com/whatsapp_pqnc_multimedia/

# Expected: HTTP 403 (no signature) o 200 (si el bucket es público)
# NOT expected: Connection reset, timeout
```

---

## 🛠️ Posibles Soluciones

### Solución A: Verificar Credenciales de Railway

```bash
# Verificar que GCS_API_TOKEN esté configurado
# En Supabase Dashboard → Edge Functions → generar-url-optimizada → Secrets
echo $GCS_API_TOKEN
echo $MEDIA_URL_AUTH

# Verificar que el token sea válido en Railway
```

### Solución B: Reiniciar Servicio Railway

Si el servicio está caído:

1. Ir a: Railway Dashboard
2. Seleccionar proyecto: `function-bun-dev-6d8e`
3. Reiniciar el servicio
4. Verificar logs de deploy

### Solución C: Cambiar a Edge Function Nativa (Sin Railway)

Si Railway es inestable, implementar generación de URLs **directamente en la Edge Function**:

```typescript
// Usar @google-cloud/storage en Deno
import { Storage } from 'https://esm.sh/@google-cloud/storage'

const storage = new Storage({
  credentials: JSON.parse(Deno.env.get('GCS_SERVICE_ACCOUNT_KEY') || '{}')
})

const bucket = storage.bucket('whatsapp_pqnc_multimedia')
const file = bucket.file(filename)

const [url] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + expirationMinutes * 60 * 1000
})
```

**⚠️ Requiere:**
- Service Account Key de Google Cloud en secrets de Supabase
- Permisos: `storage.objects.get` en el bucket

### Solución D: Fallback a Proxy Directo

Si las URLs firmadas fallan, usar un proxy que sirva las imágenes:

```typescript
// Nueva edge function: gcs-proxy
// Lee el archivo de GCS y lo sirve directamente
const file = bucket.file(filename)
const [buffer] = await file.download()

return new Response(buffer, {
  headers: {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'public, max-age=1800' // 30 min
  }
})
```

---

## 📊 Métricas de Impacto

**Usuarios afectados:** Todos los que usan WhatsApp Chat  
**Severidad:** 🔴 Alta (bloquea visualización de multimedia)  
**Frecuencia:** Constante (todas las imágenes fallan)

---

## 🔗 Referencias

- **Edge Function:** `supabase/functions/generar-url-optimizada/index.ts`
- **Servicio Frontend:** `src/services/gcsUrlService.ts`
- **Componente:** `src/components/chat/MultimediaMessage.tsx`
- **Railway Service:** https://function-bun-dev-6d8e.up.railway.app
- **GCS Bucket:** `whatsapp_pqnc_multimedia`

---

## 📝 Notas de Seguridad

**⚠️ IMPORTANTE:** No exponer GCS_API_TOKEN en logs públicos.

El token está en:
- Supabase Dashboard → Edge Functions → generar-url-optimizada → Secrets
- O en: `api_auth_tokens` con `module_name='GCS'`

---

## ✅ Checklist de Verificación

- [ ] Servicio Railway está UP y responde
- [ ] GCS_API_TOKEN está configurado correctamente
- [ ] Edge Function se ejecuta sin errores
- [ ] URLs generadas tienen formato correcto
- [ ] Conectividad a storage.googleapis.com funciona
- [ ] Archivos existen en el bucket de GCS
- [ ] Signatures de Google son válidas

---

**Estado:** 🟡 Pendiente de diagnóstico  
**Prioridad:** 🔥 Alta  
**Asignado a:** Dev con acceso a Railway y Supabase Dashboard
