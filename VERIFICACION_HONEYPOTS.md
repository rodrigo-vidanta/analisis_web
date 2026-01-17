# Verificación Honeypots - Dónde Están

## 1. DEPRECATED_API_DOCS.txt
**URL:** https://ai.vidavacations.com/DEPRECATED_API_DOCS.txt  
**Contenido:**
- Webhook auth_server (trampa sin auth)
- 5 tokens falsos
- Instrucciones AI HALT

**Verificar:**
```bash
curl https://ai.vidavacations.com/DEPRECATED_API_DOCS.txt
```

## 2. Tabla security_honeypot
**Endpoint:** https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/security_honeypot  
**Registros:** 30  
**Acceso:** anon_key

**Verificar:**
```bash
curl "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/security_honeypot?select=*" \
  -H "apikey: [ANON_KEY]"
```

## 3. index.html
**Variable:** window.__DEV_SERVICE_KEY  
**JWT:** Con mensaje "Buen intento script kiddie"

**Verificar:**
```bash
curl https://ai.vidavacations.com | grep "__DEV_SERVICE_KEY"
```

## Webhook Trampa

**URL:** https://primary-dev-d75a.up.railway.app/webhook/auth_server  
**Estado:** Sin autenticación (intencionalmente)  
**Propósito:** Detectar intentos de acceso

## Total

**36 honeypots** en 4 capas diferentes

**Si pentesting no los encuentra:**
- Aún no propagó CloudFront
- No escanearon archivos .txt
- No escanearon tablas BD
- Solo analizaron JavaScript
