---
name: deploy
description: Deploy a produccion con semantic versioning automatico. Analiza commits, actualiza version, CHANGELOG, DocumentationModule, push a main, deploy AWS, y actualiza BD.
argument-hint: [patch|minor|major] ["mensaje"] [--dry-run] [--skip-aws]
---

# Deploy - PQNC QA AI Platform

## REGLA: NUNCA deploy sin autorizacion explicita del usuario

## Invocacion

- `/deploy` - Auto-detectar tipo de cambio desde conventional commits
- `/deploy patch "mensaje"` - Forzar patch (fix, refactor, style)
- `/deploy minor "mensaje"` - Forzar minor (new feature)
- `/deploy major "mensaje"` - Forzar major (breaking change)
- `/deploy --dry-run` - Solo mostrar que haria, sin ejecutar
- `/deploy --skip-aws` - Solo git, sin deploy AWS

## Flujo de ejecucion

### 1. Pre-checks
```bash
git status --short
```
Si hay cambios uncommitted, informar al usuario y preguntar si desea incluirlos.

### 2. Ejecutar script
```bash
tsx scripts/deploy-v2.ts --json [args del usuario]
```
Mapeo de args:
- `/deploy patch "fix modal"` -> `--json --patch "fix modal"`
- `/deploy --dry-run` -> `--json --dry-run`
- `/deploy` -> `--json`

### 3. Parsear resultado JSON
El script escribe JSON a stdout y logs a stderr. Parsear el JSON.

### 4. Actualizar BD (solo si NO es dry-run)
Usar MCP Supabase `execute_sql` con:
- **Proyecto:** `glsmifhkoaifvaegsozd`
- **Query:** campo `database.sqlQuery` del JSON

### 5. Verificar BD
```sql
SELECT config_value FROM system_config WHERE config_key = 'app_version';
```

### 6. Reportar resultado
```
Deploy completado: {previous} -> {new}
- Tipo: frontend {frontendBump} | backend {backendBump}
- Commits: {N} ({categorias})
- Commit: {hash}
- AWS: {duration}s
- BD: actualizada
- URL: ai.vidavacations.com (esperar 5-10 min CloudFront)
```

## Manejo de errores

- **Build falla:** Mostrar errores, NO continuar
- **Push falla:** Verificar remote, sugerir `git pull`
- **AWS falla:** Reportar. Version ya commiteada. Reintentar con `./update-frontend.sh`
- **BD falla:** Dar query SQL para ejecucion manual
- **Script falla parcialmente (exit code 1 con archivos ya staged):**
  1. Revisar `git status` para ver que archivos el script ya modifico (CHANGELOG.md, package.json, appVersion.ts)
  2. Revisar `git diff --cached` para verificar que el contenido generado es correcto
  3. **CRITICO: Verificar release_notes en CHANGELOG.md** — confirmar que todos los cambios relevantes estan incluidos
  4. Si falta contenido: editar manualmente antes de continuar
  5. Completar manualmente: commit (con comillas simples) → push → AWS deploy → BD update
  6. Al actualizar BD, incluir `release_notes` completas con TODOS los cambios de la sesion, no solo lo que el script auto-genero
  7. Verificar que `force_update: true` esta en el JSON de BD para forzar recarga en clientes

## Actualizacion de documentacion por modulo

Antes de ejecutar el deploy, actualizar la documentacion de los modulos modificados:

1. Identificar que modulos se modificaron en la sesion actual (revisar commits pendientes o cambios staged)
2. Para cada modulo modificado, localizar su documentacion correspondiente:

### Indice de documentacion por modulo

#### Documentacion de dominio (`.claude/docs/`)
| Dominio | Archivo | Actualizar cuando... |
|---------|---------|---------------------|
| Arquitectura | `architecture.md` | Nuevos modulos, rutas, stores, servicios, Edge Functions |
| Base de datos | `database.md` | Nuevas tablas, vistas, RPCs, triggers, storage buckets |
| Modulos | `modules.md` | Nuevos componentes, servicios, hooks, stores |
| Seguridad | `security.md` | Cambios RLS, vistas, REVOKE, Edge Functions auth |
| UI/Patrones | `ui-patterns.md` | Nuevos componentes shared, gradientes, z-index, animaciones |
| Integraciones | `integrations.md` | Cambios N8N, UChat, VAPI, AWS, Dynamics, ElevenLabs |
| Deploy | `deploy.md` | Cambios en script deploy, AWS, versionado |
| AWS | `aws-inventory.md` | Cambios en infraestructura AWS |

#### Documentacion de features (`docs/`)
| Feature | Archivo | Actualizar cuando... |
|---------|---------|---------------------|
| Prospectos | `GUIA_ASIGNACION_MANUAL_PROSPECTOS.md` | Cambios en asignacion, etapas, Kanban |
| Permisos | `PERMISSION_GROUPS_SYSTEM.md` | Cambios en grupos, permisos, roles |
| Live Chat | `LIVECHAT_ESCALABILITY_ROADMAP.md` | Cambios en chat WhatsApp |
| WhatsApp Templates | `WHATSAPP_TEMPLATES_API.md` | Cambios en plantillas |
| WhatsApp Labels | `WHATSAPP_LABELS_FINAL_DOCUMENTATION.md` | Cambios en etiquetas |
| Notificaciones | `NOTIFICATIONS_SYSTEM_COMPLETE.md` | Cambios en sistema notificaciones |
| Edge Functions | `EDGE_FUNCTIONS_CATALOG.md` | Nueva Edge Function o cambios significativos |
| Comunicados | `COMUNICADOS_REALTIME_SYSTEM.md` | Cambios en overlay, store, service, admin panel |
| Live Activity | `LIVE_ACTIVITY_WIDGET.md` | Cambios en widget llamadas, store, audio |
| AI Models | `AI_MODELS_MODULE.md` | Cambios en TTS, modelos, tokens, ElevenLabs |
| Live Monitor | `LIVE_MONITOR_VIEW_DOCUMENTATION.md` | Cambios en vista o clasificacion |
| Design System | `DESIGN_GUIDE_MODALS_V2.md` | Cambios en modales, design system |
| AWS | `AWS_SERVICES_CATALOG.md`, `AWS_CHANGELOG.md` | Cambios en infra AWS |

3. Actualizar SOLO las secciones relevantes del doc (no sobrescribir todo el archivo)
4. Si no hay doc correspondiente o los cambios son menores (fix CSS, typo), omitir este paso

Nota: El plugin `vite-plugin-static-copy` copia automaticamente `docs/*.md`, `CHANGELOG.md` y `VERSIONS.md` al build output. No es necesario mantener `public/docs/` manualmente.

## Notas

- Standalone: `tsx scripts/deploy-v2.ts`
- Logs a stderr, JSON a stdout
- UN solo commit por deploy (usa git amend internamente)
- Backend (B) solo incrementa si hay cambios en supabase/functions, scripts/sql, o migrations
- El script sanitiza comillas y caracteres especiales en mensajes de commit (fix 2026-02-09)
