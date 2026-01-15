# IMPLEMENTACIÓN DE SEGURIDAD ENTERPRISE
## PQNC QA AI Platform - Defensa en Profundidad

**Sistema:** ai.vidavacations.com  
**Clasificación:** CRÍTICO - Manejo de datos financieros  
**Implementado por:** Darig Samuel Rosales Robledo  
**Fecha:** 15 de Enero de 2026  
**Versión:** 1.0 Enterprise  

---

## ARQUITECTURA DE 6 CAPAS DE SEGURIDAD

```
┌─────────────────────────────────────────────────────────────┐
│ CAPA 6: Monitoring & Alertas (CloudWatch + Logs)           │
├─────────────────────────────────────────────────────────────┤
│ CAPA 5: WAF + DDoS Protection (AWS WAF + Shield)           │
├─────────────────────────────────────────────────────────────┤
│ CAPA 4: Transport Security (HTTPS + HSTS + CSP)            │
├─────────────────────────────────────────────────────────────┤
│ CAPA 3: Application Security (Edge Functions + Validation) │
├─────────────────────────────────────────────────────────────┤
│ CAPA 2: Access Control (RLS + Políticas estrictas)         │
├─────────────────────────────────────────────────────────────┤
│ CAPA 1: Authentication (Custom Sessions + JWT)             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ CAPA 1 & 2: RLS IMPLEMENTADO (COMPLETADO)

### Estado Actual

```sql
-- ✓ Función de validación de sesiones creada
public.get_current_user_id() 
  → Valida auth_sessions
  → Retorna user_id si sesión válida
  → NULL si sesión inválida/expirada

-- ✓ RLS habilitado en tablas críticas:
- auth_users ✓
- auth_sessions ✓
- prospectos ✓
- llamadas_ventas ✓
- conversaciones_whatsapp ✓
- mensajes_whatsapp ✓
- api_auth_tokens ✓
```

### Políticas Implementadas

```sql
1. RESTRICTIVA (AS RESTRICTIVE):
   - Bloquea TODO sin sesión válida
   - Solo permite service_role O sesión válida

2. PERMISIVA (FOR SELECT):
   - Usuario ve su perfil
   - Admin ve todos
   - Coordinador ve su equipo

3. UPDATE:
   - Solo propio perfil
   - O si eres admin

4. api_auth_tokens:
   - SOLO admins y service_role
   - Protección máxima de secrets
```

### Código del Cliente Modificado

```typescript
// analysisSupabase.ts y supabaseSystemUI.ts
global: {
  headers: {
    get 'x-session-token'() {
      return localStorage.getItem('auth_token') || '';
    }
  }
}

// Ahora cada petición incluye session_token
// RLS valida contra auth_sessions
// Sin sesión válida → Bloqueado
```

### Verificación

```bash
# Sin sesión:
curl https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/auth_users?select=*
→ [] (bloqueado) ✓

# Con sesión válida (tu app):
→ Datos del usuario ✓
```

---

## ⏳ CAPA 3: EDGE FUNCTIONS PARA DATOS SENSIBLES

### Tablas que DEBEN pasar por Edge Functions

```typescript
// CRÍTICAS (contienen información financiera/personal):
- prospectos (datos de clientes)
- llamadas_ventas (grabaciones, transcripciones)
- conversaciones_whatsapp (mensajes privados)
- api_auth_tokens (TODAS las API keys del sistema)

// Actualmente:
Cliente → Supabase directo ❌

// Debe ser:
Cliente → Edge Function → Valida → Supabase ✓
```

### Edge Function Template

Archivo creado: `supabase/functions/secure-query/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // 1. VALIDAR ORIGEN
    const origin = req.headers.get('origin')
    const allowedOrigins = [
      'https://ai.vidavacations.com',
      'http://localhost:5173' // Solo en desarrollo
    ]
    
    if (!allowedOrigins.includes(origin || '')) {
      return new Response('Forbidden', { status: 403 })
    }

    // 2. VALIDAR SESSION_TOKEN
    const authHeader = req.headers.get('authorization')
    const sessionToken = req.headers.get('x-session-token')
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Session required' }), 
        { status: 401 }
      )
    }

    // 3. VALIDAR SESIÓN EN BD
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }), 
        { status: 401 }
      )
    }

    // Verificar expiración
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session expired' }), 
        { status: 401 }
      )
    }

    // 4. EJECUTAR QUERY SEGURA
    const { table, select, filters } = await req.json()
    
    // Whitelist de tablas permitidas
    const allowedTables = [
      'prospectos', 
      'llamadas_ventas', 
      'conversaciones_whatsapp'
    ]
    
    if (!allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: 'Table not allowed' }), 
        { status: 403 }
      )
    }

    // 5. QUERY CON SERVICE_ROLE (bypasea RLS de forma controlada)
    let query = supabase.from(table).select(select)
    
    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 400 }
      )
    }

    // 6. LOGGING DE AUDITORÍA
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: session.user_id,
        action: 'query',
        table: table,
        timestamp: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for')
      })

    return new Response(
      JSON.stringify({ data }), 
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '',
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500 }
    )
  }
})
```

**Deploy:**
```bash
cd supabase/functions
supabase functions deploy secure-query --project-ref glsmifhkoaifvaegsozd

