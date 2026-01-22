# Diagnóstico - Rule "documenta y actualiza" No Ejecutada [22-01-2026]

**REF**: `DIAGNOSTIC-2026-01-22-DEPLOY-RULE`

---

## 🔍 Problema Reportado

El usuario escribió **"documenta y actualiza"** pero el agent:
- ❌ **NO** ejecutó el flujo completo de deploy
- ❌ **NO** hizo push a Git
- ❌ **NO** ejecutó deploy a AWS
- ❌ **NO** creó handover automáticamente

**Comportamiento esperado** (según `.cursor/rules/deploy-workflow.mdc`):
1. Sincronizar documentación
2. Actualizar versiones en componentes
3. Git commit y push
4. Deploy a AWS (`./update-frontend.sh`)
5. Crear handover con REF

---

## 🐛 Causa Raíz

### 1. Regla Incompleta

**Archivo**: `.cursor/rules/deploy-workflow.mdc`

**Problemas encontrados**:
- ✅ Trigger correcto: "documenta y actualiza" estaba listado
- ❌ **Faltaba claridad**: No especificaba que TODOS los pasos son automáticos
- ❌ **Faltaba handover**: No mencionaba crear handover al final
- ❌ **Sin diagrama de flujo**: No era obvio el orden de ejecución

### 2. Agent No Siguió la Regla

**Posibles razones**:
1. Ambigüedad en la redacción de la regla
2. Agent interpretó "documenta y actualiza" como solo actualizar CHANGELOG/VERSIONS (lo que hizo)
3. Faltaba énfasis en que es un workflow COMPLETO

---

## ✅ Correcciones Implementadas

### 1. Actualización de `.cursor/rules/deploy-workflow.mdc`

**Cambios realizados**:

```diff
## Cuándo Aplicar Esta Regla

Cuando el usuario diga:
- "documenta y actualiza"
...

+ **⚠️ IMPORTANTE:** "documenta y actualiza" implica:
+ 1. ✅ Sincronizar documentación
+ 2. ✅ Actualizar versiones en componentes
+ 3. ✅ Git commit y push
+ 4. ✅ Deploy a AWS (ejecutar `./update-frontend.sh`)
+ 5. ✅ Crear handover final con REF

+ **Flujo automático:**
+ ```
+ "documenta y actualiza"
+     ↓
+ Sincronizar docs (PASO 1)
+     ↓
+ Actualizar DocumentationModule.tsx (PASO 2)
+     ↓
+ ...
+     ↓
+ Crear handover con REF (PASO 7)
+     ↓
+ Imprimir REF + resumen en chat (PASO 8)
+ ```
```

**Nuevos pasos agregados**:

```diff
+ ### PASO 7: Crear Handover Final
+ 
+ **Formato:**
+ ```markdown
+ REF: HANDOVER-YYYY-MM-DD-DEPLOY-vX.X.X
+ ```
+ 
+ **Contenido mínimo:**
+ - Versión desplegada
+ - Archivos principales modificados
+ - Commits realizados
+ - Estado del deploy AWS
+ - Próximos pasos (si aplica)
+ 
+ Ver `.cursor/rules/handover-format.mdc` para estructura completa.

  ### PASO 8: Informar Resultado
  
+ **En el chat, imprimir solo:**
+ 
+ ```markdown
+ ✅ Deploy completado
+ 
+ **REF**: `HANDOVER-YYYY-MM-DD-DEPLOY-vX.X.X`  
+ **Ubicación**: `.cursor/handovers/YYYY-MM-DD-deploy-vX-X-X.md`
+ 
+ **Resumen rápido**:
+ - ✅ Documentación sincronizada (N archivos)
+ - ✅ Versión actualizada: vX.X.X
+ - ✅ Git push: commit XXXXXXX
+ - ✅ AWS deploy: exitoso (XXs)
+ - Próximo: [acción si aplica]
+ ```
+ 
+ **⚠️ NO repetir el handover completo en el chat** - Solo REF + resumen.
```

### 2. Documentación del Cambio

**Archivos actualizados**:
- `.cursor/rules/deploy-workflow.mdc` - Regla completa con flujo clarificado
- `DIAGNOSTIC_DEPLOY_RULE_2026-01-22.md` - Este archivo de diagnóstico

---

## 🎯 Cómo Debería Funcionar Ahora

### Comportamiento Esperado

**Usuario escribe**: `documenta y actualiza`

