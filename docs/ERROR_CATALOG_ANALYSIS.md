# Análisis de Catálogo de Errores - WhatsApp/N8N

**Fecha de análisis:** 3 de Febrero 2026  
**Fuente:** logs (1).csv (164 registros de error)  
**Período:** 17 Enero - 3 Febrero 2026

---

## 📊 Resumen Ejecutivo

### Distribución de Errores por Código

| Código | Título | Frecuencia | % |
|--------|--------|------------|---|
| **131049** | Límite de engagement | 79 | 48.2% |
| **131026** | Mensaje no entregable | 34 | 20.7% |
| **130472** | Usuario en experimento | 12 | 7.3% |
| **131053** | Error de carga de media | 6 | 3.7% |
| **MSG_OUTSIDE_24H** | Fuera de ventana 24h | 7 | 4.3% |
| **CONNECTION_ERROR** | Error de conexión | 5 | 3.0% |
| **REQUEST_TIMEOUT** | Timeout de solicitud | 5 | 3.0% |
| **CURL_TIMEOUT** | Timeout de cURL | 5 | 3.0% |
| **131000** | Error genérico WhatsApp | 4 | 2.4% |
| **132000** | Error en template | 2 | 1.2% |
| **131050** | Usuario opt-out | 1 | 0.6% |

### Distribución por Categoría

| Categoría | Frecuencia | % |
|-----------|------------|---|
| **Business Rules** (131049, 131050, 24h) | 87 | 53.0% |
| **WhatsApp API** (131026, 130472, 131000) | 50 | 30.5% |
| **Timeout/Connectivity** | 15 | 9.1% |
| **Media** (131053) | 6 | 3.7% |
| **Template** (132000) | 2 | 1.2% |

### Distribución por Severidad

| Severidad | Frecuencia | % |
|-----------|------------|---|
| **MEDIUM** | 91 | 55.5% |
| **HIGH** | 43 | 26.2% |
| **LOW** | 12 | 7.3% |
| **CRITICAL** | 1 | 0.6% |

### Errores Reintentables vs No Reintentables

- **Reintentables:** 102 (62.2%)
- **No Reintentables:** 42 (25.6%)

---

## 🔍 Análisis Detallado por Código

### 1. Error 131049 - Límite de Engagement (48.2%)

**Problema principal:** WhatsApp está bloqueando mensajes para mantener un "ecosistema saludable".

**Patrones identificados:**
- Concentración alta en fechas específicas (26 Enero: 16 errores)
- Usuarios recurrentes afectados (`user_ns` repetidos)
- Típicamente después de múltiples mensajes enviados

**Recomendaciones:**
1. **Implementar throttling:** Máximo 3 mensajes por usuario por día
2. **Cooldown period:** 24-48 horas entre mensajes masivos
3. **Score de engagement:** Trackear respuestas del usuario
4. **Priorizar usuarios activos:** Enviar solo a usuarios que han respondido recientemente

**Código relacionado:**
```typescript
// Validación antes de enviar
if (lastMessageSentAt && Date.now() - lastMessageSentAt < 24 * 60 * 60 * 1000) {
  if (messagesSentLast24h >= 3) {
    return { error: 'ENGAGEMENT_LIMIT', waitTime: '24h' };
  }
}
```

---

### 2. Error 131026 - Mensaje No Entregable (20.7%)

**Problema:** Números inválidos, bloqueados o WhatsApp desinstalado.

**Patrones:**
- Usuario `f190385u551712611` aparece 9 veces
- Múltiples reintentos al mismo número sin éxito

**Recomendaciones:**
1. **Sistema de validación de números:**
   - Después de 3 fallos consecutivos → marcar como "inactivo"
   - Verificar formato de número antes de enviar
2. **Base de datos de números inválidos:**
   - Mantener blacklist de números no entregables
   - Auto-actualizar estado en BD
3. **Política de reintentos:**
   - NO reintentar después de 131026
   - Notificar a coordinador para verificación manual

**Implementación sugerida:**
```typescript
// En servicio de WhatsApp
async function handleUndeliverable(userId: string, phoneNumber: string) {
  await supabase
    .from('prospectos')
    .update({ 
      whatsapp_status: 'undeliverable',
      last_delivery_error: '131026',
      last_error_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  // Incrementar contador de fallos
  await incrementFailureCounter(phoneNumber);
}
```

---

### 3. Error 130472 - Usuario en Experimento (7.3%)

**Problema:** Número en pruebas de WhatsApp (A/B testing interno).

**Patrones:**
- Usuarios específicos recurrentes (`f190385u511826951` aparece 5 veces)
- Temporal, se resuelve en 24-48 horas

**Recomendaciones:**
1. **Retry automático después de 24h**
2. **Marcar con flag especial:** `in_experiment: true`
3. **No contar como fallo permanente**

---

### 4. Error 131053 - Media Upload Error (3.7%)

**Problema:** Imágenes demasiado grandes o formato incorrecto.

**Análisis técnico:**
- Tamaños detectados: 5978552, 7209569, 7227317 bytes (>5MB)
- Formatos: Intentos de enviar WEBP (no soportado)

**Soluciones técnicas:**
1. **Validación pre-upload:**
```typescript
function validateImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/png', 'image/jpeg'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Imagen debe ser menor a 5MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Solo PNG y JPEG son permitidos' };
  }
  
  return { valid: true };
}
```