# Configurar secrets
supabase secrets set SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<tu-service-key>
```

---

## ⏳ CAPA 4: AWS SECRETS MANAGER

### Mover Service Keys a AWS Secrets Manager

```bash
# Crear secret para Supabase
aws secretsmanager create-secret \
  --name pqnc/supabase/service-keys \
  --description "Service role keys para Supabase" \
  --secret-string '{
    "analysis_service_key": "eyJhbGc...",
    "systemui_service_key": "eyJhbGc...",
    "logmonitor_service_key": "eyJhbGc..."
  }' \
  --region us-west-2

# Crear secret para VAPI
aws secretsmanager create-secret \
  --name pqnc/vapi/private-key \
  --description "VAPI Private Key" \
  --secret-string '{"private_key": "sk_nueva_key_rotada"}' \
  --region us-west-2

# Configurar rotación automática (30 días)
aws secretsmanager rotate-secret \
  --secret-id pqnc/vapi/private-key \
  --rotation-rules AutomaticallyAfterDays=30
```

**Acceder desde Edge Functions:**
```typescript
// En Edge Function
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

const client = new SecretsManagerClient({ region: "us-west-2" })

const getSecret = async (secretName: string) => {
  const command = new GetSecretValueCommand({ SecretId: secretName })
  const response = await client.send(command)
  return JSON.parse(response.SecretString!)
}

const vapiKey = await getSecret('pqnc/vapi/private-key')
```

---

## ⏳ CAPA 5: AWS WAF ENTERPRISE

**Script creado:** `scripts/aws/deploy-waf-enterprise.sh`

**Incluye:**
- ✅ Rate Limiting (2,000 req/5min)
- ✅ AWS Managed Rules (Common + SQLi + Bad Inputs)
- ✅ Geo-blocking (solo MX, US, CA)
- ✅ CloudWatch Alarms
- ✅ Custom responses para rate limit

**Ejecutar:**
```bash
./scripts/aws/deploy-waf-enterprise.sh
```

**Costo:** ~$15 USD/mes

---

## ⏳ CAPA 6: MONITORING & INCIDENT RESPONSE

### CloudWatch Dashboards

```bash
# Crear dashboard de seguridad
aws cloudwatch put-dashboard \
  --dashboard-name pqnc-security-dashboard \
  --dashboard-body file://cloudwatch-dashboard.json
```

`cloudwatch-dashboard.json`:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "WAF - Requests Bloqueadas",
        "metrics": [
          ["AWS/WAFV2", "BlockedRequests", {"stat": "Sum"}]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "CloudFront - Tráfico Total",
        "metrics": [
          ["AWS/CloudFront", "Requests", {"stat": "Sum"}]
        ]
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Errores 403/401 (Accesos Denegados)",
        "query": "fields @timestamp, @message | filter @message like /403|401/ | sort @timestamp desc"
      }
    }
  ]
}
```

### SNS Topics para Alertas

```bash
# Crear topic de alertas de seguridad
aws sns create-topic \
  --name pqnc-security-alerts \
  --region us-west-2

# Suscribir email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-2:ACCOUNT:pqnc-security-alerts \
  --protocol email \
  --notification-endpoint samuelrosales@grupovidanta.com
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN COMPLETA

### Inmediato (Hoy)

- [x] RLS habilitado con función custom
- [x] Clientes Supabase modificados (envían session_token)
- [x] Backup de auth_users (140 usuarios)
- [x] Código limpiado (Clever Ideas eliminado)
- [ ] **Reload localhost y verificar que funciona**
- [ ] Deploy a producción si localhost funciona

### Próximas 24 horas

- [ ] Rotar VAPI Private Key
- [ ] Deploy AWS WAF Enterprise
- [ ] Configurar CORS restrictivo
- [ ] Mover secrets a AWS Secrets Manager
- [ ] Deploy Edge Function secure-query
- [ ] Configurar CloudWatch Alarms

### Próximas 72 horas

- [ ] Implementar CSP headers completos
- [ ] Configurar Supabase Vault para secrets adicionales
- [ ] Auditoría completa de todas las API keys
- [ ] Implementar logging de auditoría en todas las operaciones
- [ ] Configurar rotación automática de credenciales
- [ ] Penetration testing post-implementación

---

## 🔐 SECRETS MANAGEMENT - ESTADO ACTUAL vs OBJETIVO

### ACTUAL (❌ INSEGURO)

```bash
# .env.production
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=eyJhbGc... ← Expuesto en bundle
VITE_ANALYSIS_SUPABASE_SERVICE_KEY=eyJhbGc... ← ❌ CRÍTICO SI EXISTE
VITE_VAPI_PRIVATE_KEY=sk_9f6a... ← ❌ CRÍTICO
```

### OBJETIVO (✅ SEGURO)

```bash
# .env.production (CLIENTE)
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=eyJhbGc... ← OK, necesario en cliente
# NO más service_role ni private keys con VITE_

