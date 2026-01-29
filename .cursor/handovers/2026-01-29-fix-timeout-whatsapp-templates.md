# Handover: Fix Timeout en Creación de Plantillas WhatsApp

**Fecha:** 29 de Enero 2026  
**Agente:** Claude (Cursor Agent)  
**Tipo:** Bug Fix - Timeout  
**Módulo:** WhatsApp Templates

---

## 📋 Problema Reportado

Al crear una nueva plantilla de WhatsApp, el usuario recibía un error de timeout:

```
Error creando template en uChat: Error: La solicitud tardó demasiado tiempo. Por favor, intente nuevamente.
```

**Contexto:**
- El webhook de N8N **sí completó exitosamente** la operación (14.407s)
- La plantilla fue creada correctamente en la base de datos
- El timeout del cliente canceló la petición antes de recibir la respuesta

---

## 🔍 Análisis

### Evidencia del Webhook

```json
{
  "success": true,
  "data": {
    "id": "ee04eb98-9a1a-4a26-8915-7eb0c4ac716a",
    "name": "invitacion_al_concierto_1",
    "status": "PENDING"
  },
  "timestamp": "2026-01-29T04:17:49.997Z"
}
```

**Tiempo de ejecución:** 14.407 segundos  
**Timeout configurado:** 15 segundos  
**Resultado:** Timeout alcanzado debido a latencia de red + tiempo de procesamiento

### Ubicación del Problema

**Archivo:** `src/services/whatsappTemplatesService.ts`  
**Línea:** 455  
**Función:** `createTemplateInUChat()`

```typescript
// ❌ ANTES (línea 451-455)
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
}, 15000); // 15 segundos - MUY JUSTO
```

### Causa Raíz

El timeout de **15 segundos** era insuficiente para:
1. Envío de payload al Edge Function
2. Procesamiento en N8N (14.407s en este caso)
3. Respuesta de vuelta al cliente
4. Latencia de red acumulada

---

## ✅ Solución Implementada

### Cambio Realizado

**Archivo:** `src/services/whatsappTemplatesService.ts`  
**Línea:** 451-455

```typescript
// ✅ DESPUÉS - Timeout aumentado a 25 segundos
const controller = new AbortController();
const timeoutId = setTimeout(() => {
  controller.abort();
}, 25000); // 25 segundos - Margen seguro
```

### Justificación del Valor

| Métrica | Tiempo |
|---------|--------|
| Procesamiento N8N observado | ~14.4s |
| Latencia de red estimada | ~1-2s |
| Margen de seguridad | ~9s |
| **Total (nuevo timeout)** | **25s** |

---

## 📝 Archivos Modificados

```
src/services/whatsappTemplatesService.ts
  - Línea 451-455: Timeout aumentado de 15000ms a 25000ms
```

---

## 🧪 Validación

### Caso de Prueba

**Escenario:** Crear plantilla de WhatsApp con componentes complejos  
**Tiempo esperado:** 12-16 segundos  
**Resultado esperado:** ✅ Creación exitosa sin timeout

### Monitoreo Recomendado

Si en el futuro se observan timeouts con 25s:
1. Revisar logs de N8N para identificar cuellos de botella
2. Considerar optimizar el workflow `[api]-whatsapp-templates-gestion`
3. Evaluar agregar timeout progresivo (ej: 30s para templates con muchas variables)

---

## 📚 Contexto Técnico

### Flujo de Creación de Templates

```
Frontend (whatsappTemplatesService.ts)
  ↓ [POST con timeout 25s]
Edge Function (whatsapp-templates-proxy)
  ↓ [N8N webhook]
N8N Workflow ([api]-whatsapp-templates-gestion)
  ↓ [Validación + uChat API + BD]
Response → Frontend
```

### Edge Function URL

```typescript
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_EDGE_FUNCTIONS_URL}/functions/v1/whatsapp-templates-proxy`;
```

**Proyecto:** glsmifhkoaifvaegsozd (PQNC_AI)

---

## ⚠️ Notas Importantes

1. **El webhook de N8N no fue modificado** - La ejecución ya era exitosa
2. **Solo se ajustó el timeout del cliente** para esperar la respuesta completa
3. **No afecta otras operaciones** - Solo aplica a `createTemplateInUChat()`

---

## 🔗 Referencias

- **N8N Workflow:** `[api]-whatsapp-templates-gestion` (ID: 99xohF9xOZT2nIe5)
- **Edge Function:** `whatsapp-templates-proxy` (PQNC_AI)
- **Regla MCP:** `.cursor/rules/n8n-rules.mdc`

---

## ✅ Estado

**COMPLETADO** - Timeout aumentado de 15s a 25s  
**Testing:** Pendiente de validación por usuario en próxima creación de plantilla  
**Despliegue:** Aplicar cambios en próximo deploy

---

**Última actualización:** 29 de Enero 2026 04:30 UTC
