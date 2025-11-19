# 🚀 Despliegue de Supabase Edge Function: error-analisis-proxy

## 📋 **Problema Resuelto**
Error CORS al enviar análisis de IA desde localhost a Railway webhook:
```
Access to fetch at 'railway.app/webhook/error-analisis' blocked by CORS policy
```

## ✅ **Solución**
Creamos una **Supabase Edge Function** que actúa como proxy entre el frontend y el webhook de Railway, evitando problemas de CORS.

---

## 🔧 **Pasos para Desplegar**

### **1. Instalar Supabase CLI (si no lo tienes)**
```bash
# macOS
brew install supabase/tap/supabase

# Verificar instalación
supabase --version
```

### **2. Login en Supabase**
```bash
supabase login
```

### **3. Vincular el proyecto**
```bash
cd /Users/darigsamuelrosalesrobledo/Documents/pqnc-qa-ai-platform
supabase link --project-ref zbylezfyagwrxoecioup
```

### **4. Configurar Variables de Entorno**

**IMPORTANTE:** Antes de desplegar, debes configurar las variables de entorno en el dashboard de Supabase:

1. Ve a: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/settings/functions
2. Busca la función `error-analisis-proxy`
3. Agrega las siguientes variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `ERROR_ANALISIS_WEBHOOK_TOKEN` | `4@Lt'\o93BSkgA59MH[TSC"gERa+)jlgf\|BWIR-7fAmM9o59}3.\|W2k-JiRu(oeb` | Token de autenticación para el webhook de Railway |
| `ERROR_ANALISIS_WEBHOOK_URL` | `https://primary-dev-d75a.up.railway.app/webhook/error-analisis` | URL del webhook (opcional, tiene valor por defecto) |

**Nota:** El token es sensible, nunca lo hardcodees en el código. Usa variables de entorno.

### **5. Desplegar la función**
```bash
supabase functions deploy error-analisis-proxy
```

### **6. Verificar que funcione**
```bash
curl -X POST \
  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/error-analisis-proxy' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \
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
    },
    "tags": [],
    "annotations": [],
    "include_suggested_fix": true,
    "requested_at": "2025-01-18T15:22:00.000Z"
  }'
```

---

## 📂 **Archivos Creados**

### **`supabase/functions/error-analisis-proxy/index.ts`**
Edge Function que hace proxy al webhook de Railway, resuelve problemas de CORS y maneja el token de autenticación.

### **`supabase/functions/error-analisis-proxy/deno.json`**
Configuración de Deno para la función.

---

## 🔄 **Flujo de Funcionamiento**

```
Frontend (localhost:5173)
    ↓
    POST https://zbylezfyagwrxoecioup.supabase.co/functions/v1/error-analisis-proxy
    Header: apikey (Supabase anon key)
    Body: { analysis_id, error_log, tags, annotations, ... }
    ↓
Supabase Edge Function (Deno runtime)
    ↓
    POST https://primary-dev-d75a.up.railway.app/webhook/error-analisis
    Header: Authorization: Bearer {token}
    Body: Same payload
    ↓
Railway Webhook (n8n)
    ↓
    Procesa análisis de IA
    ↓
Respuesta a Frontend
```

---

## ✅ **Ventajas de esta Solución**

1. **Sin CORS:** El Edge Function se ejecuta en el servidor, no en el navegador
2. **Seguridad:** El token de autenticación no se expone al cliente
3. **Funciona en:** 
   - Localhost (desarrollo)
   - AWS CloudFront (producción)
   - Cualquier dominio
4. **Logs:** Puedes ver logs en el dashboard de Supabase
5. **Escalable:** Maneja múltiples requests simultáneos

---

## 🐛 **Troubleshooting**

### **Error: "Function not found"**
```bash
# Re-desplegar
supabase functions deploy error-analisis-proxy --no-verify-jwt
```

### **Error: "Invalid API key"**
- Verifica que el `apikey` header sea el correcto
- Debe ser el **anon key** de Supabase SystemUI

### **Error: "ERROR_ANALISIS_WEBHOOK_TOKEN no configurada"**
- Ve al dashboard de Supabase → Settings → Edge Functions → `error-analisis-proxy`
- Agrega la variable de entorno `ERROR_ANALISIS_WEBHOOK_TOKEN` con el token del webhook
- Re-despliega la función después de agregar las variables

### **Ver logs de la función**
```bash
supabase functions logs error-analisis-proxy
```

O en el dashboard: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/functions

---

## 📝 **Código del Frontend**

En `logMonitorService.ts`:
```typescript
// ✅ Ahora usa el proxy
const AI_ANALYSIS_PROXY_URL = 'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/error-analisis-proxy';

const response = await fetch(AI_ANALYSIS_PROXY_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify(webhookPayload)
});
```

---

## 🚀 **Listo para Producción**

Una vez desplegada la función:

1. ✅ Funciona en localhost
2. ✅ Funciona en AWS
3. ✅ Sin cambios adicionales necesarios
4. ✅ CORS resuelto permanentemente