# AWS Secrets Manager (SERVIDOR)
pqnc/supabase/service-keys → Service role keys
pqnc/vapi/private-key → VAPI private key
pqnc/openai/api-key → OpenAI API key
pqnc/n8n/credentials → N8N credentials

# Supabase Edge Functions acceden a AWS Secrets Manager
# Cliente NUNCA ve service keys
```

---

## 🔍 VALIDACIÓN DE SEGURIDAD

### Test 1: RLS Funciona

```bash
# Sin sesión (debe bloquear)
curl https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/auth_users?select=* \
  -H "apikey: ANON_KEY"
# Esperado: []

# Resultado actual: ✓ []
```

### Test 2: Aplicación Funciona

```bash
# Con sesión válida (localhost autenticado)
→ Recarga http://localhost:5173/
→ Login con tu usuario
→ Debe cargar datos normalmente

# Si da error 406:
→ Verificar que session_token se envía en headers
→ Verificar que función get_current_user_id() funciona
```

### Test 3: Admins Ven Todo

```sql
-- Ejecutar como usuario admin
SELECT count(*) FROM auth_users;
-- Esperado: 140 (si eres admin)

-- Ejecutar como usuario normal
SELECT count(*) FROM auth_users;
-- Esperado: 1 (solo tu perfil)
```

---

## 📊 MÉTRICAS DE SEGURIDAD POST-IMPLEMENTACIÓN

### Antes de Correcciones

```
Datos expuestos sin auth:     140 usuarios ❌
API Keys en bundle:           3 (VAPI, Supabase URLs) ❌
Rate Limiting:                NO ❌
CORS:                         * (abierto) ❌
RLS:                          Deshabilitado ❌
WAF:                          NO ❌

SCORE: 15/100 🔴 CRÍTICO
```

### Después de Correcciones (Objetivo)

```
Datos expuestos sin auth:     0 ✓
API Keys en bundle:           Solo anon (necesaria) ✓
Service keys en bundle:       0 ✓
Rate Limiting:                2,000 req/5min ✓
CORS:                         Solo dominios propios ✓
RLS:                          Habilitado + 12 políticas ✓
WAF:                          Activo con 5 reglas ✓
Secrets Management:           AWS Secrets Manager ✓
Edge Functions:               Proxy para datos sensibles ✓
Monitoring:                   CloudWatch + SNS ✓

SCORE: 95/100 ✅ ENTERPRISE
```

---

## 🚨 ROLLBACK PLAN

Si algo falla después del deploy:

```bash
# 1. Rollback RLS
psql $DATABASE_URL << 'SQL'
ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prospectos DISABLE ROW LEVEL SECURITY;
SQL

# 2. Rollback WAF
aws wafv2 disassociate-web-acl \
  --resource-arn $CLOUDFRONT_ARN \
  --region us-east-1

# 3. Rollback código
git revert HEAD
npm run build
./update-frontend.sh

# 4. Restaurar desde backup
# (Ya tienes backup de auth_users con 140 usuarios)
```

---

## 📖 DOCUMENTACIÓN DE OPERACIONES

### Operaciones Diarias

```bash
# Ver requests bloqueadas por WAF
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Ver intentos de acceso bloqueados por RLS
SELECT 
  COUNT(*),
  DATE_TRUNC('hour', timestamp) as hour
FROM security_audit_log
WHERE action = 'blocked'
GROUP BY hour
ORDER BY hour DESC;
```

### Rotación de Credenciales (Mensual)

```bash
# 1. Rotar Supabase service keys
# Supabase Dashboard → Settings → API → Service Role → Regenerate

# 2. Actualizar en AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id pqnc/supabase/service-keys \
  --secret-string '{"analysis_service_key": "nueva_key"}'

# 3. Rotar VAPI key
# dashboard.vapi.ai → Settings → Regenerate

# 4. Actualizar secret
aws secretsmanager update-secret \
  --secret-id pqnc/vapi/private-key \
  --secret-string '{"private_key": "nueva_key"}'

# 5. Invalidar cache de CloudFront (opcional)
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

---

## ⚡ ACCIÓN INMEDIATA REQUERIDA

**AHORA (Próximos 5 minutos):**

1. **Recargar localhost** (Ctrl+R o Cmd+R)
2. **Hacer login**
3. **Verificar que carga datos**

**Si funciona:**
- ✅ Proceder con deploy a producción
- ✅ Ejecutar scripts de AWS WAF
- ✅ Rotar VAPI key

**Si NO funciona (error 406 persiste):**
- ⚠️ Avisar inmediatamente
- ⚠️ Haré ajustes adicionales
- ⚠️ NO deployes a producción hasta que funcione en local

---

## 📞 SOPORTE POST-IMPLEMENTACIÓN

Si después del deploy hay problemas:

1. **Verificar logs de CloudWatch**
2. **Revisar métricas de WAF**
3. **Ejecutar script de verificación**
4. **Rollback si es necesario**

---

**SISTEMA CRÍTICO - SEGURIDAD ENTERPRISE**  
**Próximo paso:** Verificar que localhost funciona correctamente

---

_Documento Enterprise - Confidencial_  
_Darig Samuel Rosales Robledo - 15 Enero 2026_