2. **Compresión automática:**
```typescript
async function compressImage(file: File): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = await createImageBitmap(file);
  
  // Redimensionar si es muy grande
  const maxDimension = 1920;
  let width = img.width;
  let height = img.height;
  
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = (height / width) * maxDimension;
      width = maxDimension;
    } else {
      width = (width / height) * maxDimension;
      height = maxDimension;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx?.drawImage(img, 0, 0, width, height);
  
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85);
  });
}
```

---

### 5. Errores de Timeout (9.1% combinado)

**Problema:** Latencia o sobrecarga de WhatsApp Graph API.

**Patrones temporales:**
- Picos en 21 Enero (7 timeouts entre 21:30 y 23:46)
- Típicamente después de 15 segundos

**Recomendaciones:**
1. **Retry con backoff exponencial:**
```typescript
async function sendWithRetry(message: Message, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendMessage(message);
    } catch (error) {
      if (isTimeoutError(error) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

2. **Circuit breaker pattern:**
```typescript
class WhatsAppCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private threshold = 5;
  private timeout = 60000; // 1 minuto
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  }
  
  private onSuccess() {
    this.failures = 0;
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
  
  private reset() {
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}
```

---

## 🎯 Plan de Acción Inmediato

### Prioridad 1: Reducir Errores 131049 (Engagement)
1. Implementar throttling en servicio de WhatsApp
2. Dashboard de "engagement score" por usuario
3. Alertas cuando usuario alcanza límite
4. Cooldown automático de 24h

### Prioridad 2: Sistema de Validación de Números
1. Tabla `phone_validation_status` en BD
2. Contador de fallos por número
3. Auto-desactivación después de 3 fallos 131026
4. Proceso de revalidación periódico

### Prioridad 3: Manejo de Media
1. Validación pre-upload (tamaño + formato)
2. Compresión automática de imágenes
3. Conversión WEBP → JPEG
4. Preview antes de enviar

### Prioridad 4: Resiliencia de Red
1. Retry con backoff exponencial
2. Circuit breaker para WhatsApp API
3. Queue de mensajes pendientes
4. Monitoring de latencia

---

## 📁 Archivos Creados

- **`src/types/errorCatalog.ts`** - Catálogo completo de errores con utilidades
- **`docs/ERROR_CATALOG_ANALYSIS.md`** - Este documento de análisis

---

## 🔧 Uso del Catálogo en la Interfaz

### Ejemplo 1: Mostrar mensaje amigable

```tsx
import { getUserFriendlyMessage, getErrorInfo } from '@/types/errorCatalog';

function ErrorNotification({ errorDescription }: { errorDescription: string }) {
  const errorInfo = getErrorInfo(errorDescription);
  const userMessage = getUserFriendlyMessage(errorDescription);
  
  return (
    <div className={`p-4 rounded-lg ${
      errorInfo?.severity === 'critical' ? 'bg-red-100' :
      errorInfo?.severity === 'high' ? 'bg-orange-100' :
      'bg-yellow-100'
    }`}>
      <h4 className="font-semibold">{errorInfo?.title || 'Error'}</h4>
      <p className="text-sm">{userMessage}</p>
      {errorInfo?.suggestedAction && (
        <p className="text-xs mt-2 text-gray-600">
          💡 {errorInfo.suggestedAction}
        </p>
      )}
    </div>
  );
}
```

### Ejemplo 2: Dashboard de errores

```tsx
import { generateErrorStats, ERROR_CATALOG } from '@/types/errorCatalog';

function ErrorDashboard({ errorLogs }: { errorLogs: string[] }) {
  const stats = generateErrorStats(errorLogs);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-white rounded shadow">
        <h3>Total de Errores</h3>
        <p className="text-3xl font-bold">{stats.totalErrors}</p>
      </div>
      
      <div className="p-4 bg-white rounded shadow">
        <h3>Reintentables</h3>
        <p className="text-3xl font-bold text-green-600">
          {stats.retryableCount}
        </p>
      </div>
      
      <div className="p-4 bg-white rounded shadow">
        <h3>Críticos</h3>
        <p className="text-3xl font-bold text-red-600">
          {stats.bySeverity.critical + stats.bySeverity.high}
        </p>
      </div>
      
      <div className="col-span-3 p-4 bg-white rounded shadow">
        <h3 className="mb-4">Top Errores</h3>
        {stats.topErrors.map(err => (
          <div key={err.code} className="flex justify-between py-2 border-b">
            <span>{err.title}</span>
            <span className="font-semibold">{err.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Ejemplo 3: Retry inteligente

```tsx
import { isRetryable, getErrorInfo } from '@/types/errorCatalog';

async function sendMessageWithRetry(message: Message) {
  try {
    return await sendMessage(message);
  } catch (error) {
    const errorDesc = error.message;
    
    if (isRetryable(errorDesc)) {
      const errorInfo = getErrorInfo(errorDesc);
      
      // Esperar tiempo sugerido según tipo de error
      const delay = errorInfo?.code === '131049' ? 24 * 60 * 60 * 1000 : 5000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return await sendMessage(message);
    }
    
    throw error; // No reintentar
  }
}
```

---

## 📚 Referencias

- [WhatsApp Cloud API Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy/)
- [N8N Error Handling](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger/)

---

**Última actualización:** 3 de Febrero 2026  
**Próxima revisión:** Después de implementar sistema de throttling
