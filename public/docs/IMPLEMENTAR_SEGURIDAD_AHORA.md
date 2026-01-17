# IMPLEMENTACIÓN DE SEGURIDAD - ACCIÓN INMEDIATA

## ESTADO ACTUAL

**RLS implementado:**
- ✅ Habilitado en: prospectos, llamadas_ventas, conversaciones_whatsapp, mensajes_whatsapp, api_auth_tokens
- ✅ Función validate_session() creada (permisiva por ahora)
- ✅ Sistema funcional

**Protección actual:**
- ✅ api_auth_tokens: Solo service_role (CRÍTICA protegida)
- ⚠️ Otras tablas: Accesibles con anon_key

---

## SOLUCIÓN: SEGURIDAD EN 4 PASOS

### PASO 1: AWS WAF (Ejecutar AHORA)

```bash
cd ~/Documents/pqnc-qa-ai-platform
./scripts/aws/deploy-waf-enterprise.sh
```

**Esto da:**
- Rate limiting: 2,000 req/5min
- Protección DDoS
- Geo-blocking (solo MX, US, CA)
- SQL injection protection

### PASO 2: Rotar VAPI Private Key (5 min)

```bash
# 1. dashboard.vapi.ai → Settings → Regenerate Private Key
# 2. Copiar nueva key
# 3. Actualizar en Supabase:
supabase secrets set VAPI_PRIVATE_KEY=nueva_key_aqui
```

### PASO 3: Proteger Anon Key con dominio

**En Supabase Dashboard:**
```
Project glsmifhkoaifvaegsozd → Settings → API
→ Anon key → Configure
→ Allowed domains: ai.vidavacations.com, localhost:5173
```

### PASO 4: Verificar seguridad

```bash
# Debe retornar vacío desde dominio no autorizado
curl https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/prospectos?select=*
→ Bloqueado por configuración de dominio
```

---

## ARQUITECTURA FINAL DE SEGURIDAD

```
CAPA 1: AWS WAF
├─ Rate limiting
├─ DDoS protection
└─ Geo-blocking

CAPA 2: Supabase Domain Restriction
├─ Anon key solo funciona desde dominios permitidos
└─ Bloquea scrapers externos

CAPA 3: RLS en api_auth_tokens
├─ API keys protegidas
└─ Solo service_role accede

CAPA 4: Validación en código
├─ Permisos por rol
└─ Filtros por coordinación
```

**Esta combinación da seguridad ROBUSTA sin romper operación**

---

_Ejecutar: ./scripts/aws/deploy-waf-enterprise.sh_
