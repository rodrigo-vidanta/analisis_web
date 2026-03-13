# Handover: claude-mem MCP en VSCode Extension

**Fecha:** 2026-03-13
**Estado:** Completado

## Problema

El plugin `claude-mem` (thedotmack, v10.5.2) funciona en Claude Code CLI pero NO en la extension de Claude para VSCode. El plugin usa un sistema de plugins propio del CLI (`.claude/plugins/`) que VSCode no lee.

## Arquitectura del plugin

```
claude-mem tiene 2 componentes:

1. Worker (daemon)
   - Proceso: bun
   - Puerto: localhost:37777
   - Almacena observaciones en SQLite + ChromaDB
   - Health: GET http://localhost:37777/health
   - API: POST http://localhost:37777/api/observations/batch

2. MCP Server (stdio)
   - Script: ~/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/scripts/mcp-server.cjs
   - Transporte: stdio (NO HTTP)
   - Se conecta al worker via HTTP localhost:37777
   - Tools: search, timeline, get_observations, smart_search, smart_outline, smart_unfold
   - Tool especial: __IMPORTANT (instrucciones del workflow 3-layer en la descripcion)
```

## Solucion aplicada

### 1. MCP Server registrado en `.mcp.json`

Se agrego `claude-mem` como MCP server stdio en el `.mcp.json` del proyecto:

```json
"claude-mem": {
  "type": "stdio",
  "command": "node",
  "args": ["/Users/darigsamuelrosalesrobledo/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/scripts/mcp-server.cjs"]
}
```

VSCode lee `.mcp.json` y levanta el MCP server automaticamente.

### 2. Instrucciones en CLAUDE.md

Se agrego seccion "Memoria Persistente (claude-mem MCP)" con:
- Workflow 3-layer obligatorio (search → timeline → get_observations)
- Cuando usar y cuando NO usar
- Herramientas de code search (smart_search, smart_outline, smart_unfold)

### 3. Bloque `<claude-mem-context>` en CLAUDE.md

Se agrego bloque con actividad reciente (equivalente al SessionStart hook del CLI).
Contiene resumen de 34 observaciones agrupadas por tema (Mar 7-13).

### 4. Auto-update habilitado

En `~/.claude-mem/settings.json`:
```json
"CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED": "true"
```

Esto hace que el CLI actualice automaticamente el bloque `<claude-mem-context>` en CLAUDE.md al inicio de cada sesion.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `.mcp.json` | Agregado MCP server `claude-mem` (stdio) |
| `CLAUDE.md` | Seccion memoria persistente + bloque `<claude-mem-context>` |
| `~/.claude-mem/settings.json` | `CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED` → `true` |

## Limitaciones y notas

- **Path absoluto**: El MCP apunta a `~/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/`. Si el plugin se actualiza, el path cambia y hay que actualizar `.mcp.json`.
- **Worker debe estar corriendo**: Sin el worker en :37777, las tools fallan. Verificar: `lsof -i :37777`. Reiniciar: `bun ~/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/scripts/worker-service.cjs`
- **Issue conocido #941**: `FOLDER_CLAUDEMD_ENABLED` puede crear CLAUDE.md en subdirectorios. Usar `CLAUDE_MEM_FOLDER_MD_EXCLUDE` si ocurre.
- **SessionStart hook**: Solo funciona en CLI, no en VSCode. El bloque `<claude-mem-context>` en CLAUDE.md compensa esto.
- **Skills**: `/mem-search`, `/smart-explore`, `/make-plan`, `/do` estan disponibles en ambos (CLI y VSCode).

## Verificacion

```bash
# Worker corriendo
curl http://localhost:37777/health
# → {"status":"ok","timestamp":...}

# MCP tools disponibles en VSCode
# Abrir chat Claude → usar search/timeline/get_observations
```
