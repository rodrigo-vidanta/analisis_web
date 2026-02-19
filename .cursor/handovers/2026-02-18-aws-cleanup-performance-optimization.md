# AWS Cleanup + Frontend Performance Optimization

**Fecha:** 2026-02-18
**Versión:** B10.1.44N2.16.1 → B10.1.44N2.17.1

## Resumen

Sesión doble: (1) limpieza de recursos AWS zombies que costaban ~$431/mes, (2) optimización de performance del frontend con lazy loading, chunk splitting, WebP e infra CloudFront.

---

## Parte 1: Limpieza AWS

### Contexto

Facturación de enero 2026: **$443.72/mes**. El 97% era infraestructura de N8N que ya había migrado a Railway pero nunca se apagó en AWS. RDS tenía deletion protection activa. ElastiCache no tiene opción "stop" (solo delete). RDS "stopped" se reinicia automáticamente cada 7 días.

### Recursos eliminados

| Recurso | Costo/mes | Estado |
|---------|----------:|--------|
| RDS `n8n-postgres` (db.r6g.large) | $178.91 | Eliminado (quitando deletion protection primero) |
| ElastiCache `n8n-redis` (cache.t3.medium) | $50.59 | Eliminado via replication group |
| ElastiCache `n8n-redis-new` (cache.t3.medium) | $50.59 | Eliminado via replication group |
| NAT Gateway `nat-011f450d4c21eea15` | $33.48 | Eliminado |
| ALB `n8n-alb-internal` + 3 listeners | $16.75 | Eliminado |
| ECS `n8n-production` + `test-mcp-cluster` | $52.02 | Eliminados (service + clusters) |
| 9 Target Groups huérfanos | - | Eliminados |
| 2 Elastic IPs (35.167.94.127, 35.84.220.81) | $3.72 | Liberadas |
| 6 Secrets Manager secrets | $2.62 | Eliminados |
| 2 Cloud Map namespaces + 3 services | $0.10 | Eliminados (con deregister de instancia aurora-1) |
| CloudFront `n8n.vidavacations.com` (EX8VQ3ZURB53T) | - | Deshabilitado + eliminado |
| CloudFront tercera distribución (E2O0E82C64Y0YI) | - | Deshabilitado + eliminado |
| Route53 `n8n.vidavacations.com` zone | $0.50 | Eliminada (records A + CNAME primero) |
| Route53 `supabase.internal` zone | - | Eliminada via Cloud Map |
| WAF `pqnc-waf-economico` | $6.00 | Eliminado (no estaba asociado a nada) |
| 7 ACM certificates (FAILED + n8n) | - | Eliminados (us-east-1 + us-west-2) |
| **Total ahorro mensual** | **~$395** | |

### Notas técnicas de eliminación

- **ElastiCache**: No se puede delete cache-cluster si es miembro de replication group. Usar `delete-replication-group` con `--no-retain-primary-cluster`.
- **Cloud Map**: Requiere deregister-instance → delete-service → delete-namespace en orden.
- **RDS secret `rds!cluster-*`**: Managed by RDS, no se puede eliminar manualmente. Se auto-elimina.
- **CloudFront delete**: Requiere disable → wait distribution-deployed → delete (5-15 min).
- **Route53 zone delete**: Eliminar records custom primero (A, CNAME), luego delete-hosted-zone. NS y SOA se eliminan automáticamente.

### WAF optimizado

Se mejoró `frontend-ip-restriction` absorbiendo la única funcionalidad útil de `pqnc-waf-economico`:
- `RateLimitPerIP`: Bajado de 5000 a 2000 req/5min + custom response 429

Reglas finales de `frontend-ip-restriction` (5 reglas):
1. `allow-listed-ips` - IP whitelist (9 IPs)
2. `RateLimitPerIP` - 2000 req/5min, 429 response
3. `AWSManagedRulesCommon` - XSS, path traversal
4. `AWSManagedKnownBadInputs` - Log4j, SSRF
5. `AWSManagedSQLi` - SQL injection

### Estado final AWS

| Servicio | Recurso | Costo/mes |
|----------|---------|----------:|
| S3 | `pqnc-qa-ai-frontend` (38 MB) | $0.30 |
| CloudFront | `ai.vidavacations.com` (E19ZID7TVR08JG) | ~$0 |
| WAF | `frontend-ip-restriction` (5 reglas) | ~$10.60 |
| Route53 | 3 zones (ai.vidanta, ai.vidavacations, dev.vidavacations) | $1.50 |
| ACM | 1 cert ai.vidavacations.com (ISSUED) | $0 |
| AWS Support | **Pendiente bajar a Basic desde consola** | $29 → $0 |
| **Total estimado marzo** | | **~$12.40** |

URL para bajar Support: https://console.aws.amazon.com/support/plans/home

### Recursos residuales (sin costo, no vale la pena eliminar)

- 2 VPCs custom + 6 subnets (gratis)
- 4 Lambdas Amplify auth (sin invocaciones)
- 1 S3 bucket Amplify (6 KB)

---

## Parte 2: Performance Optimization

### CloudFront (ya activo, no requirió deploy)

- **HTTP/3 habilitado**: Conexiones ~40% más rápidas en mobile
- **Cache behavior `/assets/*`**: TTL 1 año (31536000s) - assets tienen hash en filename
- **Default behavior (index.html)**: TTL 0s (siempre revalida)
- **S3 cache headers**: `Cache-Control: public, max-age=31536000, immutable` en assets, `no-cache, no-store, must-revalidate` en index.html

