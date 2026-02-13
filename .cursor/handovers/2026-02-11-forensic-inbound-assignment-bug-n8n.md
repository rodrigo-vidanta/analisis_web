# Diagnóstico Forense: Bug asignación inbound en N8N

**Fecha:** 2026-02-11
**Tipo:** Diagnóstico / Bug N8N
**Status:** Diagnosticado, SIN corrección aplicada
**Severidad:** Alta (afecta todos los prospectos inbound)

---

## Caso detonante

El prospecto **SOCORRO RAMIREZ** (mostrado como "Maria RAMIREZ" en BD) fue asignado a **Cordero Sanchez David**, quien tiene `inbound = false` y no debería recibir prospectos inbound.

| Campo | Valor |
|-------|-------|
| Prospecto ID BD | `706d9f99-a8c9-48da-b422-084b4eb347f1` |
| Nombre BD | Maria RAMIREZ |
| Dynamics ID | `7105cc1e-0f49-ee11-be6d-0022480816f1` |
| WhatsApp | 5215538989304 |
| Propietario Dynamics (UI) | Ricardo Ortiz Ruiz |
| Asignado en BD a | Cordero Sanchez David (`30ac8588-6ab0-4a01-9b24-51b0277260f7`) |
| Coordinación | COB Acapulco (`0008460b-a730-4f0b-ac1b-5aaa5c40f5b0`) |
| Creado | 2026-02-11 21:26:25.593 UTC |
| Assignment date | 2026-02-11 21:26:25.793 UTC (200ms después = mismo INSERT) |
| Origen | FACEBOOK_ADS |
| Etapa | Primer contacto |

---

## Ejecuciones N8N clave

### Ejecución principal (donde ocurre el bug)
- **Workflow:** `IpyOAEayWSfGkHuT` — "New contact / contact info [PROD]"
- **Execution ID:** `1260385`
- **URL:** https://primary-dev-d75a.up.railway.app/workflow/IpyOAEayWSfGkHuT/executions/1260385
- **Timestamp:** 2026-02-11T21:26:25.136Z

### Sub-workflow CRM data (consultó Dynamics)
- **Workflow:** `fg7m0a9usTYPN4RO` — "CRM data [PROD]"
- **Execution ID:** `1260386`
- **URL:** https://primary-dev-d75a.up.railway.app/workflow/fg7m0a9usTYPN4RO/executions/1260386
- **Timestamp:** 2026-02-11T21:26:25.9Z

### Sub-workflows de Round Robin (referencia, NO invocados en este flujo)
- **`TWlt1yxb4YC0F3gU`** — "[sub] Round Robin Asignar Ejecutivo" → TIENE la query correcta con `inbound = TRUE` pero NO se usa
- **URL base:** https://primary-dev-d75a.up.railway.app/workflow/TWlt1yxb4YC0F3gU
- **`FmZYz99NMttjgPxE`** — "[sub] Round Robin Asignar Ejecutivo (viejo)" → NO filtra inbound
- **URL base:** https://primary-dev-d75a.up.railway.app/workflow/FmZYz99NMttjgPxE

---

## Causa raíz

### Bug principal: El workflow NO filtra por `inbound = true`

El workflow `IpyOAEayWSfGkHuT` tiene **2 nodos con queries defectuosas**:

#### Nodo "Buscar usuario por OwnerID1" (ruta Activo PQNC)

Query actual:
```sql
SELECT u.id AS ejecutivo_id, u.full_name AS ejecutivo_nombre, ...
FROM user_profiles_v2 u
WHERE u.id_dynamics = $1       -- OwnerID del CRM
  AND u.is_active = TRUE       -- Solo checa si está activo
LIMIT 1;
```

**Falta:** `AND u.inbound = TRUE`

#### Nodo "Inactivo - Usuarios activos coord1" (ruta Inactivo PQNC)

Query actual:
```sql
WHERE u.coordinacion_id = $1
  AND u.is_active = TRUE
  AND u.is_ejecutivo = TRUE
  AND u.is_operativo = TRUE    -- Filtra por operativo, NO por inbound
```

**Error:** Usa `is_operativo` en lugar de `inbound`. Son campos distintos.

### Contexto adicional: OwnerID de Dynamics

- **Ricardo Ortiz** (propietario mostrado en UI Dynamics): `is_active = false`, `id_dynamics = d92eecb4-ae63-ed11-9561-002248081932`
- **Cordero Sanchez David**: `is_active = true`, `id_dynamics = d18ca5ac-ae63-ed11-9561-002248081975`, `inbound = false`
- El OwnerID retornado por la API de Dynamics matcheó con Cordero (no con Ricardo Ortiz)
- Como Cordero es `is_active = true`, la query lo encontró y lo asignó sin verificar `inbound`
- Posible causa: lead reasignado en Dynamics de Ricardo Ortiz a Cordero, o discrepancia entre UI y API

---

## Impacto: Problema sistémico

NO es solo este prospecto. Análisis de COB Acapulco hoy (prospectos FACEBOOK_ADS = inbound):

