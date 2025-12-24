# Plan de Remediación de Seguridad — PQNC QA AI Platform

**Fecha:** 2025-12-23  
**Estado:** Pendiente de implementación  
**Prioridad Global:** CRÍTICA  
**Objetivo:** Remediar vulnerabilidades sin afectar operación actual

---

## Resumen Ejecutivo

Se identificaron **26 vulnerabilidades** en dos auditorías independientes. Las categorías críticas son:

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Service Keys expuestas (Supabase) | 6 | CRÍTICA |
| Tokens/APIs hardcodeadas | 8 | CRÍTICA/ALTA |
| Edge Functions sin auth (CORS `*`) | 4 | CRÍTICA |
| XSS/DOM Injection | 3 | ALTA |
| Sesión en localStorage | 1 | MEDIA |
| SQL Privilegiado desde cliente | 2 | CRÍTICA |

---

## Matriz de Vulnerabilidades Confirmadas

### 🔴 CRÍTICAS (Acción Inmediata)

| ID | Archivo | Líneas | Problema | Confirmado |
|----|---------|--------|----------|------------|
| SEC-01 | `src/config/supabaseSystemUI.ts` | 22-24 | `service_role` hardcode como fallback | ✅ |
| SEC-02 | `src/config/supabase.ts` | 5-13 | Múltiples `service_role` en frontend | ✅ |
| SEC-03 | `src/config/pqncSupabase.ts` | 4-6 | `service_role` expuesto | ✅ |
| SEC-04 | `src/services/botPauseService.ts` | 20-21 | PostgREST con service key | ✅ |
| SEC-05 | `src/services/adminMessagesService.ts` | 104-141 | RPC `exec_sql` desde cliente | ✅ |
| SEC-06 | `supabase/functions/n8n-proxy/index.ts` | 21-22 | N8N API key hardcode + CORS `*` | ✅ |
| SEC-07 | `supabase/functions/send-img-proxy/index.ts` | 33 | `livechat_auth` hardcode + CORS `*` | ✅ |
| SEC-08 | `src/services/n8nService.ts` | 9 | N8N token en frontend | ✅ |
| SEC-09 | `src/services/elevenLabsService.ts` | 91 | ElevenLabs API key fallback | ✅ |

### 🟠 ALTAS

| ID | Archivo | Líneas | Problema | Confirmado |
|----|---------|--------|----------|------------|
| SEC-10 | `supabase/functions/anthropic-proxy/index.ts` | 3-6 | CORS `*` sin auth (API key en env ✅) | ✅ |
| SEC-11 | `supabase/functions/error-analisis-proxy/index.ts` | 6-9 | CORS `*` sin auth caller | ✅ |
| SEC-12 | `src/components/analysis/DetailedCallView.tsx` | 668-670 | XSS `dangerouslySetInnerHTML` | ✅ |
| SEC-13 | `src/components/JsonViewer.tsx` | 142-144 | XSS `dangerouslySetInnerHTML` | ✅ |
| SEC-14 | `src/components/Sidebar.tsx` | 804-808, 848-852 | `innerHTML` (fallback SVG) | ✅ |
| SEC-15 | `src/services/authService.ts` | 83-91 | `auth_token` en localStorage | ✅ |

---

## Plan de Remediación por Fases

### FASE 0: Preparación (0-4h)
> **Objetivo:** Preparar entorno sin cambios en producción

```bash
# 1. Crear rama de seguridad
git checkout -b security/remediation-2025-12-23

# 2. Backup de configuración actual
cp src/config/*.ts src/config/backup/

# 3. Verificar variables de entorno actuales
cat .env | grep -E "VITE_.*KEY|VITE_.*TOKEN"
```

---

### FASE 1: Variables de Entorno (4-8h)
> **Objetivo:** Mover secretos a `.env` sin romper funcionalidad

#### 1.1 Crear/actualizar `.env.local` y `.env.production`

