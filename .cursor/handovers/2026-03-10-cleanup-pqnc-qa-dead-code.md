# Handover: Limpieza Masiva Dead Code + Módulos Deprecados

**Fecha:** 2026-03-10
**Punto de restauración:** `git tag pre-cleanup-pqnc-qa-deadcode`
**Build:** Exitoso (Vite 28.93s, sin errores TSC)
**Impacto:** 68 archivos, -28,444 líneas, +837 líneas (neto: -27,607 líneas)

---

## Resumen Ejecutivo

Limpieza progresiva en 5 rondas que eliminó 4 módulos completos y múltiples componentes de dead code:

| Ronda | Módulo/Área | Archivos eliminados | Líneas removidas |
|-------|-------------|---------------------|-----------------|
| 1 | Dead code PQNC_QA (agent builder, configs, services) | 23 | ~11,000 |
| 2 | Agent Builder Wizard (IndividualAgentWizard, data/) | 7 + directorio | ~2,900 |
| 3 | Análisis IA (natalia) + Modelos LLM + Tokens IA | 10 + directorio | ~7,500 |
| 4 | Mis Tareas - Timeline (direccion) | 6 + directorio | ~5,000 |
| 5 | Fix runtime error (getRemainingTokens) + trailing comma | 0 (edits) | ~10 |

---

## Ronda 1: Dead Code PQNC_QA

### Contexto
Auditoría de dependencias con BD PQNC_QA (`hmmfuhqgvsehkizlfzga.supabase.co`). El único módulo activo es "Llamadas PQNC" (PQNCDashboard). Todo lo demás importaba `supabaseMainAdmin` (que era `null` desde hace meses).

### Dependencias ACTIVAS conservadas (NO TOCAR)

| Servicio | Tabla en PQNC_QA | Consumido por |
|----------|-------------------|---------------|
| `feedbackService.ts` | `call_feedback` | PQNCDashboard, DetailedCallView, FeedbackModal |
| `bookmarkService.ts` | `call_bookmarks` | PQNCDashboard, DetailedCallView, BookmarkSelector |
| `pqncSecureClient.ts` | `calls`, `call_segments` | PQNCDashboard |
| `multiDbProxyService.ts` | (proxy genérico) | feedbackService, bookmarkService, pqncSecureClient |
| Edge Function `multi-db-proxy` | Todas las anteriores | multiDbProxyService via fetch |

### Flujo de acceso (intacto):
```
Frontend → multiDbProxyService → Edge Function multi-db-proxy (glsmifhkoaifvaegsozd)
   → PQNC_QA (hmmfuhqgvsehkizlfzga) con service_role_key en secrets
```

### Archivos eliminados (23)

**Componentes admin (importaban `supabaseMainAdmin` = null):**
- `src/components/admin/SystemMessageEditor.tsx`
- `src/components/admin/ToolsSelector.tsx`
- `src/components/admin/MyTools.tsx`
- `src/components/admin/MyAgents.tsx`
- `src/components/admin/ImportAgentModal.tsx`
- `src/components/admin/SquadEditor.tsx`
- `src/components/admin/SquadEditor_new.tsx`
- `src/components/admin/AgentEditor.tsx`
- `src/components/admin/AgentTemplateCard.tsx`
- `src/components/admin/EditAgentModal.tsx`
- `src/components/admin/ParametersEditor.tsx`

**Componentes editor (directorio eliminado):**
- `src/components/editor/AgentGenerator.tsx`
- `src/components/editor/RolesEditor.tsx`
- `src/components/editor/ToolsEditor.tsx`
- `src/components/editor/ParametersEditor.tsx`
- `src/components/editor/SquadsEditor.tsx`

**Componentes root:**
- `src/components/AgentCV.tsx`
- `src/components/AdminDashboard.tsx`
- `src/components/TemplateManager.tsx`
- `src/components/ToolsEditor.tsx`

**Configs sin importadores:**
- `src/config/supabase.ts` - Clientes deprecados (null)
- `src/config/pqncSupabase.ts` - Sin importadores

**Servicios y utilidades:**
- `src/services/supabaseService.ts` - 1,258 líneas, todas usaban `supabaseAdmin` (null)
- `src/utils/diagnoseDatabase.ts` - Dev utility con null client

**Scripts con credenciales:**
- `scripts/apply-permissions-directly.js` - service_role_key hardcodeada

---

## Ronda 2: Agent Builder Wizard

### Archivos eliminados (7 + directorio `src/data/`)
- `src/components/IndividualAgentWizard.tsx` (~1,175 líneas)
- `src/components/ProjectSelector.tsx` (~215 líneas)
- `src/components/PromptEditor.tsx` (~512 líneas)
- `src/data/database-structure.ts` (~346 líneas)
- `src/data/agent-templates.ts` (~678 líneas)
- `scripts/create-wizard-tables.sql`
- `scripts/add-user-ownership.sql`

---

## Ronda 3: Análisis IA (Natalia) + Modelos LLM + Tokens IA