| Prospecto | Asignado a | `inbound`? | Correcto? |
|-----------|-----------|-----------|-----------|
| GISSEL FLORES DAMIAN | Vargas Campuzano | false | NO |
| CELIA ZENTENO | Sandoval Leonides | false | NO |
| HILDA RODRIGUEZ | Gutierrez Jessica | **true** | SI |
| LAURA ISABEL MUÑOZ | Valdez Severiano (inactivo) | N/A | NO |
| **Maria RAMIREZ** | **Cordero Sanchez David** | **false** | **NO** |
| AVR ANDRADE | Sandoval Leonides | false | NO |
| Lourdes Romo | null (sin owner) | - | - |

**5 de 7 prospectos inbound de hoy fueron asignados a ejecutivos sin `inbound = true`.**

### Única ejecutiva inbound en COB Acapulco
- **Gutierrez Arredondo Jessica**: `inbound = true`, `is_operativo = true`, 45 prospectos en Feb

### Distribución actual ejecutivos activos COB Acapulco

| Ejecutivo | inbound | is_operativo | Prospectos Feb |
|-----------|---------|-------------|----------------|
| Gutierrez Arredondo Jessica | **true** | true | 45 |
| Vargas Campuzano Jose Manuel | false | true | 42 |
| Sandoval Leonides Elizabeth | false | true | 27 |
| Cordero Sanchez David | false | false | 21 |
| Magallanes Garcia Luis Andres | false | false | 10 |
| Garcia Navarro Jose Manuel | false | true | 7 |
| Vallejo Hernandez Rodolfo | false | true | 2 |

---

## Evidencia BD adicional

- **assignment_logs**: VACÍO para este prospecto (la asignación fue por INSERT directo, no por sistema de asignación)
- **prospect_assignments**: VACÍO (mismo motivo)
- **dynamics_audit_log**: VACÍO (el workflow no registra audit en esta tabla para esta operación)
- **acciones_log**: VACÍO

Esto confirma que N8N escribe directamente en `prospectos` con `ejecutivo_id` + `asesor_asignado` en el INSERT/UPDATE, sin pasar por el sistema de asignación que genera logs.

---

## Corrección recomendada (NO aplicada)

### Opción A: Parche mínimo (2 queries)

1. **Nodo "Buscar usuario por OwnerID1"** — agregar `AND u.inbound = TRUE`
2. **Nodo "Inactivo - Usuarios activos coord1"** — cambiar `is_operativo` por `inbound`

### Opción B: Refactor (mejor, más robusto)

Refactorizar el flujo principal para usar el sub-workflow `TWlt1yxb4YC0F3gU` que **ya tiene** la lógica correcta de round-robin con `inbound = TRUE`, eliminando la lógica de asignación inline duplicada.

### Consideración

Si se agrega filtro `inbound = TRUE` al nodo OwnerID, cuando el owner CRM NO sea inbound, el prospecto necesita un fallback:
- Opción: caer a round-robin entre ejecutivos `inbound = true` de la misma coordinación
- Opción: asignar solo coordinación sin ejecutivo (comportamiento actual cuando no encuentra match)

---

## Flujo reconstruido paso a paso

```
1. Mensaje WhatsApp llega de 5215538989304
2. Workflow IpyOAEayWSfGkHuT se activa (exec 1260385)
3. Busca contacto en BD → lo encuentra (ya existía en ciclo previo)
4. Identifica etapa "Primer contacto" → invoca sub-workflow CRM data
5. Sub-workflow fg7m0a9usTYPN4RO (exec 1260386):
   - Busca lead en Dynamics por teléfono/ID
   - Encuentra lead con status "Activo PQNC"
   - Retorna OwnerID = d18ca5ac-ae63-ed11-9561-002248081975 (Cordero)
6. Switch Status CRM → ruta "Activo PQNC"
7. Nodo "Buscar usuario por OwnerID1":
   - Query: WHERE id_dynamics = 'd18ca5ac...' AND is_active = TRUE
   - Resultado: Cordero Sanchez David ← ENCONTRADO (activo, pero inbound=false)
   - ⚠️ NO VERIFICA inbound = true
8. "Usuario existe en BD?" → SÍ
9. "Preparar datos Activo con Usuario":
   - ejecutivo_id = 30ac8588... (Cordero)
   - coordinacion_id = 0008460b... (COB Acapulco)
   - asesor_asignado = "Cordero Sanchez David"
10. "Query Update Prospecto Unificado":
    - UPDATE prospectos SET ejecutivo_id, coordinacion_id, asesor_asignado
    - ✅ Ejecutado exitosamente
    - ❌ Asignación incorrecta
```

---

## Archivos y recursos relacionados

- Workflow principal: https://primary-dev-d75a.up.railway.app/workflow/IpyOAEayWSfGkHuT
- Workflow CRM data: https://primary-dev-d75a.up.railway.app/workflow/fg7m0a9usTYPN4RO
- Sub-workflow RR correcto: https://primary-dev-d75a.up.railway.app/workflow/TWlt1yxb4YC0F3gU
- Sub-workflow RR viejo: https://primary-dev-d75a.up.railway.app/workflow/FmZYz99NMttjgPxE
