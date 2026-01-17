# Configurar Headers de Seguridad en CloudFront

## 1. Content-Security-Policy

**Dashboard AWS CloudFront:**
1. Behaviors → Edit
2. Response Headers Policy → Create policy
3. Agregar:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.railway.app wss://*.supabase.co; font-src 'self' data:; frame-ancestors 'self'
```

## 2. Permissions-Policy

```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

## Alternativa: Meta tags

Agregar a index.html:
```html
<meta http-equiv="Content-Security-Policy" content="...">
<meta http-equiv="Permissions-Policy" content="...">
```

**Limitación:** Meta tags de CSP no soportan todas las directivas
