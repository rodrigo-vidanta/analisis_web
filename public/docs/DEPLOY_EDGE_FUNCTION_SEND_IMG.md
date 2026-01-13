# 🚀 Despliegue de Supabase Edge Function: send-img-proxy

## 📋 **Problema Resuelto**
Error CORS al enviar imágenes desde localhost a Railway webhook:
```
Access to fetch at 'railway.app/webhook/send-img' blocked by CORS policy
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

### **4. Desplegar la función**
```bash
supabase functions deploy send-img-proxy
```

### **5. Verificar que funcione**
```bash
curl -X POST \
  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/send-img-proxy' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNzEsImV4cCI6MjA3NDkxMjI3MX0.W6Vt5h4r7vNSP_YQtd_fbTWuK7ERrcttwhcpe5Q7KoM' \
  -d '[{
    "whatsapp": "5213315127354",
    "uchat_id": "f190385u341675607",
    "imagenes": [{
      "archivo": "test.jpg",
      "destino": "Nuevo Vallarta",
      "resort": "Grand Mayan"
    }]
  }]'
```

---

## 📂 **Archivos Creados**

### **`supabase/functions/send-img-proxy/index.ts`**
```typescript
// Edge Function que hace proxy al webhook de Railway
// Resuelve problemas de CORS
```

### **`supabase/functions/send-img-proxy/deno.json`**
```json
{
  "compilerOptions": {
    "lib": ["deno.ns", "dom"]
  }
}
```

---

## 🔄 **Flujo de Funcionamiento**

```
Frontend (localhost:5173)
    ↓
    POST https://zbylezfyagwrxoecioup.supabase.co/functions/v1/send-img-proxy
    Header: apikey (Supabase anon key)
    Body: [{ whatsapp, uchat_id, imagenes: [...] }]
    ↓
Supabase Edge Function (Deno runtime)
    ↓
    POST https://primary-dev-d75a.up.railway.app/webhook/send-img
    Header: livechat_auth
    Body: Same payload
    ↓
Railway Webhook (n8n)
    ↓
    Procesa y envía imagen a WhatsApp
    ↓
Respuesta a Frontend
```

---

## ✅ **Ventajas de esta Solución**

1. **Sin CORS:** El Edge Function se ejecuta en el servidor, no en el navegador
2. **Seguridad:** El header `livechat_auth` no se expone al cliente
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
supabase functions deploy send-img-proxy --no-verify-jwt
```

### **Error: "Invalid API key"**
- Verifica que el `apikey` header sea el correcto
- Debe ser el **anon key** de Supabase SystemUI

### **Ver logs de la función**
```bash
supabase functions logs send-img-proxy
```

O en el dashboard: https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/functions

---

## 📝 **Código del Frontend**

En `ImageCatalogModal.tsx`:
```typescript
// ✅ Ahora usa el proxy
const proxyUrl = 'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/send-img-proxy';

const response = await fetch(proxyUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'apikey': 'eyJhbGc...' // Supabase anon key
  },
  body: JSON.stringify(payload)
});
```

---

## 🚀 **Listo para Producción**

Una vez desplegada la función:

1. ✅ Funciona en localhost
2. ✅ Funciona en AWS
3. ✅ Sin cambios adicionales necesarios
4. ✅ CORS resuelto permanentemente

**¡La función está lista para usarse!**

