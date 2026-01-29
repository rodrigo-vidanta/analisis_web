# Handover: Toggles de Configuración AI en WhatsApp

**Fecha:** 29 de Enero 2026  
**Módulo:** Live Chat WhatsApp  
**Archivo:** `src/components/chat/LiveChatCanvas.tsx`

---

## 📊 Contexto

Se implementaron los toggles de configuración de IA en el header de conversación de WhatsApp, permitiendo a los usuarios controlar el comportamiento del bot de forma individual por prospecto.

---

## 🎯 Cambios Realizados

### 1. Estados Agregados

```typescript
const [aiConfig, setAiConfig] = useState<{
  ai_responde: boolean;
  mensajes_reactivacion: boolean;
  permite_llamadas_auto: boolean;
  plantillas_reactivacion: boolean;
} | null>(null);

// ⚠️ NUEVO: Valores DEFAULT de la etapa (necesarios para lógica de toggle)
const [etapaDefaults, setEtapaDefaults] = useState<{
  ai_responde_auto: boolean;
  mensajes_reactivacion_auto: boolean;
  permite_llamadas_auto: boolean;
  plantillas_reactivacion_auto: boolean;
} | null>(null);

const [updatingAiConfig, setUpdatingAiConfig] = useState(false);
```

### 2. Funciones Implementadas

#### `loadAiConfig(prospectoId: string, etapaId?: string)`
- **Origen:** Vista `v_prospectos_ai_config` + Tabla `etapas`
- **Campos leídos de vista:**
  - `ai_responde` (boolean)
  - `mensajes_reactivacion` (boolean)
  - `permite_llamadas_auto` (boolean)
  - `plantillas_reactivacion` (boolean)
- **Campos leídos de etapa (DEFAULTS):**
  - `ai_responde_auto` (boolean)
  - `mensajes_reactivacion_auto` (boolean)
  - `permite_llamadas_auto` (boolean)
  - `plantillas_reactivacion_auto` (boolean)
- **Trigger:** Se ejecuta cuando se selecciona una conversación

#### `updateAiConfigOverride(prospectoId, field, currentValue)`
- **Destino:** Tabla `prospectos`
- **Campos actualizados:**
  - `override_ai_responde` (boolean | null)
  - `override_mensajes_reactivacion` (boolean | null)
  - `override_permite_llamadas_auto` (boolean | null)
  - `override_plantillas_reactivacion` (boolean | null)
- **Comportamiento:**
  - Compara nuevo valor con DEFAULT de etapa
  - Si coinciden → `override = null` (heredar)
  - Si difieren → `override = true/false` (forzar)

#### Handlers de Toggles
- `handleToggleAiResponde()`
- `handleToggleMensajesReactivacion()`
- `handleTogglePermiteLlamadasAuto()`
- `handleTogglePlantillasReactivacion()`

### 3. useEffect para Cargar Config

```typescript
useEffect(() => {
  if (selectedConversation?.prospecto_id) {
    loadAiConfig(selectedConversation.prospecto_id);
  } else {
    setAiConfig(null);
  }
}, [selectedConversation?.prospecto_id]);
```

### 4. UI de Toggles Actualizada

**Antes:**
- 4 toggles disabled (sin funcionalidad)
- Labels: "IA", "Programación", "Reactivación", "Secuencias"
- Tooltips al hover

**Después:**
- 4 toggles funcionales
- Labels renombrados:
  - "IA Responde chat" (antes "IA")
  - "IA Programa llamada" (antes "Programación")
  - "IA Reactiva chat (en desarrollo)" (antes "Reactivación") ⚠️
  - "IA Manda plantillas (en desarrollo)" (antes "Secuencias") ⚠️
- ❌ Tooltips removidos
- Estados visuales:
  - **Activo:** Fondo coloreado (blue/purple/emerald/amber)
  - **Inactivo:** Fondo gris
  - **Cargando:** Opacidad reducida, cursor not-allowed
- ⚠️ Nota "(en desarrollo)" en 2 toggles para indicar funcionalidad beta

---

## 📋 Mapeo de Datos

| Toggle UI | Vista (lectura) | Tabla (escritura) | Valor OFF | Valor ON | Estado |
|-----------|----------------|-------------------|-----------|----------|--------|
| IA Responde chat | `ai_responde` | `override_ai_responde` | `false` | `true` | ✅ Producción |
| IA Reactiva chat | `mensajes_reactivacion` | `override_mensajes_reactivacion` | `false` | `true` | ⚠️ En desarrollo |
| IA Programa llamada | `permite_llamadas_auto` | `override_permite_llamadas_auto` | `false` | `true` | ✅ Producción |
| IA Manda plantillas | `plantillas_reactivacion` | `override_plantillas_reactivacion` | `false` | `true` | ⚠️ En desarrollo |

---

## 🔍 Lógica de Negocio

### Vista `v_prospectos_ai_config`

La vista combina:
1. **Configuración de etapa** (campos base de `etapas`)
2. **Overrides de prospecto** (campos `override_*` de `prospectos`)

**Prioridad:**
```sql
-- Pseudocódigo de la vista
COALESCE(
  p.override_ai_responde,  -- 1. Override individual (si existe)
  e.ai_responde_auto       -- 2. Default de etapa
) as ai_responde
```

### Lógica de Toggle (CRÍTICA)

