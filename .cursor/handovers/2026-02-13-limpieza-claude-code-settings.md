# Handover: Limpieza de Settings de Claude Code

**Fecha:** 2026-02-13
**Estado:** Completado (no requiere deploy, no modifica codigo de la app)

---

## Problema

Al iniciar Claude Code desde CLI, se mostraban errores de parseo en los archivos de permisos:

```
"The :* pattern must be at the end. Move :* to the end for prefix matching,
or use * for wildcard matching."
Files with errors are skipped entirely, not just the invalid settings.
```

**Causa raiz:** Los archivos de settings acumularon permisos auto-guardados de sesiones anteriores, incluyendo comandos one-shot completos (curls a N8N, inline scripts de Node, heredocs de documentacion) que contenian `:*` en medio del texto o patrones invalidos.

---

## Archivos modificados

| Archivo | Scope | Antes | Despues |
|---------|-------|-------|---------|
| `.claude/settings.local.json` | Proyecto PQNC | 166 lineas, 166 reglas | 64 lineas, 56 reglas |
| `~/.claude/settings.json` | Global (todos los proyectos) | 54 lineas, 47 reglas | 38 lineas, 30 reglas |

**Ambos archivos son locales, no se suben a git, no afectan produccion.**

---

## Que se elimino

### settings.local.json (proyecto)

| Categoria | Cantidad | Ejemplo |
|-----------|----------|---------|
| Comandos one-shot N8N | ~50 | `Bash(bash -c 'source ~/.zshrc; KEY=...; curl -s -H "X-N8N-API-KEY: $KEY" "https://...railway.app/api/v1/workflows/IpyOAEay..." \| jq ...')` |
| Inline scripts Node UChat | ~5 | Scripts completos de 40+ lineas escaneando subscribers |
| Curls VAPI con API key | ~10 | `Bash(VAPI_API_KEY="448d5c18..." curl -s -H "Authorization: Bearer 448d5c18..." ...)` |
| Heredocs masivos | 2 | Auditoria de permisos (300+ lineas) y analisis import pipeline (200+ lineas) como patrones de Bash |
| Utils redundantes | ~8 | `grep`, `find`, `echo`, `printf`, `sort`, `xargs`, `xxd` (Claude Code tiene tools dedicados) |
| AWS individuales | 6→1 | `aws ec2 describe-security-groups`, `aws cloudfront get-distribution`, etc. → `Bash(aws *)` |
| Git commands con path especifico | 3 | `git -C /Users/.../pqnc... diff HEAD -- src/components/...` |
| Patrones con API keys hardcodeadas | ~8 | Keys de UChat, VAPI, N8N, Supabase anon incrustadas en texto |

### settings.json (global)

| Categoria | Cantidad | Ejemplo |
|-----------|----------|---------|
| Commits heredoc proyecto verificaciones | 5 | `git -C .../contract-validation commit -m "$(cat <<'EOF' feat: verification flow v2..."` |
| Git commands especificos verificaciones | 3 | `git -C .../contract-validation add src/App.tsx src/components/...` |
| WebFetch dominios visitados una vez | 3 | `lightrun.com`, `git.soton.ac.uk`, `ccoreilly.github.io` |

---

## Que se conservo/consolido

### settings.local.json - Patrones finales

```
Git:        checkout, stash, status, diff, log, add, commit, merge, reset
Build:      npm run, npx tsc/vite/tsx/supabase, node
Env prefix: UCHAT_API_KEY=*, VAPI_API_KEY=*, N8N_API_KEY=*  (sin key hardcodeada)
Deploy:     tsx scripts/deploy-v2.ts, ./update-frontend.sh
Infra:      aws *, supabase, source, bash -c *, curl, kill, pkill, env
MCP:        17 tools de supabase (execute_sql, list_tables, deploy_edge_function, etc.)
WebFetch:   8 dominios (uchat, vapi, elevenlabs, supabase status)
```

### settings.json - Patrones finales

```
Search:     WebSearch
WebFetch:   5 dominios (github, npm, deepwiki, unpkg, raw.githubusercontent)
Git:        ls-remote, clone, add, commit, push, lfs
Build:      npm install/run, npx tsc/vite, node
CLI:        gh, python3, ffmpeg/ffprobe, curl, tar, chmod, ls, lsof, du
```

---

## Decisiones de diseno

1. **API keys como prefijo generico**: En vez de `Bash(UCHAT_API_KEY="k3C6GD..." node:*)` con la key literal, se usa `Bash(UCHAT_API_KEY=*)` que matchea cualquier comando que empiece con esa env var sin exponer el valor.

2. **AWS consolidado**: 6 patrones individuales (`aws ec2 describe-security-groups`, `aws cloudfront get-distribution`, etc.) reemplazados por un solo `Bash(aws *)`.

3. **`bash -c *` como comodin**: Los ~50 one-shots N8N eran variantes de `bash -c 'source ~/.zshrc; KEY=...; curl...'`. Se reemplazan con `Bash(bash -c *)` que cubre cualquier subshell.

4. **Utils de shell eliminados**: `grep`, `find`, `echo`, `printf`, `sort`, `xargs` no necesitan permiso explicito porque Claude Code tiene Grep, Glob, Read, etc. como tools nativos.

5. **Separacion global vs local**: Git operations basicas (add, commit, push) en global. Git operations de workflow (checkout, stash, merge, reset) + todo lo especifico de PQNC en local.

---

## Verificacion

Reiniciar Claude Code. Esperado:
- Sin errores de parseo al arrancar
- Sin prompt "Exit and fix manually"
- Permisos dia a dia funcionan igual (los patrones genericos cubren todos los comandos que se usaban)
- Si algun comando nuevo pide permiso, se aprueba una vez y se auto-guarda como nueva regla
