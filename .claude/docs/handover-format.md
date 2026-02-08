# Handover Format - LLM-to-LLM Context Transfer

## Propósito

Formato estandarizado para handovers entre sesiones de Claude Code. Optimizado para máxima densidad de contexto técnico con mínimo de tokens. El receptor es otro LLM, no un humano — priorizar datos estructurados sobre prosa.

## Ubicación

- Directorio: `.cursor/handovers/`
- Naming: `YYYY-MM-DD-slug-descriptivo.md`
- REF: `HANDOVER-YYYY-MM-DD-SLUG` (2-4 palabras MAYÚSCULAS)

## Estructura Fija

```markdown
# HANDOVER-YYYY-MM-DD-SLUG

**Fecha**: YYYY-MM-DD | **Versión**: vX.Y.Z → vX.Y.W | **Build**: ok/fail

## Contexto
[1-2 líneas. Qué se pidió y por qué.]

## Delta

| Bloque | Descripción |
|--------|-------------|
| 1 | [Cambio principal en 1 línea] |
| 2 | [Segundo cambio] |

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `path/file.tsx` | [Qué cambió, líneas clave si relevante] |

## Migraciones SQL

| Versión | Nombre | Efecto |
|---------|--------|--------|
| 20260208034827 | create_whatsapp_analytics | Nueva función RPC |

[Omitir sección si no hay migraciones]

## Decisiones Técnicas

- **[Decisión]**: [Por qué]. Alternativa descartada: [cuál y por qué no].

[Solo decisiones que afectan arquitectura o que el próximo LLM necesita para no revertir/contradecir]

## Trampas y Gotchas

- `tabla.columna` = 'valor_real' (NO 'valor_que_parece_obvio')

[Solo incluir si hay trampas reales. Omitir si no hay.]

## Pendiente

1. [Tarea pendiente concreta con contexto suficiente para ejecutar]

[Omitir si no hay pendientes]

## Estado

- Build: tsc ok, vite ok
- Deploy: pendiente/completado (commit: abc1234)
- Archivos sin commit: [listar o "ninguno"]
```

## Reglas de Redacción

### HACER
- Tablas sobre listas, listas sobre párrafos
- Paths relativos desde raíz del proyecto
- Nombres exactos de funciones, tablas, columnas, valores de BD
- Versiones de migración SQL (para verificar estado BD)
- REF citables para encadenar handovers
- Causa raíz + fix en 1-2 líneas para bugs resueltos

### NO HACER
- Emojis en headers (desperdician tokens, no aportan a LLM)
- Párrafos explicativos largos (el receptor es un LLM, no necesita storytelling)
- Repetir contenido del CLAUDE.md o docs existentes
- Listar archivos que solo se leyeron (solo los modificados)
- Diagnósticos paso-a-paso de bugs ya resueltos
- Secciones vacías (omitir la sección completa si no aplica)
- Inventar datos — verificar contra BD/código antes de documentar

### Densidad de Contexto
- Cada línea debe aportar info que el próximo LLM necesita para continuar
- Preferir `tabla.columna = 'valor_real'` sobre "el campo X tiene el valor Y"
- Para bugs: causa raíz + fix en max 2 líneas, no el proceso de investigación

## Flujo de Creación

1. Usuario dice "handover" o "genera el handover"
2. Crear archivo en `.cursor/handovers/YYYY-MM-DD-slug.md`
3. En el chat, mostrar SOLO:

```
Handover creado.

**REF**: `HANDOVER-YYYY-MM-DD-SLUG`
**Ubicación**: `.cursor/handovers/YYYY-MM-DD-slug.md`

Para continuar: "Continúo desde REF: HANDOVER-YYYY-MM-DD-SLUG"

Resumen:
- [Tarea 1 completada]
- [Tarea 2 completada]
- Pendiente: [siguiente acción]
```

4. NO repetir el contenido del handover en el chat

## Flujo de Continuación

Cuando el usuario cita un REF:
1. Leer `.cursor/handovers/` buscando el archivo con ese REF
2. Leer secciones Pendiente + Trampas y Gotchas + Estado
3. Continuar desde donde quedó sin repetir lo hecho