```env
# Supabase System UI
VITE_SYSTEM_UI_SUPABASE_URL=https://zbylezfyagwrxoecioup.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=<anon_key>
# ⚠️ NO incluir service_role en frontend

# Supabase PQNC
VITE_PQNC_SUPABASE_URL=https://hmmfuhqgvsehkizlfzga.supabase.co
VITE_PQNC_SUPABASE_ANON_KEY=<anon_key>

# Supabase Main
VITE_MAIN_SUPABASE_URL=https://rnhejbuubpbnojalljso.supabase.co
VITE_MAIN_SUPABASE_ANON_KEY=<anon_key>

# N8N (solo para Edge Function, NO para frontend)
# VITE_N8N_API_KEY → Mover a Supabase secrets

# ElevenLabs (mover a backend/Edge)
# VITE_ELEVENLABS_API_KEY → Mover a Supabase secrets
```

#### 1.2 Eliminar fallbacks hardcodeados

**Archivo:** `src/config/supabaseSystemUI.ts`
```diff
- export const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY || 'eyJhbG...';
+ // ⚠️ Service key removida del frontend - usar Edge Functions para operaciones admin
+ export const SUPABASE_SERVICE_KEY = ''; // Deprecated: usar Edge Functions
```

**Archivo:** `src/config/supabase.ts`
```diff
- const mainSupabaseServiceKey = import.meta.env.VITE_MAIN_SUPABASE_SERVICE_KEY || 'eyJhbG...';
+ // Service keys movidas a backend - cliente usa solo anon_key + RLS
```

**Archivo:** `src/config/pqncSupabase.ts`
```diff
- const pqncSupabaseServiceRoleKey = import.meta.env.VITE_PQNC_SUPABASE_SERVICE_KEY || 'eyJhbG...';
+ // pqncSupabaseAdmin movido a Edge Function
```

---

### FASE 2: Edge Functions Seguras (8-16h)
> **Objetivo:** Crear proxies autenticados que reemplacen acceso directo

#### 2.1 Nueva Edge Function: `admin-operations`

```typescript
// supabase/functions/admin-operations/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://pqnc-qa.vidanta.ai', // ⚠️ RESTRINGIR
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ Verificar JWT del usuario
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const jwt = authHeader.replace('Bearer ', '')
    
    // ✅ Crear cliente con anon key para verificar JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Solo en servidor
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await userClient.auth.getUser(jwt)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ Verificar rol admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: userRole } = await adminClient
      .from('auth_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userRole || !['admin', 'superadmin'].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin required' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ Procesar operación
    const { operation, payload } = await req.json()
    
    switch (operation) {
      case 'create_admin_message':
        // Lógica existente de adminMessagesService
        break
      case 'save_pause_status':
        // Lógica existente de botPauseService
        break
      // ... otras operaciones
      default:
        return new Response(JSON.stringify({ error: 'Unknown operation' }), { 
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

#### 2.2 Actualizar Edge Functions existentes

**n8n-proxy: Agregar autenticación**
```diff
+ // Verificar JWT antes de procesar
+ const authHeader = req.headers.get('authorization')
+ if (!authHeader?.startsWith('Bearer ')) {
+   return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
+ }
+ 
+ // Mover API key a env
- const N8N_API_KEY = 'eyJhbG...'
+ const N8N_API_KEY = Deno.env.get('N8N_API_KEY')

+ // Restringir CORS
- 'Access-Control-Allow-Origin': '*',
+ 'Access-Control-Allow-Origin': 'https://pqnc-qa.vidanta.ai',
```

**anthropic-proxy: Agregar autenticación**
```diff
+ const authHeader = req.headers.get('authorization')
+ if (!authHeader?.startsWith('Bearer ')) {
+   return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
+ }
+ // TODO: Validar JWT y verificar cuota de usuario

