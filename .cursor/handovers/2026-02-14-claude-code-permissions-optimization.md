# Handover: Optimizacion de Permisos Claude Code

**Fecha:** 2026-02-14
**Objetivo:** Reducir prompts de permisos sin sacrificar seguridad ante cambios destructivos

## Problema

Claude Code preguntaba excesivamente por permisos en cada sesion:
- Lectura de archivos (Read, Glob, Grep) requeria aprobacion
- Comandos basicos de terminal (ls, cat, railway, etc.) pedian confirmacion
- MCP Supabase pedia permiso por cada tool
- Skills (/deploy, /uchat, etc.) requerian aprobacion
- Los permisos aprobados manualmente se perdian al cerrar sesion

## Solucion

### Arquitectura de 2 niveles de settings

#### 1. Global (`~/.claude/settings.json`)
Aplica a **todos los proyectos**. Contiene:

| Categoria | Ejemplos | Cantidad |
|-----------|----------|----------|
| Tools nativos | Read, Glob, Grep, WebSearch, Skill | 5 |
| Git completo | checkout, push, commit, branch, fetch, etc. | 16 |
| Dev tools | npm, npx, node, python3, docker, brew, pip | 10+ |
| File ops | mkdir, cp, mv, touch, chmod, tar | 6 |
| Text processing | jq, sed, awk, sort, cut, tr, diff, xargs | 10 |
| Utilidades | date, pwd, open, stat, file, pbcopy, env | 10+ |
| Infra tools | railway, aws, curl, gh | 4 |
| MCP Supabase | Todos los tools de lectura + execute_sql + apply_migration + deploy_edge_function | 22 |
| WebFetch | github, npmjs, deepwiki, unpkg | 5 dominios |

**Deny rules globales:**
- `Bash(sudo *)` - bloqueado
- `Bash(rm -rf /*)` - bloqueado

**Default mode:** `acceptEdits` (auto-aprueba Edit/Write sin preguntar)

#### 2. Proyecto (`pqnc-qa-ai-platform/.claude/settings.local.json`)
Extiende global con reglas **especificas del proyecto**:

| Categoria | Ejemplos |
|-----------|----------|
| API Keys como prefijo | `UCHAT_API_KEY=*`, `VAPI_API_KEY=*`, `N8N_API_KEY=*` |
| Supabase CLI | `supabase *`, `npx supabase *` |
| AWS CLI | `aws *` |
| WebFetch dominios | uchat, vapi, elevenlabs, supabase status, railway docs |
| MCP extras | list_extensions, list_branches |

### Lo que sigue pidiendo confirmacion (por diseño)

Operaciones destructivas/costosas de Supabase MCP:
- `create_project`, `pause_project`, `restore_project` (afectan infraestructura)
- `confirm_cost` (involucra dinero)
- `create_branch`, `delete_branch`, `merge_branch`, `reset_branch`, `rebase_branch` (irreversibles en prod)

Bash no listado:
- `rm` (borrar archivos)
- `kill`, `pkill` (matar procesos)
- Cualquier binario no conocido

### Capas de seguridad activas

1. **deny rules** → sudo y rm -rf / bloqueados permanentemente
2. **CLAUDE.md** → "NUNCA push/deploy sin autorizacion explicita" (instruccion al modelo)
3. **acceptEdits** → auto-aprueba archivos pero no Bash arbitrario
4. **Git** → safety net, todo revertible con `git checkout .`
5. **MCP destructivos** → create/delete/merge siguen pidiendo confirmacion

## Archivos modificados

- `~/.claude/settings.json` - Settings globales (aplica a todos los proyectos)
- `.claude/settings.local.json` - Settings locales del proyecto PQNC (no va a git)

## Precedencia de settings (mayor a menor)

1. Managed settings (IT admin) - no usado
2. `.claude/settings.local.json` (personal, gitignored)
3. `.claude/settings.json` (compartido, en git)
4. `~/.claude/settings.json` (global del usuario)

## Tips

- **Reiniciar Claude Code** despues de cambiar settings para que tome efecto
- **Shift+Tab** para ciclar modos temporalmente (default → acceptEdits → plan)
- **`/permissions`** para ver todas las reglas activas y de donde vienen
- Si se necesita modo totalmente autonomo (CI/containers): `--dangerously-skip-permissions`
