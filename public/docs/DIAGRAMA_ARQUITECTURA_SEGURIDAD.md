# DIAGRAMA DE ARQUITECTURA - SEGURIDAD ENTERPRISE
**Sistema:** PQNC QA AI Platform  
**Dominio:** https://ai.vidavacations.com  
**Fecha:** 15 Enero 2026  

---

## ARQUITECTURA COMPLETA

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USUARIO (Navegador)                                                     │
│ ├─ Ejecuta JavaScript del frontend                                     │
│ ├─ localStorage: session_token (auth custom)                           │
│ └─ NO tiene service_role key                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CAPA 1: AWS CLOUDFRONT (CDN)                                            │
│ ├─ Distribution: E19ZID7TVR08JG                                        │
│ ├─ Domain: d3m6zgat40u0u1.cloudfront.net → ai.vidavacations.com        │
│ ├─ Origin: S3 bucket (pqnc-qa-ai-frontend)                             │
│ └─ Cache: 24 horas para assets estáticos                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Requests
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CAPA 2: AWS WAF (Web Application Firewall)                              │
│ ├─ Web ACL: frontend-ip-restriction                                    │
│ ├─ Regla 1: IP Whitelist (IPs corporativas autorizadas)                │
│ ├─ Regla 2: Rate Limiting (5,000 req/5min por IP)                      │
│ ├─ Regla 3: AWS Managed Rules Common (XSS, Path Traversal)             │
│ ├─ Regla 4: Known Bad Inputs (exploits conocidos)                      │
│ └─ Regla 5: SQL Injection Protection                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ↓                               ↓
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ S3 BUCKET                    │   │ REQUESTS A API               │
│ Frontend estático            │   │ glsmifhkoaifvaegsozd...      │
│ (HTML, JS, CSS, assets)      │   │                              │
└──────────────────────────────┘   └──────────────────────────────┘
                                                    │
                                                    │
                                                    ↓
                            ┌─────────────────────────────────────┐
                            │ FRONTEND JAVASCRIPT                 │
                            │ ├─ Anon Key: eyJh... (role: anon)  │
                            │ ├─ Session Token en localStorage   │
                            │ └─ Llama a Edge Functions          │
                            └─────────────────────────────────────┘
                                                    │
                                                    │ POST /functions/v1/secure-query
                                                    │ Headers:
                                                    │ - Authorization: Bearer <anon_key>
                                                    │ - x-session-token: <session_token>
                                                    │ Body: {table, select, filters...}
                                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CAPA 3: SUPABASE EDGE FUNCTION (secure-query)                           │
│ Runtime: Deno en Supabase Cloud                                         │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ VALIDACIONES:                                                   │    │
│ │ 1. ✓ Origen permitido (ai.vidavacations.com, localhost, N8N)   │    │
│ │ 2. ✓ Session token presente                                    │    │
│ │ 3. ✓ Sesión existe en auth_sessions                            │    │
│ │ 4. ✓ Sesión NO expirada                                        │    │
│ │ 5. ✓ Tabla en whitelist                                        │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│ SECRETS (Supabase Vault):                                               │
│ ├─ SUPABASE_URL                                                         │
│ └─ SUPABASE_SERVICE_ROLE_KEY ← AQUÍ está segura                         │
│                                                                          │
│ Cliente Supabase:                                                        │
│ └─ createClient(URL, SERVICE_ROLE_KEY)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Query con SERVICE_ROLE
                                    │ (bypasea RLS)
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CAPA 4: SUPABASE REST API                                               │
│ ├─ PostgREST (API REST sobre PostgreSQL)                               │
│ ├─ Recibe: Authorization: Bearer <service_role>                        │
│ └─ Bypasea RLS (solo para Edge Function autenticada)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CAPA 5: POSTGRESQL con RLS                                              │
│                                                                          │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ TABLAS CON RLS HABILITADO:                                        │  │
│ │                                                                   │  │
│ │ ✅ api_auth_tokens                                                │  │
│ │    └─ Policy: RESTRICTIVE - Solo service_role                    │  │
│ │                                                                   │  │
│ │ ✅ prospectos (1,994 registros)                                   │  │
│ │    └─ Policy: RESTRICTIVE - Solo service_role                    │  │
│ │                                                                   │  │
│ │ ✅ llamadas_ventas (945 registros)                                │  │
│ │    └─ Policy: RESTRICTIVE - Solo service_role                    │  │
│ │                                                                   │  │
│ │ ✅ conversaciones_whatsapp (3,617 registros)                      │  │
│ │    └─ Policy: RESTRICTIVE - Solo service_role                    │  │
│ │                                                                   │  │
│ │ ✅ mensajes_whatsapp (23,660 registros)                           │  │
│ │    └─ Policy: RESTRICTIVE - Solo service_role                    │  │
│ │                                                                   │  │
│ │ ✅ auth_users (140 usuarios)                                      │  │
│ │    └─ Policy: RESTRICTIVE - Solo service_role                    │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ POLÍTICAS RLS:                                                           │
│ CREATE POLICY "tabla_service_only" AS RESTRICTIVE                       │
│   USING (current_setting('request.jwt.claims')::json->>'role'           │
│          = 'service_role')                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FLUJO DE DATOS DETALLADO