### Módulo Análisis IA eliminado
- `src/components/analysis/AnalysisIAComplete.tsx` (~2,886 líneas)
- `src/components/analysis/README_ANALISIS_IA.md`
- `src/components/analysis/CHANGELOG_ANALISIS_IA.md`

### Módulo Modelos LLM eliminado (directorio completo)
- `src/components/ai-models/AIModelsManager.tsx`
- `src/components/ai-models/VoiceModelsSection.tsx`
- `src/components/ai-models/ImageGenerationSection.tsx`
- `src/components/ai-models/ImageRepositorySection.tsx`
- `src/components/ai-models/README.md`

### Servicios exclusivos eliminados
- `src/services/aiModelsDbService.ts`
- `src/services/elevenLabsService.ts`
- `src/services/translationService.ts`
- `src/services/tokenService.ts`

### Componentes UI eliminados
- `src/components/admin/TokenManagement.tsx`
- `src/components/TokenUsageIndicator.tsx`

### Cambios en archivos existentes

**`src/stores/appStore.ts`**
- AppMode: quitados `'natalia'`, `'ai-models'`, `'analisis'`

**`src/components/MainApp.tsx`**
- Quitados lazy imports: `AnalysisIAComplete`, `AIModelsManager`
- Quitados cases: `'natalia'`, `'ai-models'`

**`src/components/Sidebar.tsx`**
- Quitado import `TokenUsageIndicator`
- Quitadas funciones: `handleTokenInfoChange`, `getRemainingTokens`, `handleAnalysisChange`
- Quitada variable `natalia` del destructuring de `useAnalysisPermissions`
- Quitado `analysisMode` state
- Quitados items de menú: Análisis IA, Modelos LLM
- Quitado JSX de `TokenUsageIndicator`

**`src/components/linear/LinearSidebar.tsx`**
- Quitados items: natalia, ai-models
- Destructuring: `{ pqnc, liveMonitor }` (sin natalia)

**`src/components/Header.tsx`**
- Quitados 'natalia' y 'ai-models' del ternary de títulos
- Quitados bloques de subtítulo

**`src/contexts/AuthContext.tsx`**
- `canAccessSubModule` tipo: `'natalia' | 'pqnc'` → `'pqnc'`
- `getFirstAvailableModule`: quitados 'natalia', 'ai-models'
- Productor/developer fallback: 'ai-models' → 'admin'

**`src/hooks/useNinjaAwarePermissions.ts`**
- `canAccessSubModule` tipo: `'pqnc'`
- Quitado 'natalia' de subModules de admin, developer, evaluator
- Quitado 'ai-models' de modules de developer y productor
- Productor default: 'ai-models' → 'admin'

**`src/components/admin/AdminDashboardTabs.tsx`**
- Quitados import `TokenManagement`
- Quitado 'tokens' del tipo `AdminTab`
- Quitado tab 'tokens' de la definición y renderizado

---

## Ronda 4: Mis Tareas - Timeline (Dirección)

### Archivos eliminados (6 + directorio)
- `src/components/direccion/Timeline.tsx` (~87.4KB, componente principal)
- `src/components/direccion/TimelineActivityModal.tsx`
- `src/components/direccion/TimelineCard.tsx`
- `src/components/direccion/README.md`
- `src/services/timelineService.ts`
- `src/services/timelineTypes.ts`

### Cambios en archivos existentes

**`src/stores/appStore.ts`**
- AppMode: quitado `'direccion'`
- Resultado final: `'pqnc' | 'live-monitor' | 'admin' | 'live-chat' | 'prospectos' | 'scheduled-calls' | 'operative-dashboard' | 'campaigns' | 'dashboard'`

**`src/components/MainApp.tsx`**
- Quitado lazy import `Timeline`
- Quitado case `'direccion'`
- Quitado layout especial sin sidebar para dirección
- Quitado auto-redirect para rol dirección
- Quitado bloqueo de cambio de módulo para rol dirección
- Quitadas exclusiones de tema dark para módulo dirección

**`src/components/Header.tsx`**
- Quitados 2 botones "Mis Tareas" (mobile + desktop)
- Quitado 'direccion' del título ternary
- Quitado bloque de subtítulo "Gestión de tareas y asignaciones"
- Quitado 'direccion' de tipos HeaderProps (appMode + onModeChange)

**`src/contexts/AuthContext.tsx`**
- Quitado 'direccion' del return type de `getFirstAvailableModule`
- Quitada lógica "si rol es dirección, retornar 'direccion'"

**`src/services/authService.ts`**
- Quitado case `'direccion'` de `canAccessModule`
- Quitados 6 guards `if (role === 'direccion') return false`
- Quitado 'direccion' del default guard
- Corregido tipo `canAccessSubModule`: `'natalia' | 'pqnc'` → `'pqnc'`

**`src/hooks/useNinjaAwarePermissions.ts`**
- Quitado bloque de permisos del rol `direccion` de `ROLE_DEFAULT_PERMISSIONS`

