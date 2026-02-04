# 🔧 TROUBLESHOOTING - Webhook send-audio Error 403

**Fecha:** 04 Febrero 2026  
**Estado:** 🔴 Error 403 persistente

---

## 🔍 Tests Realizados

| Header | Valor | Status |
|--------|-------|--------|
| `livechat_auth` | `2025_livechat_auth` | ❌ 403 |
| `LiveChat_auth` | `2025_livechat_auth` | ❌ 403 |
| `Authorization` | `6ff68...` | ❌ 403 |
| `Authorization` | `Bearer 6ff68...` | ❌ 403 |

**Conclusión:** El webhook está rechazando TODOS los tokens.

---

## 🎯 Posibles Causas

### 1. Workflow No Activado en N8N
- El workflow puede estar guardado pero NO activado
- **Solución:** Activar el workflow en N8N Dashboard

### 2. Credencial No Vinculada Correctamente
- La credencial existe pero el nodo Webhook no la está usando
- **Solución:** Revisar configuración del nodo Webhook en N8N

### 3. Header Name Incorrecto en N8N
- N8N puede estar esperando un header diferente
- **Solución:** Verificar qué header espera el nodo de autenticación

---

## ✅ Próximos Pasos

### 1. Verificar Workflow en N8N

1. **Abrir:** https://primary-dev-d75a.up.railway.app
2. **Buscar:** Workflow con path `/webhook/send-audio`
3. **Verificar:**
   - ✅ Workflow está **ACTIVO** (toggle en ON)
   - ✅ Nodo Webhook tiene la credencial `LiveChat_auth` seleccionada
   - ✅ En "Credential for Header Auth" está seleccionada correctamente
   - ✅ Header Name debería ser: `Authorization` (según tu screenshot)

### 2. Test Manual desde N8N

1. **Ir al workflow**
2. **Click en el nodo Webhook**
3. **Click en "Listen for Test Event"**
4. **Desde terminal, ejecutar:**

```bash
curl -X POST \
  https://primary-dev-d75a.up.railway.app/webhook/send-audio \
  -H "Content-Type: application/json" \
  -H "Authorization: 6ff68f7894567182331f6fbd79b674b9afdc00c2e64df1703cf167ba3ac8ccbd" \
  -d '{"audio_base64":"test_audio","uchat_id":"test123","filename":"test.mp3"}'
```

5. **Verificar que N8N reciba el request**

### 3. Comparar con send-img

Abre el workflow de `send-img` y compara:
- ¿Cómo está configurado el nodo Webhook?
- ¿Qué credencial usa?
- ¿Cómo está configurado el Header Auth?

---

## 🔄 Alternativa Temporal

Si no puedes hacer que `/webhook/send-audio` funcione ahora, puedo:

1. **Modificar la edge function** para usar `/webhook/send-img`
2. **Adaptar el payload** al formato que espera send-img
3. **N8N procesará el audio** como si fuera media

¿Quieres que implemente esta alternativa mientras debugueas el webhook?

---

**Última actualización:** 04 Febrero 2026  
**Estado:** Esperando verificación de configuración en N8N
