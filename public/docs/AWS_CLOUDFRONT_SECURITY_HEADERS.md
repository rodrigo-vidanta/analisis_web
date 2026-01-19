# Response Headers Policy - CloudFront Security Headers

**Fecha:** 16 de Enero 2026  
**Estado:** ✅ Aplicada y Activa

---

## 📋 Resumen

Se ha aplicado una **Response Headers Policy** a la distribución de CloudFront para agregar headers de seguridad HTTP.

---

## 🔒 Headers de Seguridad Aplicados

| Header | Valor | Descripción |
|--------|-------|-------------|
| **Content-Security-Policy** | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.vidavacations.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' https://storage.vapi.ai https://*.supabase.co blob:; connect-src 'self' https://*.supabase.co https://glsmifhkoaifvaegsozd.supabase.co https://*.vidavacations.com https://api.ipify.org https://function-bun-dev-6d8e.up.railway.app wss://*.supabase.co wss://*.vapi.ai; frame-src 'self' https://*.supabase.co;` | Controla qué recursos puede cargar el navegador |
| **Strict-Transport-Security (HSTS)** | `max-age=31536000; includeSubDomains` | Fuerza conexiones HTTPS por 1 año |
| **X-Frame-Options** | `DENY` | Previene clickjacking |
| **X-XSS-Protection** | `1; mode=block` | Protección contra XSS |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Controla información del referrer |

---

## 📊 Configuración

### Response Headers Policy

| Propiedad | Valor |
|-----------|-------|
| **Policy ID** | `b1ffe080-f1e6-45f0-b740-9e83df9b5c19` |
| **Policy Name** | `security-headers-policy` |
| **Tipo** | Custom |

### CloudFront Distribution

| Propiedad | Valor |
|-----------|-------|
| **Distribution ID** | `E19ZID7TVR08JG` |
| **Estado** | `InProgress` (aplicándose) |
| **Policy Asociada** | `b1ffe080-f1e6-45f0-b740-9e83df9b5c19` |

---

## ⏳ Tiempo de Propagación

- **Estado Actual:** `InProgress`
- **Tiempo Estimado:** 15-20 minutos
- **Verificación:** Puedes verificar el estado en AWS Console

---

## 🔗 Enlaces Útiles

- **CloudFront Console:** https://console.aws.amazon.com/cloudfront/v3/home#/distributions/E19ZID7TVR08JG
- **Response Headers Policies:** https://console.aws.amazon.com/cloudfront/v3/home#/policies/response-headers

---

## ✅ Verificación

Para verificar que los headers están aplicados:

```bash
# Verificar policy asociada
aws cloudfront get-distribution-config \
  --id E19ZID7TVR08JG \
  --query 'DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId' \
  --output text

# Ver detalles de la policy
aws cloudfront get-response-headers-policy \
  --id b1ffe080-f1e6-45f0-b740-9e83df9b5c19

# Verificar headers en respuesta HTTP
curl -I https://ai.vidavacations.com
```

---

## 📝 Notas

- Los headers se aplican automáticamente a todas las respuestas de CloudFront
- El CSP está configurado para permitir recursos de:
  - **Supabase**: `https://*.supabase.co`, `https://glsmifhkoaifvaegsozd.supabase.co`, `wss://*.supabase.co`
  - **vidavacations.com**: `https://*.vidavacations.com`
  - **VAPI**: `wss://*.vapi.ai` (WebSocket para escuchar llamadas), `https://storage.vapi.ai` (archivos de audio)
  - **api.ipify.org**: Para obtener IP del cliente
  - **Railway Function**: `https://function-bun-dev-6d8e.up.railway.app` (servicio de upload de archivos)
  - **blob:** (para medios generados en memoria)
- HSTS está configurado para 1 año con includeSubDomains
- X-Frame-Options está en DENY para máxima seguridad

---

**Última actualización:** 18 de Enero 2026