**`src/config/permissionModules.ts`**
- Quitado 'direccion' del tipo `RoleBase`
- Quitado bloque completo del módulo Dirección (7 acciones: view, create_activity, edit_activity, delete_activity, archive_activity, add_subtask, process_with_ai)

### NO tocados (rol 'direccion' sigue en BD y UserManagement)
- `src/components/admin/UserManagementV2/types.ts` - RoleType union
- `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` - Role definition
- `src/components/admin/UserManagementV2/components/FilterBar.tsx` - Filter option
- `src/components/admin/UserManagementV2/components/UserTable.tsx` - Badge styling
- `src/services/userUIPreferencesService.ts` - WIDGET_DISABLED_BY_DEFAULT_ROLES
- `src/services/whatsappTemplatesService.ts` - "dirección" = dirección postal, NO el módulo

---

## Ronda 5: Fix Runtime Errors

### Error 1: `getRemainingTokens is not defined`
- **Archivo:** `src/components/Sidebar.tsx` (línea ~884)
- **Causa:** Se eliminó la función `getRemainingTokens` en Ronda 3 pero quedó referencia JSX
- **Fix:** Eliminado bloque JSX que mostraba tokens restantes junto al username

### Error 2: `Cannot read properties of undefined (reading 'id')` en AdminDashboardTabs
- **Archivo:** `src/components/admin/AdminDashboardTabs.tsx` (línea 284)
- **Causa:** Trailing comma `,` sola tras eliminar tab 'tokens' en Ronda 3, generaba `undefined` en array `tabs`
- **Fix:** Eliminada coma suelta

---

## Estado Final del AppMode

```typescript
type AppMode = 'pqnc' | 'live-monitor' | 'admin' | 'live-chat' | 'prospectos' | 'scheduled-calls' | 'operative-dashboard' | 'campaigns' | 'dashboard';
```

**Módulos eliminados:** natalia, ai-models, analisis, direccion
**Módulos activos:** 9 (los listados arriba)

## Estado Final de AdminTab

```typescript
type AdminTab = 'usuarios' | 'preferencias' | 'configuracion-db' | 'api-tokens' | 'ejecutivos' | 'coordinaciones' | 'horarios' | 'logs' | 'aws' | 'dynamics' | 'documentacion' | 'tickets' | 'comunicados';
```

**Tabs eliminados:** tokens

## Estado Final de RoleBase (permissionModules.ts)

```typescript
type RoleBase = 'admin' | 'administrador_operativo' | 'coordinador' | 'ejecutivo' | 'evaluador' | 'developer' | 'marketing';
```

**Roles eliminados del tipo:** direccion (aún existe en BD y UserManagement para gestión de usuarios existentes)

---

## Cambios NO relacionados con limpieza (ya estaban en unstaged)

Los siguientes archivos tienen cambios independientes (refactor de analítica de campañas):
- `src/components/campaigns/analitica/TemplateAnalyticsGrid.tsx` - Extended date ranges, group aggregation
- `src/components/campaigns/analitica/TemplateAnalyticsModule.tsx` - DateRangeSelector, FilterSelector, Plotly charts
- `src/components/campaigns/analitica/TemplateDetailPanel.tsx` - UI tweaks
- `src/services/whatsappTemplatesService.ts` - Support for '24h' and '6months' ranges
- `src/types/whatsappTemplates.ts` - AnalyticsDateRange extended, TemplateAnalyticsRow new fields

---

## Limpieza pendiente (NO realizada)

1. **Documentación legacy:** 30+ archivos en `docs/`, `.cursor/`, READMEs que mencionan `hmmfuhqgvsehkizlfzga` en texto
2. **`.cursor/mcp-supavidanta.json`** - Config MCP de Cursor con service_role_key
3. **`scripts/sql/`** - Scripts SQL de migración ya ejecutados
4. **`.env.production` / `.env.local`** - `VITE_PQNC_SUPABASE_URL` (necesario para DatabaseConfiguration.tsx)
5. **Edge Function `multi-db-proxy`** - Referencia a `LOGMONITOR` (dffuwdzybhypxfzrmdcz), evaluar si es dead
6. **Tabla BD `timeline_activities`** - Ya no tiene frontend, evaluar DROP
7. **Rol BD `direccion`** - Aún existe en auth_roles, usuarios con este rol no tendrán módulo accesible

---

## Cómo restaurar

```bash
# Restaurar al estado pre-limpieza completo
git checkout pre-cleanup-pqnc-qa-deadcode -- .

# Restaurar archivos individuales
git checkout pre-cleanup-pqnc-qa-deadcode -- src/components/direccion/Timeline.tsx

# Restaurar módulo completo
git checkout pre-cleanup-pqnc-qa-deadcode -- src/components/direccion/ src/services/timelineService.ts src/services/timelineTypes.ts
```

---

## Verificación

- `npx vite build` → Exitoso en 28.93s
- Runtime: Sin errores de consola
- Todos los módulos activos funcionan correctamente
- Ningún archivo eliminado era importado por componentes activos
