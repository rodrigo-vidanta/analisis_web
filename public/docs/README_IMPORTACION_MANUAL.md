# 📥 IMPORTACIÓN MANUAL DE PROSPECTOS

**Módulo:** Gestión de Prospectos → Importación Manual
**Fecha de creación:** 27 de Enero 2026
**Versión:** 1.0.0

---

## 📋 Índice

1. [Descripción](#-descripción)
2. [Características](#-características)
3. [Uso](#-uso)
4. [Integración](#-integración)
5. [Arquitectura](#-arquitectura)
6. [Diseño](#-diseño)
7. [Casos de Uso](#-casos-de-uso)
8. [Manejo de Errores](#-manejo-de-errores)
9. [Tipos](#-tipos)
10. [Configuración](#-configuración)
11. [Testing](#-testing)
12. [Changelog](#-changelog)
13. [Mejoras Futuras](#-mejoras-futuras)
14. [Ver También](#-ver-también)

---

## 📋 Descripción

Pestaña de importación manual que permite buscar prospectos directamente en Dynamics CRM por número de teléfono y visualizar los datos obtenidos.

**Diferencia clave con Dynamics CRM Manager:**
- **Dynamics CRM Manager:** Busca primero en la base local y luego compara con Dynamics
- **Importación Manual:** Busca directamente en Dynamics CRM sin verificar en la base local

---

## ✨ Características

### 1. Búsqueda Directa
- Búsqueda por número de teléfono (10 dígitos)
- Normalización automática del formato
- Validación de entrada

### 2. Visualización de Datos
Muestra información completa del lead en 4 secciones:

#### ⚠️ Verificación de Duplicados
Antes de mostrar los datos, el sistema:
- ✅ Consulta la base de datos local por `id_dynamics`
- ✅ Si existe, muestra advertencia con:
  - Nombre del prospecto existente
  - Ejecutivo asignado
  - Coordinación asignada
- ✅ Los datos de Dynamics se muestran como referencia

#### Información Personal
- Nombre completo
- Email
- Estado civil
- Ocupación

#### Ubicación
- País
- Estado

#### Asignación en CRM
- Coordinación
- Propietario

#### Datos CRM
- ID Lead
- Calificación
- Fecha de última llamada

---

## 🔧 Uso

### Acceso
1. Módulo **Prospectos**
2. Pestaña **Importación**
3. Sección **Importación Manual**

### Permisos Requeridos
- ✅ Admin
- ✅ Admin Operativo
- ✅ Coordinador Calidad

### Flujo de Trabajo

1. **Ingresar número de teléfono**
   - Formato: 10 dígitos
   - Ejemplos válidos:
     - `5512345678`
     - `(55) 1234-5678`
     - `55 1234 5678`

2. **Buscar**
   - Click en botón "Buscar en Dynamics"
   - O presionar Enter

3. **Visualizar resultados**
   - Si se encuentra: Verifica duplicados en BD local
   - Si existe: Muestra advertencia con datos del prospecto existente
   - Si no existe: Muestra todos los datos de Dynamics
   - Si no se encuentra: Mensaje de error claro

4. **Limpiar**
   - Botón "Limpiar" para nueva búsqueda

---

## 🔌 Integración

### Edge Function Reutilizada
**Función:** `dynamics-lead-proxy`
**URL:** `${VITE_EDGE_FUNCTIONS_URL}/functions/v1/dynamics-lead-proxy`

**Payload:**
```json
{
  "phone": "5512345678"
}
```

**Verificación de Duplicados:**
- Consulta a vista: `prospectos_con_ejecutivo_y_coordinacion`
- Filtro: `id_dynamics = LeadID`
- Campos: `id, nombre_completo, ejecutivo_nombre, coordinacion_nombre`

**Headers:**
```
Authorization: Bearer ${JWT_TOKEN}
Content-Type: application/json
```

### Servicio
**Archivo:** `src/services/dynamicsLeadService.ts`
**Método:** `searchLead({ phone: string })`

---

## 📐 Arquitectura

### Componentes

```
ProspectosManager.tsx
├── [Pestaña: Prospectos]
├── [Pestaña: Reasignación Masiva]
└── [Pestaña: Importación] ← NUEVA
    └── ManualImportTab.tsx
```

### Archivos

| Archivo | Descripción |
|---------|-------------|
| `src/components/prospectos/ManualImportTab.tsx` | Componente principal |
| `src/services/dynamicsLeadService.ts` | Servicio de búsqueda (existente) |
| `supabase/functions/dynamics-lead-proxy/index.ts` | Edge Function (existente) |

---

## 🎨 Diseño

### Paleta de Colores

```typescript
// Pestaña activa
text-emerald-600 dark:text-emerald-400

// Gradientes de sección
from-blue-500 to-purple-500      // Información Personal
from-purple-500 to-pink-500      // Ubicación
from-emerald-500 to-teal-500     // Asignación CRM
from-blue-500 to-cyan-500        // Datos CRM

// Resultado exitoso
from-emerald-50 to-teal-50 dark:from-emerald-900/20
```

### Animaciones

```typescript
// Entrada de elementos
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Botones
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}

// Resultados
mode="wait" // Solo un resultado a la vez
```

---

## 🔍 Casos de Uso

### Caso 1: Lead Encontrado
```
Input: 5512345678
Output: Datos completos del lead
Estado: ✅ Success
```

### Caso 2: Lead No Encontrado
```
Input: 5599999999
Output: "Lead no encontrado en Dynamics CRM"
Estado: ❌ Error
```

### Caso 3: Número Inválido
```
Input: 123
Output: "El número debe tener 10 dígitos"
Estado: ⚠️ Validación
```

### Caso 4: Timeout
```
Input: 5512345678
Output: "Timeout: Dynamics no respondió en 30 segundos"
Estado: ⏱️ Timeout
```

---

## 🐛 Manejo de Errores

### Errores Capturados

| Error | Mensaje | Acción |
|-------|---------|--------|
| Sin número | "Ingresa un número de teléfono" | Toast error |
| Número corto | "El número debe tener 10 dígitos" | Toast error |
| Lead no encontrado | "No se encontró el lead" | Panel error |
| Timeout | "Timeout: Dynamics no respondió en 30 segundos" | Panel error |
| Red | "Error de conexión" | Panel error |

### Estados de UI

```typescript
interface State {
  phoneNumber: string;             // Input del usuario
  isSearching: boolean;            // Loader activo
  leadData: DynamicsLeadInfo | null;
  error: string | null;
  searchAttempted: boolean;        // Para mostrar botón limpiar
  existingProspect: ExistingProspect | null; // Prospecto duplicado
}

interface ExistingProspect {
  id: string;
  nombre_completo: string;
  ejecutivo_nombre: string | null;
  coordinacion_nombre: string | null;
}
```

---

## 📊 Tipos

### DynamicsLeadInfo

```typescript
interface DynamicsLeadInfo {
  LeadID: string;
  Nombre: string;
  Email: string;
  EstadoCivil: string;
  Ocupacion: string;
  Pais: string;
  EntidadFederativa: string;
  Coordinacion: string;
  CoordinacionID: string;
  Propietario: string;
  OwnerID: string;
  FechaUltimaLlamada: string | null;
  Calificacion: string;
}
```

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# Edge Functions URL
VITE_EDGE_FUNCTIONS_URL=https://glsmifhkoaifvaegsozd.supabase.co

# Credenciales (en BD SystemUI → api_auth_tokens)
# NO hardcodear
```

### Secrets (Supabase Edge Functions)

```bash
DYNAMICS_TOKEN=<token_n8n>
DYNAMICS_WEBHOOK_URL=https://primary-dev-d75a.up.railway.app/webhook/lead-info
```

---

## 🧪 Testing

### Manual

1. **Búsqueda exitosa (Prospecto Nuevo):**
   - Teléfono: `5512345678` (lead conocido, no existe en BD local)
   - Verificar: Muestra todos los datos sin advertencia

2. **Búsqueda exitosa (Prospecto Duplicado):**
   - Teléfono: `3333243333` (lead conocido, YA existe en BD local)
   - Verificar: 
     - Panel amber con advertencia
     - Nombre del prospecto existente
     - Ejecutivo asignado
     - Coordinación asignada
     - Datos de Dynamics como referencia

3. **Lead no encontrado:**
   - Teléfono: `5599999999`
   - Verificar: Mensaje de error

4. **Normalización:**
   - Input: `(55) 1234-5678`
   - Verificar: Se normaliza a `5512345678`

5. **Validación:**
   - Input: `123`
   - Verificar: Error "debe tener 10 dígitos"

6. **Limpiar:**
   - Buscar → Limpiar
   - Verificar: Formulario limpio y advertencia removida

---

## 📝 Changelog

### v1.0.0 - 27 Enero 2026
- ✅ Componente `ManualImportTab.tsx` creado
- ✅ Integración con `dynamicsLeadService`
- ✅ Búsqueda directa por teléfono
- ✅ **Verificación de duplicados en BD local**
- ✅ **Advertencia visual si el prospecto ya existe**
- ✅ Visualización en 4 secciones
- ✅ Manejo de errores completo
- ✅ Animaciones suaves
- ✅ Responsive design

---

## 🔜 Mejoras Futuras

### Fase 2
- [ ] Botón "Importar a base local"
- [ ] Validación de duplicados
- [ ] Asignación automática de ejecutivo
- [ ] Historial de búsquedas

### Fase 3
- [ ] Búsqueda masiva (CSV)
- [ ] Comparación con base local
- [ ] Sincronización automática

---

## 📚 Ver También

### Documentación Relacionada
- [README_DYNAMICS_CRM.md](README_DYNAMICS_CRM.md) - Módulo completo de Dynamics CRM Manager
- [CHANGELOG_DYNAMICS_CRM.md](CHANGELOG_DYNAMICS_CRM.md) - Historial de cambios de Dynamics
- [CHANGELOG_IMPORTACION_MANUAL.md](CHANGELOG_IMPORTACION_MANUAL.md) - Historial de cambios de este módulo

### Servicios y Edge Functions
- [Edge Functions Catalog](../docs/EDGE_FUNCTIONS_CATALOG.md) - Catálogo completo de Edge Functions
- [Dynamics Lead Service](../../src/services/dynamicsLeadService.ts) - Servicio reutilizado

### Arquitectura
- [NUEVA_ARQUITECTURA_BD_UNIFICADA.md](../docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md) - Arquitectura de BD actual
- [ARQUITECTURA_SEGURIDAD_2026.md](../docs/ARQUITECTURA_SEGURIDAD_2026.md) - Seguridad y RLS

### Handovers Técnicos
- [2026-01-27-importacion-manual-prospectos.md](../../.cursor/handovers/2026-01-27-importacion-manual-prospectos.md) - Implementación técnica completa
- [2026-01-27-importacion-manual-UI-preview.md](../../.cursor/handovers/2026-01-27-importacion-manual-UI-preview.md) - Preview visual de la UI

---

**Última actualización:** 27 de Enero 2026
**Autor:** Team