### QUERY NORMAL (Ej: Cargar prospectos)

```
1. Frontend
   └─ secureFrom('prospectos').select('*').limit(100)

2. SecureQueryBuilder
   └─ fetch('/functions/v1/secure-query', {
        headers: {
          'Authorization': 'Bearer <anon_key>',
          'x-session-token': localStorage.getItem('auth_token')
        },
        body: JSON.stringify({
          table: 'prospectos',
          select: '*',
          limit: 100
        })
      })

3. Edge Function secure-query
   ├─ Valida session_token en auth_sessions
   ├─ Obtiene service_role de secrets
   └─ supabase.from('prospectos').select('*').limit(100)

4. Supabase REST API
   ├─ Recibe request con service_role
   ├─ RLS verifica: role = 'service_role' ✓
   └─ Retorna datos

5. Frontend
   └─ Recibe datos y renderiza
```

### ATAQUE EXTERNO (Con anon_key robada)

```
1. Atacante
   └─ curl "https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/prospectos"
        -H "apikey: <anon_key_robada>"

2. Supabase REST API
   ├─ Recibe request con anon_key
   ├─ RLS verifica: role = 'anon'
   ├─ Policy dice: SOLO service_role permitido
   └─ BLOQUEA: Retorna [] ✓

3. Atacante
   └─ Recibe: [] (sin datos)
```

---

## CAPAS DE DEFENSA

```
╔═══════════════════════════════════════════════════════════════╗
║ DEFENSA EN PROFUNDIDAD - 6 CAPAS                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ CAPA 1: AWS WAF                                               ║
║ ├─ Rate Limiting: 5,000 req/5min por IP                      ║
║ ├─ Managed Rules: XSS, SQLi, exploits                        ║
║ ├─ IP Whitelist: Solo IPs corporativas                       ║
║ └─ Geo-blocking: Solo MX, US, CA                             ║
║                                                               ║
║ CAPA 2: CloudFront                                            ║
║ ├─ HTTPS enforcement                                          ║
║ ├─ HSTS headers                                               ║
║ └─ Cache de contenido estático                               ║
║                                                               ║
║ CAPA 3: Edge Function Validation                              ║
║ ├─ Valida session_token                                      ║
║ ├─ Valida origen de request                                  ║
║ ├─ Whitelist de tablas permitidas                            ║
║ └─ Service_role en secrets (NO en código)                    ║
║                                                               ║
║ CAPA 4: Row Level Security (RLS)                              ║
║ ├─ 6 tablas con políticas restrictivas                       ║
║ ├─ Solo service_role puede acceder                           ║
║ └─ Anon_key bloqueada                                        ║
║                                                               ║
║ CAPA 5: Autenticación Custom                                  ║
║ ├─ Session tokens en auth_sessions                           ║
║ ├─ Validación de expiración                                  ║
║ └─ Control de permisos por rol                               ║
║                                                               ║
║ CAPA 6: Código del Cliente                                    ║
║ ├─ Validación de permisos en UI                              ║
║ ├─ No expone datos sensibles en consola                      ║
║ └─ No include service_role en bundle                         ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## COMPONENTES DESPLEGADOS

```
AWS (Región: us-west-2 + us-east-1):
├─ CloudFront Distribution
│  ├─ Domain: ai.vidavacations.com
│  ├─ Origin: S3 bucket (pqnc-qa-ai-frontend)
│  ├─ WAF: frontend-ip-restriction
│  └─ Response Headers: HSTS, X-Frame-Options
│
├─ WAF Web ACL (us-east-1)
│  ├─ 5 reglas activas
│  └─ CloudWatch metrics habilitadas
│
├─ S3 Bucket
│  ├─ Nombre: pqnc-qa-ai-frontend
│  ├─ Bundle: React app compilada
│  └─ Solo anon_key en bundle
│
└─ Secrets Manager
   └─ pqnc/supabase/service-role-key (para futuro)

