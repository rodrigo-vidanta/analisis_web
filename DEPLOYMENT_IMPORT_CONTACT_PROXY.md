# 🚀 Guía de Deployment: import-contact-proxy

**Fecha:** 27 de Enero 2026  
**Edge Function:** import-contact-proxy  
**Proyecto:** PQNC_AI (glsmifhkoaifvaegsozd)

---

## ⚡ Opción 1: Deployment Automático (Recomendado)

```bash
./deploy-import-contact-complete.sh
```

Este script hace:
1. Deploy de la edge function
2. Configura el secret `LIVECHAT_AUTH`

---

## 🔧 Opción 2: Deployment Manual

### Paso 1: Desplegar Edge Function

```bash
supabase functions deploy import-contact-proxy \
  --project-ref glsmifhkoaifvaegsozd \
  --no-verify-jwt
```

### Paso 2: Configurar Secret

**Opción A: Via CLI**
```bash
supabase secrets set \
  --project-ref glsmifhkoaifvaegsozd \
  LIVECHAT_AUTH="2025_livechat_auth"
```

**Opción B: Via Dashboard**
1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/functions
2. Buscar: `import-contact-proxy`
3. Click en "Secrets"
4. Agregar nuevo secret:
   - **Key:** `LIVECHAT_AUTH`
   - **Value:** `2025_livechat_auth`
5. Click "Save"

---

## ✅ Verificación

### 1. Verificar que la función existe

```bash
supabase functions list --project-ref glsmifhkoaifvaegsozd
```

Debe aparecer `import-contact-proxy` en la lista.

### 2. Verificar secret (opcional)

```bash
supabase secrets list --project-ref glsmifhkoaifvaegsozd
```

Debe aparecer `LIVECHAT_AUTH` en la lista.

### 3. Test de la función

```bash
# Obtener JWT token (desde el frontend o con supabase CLI)
# Reemplazar {JWT_TOKEN} con tu token real

curl -X POST https://glsmifhkoaifvaegsozd.supabase.co/functions/v1/import-contact-proxy \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ejecutivo_nombre": "Test User",
    "ejecutivo_id": "uuid-test",
    "coordinacion_id": "uuid-test",
    "fecha_solicitud": "2026-01-27T12:00:00Z",
    "lead_id": "test-lead-123",
    "telefono": "3333243333",
    "nombre_completo": "Prospecto Test"
  }'
```

**Respuesta esperada (si todo está bien):**
```json
{
  "success": true,
  "prospecto_id": "uuid-del-prospecto",
  "conversacion_id": "uuid-de-conversacion"
}
```

---

## 📋 Información del Token

### De dónde viene `2025_livechat_auth`?

Este token está almacenado en la tabla `api_auth_tokens`:

```sql
SELECT module_name, token_key, token_value 
FROM api_auth_tokens 
WHERE token_value = '2025_livechat_auth';
```

**Resultado:**
| module_name | token_key | token_value |
|-------------|-----------|-------------|
| Enviar Mensaje WhatsApp | send_message_auth | 2025_livechat_auth |
| Pausar Bot | pause_bot_auth | 2025_livechat_auth |
| Broadcast WhatsApp | broadcast_auth | 2025_livechat_auth |

Es el mismo token usado por todas las edge functions que llaman a webhooks de N8N.

---

## 🔗 Edge Functions que usan LIVECHAT_AUTH

| Edge Function | Webhook N8N | Estado |
|--------------|-------------|--------|
| send-message-proxy | /webhook/send-message | ✅ Activo |
| pause-bot-proxy | /webhook/pause_bot | ✅ Activo |
| paraphrase-proxy | /webhook/mensaje-agente | ✅ Activo |
| broadcast-proxy | /webhook/broadcast | ✅ Activo |
| **import-contact-proxy** | /webhook/import-contact-crm | 🆕 Nuevo |

---

## 🐛 Troubleshooting

### Error: "supabase: command not found"

**Solución:** Instalar Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (cualquier OS)
npm install -g supabase
```

### Error: "Missing authorization header" al probar

**Causa:** No se envió el JWT token o es inválido.

**Solución:** Obtener un token válido:
1. Login en el frontend
2. Abrir DevTools → Application → Local Storage
3. Buscar: `sb-glsmifhkoaifvaegsozd-auth-token`
4. Copiar el `access_token`

### Error: "Webhook error: 401"

**Causa:** El secret `LIVECHAT_AUTH` no está configurado o es incorrecto.

**Solución:** Verificar que el secret esté configurado con el valor exacto: `2025_livechat_auth`

### Error: "Webhook error: 404"

**Causa:** El webhook `/webhook/import-contact-crm` no existe en N8N.

**Solución:** Verificar que el workflow en N8N esté activo y el webhook esté configurado.

---

## 📝 Notas

- El deployment NO afecta a las edge functions existentes
- El secret `LIVECHAT_AUTH` es compartido por múltiples edge functions
- La función requiere JWT válido (usuario autenticado)
- El webhook debe retornar `prospecto_id` y `conversacion_id` para que el frontend funcione correctamente

---

**Última actualización:** 27 de Enero 2026  
**Estado:** ✅ Listo para deployment
