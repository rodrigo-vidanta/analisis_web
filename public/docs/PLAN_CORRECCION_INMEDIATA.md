# PLAN DE CORRECCIÓN INMEDIATA
## ai.vidavacations.com - Vulnerabilidades Críticas

**Fecha:** 14 de Enero de 2026  
**Prioridad:** P0 - CRÍTICO  
**Tiempo estimado:** 2-3 horas  

---

## 🔴 CORRECCIÓN #1: ROTAR VAPI PRIVATE KEY (15 MIN)

### Problema
```
VAPI Private Key expuesta en bundle:
sk_9f6a9d41ceeca6766de6fb27a9b8b1ddd678b1f738db6d65

Mensaje de VAPI: "you may be using the private key instead of the public key"
```

### Solución Inmediata

**Paso 1: Rotar key en VAPI Dashboard**
```
1. https://dashboard.vapi.ai/
2. Settings → API Keys
3. Click "Regenerate Private Key"
4. Copiar nueva key
5. Guardar como VAPI_PRIVATE_KEY (sin VITE_ prefix)
```

**Paso 2: Crear Edge Function para proxy**
```typescript
// supabase/functions/vapi-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY')!

serve(async (req) => {
  // Validar origen
  const origin = req.headers.get('origin')
  if (origin !== 'https://ai.vidavacations.com') {
    return new Response('Forbidden', { status: 403 })
  }

  const { endpoint, method, body } = await req.json()

  // Hacer petición a VAPI con key privada (servidor)
  const response = await fetch(`https://api.vapi.ai${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Paso 3: Actualizar código del cliente**
```typescript
// src/services/vapiService.ts

// ANTES (MAL):
const VAPI_PRIVATE_KEY = 'sk_9f6a9d41ceeca...'; // ❌ Hardcoded

async function createAssistant(config) {
  const response = await fetch('https://api.vapi.ai/assistant', {
    headers: {
      'Authorization': `Bearer ${VAPI_PRIVATE_KEY}` // ❌
    }
  });
}

// DESPUÉS (BIEN):
async function createAssistant(config) {
  // Llamar a Edge Function que tiene la private key
  const response = await fetch(
    'https://zbylezfyagwrxoecioup.supabase.co/functions/v1/vapi-proxy',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // ✓ Anon key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: '/assistant',
        method: 'POST',
        body: config
      })
    }
  );
}
```

**Paso 4: Deploy Edge Function**
```bash
cd supabase/functions
supabase functions deploy vapi-proxy --project-ref zbylezfyagwrxoecioup

# Configurar secret
supabase secrets set VAPI_PRIVATE_KEY=nueva-key-generada
```

**Paso 5: Rebuild y deploy frontend**
```bash
npm run build
./update-frontend.sh
```

**Tiempo:** 15 minutos

---

## 🔴 CORRECCIÓN #2: ARREGLAR RLS EN auth_users (20 MIN)

### Problema
```
Con Anon Key se pueden leer emails y nombres:
[
  {"email":"leonardoirak@grupovidanta.com","full_name":"Leonardo Sanchez"},
  {"email":"ejecutivo@grupovidanta.com","full_name":"Panfilo Mestas"}
]

140 usuarios expuestos
```

### Solución

**Conectar a Supabase y ejecutar:**

```sql
-- 1. Verificar estado actual de RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'auth_users';

-- Si rowsecurity = false → Habilitar
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas permisivas (si existen)
DROP POLICY IF EXISTS "Allow public read" ON auth_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON auth_users;

-- 3. Crear política restrictiva
CREATE POLICY "Usuarios solo ven su propio perfil" ON auth_users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los usuarios" ON auth_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users 
      WHERE id = auth.uid() 
      AND role_id IN (
        SELECT id FROM auth_roles WHERE role_name IN ('Super Admin', 'Admin')
      )
    )
  );

-- 4. Verificar que funcionó
-- Intentar SELECT sin autenticación (debe fallar)
SET request.jwt.claims = '{"role":"anon"}';
SELECT * FROM auth_users; 
-- Debe retornar: 0 rows (o error de permisos)
```