- 'Access-Control-Allow-Origin': '*',
+ 'Access-Control-Allow-Origin': 'https://pqnc-qa.vidanta.ai',
```

**send-img-proxy: Autenticación + remover token hardcode**
```diff
- 'livechat_auth': '2025_livechat_auth'
+ 'livechat_auth': Deno.env.get('LIVECHAT_AUTH_TOKEN')
```

---

### FASE 3: Corregir XSS (4-8h)
> **Objetivo:** Eliminar `dangerouslySetInnerHTML` y sanitizar inputs

#### 3.1 DetailedCallView.tsx - Render seguro

```diff
- <div 
-   className="text-sm leading-relaxed"
-   dangerouslySetInnerHTML={{ 
-     __html: highlightKeyMoments(conv.content, segment) 
-   }}
- />
+ <div className="text-sm leading-relaxed">
+   {renderHighlightedContent(conv.content, segment)}
+ </div>
```

**Nueva función de render seguro:**
```typescript
const renderHighlightedContent = (text: string, segment: SegmentRecord) => {
  // Crear lista de términos a resaltar con sus estilos
  const highlights: Array<{ term: string; className: string }> = [];
  
  segment.elementos_obligatorios?.forEach(el => 
    highlights.push({ term: el.replace('_', ' '), className: 'bg-blue-200 dark:bg-blue-800' })
  );
  segment.tecnicas_rapport?.forEach(tec => 
    highlights.push({ term: tec.replace('_', ' '), className: 'bg-green-200 dark:bg-green-800' })
  );
  segment.tipos_objeciones?.forEach(obj => 
    highlights.push({ term: obj.replace('_', ' '), className: 'bg-red-200 dark:bg-red-800' })
  );

  // Escapar texto y aplicar highlights como React nodes
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  highlights.forEach(({ term, className }) => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    const splitParts = remaining.split(regex);
    
    splitParts.forEach((part, idx) => {
      if (part.toLowerCase() === term.toLowerCase()) {
        parts.push(<mark key={key++} className={className}>{part}</mark>);
      } else if (part) {
        parts.push(<span key={key++}>{part}</span>);
      }
    });
  });

  return parts.length > 0 ? parts : text;
};

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

#### 3.2 JsonViewer.tsx - Render sin HTML injection

```diff
- <code 
-   dangerouslySetInnerHTML={{ 
-     __html: formatJsonWithSyntaxHighlighting(formattedJson) 
-   }}
- />
+ <code>
+   {renderSyntaxHighlightedJson(formattedJson)}
+ </code>
```

**Nueva función de render:**
```typescript
const renderSyntaxHighlightedJson = (json: string): React.ReactNode[] => {
  if (!isValid) return [<span key="error" className="text-red-500">{json}</span>];
  
  const parts: React.ReactNode[] = [];
  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
  
  let lastIndex = 0;
  let match;
  let key = 0;
  
  while ((match = regex.exec(json)) !== null) {
    // Texto antes del match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{json.slice(lastIndex, match.index)}</span>);
    }
    
    // Determinar clase
    let className = '';
    if (/^"/.test(match[0])) {
      className = /:$/.test(match[0]) 
        ? 'text-blue-600 dark:text-blue-400 font-semibold' 
        : 'text-green-600 dark:text-green-400';
    } else if (/true|false/.test(match[0])) {
      className = 'text-purple-600 dark:text-purple-400';
    } else if (/null/.test(match[0])) {
      className = 'text-gray-500 dark:text-gray-400';
    } else {
      className = 'text-orange-600 dark:text-orange-400';
    }
    
    parts.push(<span key={key++} className={className}>{match[0]}</span>);
    lastIndex = regex.lastIndex;
  }
  
  // Texto restante
  if (lastIndex < json.length) {
    parts.push(<span key={key++}>{json.slice(lastIndex)}</span>);
  }
  
  return parts;
};
```

#### 3.3 Sidebar.tsx - Eliminar innerHTML

```diff
- parent.innerHTML = `
-   <svg class="w-5 h-5 ...">
-     <path ... />
-   </svg>
- `;
+ // Usar ref para actualizar de forma segura o simplemente ocultar el elemento
+ target.style.display = 'none';
+ // El SVG de fallback ya está renderizado condicionalmente
```

---

### FASE 4: Servicios Frontend (8-16h)
> **Objetivo:** Refactorizar servicios para usar Edge Functions

#### 4.1 Nuevo servicio `secureAdminService.ts`

```typescript
// src/services/secureAdminService.ts
import { supabaseSystemUI } from '../config/supabaseSystemUI';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
  'https://zbylezfyagwrxoecioup.supabase.co/functions/v1';

class SecureAdminService {
  private async getAuthHeaders(): Promise<Headers> {
    const { data: { session } } = await supabaseSystemUI.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authenticated session');
    }
    
    return new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    });
  }

  async adminOperation(operation: string, payload: Record<string, any>) {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${EDGE_FUNCTION_URL}/admin-operations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operation, payload }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Admin operation failed');
    }

    return response.json();
  }

  // Migración de botPauseService
  async savePauseStatus(uchatId: string, durationMinutes: number | null, pausedBy: string) {
    return this.adminOperation('save_pause_status', { uchatId, durationMinutes, pausedBy });
  }

  // Migración de adminMessagesService
  async createAdminMessage(params: CreateAdminMessageParams) {
    return this.adminOperation('create_admin_message', params);
  }
}

export const secureAdminService = new SecureAdminService();
```