**Agent debe**:
1. Leer `.cursor/rules/deploy-workflow.mdc`
2. Ver el trigger "documenta y actualiza"
3. Ver el **flujo automático** completo (8 pasos)
4. Ejecutar TODOS los pasos en orden:
   - PASO 1: Sincronizar docs (cp archivos)
   - PASO 2: Actualizar DocumentationModule.tsx
   - PASO 3: Actualizar Footer.tsx
   - PASO 4: Actualizar package.json (si release)
   - PASO 5: Git commit y push
   - PASO 6: Deploy AWS (`./update-frontend.sh`)
   - PASO 7: Crear handover con REF
   - PASO 8: Imprimir REF + resumen en chat

**Salida en chat**:
```
✅ Deploy completado

**REF**: `HANDOVER-2026-01-22-DEPLOY-v2.5.37`  
**Ubicación**: `.cursor/handovers/2026-01-22-deploy-v2-5-37.md`

**Resumen rápido**:
- ✅ Documentación sincronizada (15 archivos)
- ✅ Versión actualizada: v2.5.37
- ✅ Git push: commit a1b2c3d
- ✅ AWS deploy: exitoso (45s)
```

---

## 🧪 Prueba del Fix

### Test Case 1: "documenta y actualiza" sin cambios

**Input**: `documenta y actualiza`

**Expected**:
- Agent detecta que no hay cambios pendientes
- Pregunta: "¿Qué versión quieres desplegar?" o "No hay cambios nuevos, ¿continuar?"

### Test Case 2: "documenta y actualiza" con cambios

**Input**: `documenta y actualiza` (después de modificar código)

**Expected**:
- Agent ejecuta PASO 1-8 completo
- Imprime REF en chat
- NO repite handover completo

### Test Case 3: Solo "handover"

**Input**: `handover`

**Expected**:
- Agent crea handover con REF
- NO ejecuta deploy
- Imprime REF en chat

---

## 📊 Comparación Antes/Después

### Antes del Fix

| Comando | Comportamiento |
|---------|----------------|
| `documenta y actualiza` | Solo actualizó CHANGELOG.md y VERSIONS.md |
| | NO hizo git push |
| | NO ejecutó AWS deploy |
| | NO creó handover |

### Después del Fix

| Comando | Comportamiento Esperado |
|---------|-------------------------|
| `documenta y actualiza` | Ejecuta workflow completo (8 pasos) |
| | Git push automático |
| | AWS deploy automático |
| | Handover con REF automático |

---

## ⚠️ Notas Importantes

### 1. Aplicación de la Regla

La regla `deploy-workflow.mdc` tiene:
```
> **Aplicación:** Agent Requested (cuando usuario solicita deploy)
```

Esto significa que el agent debe **activarla automáticamente** cuando detecte los triggers listados.

### 2. Triggers Válidos

Los siguientes comandos deben detonar el workflow completo:
- "documenta y actualiza"
- "push a git y aws"
- "deploy"
- "de acuerdo a la regla"

Los siguientes comandos deben hacer solo parte del workflow:
- "push a git" → Solo PASO 5
- "handover" → Solo PASO 7

### 3. Verificación Manual

Si el agent NO ejecuta el workflow completo, verificar:
1. ¿La regla está en `.cursor/rules/deploy-workflow.mdc`?
2. ¿El trigger está correctamente listado?
3. ¿El diagrama de flujo está visible?
4. ¿El agent tiene permisos para git_write y network?

---

## 🔄 Próximos Pasos

### Para el Usuario

**Próxima vez que digas "documenta y actualiza":**
1. Observar si el agent ejecuta los 8 pasos
2. Si NO lo hace, compartir este diagnóstico: `REF: DIAGNOSTIC-2026-01-22-DEPLOY-RULE`
3. Verificar que el handover se creó en `.cursor/handovers/`

### Para el Agent

**Al ver "documenta y actualiza":**
1. Leer `.cursor/rules/deploy-workflow.mdc`
2. Ver sección "Flujo automático"
3. Ejecutar PASO 1-8 sin pausas ni confirmaciones
4. Solo imprimir REF + resumen al final

---

## 📚 Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| `.cursor/rules/deploy-workflow.mdc` | Workflow completo de deploy |
| `.cursor/rules/handover-format.mdc` | Formato de handovers con REF |
| `DIAGNOSTIC_DEPLOY_RULE_2026-01-22.md` | Este diagnóstico |

---

**Estado**: ✅ REGLA CORREGIDA  
**Fecha de corrección**: 22 de Enero 2026  
**Próxima prueba**: Siguiente comando "documenta y actualiza"  
**Para citar**: `REF: DIAGNOSTIC-2026-01-22-DEPLOY-RULE`
