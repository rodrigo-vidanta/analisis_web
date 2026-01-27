# Handover: Corrección Filtro Columnas Ocultas - Kanban Prospectos

**Fecha:** 26 de Enero 2026  
**Módulo:** Prospectos - Vista Kanban  
**Tipo:** Bug Fix + Feature Enhancement  
**Estado:** ✅ Completado

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Bugs Corregidos](#bugs-corregidos)
3. [Cambios Implementados](#cambios-implementados)
4. [Archivos Modificados](#archivos-modificados)
5. [Próximos Pasos](#próximos-pasos)
6. [Testing y Validación](#testing-y-validación)
7. [Notas Técnicas](#notas-técnicas)

---

## 🎯 Resumen Ejecutivo

### Problema Principal
El filtro de columnas en la vista Kanban de Prospectos mostraba un contador de "X columnas ocultas", pero:
- Las columnas **NO estaban realmente ocultas** en el Kanban
- Los **checkboxes aparecían marcados** (activos) en lugar de desmarcados
- Las columnas que debían estar ocultas por defecto **se veían en pantalla**

### Causa Raíz
**Migración de formato de IDs de columnas:**
- **Formato antiguo:** `checkpoint #activo-pqnc` (con espacio, `#`, y guiones)
- **Formato nuevo:** `checkpoint-activo_pqnc` (con guión, sin espacio, underscores)

Las preferencias guardadas en `localStorage` contenían IDs antiguos que **no coincidían** con los IDs generados dinámicamente desde la base de datos, por lo que el filtro `.includes()` nunca encontraba coincidencias.

### Solución
Implementación de **migración automática** en `prospectsViewPreferencesService` que:
1. Detecta IDs con formato antiguo
2. Los elimina de las preferencias
3. Aplica defaults correctos con nuevo formato
4. Guarda preferencias migradas permanentemente

---

## 🐛 Bugs Corregidos

### Bug #1: Columnas Ocultas No Se Ocultan

**Síntomas:**
- Estado `hiddenColumns` contenía IDs: `['checkpoint #activo-pqnc', 'checkpoint #es-miembro', 'checkpoint #1']`
- Kanban mostraba **10 columnas visibles** en lugar de 6-7
- Filtro en `ProspectosKanban.tsx` no funcionaba:
  ```typescript
  CHECKPOINT_KEYS.filter(key => !hiddenColumns.includes(key))
  // Nunca encontraba coincidencias porque:
  // 'checkpoint-activo_pqnc' !== 'checkpoint #activo-pqnc'
  ```

**Causa:**
- `localStorage` guardaba IDs con formato antiguo (`checkpoint #...`)
- `etapasService` generaba IDs con formato nuevo (`checkpoint-...`)
- `.includes()` comparaba strings diferentes → siempre `false`

**Solución:**
- Método `migrateOldColumnIds()` en `prospectsViewPreferencesService.ts`
- Detecta IDs con `startsWith('checkpoint #')` y los elimina
- Si array queda vacío, aplica defaults correctos

**Archivos Afectados:**
- `src/services/prospectsViewPreferencesService.ts` (migración automática)

---

### Bug #2: Checkboxes Marcados Cuando Deberían Estar Desmarcados

**Síntomas:**
- UI mostraba checkboxes **marcados** (✓) para columnas "ocultas"
- Contador decía "(3 ocultas)" pero todas las columnas aparecían visibles

**Causa:**
- Lógica del checkbox: `checked={!isHidden}`
- `isHidden = hiddenColumns.includes(column.id)`
- Como los IDs no coincidían, `isHidden` siempre era `false`
- Por lo tanto, `checked` siempre era `true` (marcado)

**Solución:**
- Migración de IDs asegura que `hiddenColumns.includes()` funcione correctamente
- Checkboxes ahora reflejan el estado real

**Archivos Afectados:**
- `src/components/prospectos/ProspectosManager.tsx` (UI del filtro)

---

### Bug #3: Defaults No Se Aplicaban en Primera Carga

**Síntomas:**
- En primera visita (usuario nuevo), el estado `hiddenColumns` se inicializaba **vacío** `[]`
- Luego un `useEffect` actualizaba el estado, causando **re-render tardío**
- Resultado: primer render mostraba todas las columnas, luego ocultaba algunas (parpadeo)

**Causa:**
- `useState` con valor estático: `useState<string[]>([])`
- `useEffect` con dependencia `[user?.id]` ejecutaba **después del primer render**

**Solución:**
- **Lazy initialization** con función en `useState`:
  ```typescript
  useState<string[]>(() => {
    const defaults = ['checkpoint-importado_manual', ...];
    if (user?.id) {
      const prefs = prospectsViewPreferencesService.getUserPreferences(user.id);
      return prefs.hiddenColumns || defaults;
    }
    return defaults;
  });
  ```
- La función se ejecuta **una sola vez** durante el primer render
- Lee `localStorage` síncronamente antes de renderizar
- Elimina `useEffect` innecesario

**Archivos Afectados:**
- `src/components/prospectos/ProspectosManager.tsx` (inicialización de estado)

---

### Bug #4: Contador de Columnas Ocultas Incorrecto

**Síntomas:**
- Al desmarcar checkboxes manualmente, el contador llegaba a "(7 ocultas)"
- Esto era más columnas de las que existen (solo hay 10 totales)

**Causa:**
- Cada click en checkbox agregaba un ID al array `hiddenColumns`
- Pero los IDs antiguos (`checkpoint #...`) **no se eliminaban**
- Array acumulaba tanto IDs antiguos como nuevos:
  ```typescript
  [
    'checkpoint #activo-pqnc',      // Antiguo (no hace nada)
    'checkpoint #es-miembro',        // Antiguo (no hace nada)
    'checkpoint #1',                 // Antiguo (no hace nada)
    'checkpoint-importado_manual',   // Nuevo (funciona)
    'checkpoint-activo_pqnc',        // Nuevo (funciona)
    'checkpoint-es_miembro',         // Nuevo (funciona)
    'checkpoint-no_interesado'       // Nuevo (funciona)
  ]
  // Contador: 7, pero solo 4 realmente ocultan columnas
  ```

**Solución:**
- Migración automática limpia IDs antiguos **permanentemente**
- Solo IDs nuevos válidos permanecen en `localStorage`
- Contador ahora coincide con columnas realmente ocultas

**Archivos Afectados:**
- `src/services/prospectsViewPreferencesService.ts` (limpieza de IDs)

---

## 🔧 Cambios Implementados

### 1. Migración Automática de IDs de Columnas

**Archivo:** `src/services/prospectsViewPreferencesService.ts`

**Método Agregado:**
```typescript
private migrateOldColumnIds(columnIds: string[]): string[] {
  return columnIds
    .map(id => {
      // Detectar y eliminar IDs con formato antiguo "checkpoint #..."
      if (id.startsWith('checkpoint #')) {
        console.log(`⚠️ Eliminando ID antiguo: ${id}`);
        return null; // Marcar para eliminación
      }
      // Mantener IDs con formato nuevo "checkpoint-..."
      return id;
    })
    .filter(id => id !== null) as string[];
}
```

**Lógica de Migración en `getUserPreferences()`:**
```typescript
if (stored) {
  const parsed = JSON.parse(stored) as ProspectsViewPreferences;
  
  // Migrar IDs antiguos si existen
  let needsMigration = false;
  let migratedHiddenColumns = parsed.hiddenColumns || [];
  let migratedCollapsedColumns = parsed.collapsedColumns || [];
  
  if (migratedHiddenColumns.some(id => id.startsWith('checkpoint #'))) {
    migratedHiddenColumns = this.migrateOldColumnIds(migratedHiddenColumns);
    needsMigration = true;
  }
  
  if (migratedCollapsedColumns.some(id => id.startsWith('checkpoint #'))) {
    migratedCollapsedColumns = this.migrateOldColumnIds(migratedCollapsedColumns);
    needsMigration = true;
  }
  
  // Si hubo migración, guardar preferencias actualizadas
  if (needsMigration) {
    console.log('✅ Preferencias migradas al nuevo formato');
    const migrated = {
      ...parsed,
      hiddenColumns: migratedHiddenColumns.length > 0 ? migratedHiddenColumns : defaultPreferences.hiddenColumns,
      collapsedColumns: migratedCollapsedColumns
    };
    this.saveUserPreferences(userId, migrated);
    return migrated;
  }
  
  return { ...defaultPreferences, ...parsed };
}
```

**Comportamiento:**
- **Primera carga post-migración:** Detecta IDs antiguos, los elimina, aplica defaults, guarda en `localStorage`
- **Siguientes cargas:** Lee IDs limpios, sin procesamiento adicional
- **Mensaje en consola:** `✅ Preferencias migradas al nuevo formato` (solo una vez)

---

### 2. Lazy Initialization de Estado

**Archivo:** `src/components/prospectos/ProspectosManager.tsx`

**ANTES:**
```typescript
const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

useEffect(() => {
  if (user) {
    const preferences = prospectsViewPreferencesService.getUserPreferences(user.id);
    setHiddenColumns(preferences.hiddenColumns || [...defaults]);
  }
}, [user?.id]);
```

**Problemas:**
- Estado inicial vacío `[]` → primer render incorrecto
- `useEffect` ejecuta después → re-render adicional
- Posible parpadeo visual (columnas aparecen/desaparecen)

**DESPUÉS:**
```typescript
const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
  const defaults = [
    'checkpoint-importado_manual',
    'checkpoint-activo_pqnc', 
    'checkpoint-es_miembro',
    'checkpoint-no_interesado'
  ];
  
  if (user?.id) {
    const prefs = prospectsViewPreferencesService.getUserPreferences(user.id);
    return prefs.hiddenColumns || defaults;
  }
  return defaults;
});
```

**Ventajas:**
- ✅ Función ejecuta **antes del primer render**
- ✅ Estado correcto desde el inicio
- ✅ Sin re-renders adicionales
- ✅ Sin parpadeo visual

**Aplicado también a:**
- `viewType` (kanban/datagrid)
- `collapsedColumns` (columnas colapsadas)

---

### 3. Defaults Correctos en Servicio

**Archivo:** `src/services/prospectsViewPreferencesService.ts`

**Defaults Definidos:**
```typescript
const defaultPreferences: ProspectsViewPreferences = {
  viewType: 'kanban',
  collapsedColumns: [], // Sin colapsar por defecto
  hiddenColumns: [
    'checkpoint-importado_manual',
    'checkpoint-activo_pqnc', 
    'checkpoint-es_miembro',
    'checkpoint-no_interesado'
  ], // Ocultar columnas menos usadas por defecto
  lastUpdated: new Date().toISOString()
};
```

**Columnas Ocultas por Defecto:**
1. **Importado Manual** - Checkpoint técnico interno
2. **Activo PQNC** - Estado terminal exitoso
3. **Es miembro** - Estado terminal exitoso
4. **No interesado** - Estado terminal negativo

**Razón:** Estas columnas son poco relevantes para el día a día de los ejecutivos:
- Las terminales exitosas (`Activo PQNC`, `Es miembro`) rara vez se consultan activamente
- Las terminales negativas (`No interesado`) no requieren seguimiento
- El checkpoint técnico (`Importado Manual`) es solo para auditoría

---

## 📁 Archivos Modificados

### Modificaciones Principales

| Archivo | Cambios | LOC | Tipo |
|---------|---------|-----|------|
| `src/services/prospectsViewPreferencesService.ts` | + Método `migrateOldColumnIds()` + Lógica de migración en `getUserPreferences()` | +65 | Feature |
| `src/components/prospectos/ProspectosManager.tsx` | Lazy initialization de `viewType`, `collapsedColumns`, `hiddenColumns` | ~40 | Refactor |
| `src/components/prospectos/ProspectosKanban.tsx` | Eliminación de logs de debug (temporales) | -10 | Cleanup |

### Archivos de Referencia (No Modificados)

- `src/types/etapas.ts` - Tipos de `Etapa`
- `src/services/etapasService.ts` - Servicio de caché de etapas
- `docs/MIGRACION_ETAPAS_STRING_A_FK.md` - Documentación de migración etapas

---

## 🚀 Próximos Pasos

### Prioridad Alta (Siguiente Sesión)

#### 1. ✅ Validar en Producción
**Tarea:** Verificar que la migración funcione correctamente para usuarios reales

**Checklist:**
- [ ] Cargar módulo de Prospectos como diferentes usuarios
- [ ] Verificar mensaje en consola: `✅ Preferencias migradas al nuevo formato`
- [ ] Confirmar que contador muestre "(4 ocultas)" por defecto
- [ ] Verificar que checkboxes estén **desmarcados** para las 4 columnas ocultas
- [ ] Confirmar que columnas **NO aparezcan** en Kanban

**Usuarios de Prueba:**
- Usuario nuevo (sin preferencias previas)
- Usuario existente (con preferencias antiguas)
- Coordinador con preferencias personalizadas

**Si falla:**
- Revisar logs en consola del navegador
- Verificar contenido de `localStorage` con:
  ```javascript
  Object.keys(localStorage).filter(k => k.startsWith('prospects_view_preferences_'))
  ```

---

#### 2. 🧹 Limpiar localStorage de Usuarios Existentes (Opcional)

**Contexto:** Algunos usuarios pueden tener preferencias muy antiguas que causen conflictos inesperados.

**Script de Limpieza Global (Solo si es necesario):**

**Archivo:** `src/scripts/cleanOldPreferences.ts`
```typescript
/**
 * Script para limpiar preferencias antiguas de todos los usuarios
 * Ejecutar SOLO si hay reportes de bugs persistentes
 */
import { supabaseSystemUI } from '../config/supabaseSystemUI';

async function cleanOldPreferencesGlobally() {
  // 1. Obtener todos los usuarios activos
  const { data: users } = await supabaseSystemUI
    .from('auth_users')
    .select('id')
    .eq('is_active', true);
  
  if (!users) {
    console.error('No se pudieron obtener usuarios');
    return;
  }
  
  // 2. Limpiar localStorage keys para cada usuario
  users.forEach(user => {
    const key = `prospects_view_preferences_${user.id}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Si tiene IDs antiguos, eliminar completamente
      if (parsed.hiddenColumns?.some(id => id.startsWith('checkpoint #')) ||
          parsed.collapsedColumns?.some(id => id.startsWith('checkpoint #'))) {
        console.log(`🧹 Limpiando preferencias antiguas para usuario ${user.id}`);
        localStorage.removeItem(key);
      }
    }
  });
  
  console.log('✅ Limpieza completada');
}
```

**Cuándo Usar:**
- ⚠️ **NO ejecutar de forma preventiva**
- ✅ **SOLO si usuarios reportan** bugs persistentes después de la migración
- ✅ Primero intentar migración automática (ya implementada)

---

#### 3. 📊 Monitorear Logs de Migración

**Objetivo:** Identificar patrones de IDs antiguos que puedan no haberse contemplado

**Herramienta:** Consola del navegador (F12)

**Logs a Buscar:**
```
⚠️ Eliminando ID antiguo: checkpoint #...
✅ Preferencias migradas al nuevo formato
```

**Métricas:**
- **Frecuencia:** ¿Cuántos usuarios ven el mensaje de migración?
- **Variaciones:** ¿Hay formatos de IDs antiguos no contemplados? (ej: `checkpoint_...`, `etapa-...`)

**Si aparecen variaciones no contempladas:**
- Expandir lógica de `migrateOldColumnIds()` para incluir otros prefijos
- Ejemplo:
  ```typescript
  if (id.startsWith('checkpoint #') || 
      id.startsWith('checkpoint_') || 
      id.startsWith('etapa-')) {
    return null;
  }
  ```

---

### Prioridad Media (Esta Semana)

#### 4. 🎨 Mejorar UX del Filtro de Columnas

**Problemas Actuales:**
- Dropdown no tiene scroll visual (solo scrollable)
- No hay indicador de cuántas columnas están visibles vs. totales
- Botón "Mostrar todas" solo aparece si hay columnas ocultas (podría ser más prominente)

**Mejoras Propuestas:**

**A. Indicador Visual de Estado:**
```tsx
<div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">
  Mostrar/Ocultar Columnas
  <span className="text-gray-500 ml-2">
    ({visibleCheckpointKeys.length}/{kanbanColumns.length} visibles)
  </span>
</div>
```

**B. Scroll más evidente:**
```tsx
<div className="space-y-1 max-h-64 overflow-y-auto border-t border-b border-gray-100 dark:border-gray-700 py-2">
  {/* Contenido */}
</div>
```

**C. Botones de Acción Rápida:**
```tsx
<div className="mt-2 flex gap-2">
  <button onClick={showAllColumns} className="flex-1 text-xs ...">
    ✓ Mostrar todas
  </button>
  <button onClick={hideAllColumns} className="flex-1 text-xs ...">
    ✗ Ocultar todas
  </button>
</div>
```

**Archivos a Modificar:**
- `src/components/prospectos/ProspectosManager.tsx` (líneas 2213-2265)

---

#### 5. 🔄 Sincronizar Preferencias con Base de Datos (Opcional)

**Contexto:** Actualmente las preferencias solo están en `localStorage` del navegador. Si el usuario cambia de dispositivo, pierde sus preferencias.

**Propuesta:**
- Agregar tabla `user_view_preferences` en BD:
  ```sql
  CREATE TABLE user_view_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    view_type TEXT DEFAULT 'kanban',
    hidden_columns JSONB DEFAULT '[]'::jsonb,
    collapsed_columns JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
  );
  ```

- Modificar `prospectsViewPreferencesService.ts`:
  - `getUserPreferences()` → Primero intenta BD, luego `localStorage`
  - `saveUserPreferences()` → Guarda en BD **y** `localStorage`

**Ventajas:**
- ✅ Preferencias persisten entre dispositivos
- ✅ Fácil auditoría de qué columnas ocultan los usuarios (analytics)
- ✅ Posibilidad de configuración por rol (ej: coordinadores ven solo X columnas)

**Desventajas:**
- ⚠️ Más complejidad (queries adicionales)
- ⚠️ Posible latencia (especialmente en primera carga)

**Decisión:** 
- **NO implementar ahora** (localStorage suficiente)
- **Considerar para futuro** si usuarios solicitan sincronización

---

### Prioridad Baja (Backlog)

#### 6. 📝 Documentar Formato de IDs de Columnas

**Objetivo:** Evitar futuros conflictos de formato

**Archivo a Crear:** `docs/CONVENCIONES_IDS_KANBAN.md`

**Contenido:**
```markdown
# Convenciones de IDs para Columnas Kanban

## Formato Estándar

### Checkpoints de Etapas
**Formato:** `checkpoint-{codigo_etapa}`

**Ejemplos:**
- `checkpoint-importado_manual`
- `checkpoint-primer_contacto`
- `checkpoint-validando_membresia`

**Reglas:**
- Prefijo SIEMPRE es `checkpoint-` (con guión, sin espacio)
- Código de etapa en **snake_case** (underscores, minúsculas)
- Código debe coincidir con columna `codigo` en tabla `etapas`

### ❌ Formatos Antiguos (DEPRECADOS)
- `checkpoint #...` (con espacio y `#`)
- `etapa-...` (sin prefijo checkpoint)
- `{codigo}` (sin prefijo)

## Cómo Generar IDs Correctamente

### Desde Base de Datos
```typescript
const etapas = etapasService.getAllActive();
const checkpointId = `checkpoint-${etapa.codigo}`;
```

### Nunca Hardcodear
```typescript
// ❌ INCORRECTO
const hiddenColumns = ['checkpoint #1', 'etapa-activo'];

// ✅ CORRECTO
const hiddenColumns = etapas
  .filter(e => e.es_terminal)
  .map(e => `checkpoint-${e.codigo}`);
```

## Migración Automática

El servicio `prospectsViewPreferencesService` incluye migración automática que:
- Detecta IDs con formato antiguo
- Los elimina de las preferencias
- Aplica defaults correctos

Ver: `src/services/prospectsViewPreferencesService.ts`
```

---

#### 7. 🧪 Tests Unitarios para Migración

**Objetivo:** Asegurar que la migración funcione en todos los escenarios

**Archivo:** `src/services/__tests__/prospectsViewPreferencesService.test.ts`

**Casos de Prueba:**
```typescript
describe('prospectsViewPreferencesService', () => {
  describe('migrateOldColumnIds', () => {
    it('elimina IDs con formato "checkpoint #..."', () => {
      const service = new ProspectsViewPreferencesService();
      const input = ['checkpoint #1', 'checkpoint-valid', 'checkpoint #2'];
      const result = service['migrateOldColumnIds'](input);
      expect(result).toEqual(['checkpoint-valid']);
    });
    
    it('retorna array vacío si todos los IDs son antiguos', () => {
      const service = new ProspectsViewPreferencesService();
      const input = ['checkpoint #1', 'checkpoint #2'];
      const result = service['migrateOldColumnIds'](input);
      expect(result).toEqual([]);
    });
    
    it('mantiene IDs válidos sin cambios', () => {
      const service = new ProspectsViewPreferencesService();
      const input = ['checkpoint-valid1', 'checkpoint-valid2'];
      const result = service['migrateOldColumnIds'](input);
      expect(result).toEqual(input);
    });
  });
  
  describe('getUserPreferences', () => {
    beforeEach(() => {
      localStorage.clear();
    });
    
    it('aplica defaults si no hay preferencias guardadas', () => {
      const service = new ProspectsViewPreferencesService();
      const prefs = service.getUserPreferences('user123');
      expect(prefs.hiddenColumns).toHaveLength(4);
      expect(prefs.hiddenColumns).toContain('checkpoint-importado_manual');
    });
    
    it('migra IDs antiguos automáticamente', () => {
      const service = new ProspectsViewPreferencesService();
      localStorage.setItem('prospects_view_preferences_user123', JSON.stringify({
        viewType: 'kanban',
        hiddenColumns: ['checkpoint #1', 'checkpoint #2']
      }));
      
      const prefs = service.getUserPreferences('user123');
      expect(prefs.hiddenColumns).not.toContain('checkpoint #1');
      expect(prefs.hiddenColumns).toHaveLength(4); // Defaults aplicados
    });
  });
});
```

**Setup Requerido:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

**Ejecución:**
```bash
npm test -- prospectsViewPreferencesService
```

---

## ✅ Testing y Validación

### Checklist de Validación Manual

#### Escenario 1: Usuario con Preferencias Antiguas
**Pasos:**
1. Abrir DevTools → Console
2. Ejecutar:
   ```javascript
   localStorage.setItem('prospects_view_preferences_test', JSON.stringify({
     viewType: 'kanban',
     hiddenColumns: ['checkpoint #activo-pqnc', 'checkpoint #es-miembro']
   }))
   ```
3. Recargar módulo de Prospectos
4. **Esperar:** Mensaje `✅ Preferencias migradas al nuevo formato`
5. **Verificar:** 4 columnas ocultas por defecto (no solo 2)

#### Escenario 2: Usuario Nuevo (Sin Preferencias)
**Pasos:**
1. `localStorage.clear()`
2. Recargar módulo de Prospectos
3. **Verificar:**
   - Contador muestra "(4 ocultas)"
   - Checkboxes desmarcados para: Importado Manual, Activo PQNC, Es miembro, No interesado
   - Kanban muestra solo 6 columnas

#### Escenario 3: Usuario con Preferencias Válidas
**Pasos:**
1. Ocultar manualmente 2 columnas adicionales (ej: Primer contacto, Validando membresía)
2. Recargar página
3. **Verificar:** Las 6 columnas ocultas se mantienen (4 defaults + 2 personalizadas)

#### Escenario 4: Botón "Mostrar todas"
**Pasos:**
1. Abrir filtro de columnas
2. Click en "Mostrar todas"
3. **Verificar:**
   - Todos los checkboxes marcados
   - Contador muestra "(0 ocultas)"
   - Kanban muestra las 10 columnas

#### Escenario 5: Persistencia de Preferencias
**Pasos:**
1. Ocultar 3 columnas específicas
2. Cerrar navegador completamente
3. Reabrir y volver a Prospectos
4. **Verificar:** Las mismas 3 columnas siguen ocultas

---

### Validación en Diferentes Navegadores

| Navegador | Versión Mínima | Estado | Notas |
|-----------|----------------|--------|-------|
| Chrome | 90+ | ✅ Validado | localStorage funciona correctamente |
| Firefox | 88+ | ⚠️ Pendiente | Validar localStorage con privacidad estricta |
| Safari | 14+ | ⚠️ Pendiente | Validar en iOS también |
| Edge | 90+ | ✅ Validado | Basado en Chromium |

**Casos Especiales:**
- **Modo Incógnito:** Las preferencias NO se guardan (esperado)
- **Navegación Privada (Safari):** Puede restringir `localStorage`
- **Cookies bloqueadas:** No afecta (usamos `localStorage`, no cookies)

---

## 📝 Notas Técnicas

### Diferencias entre Formatos de IDs

| Aspecto | Antiguo | Nuevo | Razón del Cambio |
|---------|---------|-------|------------------|
| **Prefijo** | `checkpoint #` | `checkpoint-` | Espacio causaba bugs en URLs |
| **Separador** | Guión `-` | Underscore `_` | Consistencia con DB (columna `codigo`) |
| **Ejemplo** | `checkpoint #activo-pqnc` | `checkpoint-activo_pqnc` | Mejor compatibilidad |

### ¿Por Qué No Convertir IDs Antiguos?

**Opción Descartada:** Convertir `checkpoint #activo-pqnc` → `checkpoint-activo_pqnc`

**Razones:**
1. **Inconsistencia histórica:** Los IDs antiguos usaban **nombres de etapas**, no códigos
2. **Mapeo complejo:** `checkpoint #1` ¿qué etapa es? (sin contexto)
3. **Riesgo de error:** Conversión incorrecta peor que usar defaults limpios
4. **Simplicidad:** Eliminar y usar defaults es más seguro

**Decisión:** **Eliminar IDs antiguos y aplicar defaults** (implementado)

---

### Impacto en Performance

**Antes (con bug):**
- Primer render: 10 columnas visibles (incorrecto)
- `useEffect` ejecuta después → re-render
- Total: **2 renders**

**Después (corregido):**
- Primer render: 6 columnas visibles (correcto)
- Sin `useEffect` adicional
- Total: **1 render**

**Mejora:** **-50% de renders** en carga inicial del Kanban

---

### Estructura de localStorage

**Key:** `prospects_view_preferences_{userId}`

**Value (JSON):**
```json
{
  "viewType": "kanban",
  "collapsedColumns": [],
  "hiddenColumns": [
    "checkpoint-importado_manual",
    "checkpoint-activo_pqnc",
    "checkpoint-es_miembro",
    "checkpoint-no_interesado"
  ],
  "lastUpdated": "2026-01-26T10:30:00.000Z"
}
```

**Tamaño Estimado:** ~250 bytes por usuario

**Límite de localStorage:** 5-10 MB (suficiente para ~20,000 usuarios)

---

## 📚 Referencias

### Documentación Relacionada

- [Migración Etapas String a FK](./../docs/MIGRACION_ETAPAS_STRING_A_FK.md) - Contexto general de migración
- [Plan Paso a Paso Migración](./../docs/PLAN_PASO_A_PASO_MIGRACION_ETAPAS.md) - Roadmap original
- [Resumen Ejecutivo Migración](./../docs/RESUMEN_EJECUTIVO_MIGRACION_ETAPAS.md) - Vista de alto nivel

### Archivos de Referencia

- `src/types/etapas.ts` - Tipos TypeScript de `Etapa`
- `src/services/etapasService.ts` - Servicio de caché de etapas
- `src/components/shared/EtapaBadge.tsx` - Componente reutilizable de badges
- `src/components/prospectos/ProspectosKanban.tsx` - Vista Kanban principal

### Commits Relacionados

```bash
# Ver historial de cambios en estos archivos
git log --oneline -- src/services/prospectsViewPreferencesService.ts
git log --oneline -- src/components/prospectos/ProspectosManager.tsx
```

---

## 🎯 Resumen de Próximos Pasos

### Inmediato (Hoy)
1. ✅ Validar en producción con usuarios reales
2. ✅ Monitorear logs de migración en consola

### Esta Semana
3. 🎨 Mejorar UX del filtro de columnas (indicadores visuales)
4. 📊 Analizar patrones de uso (¿qué columnas ocultan más los usuarios?)

### Backlog
5. 📝 Documentar convenciones de IDs (`docs/CONVENCIONES_IDS_KANBAN.md`)
6. 🧪 Agregar tests unitarios para migración
7. 🔄 Evaluar sincronización con BD (solo si usuarios lo solicitan)

---

**Última actualización:** 26 de Enero 2026  
**Agent responsable:** Cursor AI  
**Validado por:** [Pendiente]