**Verificación inmediata:**
```bash
# Probar de nuevo con Anon Key
ANON_KEY="eyJhbGc..."

curl "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/auth_users?select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY"

# Resultado esperado:
# [] (array vacío) o {"code":"42501","message":"permission denied"}
```

**Tiempo:** 20 minutos

---

## 🟡 CORRECCIÓN #3: ELIMINAR PROYECTO PROHIBIDO (10 MIN)

### Problema
```
rnhejbuubpbnojalljso.supabase.co (Clever Ideas)
→ Proyecto de otra aplicación
→ No debe estar en este código
```

### Solución

**Buscar referencias en código:**
```bash
cd ~/Documents/pqnc-qa-ai-platform

# Buscar todas las referencias
grep -r "rnhejbuubpbnojalljso" src/

# Ejemplo de output esperado:
# src/components/algo/Component.tsx:  const url = 'https://rnhejbuubpbnojalljso.supabase.co'
```

**Eliminar referencias:**
```typescript
// Buscar archivos que lo usan y eliminar/comentar

// src/config/supabase.ts o similar
// ANTES:
const cleverSupabase = createClient(
  'https://rnhejbuubpbnojalljso.supabase.co',
  'key...'
); // ❌ ELIMINAR

// DESPUÉS:
// Usar solo los clientes correctos: analysisSupabase, supabaseSystemUI
```

**Rebuild:**
```bash
npm run build
./update-frontend.sh
```

**Tiempo:** 10 minutos

---

## 🟡 CORRECCIÓN #4: INVESTIGAR PROYECTO DESCONOCIDO (5 MIN)

### Problema
```
dffuwdzybhypxfzrmdcz.supabase.co
→ No documentado
→ Origen desconocido
```

### Solución

**Buscar en código:**
```bash
grep -r "dffuwdzybhypxfzrmdcz" src/

# Si aparece → Documentar en arquitectura
# Si no aparece → Puede ser dependency de un paquete npm
```

**Verificar dependencies:**
```bash
grep -r "dffuwdzybhypxfzrmdcz" node_modules/
```

**Acción:**
- Si es necesario → Documentar en docs/
- Si NO es necesario → Eliminar referencias

**Tiempo:** 5 minutos

---

## 🔴 CORRECCIÓN #5: IMPLEMENTAR AWS WAF (60 MIN)

### Solución con Script Automatizado

**Archivo:** `scripts/aws/deploy-waf-quick.sh`

```bash
#!/bin/bash
# Script de despliegue rápido de WAF

set -e

echo "🛡️ Desplegando AWS WAF para ai.vidavacations.com..."

# 1. Crear Web ACL
cat > /tmp/waf-config.json << 'EOF'
{
  "Name": "pqnc-waf",
  "Scope": "CLOUDFRONT",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimit"
      }
    },
    {
      "Name": "AWSManagedRules",
      "Priority": 2,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRules"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "pqnc-waf"
  }
}
EOF

# 2. Crear WAF
aws wafv2 create-web-acl \
  --cli-input-json file:///tmp/waf-config.json \
  --region us-east-1

# 3. Obtener ARN del WAF
WAF_ARN=$(aws wafv2 list-web-acls \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --query "WebACLs[?Name=='pqnc-waf'].ARN" \
  --output text)

echo "WAF creado: $WAF_ARN"

# 4. Obtener Distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, 'ai.vidavacations.com')]].Id" \
  --output text)

echo "Distribution ID: $DIST_ID"

# 5. Asociar WAF a CloudFront
aws cloudfront get-distribution-config \
  --id $DIST_ID > /tmp/dist-config.json

# Editar manualmente o con jq
jq '.DistributionConfig.WebACLId = "'$WAF_ARN'"' /tmp/dist-config.json > /tmp/dist-config-updated.json

ETAG=$(jq -r '.ETag' /tmp/dist-config.json)

aws cloudfront update-distribution \
  --id $DIST_ID \
  --if-match $ETAG \
  --distribution-config file:///tmp/dist-config-updated.json

echo "✓ WAF asociado a CloudFront"
echo "✓ Se aplicará en ~5-10 minutos"
```

**Ejecutar:**
```bash
chmod +x scripts/aws/deploy-waf-quick.sh
./scripts/aws/deploy-waf-quick.sh
```

