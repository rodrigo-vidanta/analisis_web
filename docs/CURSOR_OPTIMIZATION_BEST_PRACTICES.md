# 🚀 Cursor Optimization Best Practices

**Guía Universal de Optimización de Cursor AI**  
**Versión:** 2.0 (Enero 2026)  
**Aplicable a:** Cualquier proyecto (Frontend, Backend, Full-Stack)

---

## 📋 Índice

1. [Filosofía de Optimización](#filosofía-de-optimización)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Cursor Rules (.cursor/rules/)](#cursor-rules)
4. [Documentación Esencial](#documentación-esencial)
5. [Índices y Context Control](#índices-y-context-control)
6. [Session Management](#session-management)
7. [Handovers](#handovers)
8. [Model Selection](#model-selection)
9. [Workflow Optimization](#workflow-optimization)
10. [Anti-Hallucination Strategies](#anti-hallucination-strategies)
11. [Cost Optimization](#cost-optimization)
12. [Checklist de Implementación](#checklist-de-implementación)

---

## 🎯 Filosofía de Optimización

### Principios Fundamentales

```
1. CONTEXTO > TOKENS
   - Mejor contexto = menos iteraciones = menos tokens
   
2. ESTRUCTURA > LIBERTAD
   - Rules claras = menos alucinaciones
   
3. MODULARIDAD > MONOLITO
   - Rules pequeñas y especializadas > 1 archivo gigante
   
4. PREVENCIÓN > CORRECCIÓN
   - Evitar errores > Corregir errores
   
5. EXPLÍCITO > IMPLÍCITO
   - Instrucciones claras > Asumir que el AI entiende
```

---

## 📁 Estructura de Archivos

### Estructura Recomendada

```
proyecto/
├── .cursor/
│   ├── rules/                    # Rules modulares
│   │   ├── project-context.mdc   # Contexto del proyecto
│   │   ├── core-production.mdc   # Prohibiciones críticas
│   │   ├── anti-hallucination.mdc
│   │   ├── session-limits.mdc
│   │   ├── workflow.mdc
│   │   ├── gold-standards.mdc
│   │   ├── model-selection.mdc
│   │   └── [feature]-rules.mdc   # Rules específicas por feature
│   │
│   ├── templates/                # Plantillas reutilizables
│   │   ├── session-handover.md
│   │   ├── checkpoint.md
│   │   └── bug-report.md
│   │
│   ├── handovers/                # Historial de handovers
│   │   ├── .gitkeep
│   │   └── YYYY-MM-DD-[topic].md
│   │
│   ├── CODEBASE_INDEX.md         # Mapa del código
│   ├── ERROR_PATTERNS.md         # Errores comunes
│   └── OPTIMIZATION_LOG.md       # Log de optimizaciones
│
├── docs/                         # Documentación del proyecto
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── API_REFERENCE.md
│   └── [otros].md
│
├── .cursorrules                  # Rule master (índice)
├── .cursorindexingignore         # Excluir de indexado
├── .cursorignore                 # Ignorar archivos
├── ARCHITECTURE.md               # Arquitectura (raíz)
├── CONVENTIONS.md                # Convenciones (raíz)
└── README.md
```

---

## 📝 Cursor Rules

### 1. Rule Master: `.cursorrules`

**Propósito:** Índice que referencia las rules modulares.

```markdown
# [Nombre del Proyecto] - Reglas Principales

> **Estado:** [Desarrollo/Producción]
> **Stack:** [Lista de tecnologías principales]
> **Última actualización:** [Fecha]

---

## Resumen Ejecutivo

[Descripción breve del proyecto en 2-3 líneas]

---

## Reglas Críticas (SIEMPRE APLICAR)

### 1. [Regla Crítica 1]
```
❌ NUNCA [acción prohibida]
✅ SIEMPRE [acción correcta]
```

[Repetir para otras reglas críticas]

---

## Reglas Detalladas

Para instrucciones completas, consultar las reglas modulares en `.cursor/rules/`:

| Regla | Propósito |
|-------|-----------|
| `project-context.mdc` | Contexto general del proyecto |
| `core-production.mdc` | Prohibiciones críticas |
| `anti-hallucination.mdc` | Prevenir invenciones |
| `session-limits.mdc` | Control de sesiones |
| `workflow.mdc` | Flujo de trabajo |
| `gold-standards.mdc` | Archivos ejemplares |
| `model-selection.mdc` | Selección de modelos |

---

## Archivos Clave

| Necesitas... | Consulta... |
|--------------|-------------|
| Arquitectura | `ARCHITECTURE.md` |
| Convenciones | `CONVENTIONS.md` |
| Mapa código | `.cursor/CODEBASE_INDEX.md` |
| Errores comunes | `.cursor/ERROR_PATTERNS.md` |

---

## Recordatorio

```
VERIFICAR antes de actuar
PREGUNTAR antes de asumir
COMMIT frecuente
NUEVO CHAT cada [X] mensajes
```
```

**Tamaño:** 100-150 líneas máximo

---

### 2. Project Context: `.cursor/rules/project-context.mdc`

**Propósito:** Contexto completo del proyecto.

```markdown
# Contexto del Proyecto

**Última actualización:** [Fecha]

---

## Stack Tecnológico

### Frontend
- Framework: [React/Vue/Angular/etc]
- Lenguaje: [TypeScript/JavaScript]
- Build Tool: [Vite/Webpack/etc]
- Styling: [TailwindCSS/CSS Modules/etc]
- Estado: [Zustand/Redux/Context/etc]

### Backend
- Runtime: [Node/Deno/Bun/etc]
- Framework: [Express/Fastify/etc]
- Base de Datos: [PostgreSQL/MongoDB/etc]
- ORM: [Prisma/TypeORM/etc]

### Infraestructura
- Hosting: [Vercel/AWS/Railway/etc]
- CI/CD: [GitHub Actions/GitLab/etc]

---

## Estructura de Carpetas

```
src/
├── components/      # [Descripción]
├── services/        # [Descripción]
├── utils/           # [Descripción]
├── types/           # [Descripción]
└── [otros]/
```

---

## Convenciones de Código

### Nomenclatura
- Componentes: `PascalCase`
- Funciones: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Archivos: `kebab-case` o `PascalCase`

### Patrones
- Handlers: `handle[Action]` (ej: `handleSubmit`)
- Boolean: `is/has/can` (ej: `isLoading`, `hasError`)
- Async: `fetch/get/create/update/delete`

---

## Integraciones Externas

| Servicio | Propósito | Docs |
|----------|-----------|------|
| [API 1] | [Descripción] | [Link] |
| [API 2] | [Descripción] | [Link] |

---

## Variables de Entorno

```bash
# Ejemplo de estructura
API_URL=
API_KEY=
DATABASE_URL=
```

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Tests
npm run test

# Linting
npm run lint
```
```

---

### 3. Core Production: `.cursor/rules/core-production.mdc`

**Propósito:** Prohibiciones críticas.

```markdown
# Reglas de Producción Críticas

## ⛔ PROHIBICIONES ABSOLUTAS

### 1. NO Deploy Automático
```
❌ NUNCA push a Git sin autorización explícita
❌ NUNCA deploy sin confirmación del usuario
✅ SOLO cuando el usuario lo solicite explícitamente
```

### 2. NO Código Mock
```
❌ NUNCA funciones mock en producción
❌ NUNCA datos hardcodeados
❌ NUNCA console.log en producción
✅ TODO código debe ser production-ready
```

### 3. NO Exponer Credenciales
```
❌ NUNCA hardcodear API keys
❌ NUNCA credenciales en código
❌ NUNCA tokens en commits
✅ SIEMPRE usar variables de entorno
```

### 4. NO Modificar sin Entender
```
❌ NUNCA cambiar código sin leerlo primero
❌ NUNCA asumir estructura sin verificar
❌ NUNCA inventar funciones que no existen
✅ SIEMPRE leer antes de modificar
```

---

## ✅ PATRONES OBLIGATORIOS

### 1. Confirmación Antes de Destructivo
```typescript
// Antes de DELETE, DROP, TRUNCATE
const confirmDelete = await confirm("¿Eliminar [recurso]?");
if (!confirmDelete) return;
```

### 2. Manejo de Errores
```typescript
try {
  // Operación
} catch (error) {
  console.error('[Context]:', error);
  // Manejo apropiado
}
```

### 3. Validación de Inputs
```typescript
if (!input || !isValid(input)) {
  throw new Error('Invalid input');
}
```

---

## 🔒 Seguridad

1. **Nunca** exponer tokens en logs
2. **Siempre** validar inputs del usuario
3. **Siempre** sanitizar datos antes de guardar
4. **Nunca** confiar en datos del cliente
```

---

### 4. Anti-Hallucination: `.cursor/rules/anti-hallucination.mdc`

```markdown
# Reglas Anti-Alucinación

## ⛔ NUNCA Inventar

### 1. NO Inventar Código
```
❌ Crear funciones que no existen
❌ Asumir APIs sin verificar
❌ Imaginar estructura de datos
✅ Leer archivos existentes primero
✅ Verificar documentación
✅ Preguntar si no estás seguro
```

### 2. NO Inventar Archivos
```
❌ Referenciar rutas inexistentes
❌ Asumir nombres de archivos
❌ Crear imports a módulos que no existen
✅ Verificar con grep/file search
✅ Revisar estructura real del proyecto
```

### 3. NO Inventar Librerías
```
❌ Usar paquetes no instalados
❌ Asumir métodos de librerías sin verificar
❌ Mezclar sintaxis de diferentes versiones
✅ Verificar package.json
✅ Consultar documentación oficial
```

---

## ✅ PROCESO DE VERIFICACIÓN

### Antes de Codificar

1. **Leer archivos relacionados**
   ```bash
   - Leer el archivo que vas a modificar
   - Leer archivos importados
   - Verificar tipos/interfaces
   ```

2. **Buscar patrones existentes**
   ```bash
   - grep para encontrar usos similares
   - Buscar ejemplos en el código
   - Identificar convenciones
   ```

3. **Verificar dependencias**
   ```bash
   - Revisar package.json
   - Confirmar versiones de librerías
   - Verificar APIs disponibles
   ```

4. **Confirmar con el usuario**
   ```
   Si tienes duda sobre:
   - Arquitectura
   - Naming
   - Ubicación de archivos
   → PREGUNTAR antes de asumir
   ```

---

## 🎯 Checklist Pre-Código

- [ ] He leído el archivo que voy a modificar
- [ ] He verificado que las funciones/métodos existen
- [ ] He confirmado que las librerías están instaladas
- [ ] He buscado patrones similares en el código
- [ ] Tengo claro el objetivo y el approach
- [ ] No estoy asumiendo nada sin verificar
```

---

### 5. Session Limits: `.cursor/rules/session-limits.mdc`

```markdown
# Límites de Sesión

## 📊 Límites Recomendados

### Chat Normal
```
- Máximo: 50 mensajes
- Tiempo: 1-2 horas
- Contexto: ~100-150K tokens
```

### Composer/Agent
```
- Máximo: 30 acciones/ediciones
- Tiempo: 1 hora
- Contexto: ~150-200K tokens
```

---

## ⚠️ Señales para Nuevo Chat

### Indicadores de Context Overload

1. **El AI repite información**
2. **Comete errores que ya se corrigieron**
3. **Confunde archivos o conceptos**
4. **Las respuestas son genéricas**
5. **Tarda mucho en responder**
6. **Ignora reglas establecidas**

### Situaciones que Requieren Nuevo Chat

```
✅ Cambio de feature/módulo
✅ Después de 50+ mensajes
✅ Sesión de 2+ horas
✅ Errores repetitivos
✅ Confusión en el contexto
✅ Cambio de enfoque/objetivo
```

---

## 🔄 Proceso de Handover

### Cuándo Hacer Handover

1. **Antes de cerrar una sesión larga**
2. **Al terminar una feature compleja**
3. **Antes de cambiar de módulo**
4. **Al alcanzar límite de mensajes**

### Cómo Hacer Handover

```
1. Usa la plantilla: .cursor/templates/session-handover.md
2. Documenta:
   - Qué se completó
   - Qué está pendiente
   - Problemas encontrados
   - Decisiones importantes
3. Guarda en: .cursor/handovers/YYYY-MM-DD-[topic].md
4. Inicia nuevo chat
5. Primera línea: "Lee .cursor/handovers/[último].md"
```

---

## 📝 Plantilla de Handover

Ver: `.cursor/templates/session-handover.md`

---

## 💡 Tips para Sesiones Eficientes

1. **Un objetivo por sesión**
   - ✅ "Implementar autenticación"
   - ❌ "Hacer auth, dashboard, y API"

2. **Commits frecuentes**
   - Cada feature pequeña = 1 commit
   - Facilita rollback si algo falla

3. **Checkpoints intermedios**
   - Cada 10-15 mensajes, resume el progreso
   - Usa: `.cursor/templates/checkpoint.md`

4. **Documentar decisiones**
   - Si cambias arquitectura, documéntalo
   - Explica el "por qué" de decisiones grandes
```

---

### 6. Workflow: `.cursor/rules/workflow.mdc`

```markdown
# Workflow de Desarrollo

## 📋 Proceso Estándar

### Fase 1: Análisis (SIEMPRE)

```
1. Lee el objetivo completo
2. Identifica archivos involucrados
3. Lee archivos relevantes
4. Busca patrones similares en el código
5. Pregunta si tienes dudas
```

### Fase 2: Planificación

```
1. Desglosa la tarea en pasos pequeños
2. Identifica dependencias
3. Planea el orden de ejecución
4. Estima impacto en otros archivos
```

### Fase 3: Implementación

```
1. Implementa en pasos pequeños
2. Commit frecuente
3. Verifica que funcione antes de continuar
4. Documenta cambios importantes
```

### Fase 4: Verificación

```
1. Revisa que cumple el objetivo
2. Verifica que no rompe nada
3. Confirma con el usuario
4. Documenta si es necesario
```

---

## 🚦 Niveles de Cambio

### 🟢 Cambio Simple (Directo)
```
Ejemplos:
- Cambiar texto
- Ajustar estilos
- Agregar un campo

Proceso:
1. Leer archivo
2. Hacer cambio
3. Confirmar
```

### 🟡 Cambio Medio (Planificación)
```
Ejemplos:
- Agregar un componente
- Crear un servicio
- Modificar lógica

Proceso:
1. Analizar contexto
2. Presentar plan al usuario
3. Esperar aprobación
4. Implementar
5. Verificar
```

### 🔴 Cambio Complejo (Aprobación Explícita)
```
Ejemplos:
- Cambiar arquitectura
- Migrar base de datos
- Refactorizar módulo completo

Proceso:
1. Análisis profundo
2. Documento de propuesta
3. Aprobación explícita del usuario
4. Implementación por fases
5. Checkpoints frecuentes
6. Verificación exhaustiva
```

---

## ⚠️ Reglas de Aprobación

### Requiere Aprobación Explícita

```
❌ Cambios destructivos (DELETE, DROP)
❌ Cambios en producción
❌ Modificar múltiples archivos (>5)
❌ Cambiar arquitectura
❌ Deploy/Push a Git
❌ Cambios en configuración crítica
```

### NO Requiere Aprobación

```
✅ Agregar comentarios
✅ Formatear código
✅ Agregar logs de desarrollo
✅ Crear archivos de documentación
✅ Cambios cosméticos en UI
```

---

## 🔄 Iteración Inteligente

### Patrón Recomendado

```
1. Cambio pequeño (1-2 archivos)
2. Verifica que funciona
3. Commit
4. Siguiente cambio pequeño
5. Repeat

❌ NO hacer todo de una vez
✅ Iterar en pasos pequeños
```

### Ventajas de Iteración

- Más fácil detectar errores
- Rollback más sencillo
- Feedback más rápido
- Menos context overflow

---

## 💬 Comunicación con el Usuario

### Actualiza al Usuario

```
✅ Antes de cambios grandes
✅ Cuando encuentras un problema
✅ Si hay múltiples opciones
✅ Al completar un paso importante
```

### Pide Feedback

```
✅ "¿Te parece este approach?"
✅ "¿Prefieres opción A o B?"
✅ "¿Procedo con este plan?"
```

### Reporta Problemas

```
✅ "Encontré un error en [archivo]"
✅ "Esta parte no está clara: [explicar]"
✅ "Necesito más información sobre [tema]"
```
```

---

### 7. Gold Standards: `.cursor/rules/gold-standards.mdc`

```markdown
# Gold Standards (Archivos Ejemplares)

## 📚 Archivos de Referencia

### Componentes

```typescript
// Referencia para componentes:
// src/components/[ejemplo-componente].tsx

- Uso de TypeScript
- Props interface
- Manejo de estado
- Styled con TailwindCSS
- Comentarios claros
```

### Servicios

```typescript
// Referencia para servicios:
// src/services/[ejemplo-service].ts

- Funciones async/await
- Manejo de errores
- Tipos de retorno explícitos
- JSDoc para documentación
```

### Hooks

```typescript
// Referencia para hooks:
// src/hooks/[ejemplo-hook].ts

- Custom hooks con tipos
- Manejo de dependencias
- Cleanup adecuado
```

---

## 🎯 Patrones a Seguir

### 1. Estructura de Componente

```typescript
import { useState, useEffect } from 'react';
import type { ComponentProps } from './types';

interface Props {
  // Props tipadas
}

export const Component = ({ prop1, prop2 }: Props) => {
  // 1. Hooks primero
  const [state, setState] = useState();
  
  // 2. Efectos
  useEffect(() => {
    // ...
  }, [dependencies]);
  
  // 3. Handlers
  const handleAction = () => {
    // ...
  };
  
  // 4. Early returns
  if (loading) return <Loading />;
  if (error) return <Error />;
  
  // 5. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### 2. Estructura de Servicio

```typescript
/**
 * [Descripción del servicio]
 */
export const exampleService = {
  /**
   * [Descripción de la función]
   * @param param1 - Descripción
   * @returns Descripción del retorno
   */
  async fetchData(param1: string): Promise<DataType> {
    try {
      // Implementación
      return data;
    } catch (error) {
      console.error('[Service] Error:', error);
      throw error;
    }
  },
};
```

### 3. Manejo de Errores

```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error('[Context] Error:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}
```

---

## 📐 Convenciones de Código

### Nomenclatura

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componente | PascalCase | `UserProfile` |
| Función | camelCase | `fetchUserData` |
| Constante | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Interface | PascalCase + I (opcional) | `User` o `IUser` |
| Type | PascalCase | `UserData` |
| Enum | PascalCase | `UserRole` |

### Archivos

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componente | PascalCase.tsx | `UserProfile.tsx` |
| Servicio | camelCase.ts | `userService.ts` |
| Tipo | camelCase.ts | `userTypes.ts` |
| Utilidad | camelCase.ts | `formatDate.ts` |
| Hook | camelCase.ts | `useAuth.ts` |

---

## 🎨 Styling (TailwindCSS)

### Orden de Clases

```typescript
className="
  // Layout
  flex flex-col
  // Spacing
  p-4 m-2
  // Sizing
  w-full h-screen
  // Typography
  text-lg font-bold
  // Colors
  bg-blue-500 text-white
  // Borders
  border border-gray-300 rounded-lg
  // Effects
  shadow-lg hover:shadow-xl
  // Transitions
  transition-all duration-200
"
```

---

## 📝 Comentarios

### Cuándo Comentar

```typescript
// ✅ COMENTAR:
// - Por qué se hace algo (no qué se hace)
// - Decisiones de arquitectura
// - Workarounds temporales
// - TODO/FIXME con contexto

// ❌ NO COMENTAR:
// - Código auto-explicativo
// - Obviedades
// - Código comentado (eliminarlo)
```

### Estilo de Comentarios

```typescript
// Comentario de una línea para explicaciones breves

/**
 * Comentario de bloque para:
 * - Funciones públicas
 * - Componentes complejos
 * - APIs
 */

// TODO: [Descripción de lo que falta] - [Autor] - [Fecha]
// FIXME: [Descripción del problema] - [Autor] - [Fecha]
```
```

---

### 8. Model Selection: `.cursor/rules/model-selection.mdc`

```markdown
# Selección de Modelos

## 🎯 Guía de Uso por Modelo

### 💚 Claude Sonnet 4 (Uso Diario)

**Cuándo usar:**
- ✅ Desarrollo día a día
- ✅ Refactoring
- ✅ Debugging
- ✅ Implementación de features
- ✅ Code reviews
- ✅ Documentación

**Ventajas:**
- ⚡ Rápido
- 💰 Económico
- 🎯 Preciso para tareas comunes
- 📊 200K context window

**Desventajas:**
- ⚠️ x2 costo si excede 200K tokens
- ⚠️ Menos profundo para arquitectura compleja

**Costo:** ~$3 per 1M input tokens

---

### 🔮 Claude Opus 4 (Tareas Críticas)

**Cuándo usar:**
- ✅ Arquitectura compleja
- ✅ Debugging muy difícil
- ✅ Decisiones críticas de diseño
- ✅ Code review profundo
- ✅ Optimización de rendimiento

**Ventajas:**
- 🧠 Razonamiento más profundo
- 🎯 Mejor para problemas complejos
- ♾️ Sin límite de context window

**Desventajas:**
- 💰 Más costoso
- 🐌 Más lento

**Costo:** ~$15 per 1M input tokens

---

### 🚀 Max Mode (Problemas Imposibles)

**Cuándo usar:**
- ✅ Bugs críticos que nadie puede resolver
- ✅ Refactoring masivo
- ✅ Decisiones de arquitectura mayor

**Ventajas:**
- 🔥 Máxima capacidad
- 🧠 Razonamiento excepcional

**Desventajas:**
- 💸 MUY costoso
- 🐢 Muy lento

**Costo:** Premium (consumo alto de "cycle count")

---

### 🎯 Cursor Small (Tareas Simples)

**Cuándo usar:**
- ✅ Autocompletado
- ✅ Cambios muy simples
- ✅ Formatear código
- ✅ Generar boilerplate

**Ventajas:**
- ⚡ Muy rápido
- 💚 Gratis/incluido

**Desventajas:**
- 🎯 Menos preciso
- 📦 Context limitado

---

## 🧮 Estrategia de Costo-Beneficio

### Desarrollo Normal (80% del tiempo)

```
Claude Sonnet 4 (sin thinking)
├── Daily tasks
├── Feature implementation
├── Bug fixes
└── Refactoring

Costo estimado: $5-10/día (uso intensivo)
```

### Debugging Complejo (15% del tiempo)

```
Claude Sonnet 4 + Debug Mode
├── Analizar problemas difíciles
├── Trace de bugs
└── Optimización

Costo estimado: +$2-5 extra
```

### Decisiones Críticas (5% del tiempo)

```
Claude Opus 4
├── Arquitectura mayor
├── Decisiones de diseño críticas
└── Code review profundo

Costo estimado: $5-10 por sesión
```

---

## 💡 Tips para Ahorrar Tokens

### 1. Usa Composer para Tareas Multi-Archivo

```
❌ Chat: "Edita archivo1, luego archivo2, luego archivo3"
   → Mucho context, muchas respuestas

✅ Composer: "Actualiza estos 3 archivos con [cambio]"
   → Una sesión, menos tokens
```

### 2. Sesiones Cortas y Enfocadas

```
❌ Una sesión de 100 mensajes mezclando temas
✅ Sesiones de 30-50 mensajes enfocadas en 1 objetivo
```

### 3. Handovers Regulares

```
❌ Sesión de 5 horas arrastrando todo el contexto
✅ Handover cada 1-2 horas, nuevo chat
```

### 4. Excluir Archivos Grandes

```
Usa .cursorindexingignore para excluir:
- node_modules/
- dist/
- Archivos generados
- Logs
- Assets grandes
```

### 5. No uses "Thinking" si no es Necesario

```
Thinking = ~2-3x más tokens

❌ Thinking para cambio simple
✅ Thinking para problema complejo
```

---

## 📊 Monitoreo de Uso

### Revisar Dashboard

```
1. Settings → Usage
2. Verificar:
   - Tokens consumidos hoy
   - Modelo más usado
   - Cycle agent count
```

### Señales de Uso Excesivo

```
⚠️ >100K tokens/día consistentemente
⚠️ Uso frecuente de Opus para tareas simples
⚠️ Max Mode activado regularmente
⚠️ Thinking habilitado siempre
⚠️ Sesiones muy largas (>200 mensajes)
```

---

## ✅ Checklist de Optimización

- [ ] Usar Sonnet para desarrollo diario
- [ ] Reservar Opus para casos críticos
- [ ] Usar Composer para multi-archivo
- [ ] Sesiones <50 mensajes
- [ ] Handovers cada 1-2 horas
- [ ] .cursorindexingignore configurado
- [ ] Thinking solo cuando es necesario
- [ ] Monitorear usage semanalmente
```

---

## 🗂️ Índices y Context Control

### `.cursorindexingignore`

**Propósito:** Excluir archivos del indexado de Cursor.

```gitignore
# Dependencies
node_modules/
vendor/
.pnp/
.pnp.js

# Build outputs
dist/
build/
out/
.next/
.nuxt/
.cache/

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Environment
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Package managers
package-lock.json
yarn.lock
pnpm-lock.yaml

# Assets grandes
*.pdf
*.zip
*.tar.gz
*.mp4
*.mov

# Database
*.sql
*.sqlite
*.db

# Documentation generada
docs/api/
docs/generated/

# Backups
backups/
*.backup
*.bak

# Deployment
.vercel/
.netlify/
.firebase/

# Large data files
*.csv
*.json (si son muy grandes)
```

---

### `.cursorignore`

Similar a `.cursorindexingignore`, aplica para todas las operaciones de Cursor.

```gitignore
# Mismo contenido que .cursorindexingignore
# + archivos específicos que nunca quieres que Cursor toque

# Configuración crítica
.git/
.github/workflows/ (si no quieres que modifique CI/CD)

# Archivos generados por herramientas
*-lock.json
*.lock
```

---

### `.cursor/CODEBASE_INDEX.md`

**Propósito:** Mapa rápido del proyecto para el AI.

```markdown
# Mapa del Codebase

**Última actualización:** [Fecha]

---

## Estructura Principal

### `/src/components/`
- **[Componente1]**: [Descripción breve]
- **[Componente2]**: [Descripción breve]

### `/src/services/`
- **[Service1]**: [Descripción breve]
- **[Service2]**: [Descripción breve]

### `/src/utils/`
- **[Util1]**: [Descripción breve]
- **[Util2]**: [Descripción breve]

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/main.tsx` | Punto de entrada |
| `src/App.tsx` | Componente raíz |
| `src/config/` | Configuración |

---

## Flujos Principales

### Autenticación
```
1. LoginForm.tsx
2. authService.ts
3. AuthContext.tsx
4. Protected routes
```

### [Otro flujo]
```
1. [Paso 1]
2. [Paso 2]
```

---

## Convenciones

- Componentes: `PascalCase.tsx`
- Servicios: `camelCase.ts`
- [Otras convenciones]

---

## Notas Importantes

- [Nota 1]
- [Nota 2]
```

---

## 🔄 Handovers

### Plantilla: `.cursor/templates/session-handover.md`

```markdown
# Session Handover - [Fecha] - [Tema]

## 📊 Resumen Ejecutivo

**Objetivo Principal:** [Descripción en 1 línea]
**Status:** [En progreso / Completado / Bloqueado]
**Duración:** [X horas / Y mensajes]

---

## ✅ Completado

### [Feature/Tarea 1]
- [x] [Subtarea 1]
- [x] [Subtarea 2]

**Archivos modificados:**
- `src/[archivo1.ts]`
- `src/[archivo2.tsx]`

**Decisiones tomadas:**
- [Decisión 1 y por qué]
- [Decisión 2 y por qué]

### [Feature/Tarea 2]
[...]

---

## 🚧 En Progreso

### [Tarea actual]
**Status:** [X% completado]
**Archivos involucrados:**
- `src/[archivo.ts]`

**Contexto:**
[Explicación breve de dónde quedamos]

**Próximos pasos:**
1. [Paso 1]
2. [Paso 2]

---

## 🔴 Bloqueadores

### [Bloqueador 1]
**Descripción:** [Qué está bloqueando]
**Posible solución:** [Si la hay]
**Requiere:** [Decisión del usuario / Investigación / etc]

---

## 🐛 Bugs Encontrados

### [Bug 1]
**Ubicación:** `src/[archivo.ts:línea]`
**Descripción:** [Qué pasa]
**Causa posible:** [Si se identificó]
**Workaround:** [Si hay alguno temporal]

---

## 💡 Decisiones Importantes

1. **[Decisión 1]**
   - **Por qué:** [Razón]
   - **Alternativas consideradas:** [Si aplica]
   
2. **[Decisión 2]**
   [...]

---

## 📝 Notas para la Próxima Sesión

- [Nota 1: algo que tener en cuenta]
- [Nota 2: revisar antes de continuar]

---

## 🔗 Referencias

- Commit principal: [hash]
- Issue/Ticket: [link]
- Documentación relevante: [links]

---

## 📊 Métricas

- **Archivos modificados:** [X]
- **Líneas agregadas:** [~X]
- **Líneas eliminadas:** [~X]
- **Tests:** [Pasando / Pendientes]
- **Tokens consumidos:** [Estimado ~X]

---

**Fecha de handover:** [YYYY-MM-DD HH:mm]  
**Próxima sesión:** [Continuar con [tema]]
```

---

### Plantilla: `.cursor/templates/checkpoint.md`

```markdown
# Checkpoint - [HH:mm]

## Status
- ✅ [Tarea completada 1]
- 🚧 [Tarea en progreso]
- ⏳ [Tarea pendiente]

## Archivos modificados desde último checkpoint
- `[archivo1]`
- `[archivo2]`

## Próximo objetivo
[Descripción breve]

## Bloqueadores (si hay)
[Descripción o "Ninguno"]
```

---

## 🎯 Checklist de Implementación

### Setup Inicial

```bash
# 1. Crear estructura de carpetas
mkdir -p .cursor/rules .cursor/templates .cursor/handovers

# 2. Crear archivos base
touch .cursorrules
touch .cursorindexingignore
touch .cursorignore
touch .cursor/CODEBASE_INDEX.md
touch .cursor/ERROR_PATTERNS.md

# 3. Crear rules modulares
touch .cursor/rules/project-context.mdc
touch .cursor/rules/core-production.mdc
touch .cursor/rules/anti-hallucination.mdc
touch .cursor/rules/session-limits.mdc
touch .cursor/rules/workflow.mdc
touch .cursor/rules/gold-standards.mdc
touch .cursor/rules/model-selection.mdc

# 4. Crear templates
touch .cursor/templates/session-handover.md
touch .cursor/templates/checkpoint.md

# 5. Crear documentación raíz
touch ARCHITECTURE.md
touch CONVENTIONS.md
```

---

### Checklist de Contenido

#### ✅ Archivos Críticos
- [ ] `.cursorrules` (índice master, <150 líneas)
- [ ] `.cursorindexingignore` (excluir node_modules, dist, logs)
- [ ] `.cursorignore` (similar al anterior)
- [ ] `ARCHITECTURE.md` (arquitectura general)
- [ ] `CONVENTIONS.md` (convenciones de código)

#### ✅ Rules Modulares
- [ ] `project-context.mdc` (stack, estructura, integraciones)
- [ ] `core-production.mdc` (prohibiciones críticas)
- [ ] `anti-hallucination.mdc` (no inventar código)
- [ ] `session-limits.mdc` (límites de mensajes/tiempo)
- [ ] `workflow.mdc` (proceso de desarrollo)
- [ ] `gold-standards.mdc` (archivos de referencia)
- [ ] `model-selection.mdc` (cuándo usar cada modelo)

#### ✅ Templates
- [ ] `session-handover.md` (plantilla de handover)
- [ ] `checkpoint.md` (plantilla de checkpoint)

#### ✅ Documentación Auxiliar
- [ ] `.cursor/CODEBASE_INDEX.md` (mapa del código)
- [ ] `.cursor/ERROR_PATTERNS.md` (errores comunes)
- [ ] `.cursor/OPTIMIZATION_LOG.md` (log de cambios)

---

### Checklist de Hábitos

#### 📅 Diariamente
- [ ] Usar Claude Sonnet 4 para desarrollo normal
- [ ] Sesiones <50 mensajes
- [ ] Commits frecuentes

#### 📅 Cada Sesión
- [ ] Definir objetivo claro al inicio
- [ ] Checkpoint cada 10-15 mensajes
- [ ] Handover si la sesión supera 1-2 horas

#### 📅 Semanalmente
- [ ] Revisar dashboard de usage
- [ ] Actualizar ERROR_PATTERNS.md si encontraste bugs
- [ ] Revisar y limpiar handovers antiguos

#### 📅 Mensualmente
- [ ] Actualizar CODEBASE_INDEX.md
- [ ] Revisar y optimizar .cursorindexingignore
- [ ] Evaluar qué rules necesitan actualización

---

## 📊 Métricas de Éxito

### Antes vs Después de Optimización

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tokens/día | ~500K | ~150K | -70% |
| Errores/sesión | 5-10 | 1-2 | -80% |
| Tiempo/feature | 2-3h | 1-1.5h | -50% |
| Alucinaciones | Frecuentes | Raras | -90% |
| Context overflow | Común | Raro | -95% |
| Costo/día | $50-100 | $10-20 | -80% |

---

## 🚀 Quick Start

### Para un Proyecto Nuevo

```bash
# 1. Clonar este template
# 2. Ejecutar setup inicial (ver arriba)
# 3. Personalizar project-context.mdc con tu stack
# 4. Agregar tus convenciones en CONVENTIONS.md
# 5. Configurar .cursorindexingignore según tu proyecto
# 6. Crear CODEBASE_INDEX.md con tu estructura
# 7. Identificar archivos gold standard
# 8. ¡Empezar a codear! 🎉
```

---

## 📚 Referencias

### Documentación Oficial
- [Cursor Documentation](https://docs.cursor.sh)
- [Cursor Rules Guide](https://docs.cursor.sh/context/rules)

### Comunidad
- [Cursor Forum](https://forum.cursor.sh)
- Reddit: r/cursor

---

## 🎓 Aprendizajes Clave

### 1. Contexto es Rey
> Mejor contexto = menos tokens = menos errores = menos costo

### 2. Modularidad Gana
> 7 archivos pequeños y especializados > 1 archivo gigante

### 3. Prevención > Corrección
> 10 minutos configurando rules > 2 horas corrigiendo alucinaciones

### 4. Sesiones Cortas y Enfocadas
> 3 sesiones de 30 min > 1 sesión de 90 min

### 5. Handovers son Inversión
> 5 minutos documentando > 30 minutos recordando qué hacías

---

## 💡 Pro Tips

1. **Siempre usa Composer para cambios multi-archivo**
   - Más eficiente que chat secuencial
   
2. **Revisa usage dashboard semanalmente**
   - Detecta patrones de uso excesivo
   
3. **Documenta decisiones en handovers**
   - Tu yo del futuro te lo agradecerá
   
4. **No temas hacer preguntas al AI**
   - Mejor preguntar que asumir mal
   
5. **Itera en pasos pequeños**
   - Más fácil debuggear si algo falla

---

**Versión:** 2.0  
**Fecha:** Enero 2026  
**Licencia:** Uso libre  
**Créditos:** Basado en optimización real de proyecto PQNC QA AI Platform

---

## 🙏 Contribuciones

Si implementas esta guía y descubres mejoras, por favor comparte:
- Nuevos patrones que funcionan
- Optimizaciones adicionales
- Casos de uso específicos

---

**🚀 ¡Happy Coding con Cursor Optimizado!**
