# 🔒 Arquitectura de Seguridad - PQNC QA AI Platform

**Fecha de Vigencia:** 16 de Enero 2026  
**Versión:** v3.0  
**Estado:** PRODUCCIÓN ACTIVA

---

## 📋 Índice

1. [Cambio Arquitectónico Crítico](#⚠️-cambio-arquitectónico-crítico---enero-2026)
2. [Arquitectura Actual](#🏗️-arquitectura-actual)
3. [Gestión de Keys](#🔑-gestión-de-keys)
4. [Modelo de Seguridad](#🛡️-modelo-de-seguridad)
5. [Edge Functions](#📦-edge-functions)
6. [Reglas Obligatorias](#⛔-reglas-obligatorias-para-desarrollo)
7. [Checklist Pre-Deploy](#📋-checklist-pre-deploy)
8. [Reportes de Pentesting](#📊-reportes-de-pentesting)
9. [Ver También](#ver-también)

---

## ⚠️ CAMBIO ARQUITECTÓNICO CRÍTICO - ENERO 2026

A partir del **16 de Enero 2026**, la arquitectura de seguridad cambió significativamente:

| Antes (hasta 15 Ene 2026) | Después (desde 16 Ene 2026) |
|---------------------------|------------------------------|
| `service_role_key` en código frontend | ❌ **ELIMINADO** del bundle |
| Clientes `*Admin` para operaciones privilegiadas | ❌ **ELIMINADOS** |
| RLS con políticas complejas | RLS **DESHABILITADO** |
| Edge Functions en system_ui | Edge Functions en **PQNC_AI** |

---

## 🏗️ Arquitectura Actual

### Base de Datos: PQNC_AI (glsmifhkoaifvaegsozd)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                     (ai.vidavacations.com)                       │
│                                                                   │
│   Solo expone: anon_key (3 proyectos Supabase)                  │
│   NO expone: service_role_key                                    │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE PQNC_AI                           │
│                 (glsmifhkoaifvaegsozd)                          │
│                                                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │ 61 Tablas   │  │ Edge Funcs  │  │  Realtime   │            │
│   │ RLS=OFF     │  │ (seguras)   │  │  Channels   │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                   │
│   Acceso: anon_key (RLS deshabilitado = acceso completo)        │
└─────────────────────────────────────────────────────────────────┘
```

### Clientes de Supabase

#### ✅ Clientes PERMITIDOS (Usar Siempre)

| Cliente | Archivo | Key Usada | Uso |
|---------|---------|-----------|-----|
| `analysisSupabase` | `src/config/analysisSupabase.ts` | `anon_key` | **Principal** - Todo |
| `supabaseSystemUI` | `src/config/supabaseSystemUI.ts` | `anon_key` | Auth, usuarios, permisos |

#### ❌ Clientes ELIMINADOS (NUNCA Usar)

| Cliente | Estado | Razón |
|---------|--------|-------|
| `supabaseSystemUIAdmin` | **ELIMINADO** | Exponía `service_role_key` |
| `analysisSupabaseAdmin` | **ELIMINADO** | Exponía `service_role_key` |
| `pqncSupabaseAdmin` | **ELIMINADO** | Proyecto prohibido |

---

## 🔑 Gestión de Keys

### Variables de Entorno en Producción (`.env.production`)

```bash
# ✅ SOLO ANON KEYS - SEGURO PARA BUNDLE
VITE_ANALYSIS_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_ANALYSIS_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_SYSTEM_UI_SUPABASE_URL=https://glsmifhkoaifvaegsozd.supabase.co
VITE_SYSTEM_UI_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_EDGE_FUNCTIONS_URL=https://glsmifhkoaifvaegsozd.supabase.co

# ❌ NUNCA INCLUIR EN PRODUCCIÓN
# VITE_*_SERVICE_KEY=... (PROHIBIDO)
```

### Variables de Entorno en Desarrollo (`.env.local`)

```bash
# Desarrollo local puede tener service_key para testing
# PERO: el build de producción NUNCA debe incluirlas

VITE_ANALYSIS_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Esta key se usa SOLO para:
# - MCPs de desarrollo
# - Scripts de migración
# - Testing local
```

---

## 🛡️ Modelo de Seguridad

### RLS (Row Level Security)

**Estado Actual: DESHABILITADO en 61 tablas**

| Aspecto | Detalle |
|---------|---------|
| RLS | Deshabilitado |
| Acceso | Cualquier request con `anon_key` tiene acceso completo |
| Protección | Autenticación a nivel de aplicación |

#### ¿Por qué RLS está deshabilitado?

1. Las políticas RLS existentes no funcionaban correctamente con `anon_key`
2. La app tiene su propio sistema de autenticación (`auth_users`, `auth_sessions`)
3. El `anon_key` no está expuesto públicamente (solo en el bundle de la app)
4. Se requiere login válido para acceder a cualquier funcionalidad

#### Mitigaciones de Seguridad

| Capa | Protección |
|------|------------|
| Frontend | Login obligatorio, validación de sesión |
| CloudFront | HTTPS obligatorio, headers de seguridad |
| Supabase | `anon_key` requerido para todas las requests |
| App | Sistema de roles y permisos propio |

---

## 📦 Edge Functions

### Ubicación: PQNC_AI (glsmifhkoaifvaegsozd)

**⚠️ CAMBIO: Las Edge Functions ahora están en PQNC_AI, NO en system_ui**

```bash
# URL correcta para Edge Functions
VITE_EDGE_FUNCTIONS_URL=https://glsmifhkoaifvaegsozd.supabase.co

# ❌ URL INCORRECTA (obsoleta)
# VITE_EDGE_FUNCTIONS_URL=https://zbylezfyagwrxoecioup.supabase.co
```

### Edge Functions Disponibles

| Función | Uso | Secrets Requeridos |
|---------|-----|-------------------|
| `multi-db-proxy` | Proxy a PQNC_QA y LOGMONITOR | `PQNC_QA_SERVICE_KEY`, `LOGMONITOR_SERVICE_KEY` |
| `auth-admin-proxy` | Operaciones admin de auth | `SUPABASE_SERVICE_ROLE_KEY` |
| `send-img-proxy` | Envío de imágenes WhatsApp | `N8N_WEBHOOK_URL` |
| `anthropic-proxy` | Proxy a API Anthropic | `ANTHROPIC_API_KEY` |

### Secrets de Edge Functions

Los secrets se configuran en Supabase Dashboard o via CLI:

```bash
supabase secrets set PQNC_QA_SERVICE_KEY=eyJ...
supabase secrets set LOGMONITOR_SERVICE_KEY=eyJ...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**⚠️ CRÍTICO:** Los secrets NUNCA se exponen al frontend. Solo las Edge Functions tienen acceso.

---

## ⛔ REGLAS OBLIGATORIAS PARA DESARROLLO

### 1. NUNCA Importar Clientes Admin

```typescript
// ❌ PROHIBIDO - Estos clientes YA NO EXISTEN
import { supabaseSystemUIAdmin } from '../config/supabaseSystemUI';
import { analysisSupabaseAdmin } from '../config/analysisSupabaseAdmin';

// ✅ CORRECTO - Usar clientes normales
import { supabaseSystemUI } from '../config/supabaseSystemUI';
import { analysisSupabase } from '../config/analysisSupabase';
```

### 2. NUNCA Hardcodear Service Keys

```typescript
// ❌ PROHIBIDO
const client = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// ❌ PROHIBIDO - Aunque sea de env
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// ✅ CORRECTO - Solo anon_key
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 3. Operaciones Privilegiadas via Edge Functions

Si necesitas operaciones que requieren `service_role`:

```typescript
// ❌ PROHIBIDO - Usar service_key en frontend
await supabaseAdmin.from('users').update({ admin: true });

// ✅ CORRECTO - Usar Edge Function
const response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/auth-admin-proxy`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'updateUser', data: {...} })
});
```

### 4. Verificar Build Antes de Deploy

```bash
# SIEMPRE verificar que no hay service_role en el bundle
npm run build

# Buscar JWTs en el bundle
for jwt in $(grep -oh "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9[^\"']*" dist/assets/index-*.js 2>/dev/null | sort -u); do
    payload=$(echo "$jwt" | cut -d. -f2 | base64 -d 2>/dev/null)
    if echo "$payload" | grep -q "service_role"; then
        echo "❌ SERVICE_ROLE KEY DETECTADA - NO DEPLOY"
        exit 1
    fi
done
echo "✅ Bundle seguro - solo anon_keys"
```

---

## 🔍 Checklist de Seguridad Pre-Deploy

- [ ] No hay imports de `*Admin` clients en ningún archivo
- [ ] `.env.production` solo contiene `anon_key`
- [ ] Build de producción no contiene `service_role` en JWTs
- [ ] Edge Functions tienen secrets configurados
- [ ] CloudFront invalidado después del deploy

---

## 📊 Resumen de Puntuación de Seguridad

| Categoría | Estado | Puntuación |
|-----------|--------|------------|
| Service Keys en Bundle | ✅ No expuestas | 10/10 |
| Headers HTTP | ✅ HSTS, X-Frame, etc. | 8/10 |
| SSL/TLS | ✅ TLSv1.3 | 10/10 |
| RLS | ⚠️ Deshabilitado | 6/10 |
| Dependencias | ⚠️ 5 HIGH vulns | 7/10 |
| **Total** | | **8.0/10** |

---

## 📚 Ver También

### Documentación Relacionada
- [Reglas de Seguridad](.cursor/rules/security-rules.mdc) - Reglas obligatorias de desarrollo
- [Arquitectura BD Unificada](NUEVA_ARQUITECTURA_BD_UNIFICADA.md) - Estructura de base de datos
- [Migración System_UI](MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md) - Detalles de migración
- [Edge Functions Catalog](EDGE_FUNCTIONS_CATALOG.md) - Funciones serverless seguras
- [Deploy Multi-DB Proxy](DEPLOY_MULTI_DB_PROXY.md) - Configuración de proxies

### Reportes de Pentesting
- [Pentesting Final 2026-01-18](PENTESTING_FINAL_2026-01-18.md) - Auditoría más reciente
- [Pentesting Profundo 2026-01-17](PENTESTING_PROFUNDO_2026-01-17.md) - Análisis detallado
- [Pentesting 2026-01-16](PENTESTING_2026-01-16_FINAL.md) - Reporte inicial

### Guías de Configuración
- [Variables de Entorno](ENV_VARIABLES_REQUIRED.md) - Configuración segura
- [CloudFront Security Headers](AWS_CLOUDFRONT_SECURITY_HEADERS.md) - Headers HTTP

---

**Última Actualización:** 22 de Enero 2026  
**Revisado por:** Auditoría de Documentación
