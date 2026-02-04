# 🚨 Acciones Requeridas - Funcionalidad de Audio

**Fecha:** 04 Febrero 2026  
**Estado:** ⚠️ PENDIENTE DE DEPLOY

---

## 📋 Resumen

La funcionalidad de envío de audio está **completamente implementada en el frontend** pero requiere:

1. ✅ **Código implementado:** Botones, grabación, UI, animaciones
2. ⚠️ **Edge Function pendiente:** `send-audio-proxy` NO está deployed
3. ⚠️ **Error en `pause-bot-proxy`:** 401 Unauthorized (posible problema de sesión)

---

## 🚀 Acción 1: Deploy de send-audio-proxy

### Opción A: Dashboard (5 minutos) ⭐ RECOMENDADO

1. **Ir a:** https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/functions

2. **Click:** "Create a new function"

3. **Configurar:**
   - Name: `send-audio-proxy`
   - Copiar código desde: `supabase/functions/send-audio-proxy/index.ts`

4. **Deploy**

5. **Verificar secrets** (ya deberían estar):
   - `SUPABASE_URL` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅
   - `LIVECHAT_AUTH` ✅

### Opción B: CLI (si tienes instalado)

```bash
supabase functions deploy send-audio-proxy --project-ref glsmifhkoaifvaegsozd
```

---

## 🔧 Acción 2: Investigar Error 401 en pause-bot-proxy

### Síntomas:
```
POST /functions/v1/pause-bot-proxy 401 (Unauthorized)
❌ [pauseBot] Error 401 - Autenticación fallida
```

### Causas Posibles:

1. **Token Expirado:**
   - Sesión de Supabase Auth caducó
   - Solución: Recargar página (F5)

2. **Sesión No Inicializada:**
   - Usuario no está completamente autenticado
   - Verificar en DevTools → Application → Local Storage → supabase.auth.token

3. **Edge Function Desincronizada:**
   - La función `pause-bot-proxy` tiene una versión desactualizada
   - Verificar logs en Dashboard

### Pasos de Diagnóstico:

#### 1. Verificar Token en el Frontend
```javascript
// En la consola del navegador
const { data } = await supabaseSystemUI.auth.getSession()
console.log('Token:', data.session?.access_token)
console.log('Expires at:', new Date(data.session?.expires_at * 1000))
```

#### 2. Verificar Logs de la Edge Function
Dashboard → Edge Functions → pause-bot-proxy → Logs (últimos 10 minutos)

Buscar líneas con:
```
❌ [pause-bot-proxy] Auth verification failed
```

#### 3. Test Manual de la Edge Function
```bash
# Obtener JWT válido del navegador (Application → Local Storage)
JWT="<tu_jwt_desde_localstorage>"

curl -X POST \
  https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/pause-bot-proxy \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"uchat_id":"test123","ttl":60}'
```

**Respuestas esperadas:**
- ✅ 200: Funcionó correctamente
- ❌ 401: JWT inválido o expirado
- ❌ 400: Faltan parámetros
- ❌ 500: Error del webhook N8N

---

## 🧪 Testing Post-Deploy

### 1. Verificar que send-audio-proxy existe
```bash
curl https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/send-audio-proxy
```

Esperado: `{"error":"Missing authorization header","success":false}` (401)

### 2. Test de Grabación de Audio

1. **Abrir:** http://localhost:5173 (o tu URL de dev)
2. **Login:** Con usuario válido
3. **Ir a:** Módulo de WhatsApp
4. **Seleccionar:** Una conversación activa
5. **Click:** Botón morado de micrófono
6. **Verificar:**
   - Permiso de micrófono solicitado ✅
   - Textarea deshabilitado ✅
   - Overlay rojo visible ✅
   - Contador de tiempo funcionando ✅
   - Botones verde y rojo visibles ✅

7. **Grabar:** 3-5 segundos
8. **Click:** Botón verde (detener y enviar)
9. **Verificar:**
   - Spinner de envío ✅
   - Toast de éxito ✅
   - Audio enviado a WhatsApp ✅

### 3. Test de Cancelación

1. **Iniciar grabación**
2. **Click:** Botón rojo (basura)
3. **Verificar:**
   - Toast: "Grabación cancelada" ✅
   - NO se envía audio ✅
   - Textarea re-habilitado ✅

---

## 📊 Estado de Archivos

### ✅ Completados

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `LiveChatCanvas.tsx` | ✅ | Botones, grabación, UI |
| `send-audio-proxy/index.ts` | ✅ | Edge function creada |
| `send-audio-proxy/deno.json` | ✅ | Config de Deno |
| `AUDIO_MESSAGING_FEATURE.md` | ✅ | Documentación completa |
| `DEPLOY_SEND_AUDIO_PROXY.md` | ✅ | Instrucciones de deploy |

### ⚠️ Pendientes

| Acción | Estado | Prioridad |
|--------|--------|-----------|
| Deploy `send-audio-proxy` | ⏳ | 🔴 Alta |
| Configurar N8N webhook `/send-audio` | ⏳ | 🔴 Alta |
| Investigar error 401 `pause-bot-proxy` | ⏳ | 🟡 Media |
| Test completo end-to-end | ⏳ | 🟢 Baja |

---

## 🔗 Enlaces Útiles

- **Dashboard Edge Functions:** https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/functions
- **Dashboard Secrets:** https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/edge-functions
- **N8N Dashboard:** https://primary-dev-d75a.up.railway.app
- **Código completo:** `supabase/functions/send-audio-proxy/index.ts`
- **Documentación:** `docs/AUDIO_MESSAGING_FEATURE.md`

---

## 💡 Recomendaciones

### Solución Inmediata al Error 401:
1. **Recargar la página** (F5) para refrescar la sesión
2. **Login nuevamente** si persiste
3. Si aún falla, revisar logs de `pause-bot-proxy` en Dashboard

### Para Producción:
1. Implementar **refresh automático de token** antes de que expire
2. Agregar **retry logic** para errores 401
3. Mostrar **diálogo de re-login** cuando el token expire
4. Agregar **health check** de Edge Functions al iniciar la app

---

**Última actualización:** 04 Febrero 2026  
**Próximo paso:** Deploy de `send-audio-proxy` vía Dashboard