### Lazy Loading - MainApp.tsx (v2.17.0)

**Cambio clave**: Todos los imports eager de módulos de ruta convertidos a `React.lazy()` con `Suspense`.

16 componentes lazy-loaded:
- AnalysisDashboard, LiveMonitorKanban, AdminDashboardTabs
- LinearLayout, LinearLiveMonitor, AIModelsManager
- LiveChatModule, ProspectosManager, ScheduledCallsManager
- OperativeDashboard, DashboardModule, CampaignsDashboardTabs
- AnalysisIAComplete, ChangePasswordModal, Timeline
- ForceUpdateModal, ComunicadoOverlay, LiveCallActivityWidget

Imports que se mantienen eager (necesarios siempre):
- Header, Footer, Sidebar, LoginScreen
- Hooks: useAuth, useAppStore, useTheme, useEffectivePermissions, etc.

**Patrón para named exports**:
```typescript
const OperativeDashboard = lazy(() => import('./dashboard/OperativeDashboard').then(m => ({ default: m.OperativeDashboard })));
```

**Fallback spinner**:
```typescript
const ModuleLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
  </div>
);
```

### Vite Chunk Splitting (v2.17.1)

**Problema v2.17.0**: `manualChunks` separaba vendors que dependen de React (framer-motion, react-markdown, reactflow, etc.) en chunks separados. Esto causaba `TypeError: Cannot read properties of undefined (reading 'forwardRef')` porque el chunk se cargaba antes que React.

**Solución v2.17.1**: Solo separar vendors SIN dependencia de React:
```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('@aws-sdk') || id.includes('@smithy')) return 'vendor-aws';
    if (id.includes('@supabase')) return 'vendor-supabase';
  }
}
```

Vite maneja automáticamente el code-splitting del resto gracias a los `React.lazy()` imports.

### Imágenes WebP

9 PNGs convertidas a WebP (PIL, quality=85):

| Imagen | PNG | WebP | Reducción |
|--------|----:|-----:|:---------:|
| citas-background-beach | 5,705 KB | 203 KB | 96% |
| citas-sidebar-dark | 5,001 KB | 82 KB | 98% |
| citas-workspace-light | 5,705 KB | 203 KB | 96% |
| citas-sidebar-light | 1,322 KB | 56 KB | 96% |
| citas-workspace-dark | 1,062 KB | 23 KB | 98% |
| pqnc-christmas-text-final | 304 KB | 43 KB | 86% |
| logo_pqnc-reyes | 265 KB | 40 KB | 85% |
| logo_pqnc-newyear | 197 KB | 40 KB | 80% |
| logo_pqnc-valentine | 133 KB | 21 KB | 84% |
| **Total** | **19,693 KB** | **711 KB** | **96%** |

Referencias actualizadas en 7 archivos: CitasDashboard, CitasLoginScreen, ReyesLogo, ValentineLogo, NewYearLogo, LogoCatalog, ChristmasLogo.

**NOTA**: Los PNGs originales siguen en el repo (no se eliminaron). Se podrían eliminar en el futuro.

### Resultados de bundle

| Métrica | Antes (v2.16.1) | Después (v2.17.1) | Reducción |
|---------|----------------:|-----------------:|:---------:|
| index.js (raw) | 9,000 KB | 1,106 KB | -88% |
| index.js (gzip) | 2,532 KB | 293 KB | -88% |
| Imágenes | 19,693 KB | 711 KB | -96% |

### Bug de versión en BD

El deploy script genera `version` en formato corto (`2.17.1`) pero la app reporta `build_number` en formato largo (`B10.1.44N2.17.1`). El `ForceUpdateModal` compara ambos y al no coincidir, bloquea la app en loop de "Actualización Requerida".

**Fix**: Asegurar que `version` y `min_required_version` en BD usen siempre el formato `B{backend}N{frontend}`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/MainApp.tsx` | 16 imports → React.lazy() + Suspense |
| `vite.config.ts` | manualChunks: solo vendor-aws y vendor-supabase |
| `src/components/citas/CitasDashboard.tsx` | .png → .webp |
| `src/components/citas/CitasLoginScreen.tsx` | .png → .webp |
| `src/components/logos/ChristmasLogo.tsx` | .png → .webp |
| `src/components/logos/LogoCatalog.tsx` | .png → .webp |
| `src/components/logos/NewYearLogo.tsx` | .png → .webp |
| `src/components/logos/ReyesLogo.tsx` | .png → .webp |
| `src/components/logos/ValentineLogo.tsx` | .png → .webp |
| `public/assets/*.webp` | 9 nuevas imágenes WebP |

## Lecciones aprendidas

1. **AWS "stop" no es gratis**: RDS se reinicia a los 7 días. ElastiCache no tiene stop. NAT Gateway/ALB cobran por existir. Para dejar de pagar, hay que **eliminar**.
2. **manualChunks con cuidado**: No separar vendors que dependen de React en chunks manuales. Dejar que Vite + React.lazy manejen el splitting automáticamente.
3. **Formato de versión en BD**: Siempre usar el formato completo `B{x}N{y}` para `version` y `min_required_version` para que coincida con lo que reporta el frontend.
