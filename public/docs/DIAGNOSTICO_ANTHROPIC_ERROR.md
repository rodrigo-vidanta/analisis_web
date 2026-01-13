# 🔍 Diagnóstico de Error Anthropic API

## Error Actual
```
not_found_error: model: claude-3-5-sonnet-20240620
Status: 404
```

## Posibles Causas

### 1. ❌ Modelo No Disponible en la Cuenta
**Causa más probable**: La API key de Anthropic no tiene acceso al modelo `claude-3-5-sonnet-20240620`.

**Soluciones**:
- Verifica tu plan en [console.anthropic.com](https://console.anthropic.com)
- Algunos modelos requieren acceso específico o planes de pago
- Prueba con modelos más básicos como `claude-3-sonnet-20240229`

### 2. 💰 Falta de Créditos/Tokens
**Cómo verificar**:
- Ve a [console.anthropic.com](https://console.anthropic.com)
- Revisa tu saldo de créditos
- Verifica si hay límites de uso

**Error esperado**: Normalmente sería 401/402, pero algunos casos pueden dar 404

### 3. 🔑 API Key Incorrecta o Sin Permisos
**Cómo verificar**:
- Verifica que la API key esté correctamente configurada en Supabase
- Asegúrate de que la key tenga acceso a modelos Claude
- Prueba la key directamente con curl:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: TU_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### 4. 📝 Modelo Descontinuado o Nombre Incorrecto
**Modelos válidos conocidos**:
- `claude-3-sonnet-20240229` ✅ (más básico, más probable que funcione)
- `claude-3-opus-20240229` ✅ (requiere plan superior)
- `claude-3-5-sonnet-20240620` ⚠️ (puede requerir acceso específico)
- `claude-3-5-haiku-20241022` ✅ (más rápido, más económico)

## Pasos de Diagnóstico

### Paso 1: Verificar API Key
```bash
# Verifica que la variable esté configurada en Supabase
supabase secrets list --project-ref zbylezfyagwrxoecioup
```

### Paso 2: Probar con Modelo Más Básico
Cambia temporalmente el modelo en `ParaphraseModal.tsx`:
```typescript
model: 'claude-3-sonnet-20240229', // Modelo más básico
```

### Paso 3: Verificar Créditos
1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Revisa "Usage & Billing"
3. Verifica que tengas créditos disponibles

### Paso 4: Probar API Key Directamente
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: TU_API_KEY_AQUI" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

## Solución Temporal

Si el problema persiste, puedes usar un modelo alternativo:

```typescript
// En ParaphraseModal.tsx
model: 'claude-3-sonnet-20240229', // Cambiar a modelo más básico
```

## Logs de Supabase

Revisa los logs de la Edge Function en:
https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/functions/anthropic-proxy/logs

Los logs mostrarán:
- Si la API key está configurada
- El error exacto de Anthropic
- El payload que se está enviando