Supabase (glsmifhkoaifvaegsozd):
├─ PostgreSQL Database
│  ├─ RLS habilitado en 6 tablas
│  ├─ 29,216 registros protegidos
│  └─ Políticas: AS RESTRICTIVE service_role
│
└─ Edge Functions
   ├─ secure-query (desplegada)
   ├─ Secrets: SUPABASE_SERVICE_ROLE_KEY
   └─ Runtime: Deno
```

---

## FLUJO DE AUTENTICACIÓN

```
┌──────────────────────────────────────────────────────────┐
│ 1. LOGIN                                                 │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend envía:                                          │
│ └─ email + password                                      │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ Edge Function valida contra auth_users                   │
│ (con service_role de secrets)                            │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ Si válido:                                               │
│ ├─ Crea session_token en auth_sessions                   │
│ ├─ Retorna session_token al frontend                     │
│ └─ Frontend guarda en localStorage                       │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 2. QUERIES POSTERIORES                                   │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ Frontend envía:                                          │
│ ├─ Authorization: Bearer <anon_key>                      │
│ ├─ x-session-token: <session_token>                     │
│ └─ Body: {table, select, filters}                       │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ Edge Function:                                           │
│ ├─ Valida session_token en auth_sessions                 │
│ ├─ Si válida → usa service_role                          │
│ └─ Si inválida → rechaza (401)                           │
└──────────────────────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────┐
│ PostgreSQL con RLS:                                      │
│ ├─ Recibe query con service_role                         │
│ ├─ RLS permite (policy restrictiva)                      │
│ └─ Retorna datos                                         │
└──────────────────────────────────────────────────────────┘
```

---

## PROTECCIÓN CONTRA ATAQUES

### Ataque 1: Robo de Anon Key del Bundle

```
Atacante:
└─ Descarga bundle de JavaScript
└─ Extrae anon_key: eyJh...role:anon...
└─ Intenta: curl .../rest/v1/prospectos -H "apikey: <anon_key>"

Defensa:
└─ RLS Policy: Solo service_role permitido
└─ Resultado: [] (bloqueado)
```

### Ataque 2: DDoS

```
Atacante:
└─ Envía 10,000 requests/minuto

Defensa:
├─ AWS WAF: Bloquea después de 5,000 en 5 min
├─ CloudFront: Cache sirve contenido
└─ Resultado: 429 Too Many Requests
```

### Ataque 3: SQL Injection

```
Atacante:
└─ Intenta: ?id=eq.' OR '1'='1

Defensa:
├─ AWS WAF Managed Rule: Detecta patrón SQLi
├─ Supabase: Prepared statements
└─ Resultado: 403 Forbidden
```

### Ataque 4: XSS

```
Atacante:
└─ Intenta: <script>alert(1)</script>

Defensa:
├─ AWS WAF: Detecta patrón XSS
├─ React: Escapa HTML automáticamente
└─ Resultado: 403 Forbidden o texto escapado
```

---

## VARIABLES DE ENTORNO

### Bundle de Producción (ai.vidavacations.com)

```javascript
// INCLUIDAS (públicas):
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=eyJh...role:anon... ✓
VITE_EDGE_FUNCTIONS_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_USE_SECURE_QUERIES=true

// NO INCLUIDAS (secretas):
VITE_ANALYSIS_SUPABASE_SERVICE_KEY ✗ (NO existe en .env.production)
```

### Supabase Edge Function Secrets

```
SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...role:service_role... ✓
(Encriptados en Supabase Vault)
```

---

## CONFIGURACIÓN DE SEGURIDAD

| Componente | Configuración | Estado |
|------------|---------------|--------|
| CloudFront HTTPS | Forzado | ✅ |
| HSTS | max-age=31536000 + preload | ✅ |
| WAF Rate Limit | 5,000/5min por IP | ✅ |
| WAF Managed Rules | 4 rulesets activos | ✅ |
| IP Restriction | Whitelist configurada | ✅ |
| RLS Database | 6 tablas habilitadas | ✅ |
| Service Role | En Supabase Vault | ✅ |
| Anon Key | En bundle (RLS la bloquea) | ✅ |

---

## MÉTRICAS DE SEGURIDAD

```
Datos protegidos:        29,216 registros
Tablas con RLS:          6/6 (100%)
Service_role expuesta:   NO ✅
API keys en bundle:      NO ✅
Rate limiting:           Activo ✅
Costo mensual:          +$7-8 USD
```

**SEGURIDAD ENTERPRISE COMPLETADA** ✅