**Tiempo:** 60 minutos (incluyendo propagación)

---

## 🔴 CORRECCIÓN #6: CORS EN CLOUDFRONT (30 MIN)

**Archivo:** `scripts/aws/fix-cors-cloudfront.sh`

```bash
#!/bin/bash

cat > /tmp/response-headers-policy.json << 'EOF'
{
  "ResponseHeadersPolicyConfig": {
    "Name": "pqnc-security-headers",
    "CorsConfig": {
      "AccessControlAllowOrigins": {
        "Quantity": 1,
        "Items": ["https://ai.vidavacations.com"]
      },
      "AccessControlAllowMethods": {
        "Quantity": 5,
        "Items": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      },
      "AccessControlAllowHeaders": {
        "Quantity": 1,
        "Items": ["*"]
      },
      "AccessControlAllowCredentials": true,
      "OriginOverride": true
    },
    "SecurityHeadersConfig": {
      "ContentSecurityPolicy": {
        "ContentSecurityPolicy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co https://api.openai.com https://api.vapi.ai;",
        "Override": true
      }
    }
  }
}
EOF

# Crear policy
aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file:///tmp/response-headers-policy.json

# Asociar a distribution (requiere actualización manual o script adicional)
echo "✓ Policy creada, ahora asociarla en CloudFront Dashboard"
```

**Tiempo:** 30 minutos

---

## 📋 RESUMEN DE CORRECCIONES INMEDIATAS

| # | Vulnerabilidad | Solución | Dónde | Tiempo |
|---|----------------|----------|-------|--------|
| 1 | VAPI Private Key | Rotar + Edge Function | VAPI + Supabase | 15 min |
| 2 | RLS auth_users | SQL policies | Supabase DB | 20 min |
| 3 | Proyecto prohibido | Eliminar referencias | Código | 10 min |
| 4 | Proyecto desconocido | Investigar | Código | 5 min |
| 5 | AWS WAF | Deploy script | AWS CLI | 60 min |
| 6 | CORS | CloudFront policy | AWS | 30 min |

**TOTAL: 2h 20min**

---

## 🔧 CORRECCIONES AUTOMÁTICAS QUE PUEDO HACER

### ✅ Puedo resolver AHORA:

**1. Arreglar RLS en auth_users**
```sql
-- Ejecutar con MCP de Supabase
```

**2. Crear Edge Function para VAPI**
```typescript
// Crear archivo en supabase/functions/vapi-proxy/
```

**3. Actualizar vapiService.ts**
```typescript
// Modificar para usar Edge Function
```

**4. Eliminar referencias a Clever Ideas**
```bash
# Buscar y eliminar del código
```

### ⚠️ Requieren acción manual:

**5. Rotar VAPI Private Key**
- Requiere acceso a dashboard.vapi.ai
- Solo tú puedes hacerlo

**6. Deploy de AWS WAF**
- Requiere AWS credentials
- Puedo dar el script, tú ejecutas

---

## 📊 PRIORIZACIÓN POR IMPACTO

```
╔══════════════════════════════════════════════════════════╗
║ IMPACTO SI NO SE CORRIGE                                ║
╠══════════════════════════════════════════════════════════╣
║ RLS auth_users        → Emails de 140 usuarios expuestos║
║ VAPI Private Key      → Llamadas no autorizadas ($$$$)  ║
║ AWS WAF               → DDoS viable                      ║
║ CORS                  → Phishing + robo de datos         ║
║ Proyecto prohibido    → Bug  potenciales                ║
╚══════════════════════════════════════════════════════════╝
```

---

## ⚡ PLAN EJECUTIVO

**AHORA (autorízame):**
- [x] Arreglar RLS en auth_users (SQL)
- [x] Crear Edge Function VAPI
- [x] Actualizar vapiService.ts
- [x] Eliminar clever-ideas del código

**TÚ HACES (después):**
- [ ] Rotar VAPI key en dashboard
- [ ] Ejecutar script de AWS WAF
- [ ] Rebuild + deploy

**TIEMPO TOTAL: 2h 20min**

---

**¿Autorizo para hacer las correcciones de código/SQL que puedo resolver ahora?**
