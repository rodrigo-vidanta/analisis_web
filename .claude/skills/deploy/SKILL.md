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

## Notas

- Standalone: `tsx scripts/deploy-v2.ts`
- Logs a stderr, JSON a stdout
- UN solo commit por deploy (usa git amend internamente)
- Backend (B) solo incrementa si hay cambios en supabase/functions, scripts/sql, o migrations