**Campos en tabla `etapas` (NO SE MODIFICAN):**
- `ai_responde_auto` (boolean) - Valor DEFAULT
- `mensajes_reactivacion_auto` (boolean) - Valor DEFAULT
- `permite_llamadas_auto` (boolean) - Valor DEFAULT
- `plantillas_reactivacion_auto` (boolean) - Valor DEFAULT

**Campos en tabla `prospectos` (SE ESCRIBEN):**
- `override_ai_responde` (boolean | null)
- `override_mensajes_reactivacion` (boolean | null)
- `override_permite_llamadas_auto` (boolean | null)
- `override_plantillas_reactivacion` (boolean | null)

**Algoritmo de Actualización:**

```typescript
// Al hacer click en toggle:
const newValue = !currentValue;
const defaultValue = etapa[field + '_auto']; // Ej: ai_responde_auto

// Si el nuevo valor coincide con el default de etapa → null (heredar)
// Si el nuevo valor difiere del default → true/false (forzar)
const overrideValue = newValue === defaultValue ? null : newValue;
```

**Ejemplos:**

| Etapa Default | Valor Actual | Usuario Click | Nuevo Valor | Override Escrito |
|---------------|--------------|---------------|-------------|------------------|
| `true` | `true` | Click OFF | `false` | `false` (difiere) |
| `true` | `false` | Click ON | `true` | `null` (coincide) |
| `false` | `false` | Click ON | `true` | `true` (difiere) |
| `false` | `true` | Click OFF | `false` | `null` (coincide) |

**Ventajas de esta lógica:**
- ✅ Optimiza almacenamiento (null cuando hereda)
- ✅ Permite cambiar defaults de etapa y afecta a prospectos sin override
- ✅ Override explícito solo cuando el usuario lo personaliza

### Escritura en `prospectos`

Al cambiar un toggle:
- Se consulta el valor DEFAULT de la etapa actual
- Se compara el nuevo valor con el DEFAULT
- Se escribe en `prospectos.override_*`:
  - `null` si coincide con default (heredar)
  - `true/false` si difiere (forzar)

---

## ✅ Validación

### Tests Manuales

- [x] Toggles cargan estado correcto al seleccionar conversación
- [x] Toggles se pueden activar/desactivar
- [x] Toast de confirmación al actualizar
- [x] Toast de error si falla actualización
- [x] Estado disabled mientras actualiza (loading)
- [x] Labels correctos (renombrados)
- [x] Tooltips removidos
- [x] Colores según estado (activo/inactivo)

### Escenarios

#### Caso 1: Prospecto sin overrides
- **Vista devuelve:** Valores de etapa
- **Usuario cambia toggle:** Se crea override
- **Resultado:** Toggle refleja override

#### Caso 2: Prospecto con overrides
- **Vista devuelve:** Valores de override
- **Usuario cambia toggle:** Se actualiza override
- **Resultado:** Toggle refleja nuevo valor

#### Caso 3: Error de actualización
- **Acción:** Update falla (permisos, red, etc.)
- **Resultado:** Toast error, toggle NO cambia

---

## 🐛 Debugging

### Logs de Consola

Al hacer click en un toggle, verás en consola:

```
🔄 Actualizando override_ai_responde: {
  currentValue: true,
  newValue: false,
  defaultValue: true,
  overrideValue: 'false'
}
```

O si vuelve a default:

```
🔄 Actualizando override_ai_responde: {
  currentValue: false,
  newValue: true,
  defaultValue: true,
  overrideValue: 'null (heredar)'
}
```

### Verificación en BD

```sql
-- Ver configuración efectiva del prospecto
SELECT * FROM v_prospectos_ai_config 
WHERE id = 'uuid-del-prospecto';

-- Ver overrides explícitos
SELECT 
  id, 
  etapa_id,
  override_ai_responde,
  override_mensajes_reactivacion,
  override_permite_llamadas_auto,
  override_plantillas_reactivacion
FROM prospectos 
WHERE id = 'uuid-del-prospecto';

-- Ver defaults de la etapa
SELECT 
  e.nombre,
  e.ai_responde_auto,
  e.mensajes_reactivacion_auto,
  e.permite_llamadas_auto,
  e.plantillas_reactivacion_auto
FROM etapas e
JOIN prospectos p ON p.etapa_id = e.id
WHERE p.id = 'uuid-del-prospecto';
```

---

## 🚀 Próximos Pasos

### Opcional - Mejoras Futuras

1. **Indicador visual de override**
   - Mostrar ícono cuando valor difiere de etapa
   - Botón "Restaurar default de etapa"

2. **Logs de cambios**
   - Auditoría en tabla `ai_config_changes`
   - Quién cambió, cuándo, valor anterior/nuevo

3. **Validaciones de negocio**
   - No permitir desactivar "IA Responde" si está en etapa crítica
   - Confirmación antes de desactivar llamadas programadas

---

## 📚 Archivos Relacionados

- `src/components/chat/LiveChatCanvas.tsx` - Implementación principal
- Vista `v_prospectos_ai_config` - Lectura de configuración (backend)
- Tabla `prospectos` - Escritura de overrides

---

## 🔗 Referencias

- Handover relacionado: `.cursor/handovers/2026-01-26-migracion-etapas-frontend.md`
- Arquitectura de etapas: `docs/MIGRACION_ETAPAS_STRING_A_FK.md`

---

**Estado:** ✅ Completado  
**Deploy:** Pendiente
