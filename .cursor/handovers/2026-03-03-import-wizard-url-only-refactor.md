# Handover: ImportWizardModal — Solo importación por URL de CRM

**Fecha:** 2026-03-03
**Commit:** `044ff6b` (v2.17.6)
**Estado:** En producción

---

## Resumen del cambio

Se eliminó la opción de importar prospectos por teléfono del `ImportWizardModal`. Ahora **solo se soporta importación por URL de Dynamics CRM**. El teléfono se obtiene automáticamente del campo `Telefono` que retorna el endpoint de Dynamics y **no es editable** por el usuario para evitar errores humanos.

---

## Archivos modificados

### 1. `src/services/dynamicsLeadService.ts`
**Cambio:** Se añadieron 4 campos opcionales a `DynamicsLeadInfo` (líneas 105-108):
```typescript
BaseOrigen?: string | null;
Telefono?: string | null;
Creado?: string | null;
status_crm?: string | null;
```
Estos campos reflejan datos adicionales que ahora retorna el endpoint de Dynamics CRM.

### 2. `src/components/chat/ImportWizardModal.tsx` (1,563 líneas)
**Refactorización mayor.** Cambios principales:

#### Tipos e interfaces
- `SearchEntry.type` cambiado de `'url' | 'phone'` a solo `'url'` (línea 70)
- Eliminado status `'exists_locally'` del union type
- Eliminada interfaz `ExistingProspect`
- `SearchEntry.phone` ahora es "teléfono auto-extraído del CRM, no editable" (línea 72)

#### Funciones nuevas
- **`extractPhoneFromCrmField(raw: string): string`** (líneas 125-138): Parsea el formato CRM `<2721899480>;<>;<>`, extrae primer teléfono válido de 10 dígitos. Split por `;`, busca contenido entre `<>`, normaliza a 10 dígitos. Fallback: normaliza el string completo.

#### Funciones eliminadas
- `searchLocalProspect()` — buscaba prospectos en BD local por teléfono
- `deduplicateByLeadId()` — deduplicaba cuando había URL+teléfono para el mismo lead
- `updateEntryPhone()` — permitía editar teléfono manualmente en Step 2

#### Funciones modificadas
- **`parseInputLine()`** (líneas 141-163): Solo acepta URLs de Dynamics CRM. Eliminada detección de patrones telefónicos.
- **`parseSearchInput()`** (líneas 166-186): Mensaje de error actualizado: "No se reconoce como URL de Dynamics CRM".
- **`searchSingleEntry()`** (líneas 356-395): Eliminada rama de búsqueda por teléfono. Ahora solo busca por `id_dynamics`. Extrae teléfono automáticamente: `extractPhoneFromCrmField(result.data.Telefono)`.
- **`handleSearch()`** (líneas 397-439): Eliminada lógica de deduplicación. Toast actualizado para solo URLs.

#### Estado derivado
- `pendingPhone` renombrado a **`missingPhone`** (líneas 291-294): Indica entradas donde el CRM no tiene teléfono (antes indicaba que faltaba input manual).
- Eliminado `allImported` derived state.

#### UI — Step 1 (Búsqueda)
- Label: "URLs de Dynamics CRM" (línea 973)
- Placeholder: Solo URLs, sin teléfonos (línea 978)
- Info box: "El teléfono y la base de origen se obtienen automáticamente del CRM" (línea 1027)
- Resultados muestran `BaseOrigen` con ícono Tag (líneas 1124-1128)
- Warning cuando CRM no tiene teléfono (líneas 1141-1145)

#### UI — Step 2 (Revisión e Importación)
- **Sin input manual de teléfono** — teléfono se muestra read-only con ícono Phone (líneas 1227-1231)
- `BaseOrigen` mostrado con ícono Tag (líneas 1232-1236)
- Warning "Sin teléfono en CRM — no importable" para entradas sin teléfono (líneas 1238-1242)

#### Imports limpiados
- Eliminados: `useCallback`, `Mail`, `Link`, `VariableMapping` (ya no usados)

---

## Formato del campo Telefono del CRM

El endpoint de Dynamics CRM retorna el teléfono en formato:
```
<2721899480>;<>;<>
```

La función `extractPhoneFromCrmField` lo procesa así:
1. Split por `;` → `["<2721899480>", "<>", "<>"]`
2. Para cada parte, extrae contenido entre `<>` → `"2721899480"`
3. Normaliza a últimos 10 dígitos
4. Retorna si tiene exactamente 10 dígitos, sino string vacío
5. Fallback: normaliza todo el string si no encuentra patrón `<>`

---

## Payload ejemplo del CRM

```json
{
  "ID_Dynamics": "d9571471-9973-41aa-8f0d-cae92331a23c",
  "Nombre": "ANA MARIA MARTINEZ GARCIA",
  "Email": "<MGANAMARIA.O@GMAIL.COM>;<>;<>",
  "EstadoCivil": "Married",
  "status_crm": "Activo PQNC",
  "Propietario": "Karla Joana Marban Martinez",
  "OwnerID": "751fe0e3-ae63-ed11-9561-002248081975",
  "Coordinacion": "APEX",
  "CoordinacionID": "c66ba9ed-afec-f011-8544-7ced8d3c7d26",
  "Pais": null,
  "EntidadFederativa": null,
  "FechaUltimaLlamada": "2026-02-26T18:21:15Z",
  "Calificacion": "Q Premium",
  "Creado": "2025-06-11T18:34:36Z",
  "BaseOrigen": "REFERIDOS",
  "Telefono": "<2721899480>;<>;<>"
}
```

---

## Flujo actual del wizard

```
Paso 1: Pegar URLs de CRM → Buscar leads en Dynamics (paralelo, ~3s c/u)
  ↳ Teléfono se extrae automáticamente del campo Telefono del CRM
  ↳ BaseOrigen se muestra en resultados
  ↳ Si CRM no tiene teléfono → warning, no importable

Paso 2: Revisión de permisos → Importar (N8N webhook)
  ↳ Teléfono read-only (no editable)
  ↳ BaseOrigen visible como badge
  ↳ Solo se importan entradas con teléfono válido de 10 dígitos

Paso 3: Seleccionar plantilla WhatsApp

Paso 4: Configurar variables → Enviar plantilla a importados
```

---

## Archivos NO modificados (contexto)

| Archivo | Descripción |
|---------|-------------|
| `src/components/chat/QuickImportModal.tsx` | Modal de importación rápida por teléfono — **no fue tocado**, funcionalidad independiente |
| `src/components/prospectos/ManualImportTab.tsx` | Usa ImportWizardModal — hereda cambios automáticamente |
| `src/services/importContactService.ts` | Payload de importación — sin cambios, sigue esperando `telefono` normalizado |

---

## Decisiones de diseño

1. **Teléfono no editable**: Previene errores humanos. Si el CRM no tiene teléfono, el prospecto simplemente no se puede importar.
2. **Sin fallback manual**: No hay forma de agregar teléfono manualmente. La fuente de verdad es Dynamics CRM.
3. **`missingPhone` vs `pendingPhone`**: Renombrado porque ya no es "pendiente de input" sino "ausente en CRM".
4. **Dedup eliminada**: Con solo URLs, no puede haber duplicados (cada URL tiene un GUID único).
5. **BaseOrigen visible**: Se muestra en Step 1 y Step 2 como información contextual del lead.