#### 4.2 Deprecar servicios antiguos

```typescript
// src/services/botPauseService.ts
console.warn('⚠️ DEPRECATED: botPauseService usa service_role. Migrar a secureAdminService');
// ... mantener funcionalidad temporalmente para compatibilidad
```

---

### FASE 5: Rotación de Secretos (Post-deploy)
> **Objetivo:** Rotar todos los secretos expuestos

#### 5.1 Lista de secretos a rotar

| Servicio | Tipo | Ubicación Nueva |
|----------|------|-----------------|
| Supabase System UI | `service_role` | Solo en Edge Functions (Supabase secrets) |
| Supabase PQNC | `service_role` | Solo en Edge Functions |
| Supabase Main | `service_role` | Solo en Edge Functions |
| N8N | API Token | Supabase secrets: `N8N_API_KEY` |
| ElevenLabs | API Key | Supabase secrets: `ELEVENLABS_API_KEY` |
| LiveChat Auth | Token | Supabase secrets: `LIVECHAT_AUTH_TOKEN` |
| Error Analysis | Token | Supabase secrets: `ERROR_ANALISIS_WEBHOOK_TOKEN` |

#### 5.2 Comandos de rotación

```bash
# Supabase - Regenerar keys desde dashboard
# Dashboard > Settings > API > Regenerate service_role key

# Supabase secrets (para Edge Functions)
supabase secrets set N8N_API_KEY=<nuevo_token>
supabase secrets set ELEVENLABS_API_KEY=<nueva_key>
supabase secrets set LIVECHAT_AUTH_TOKEN=<nuevo_token>

# Actualizar .env.production (solo anon keys)
# NO incluir service_role en .env del frontend
```

---

## Cronograma de Implementación

| Fase | Duración | Riesgo Operativo | Rollback |
|------|----------|------------------|----------|
| 0: Preparación | 4h | Ninguno | N/A |
| 1: Variables de Entorno | 4-8h | Bajo | Revertir .env |
| 2: Edge Functions | 8-16h | Medio | Desplegar versión anterior |
| 3: Corregir XSS | 4-8h | Bajo | Revertir componentes |
| 4: Servicios Frontend | 8-16h | Medio | Usar servicios deprecados |
| 5: Rotación de Secretos | 2-4h | Alto (coordinar) | N/A (irreversible) |

**Total estimado:** 30-56 horas de desarrollo

---

## Checklist de Verificación Post-Implementación

- [ ] Bundle no contiene `service_role` (buscar en `dist/assets/*.js`)
- [ ] Bundle no contiene N8N/ElevenLabs API keys
- [ ] Edge Functions responden 401 sin Authorization header
- [ ] Edge Functions responden 403 para usuarios sin rol admin
- [ ] CORS restringido a dominio de producción
- [ ] No hay `dangerouslySetInnerHTML` en código (grep confirma)
- [ ] No hay `innerHTML` con contenido dinámico
- [ ] Secretos rotados y antiguos revocados
- [ ] Logs no contienen tokens/passwords

---

## Notas de Compatibilidad

### Operación Actual No Afectada Si:

1. **Variables de entorno configuradas:** Las mismas keys funcionarán si están en `.env`
2. **Edge Functions desplegadas antes de quitar fallbacks:** Secuencia importante
3. **Migración gradual de servicios:** Deprecar ≠ eliminar inmediatamente
4. **Testing en staging:** Probar cada fase antes de producción

### Puntos de Rollback

1. **Fase 1:** Restaurar archivos de `src/config/backup/`
2. **Fase 2:** `supabase functions deploy --version <anterior>`
3. **Fase 3-4:** `git checkout main -- src/components/ src/services/`

---

## Contacto

**Responsable:** Equipo de Seguridad  
**Revisado por:** Auditorías IA (kus, bbm)  
**Próxima revisión:** 2025-01-23

---

*Documento generado el 2025-12-23 basado en auditorías SAST independientes.*

