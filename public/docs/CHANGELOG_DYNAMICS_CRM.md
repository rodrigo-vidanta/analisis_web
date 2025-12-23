# 📋 CHANGELOG - DYNAMICS CRM MANAGER

Historial de cambios del módulo de Dynamics CRM Manager.

---

## [1.0.3] - 2025-12-22

### 🔄 Visualización Completa de Campos y Datos desde System_UI

#### Mejorado
- **Vista completa de comparación**: Ahora se muestran TODOS los campos comparados, no solo las discrepancias
  - Campos sincronizados se muestran en verde con ícono ✓
  - Discrepancias críticas se muestran en rojo con ícono ✗
  - Advertencias se muestran en ámbar
  - Campos informativos (solo Dynamics) se muestran en azul

- **Datos del ejecutivo desde System_UI**: 
  - El `id_dynamics` del ejecutivo ahora se obtiene correctamente desde `auth_users` en `system_ui`
  - Anteriormente se intentaba leer de `pqnc_ai` donde no existe este campo
  - Se usa `coordinacionService.getEjecutivoById()` para obtener datos completos

#### Agregado
- Nueva interfaz `LeadFieldComparison` para campos comparados
- Campo `allFields` en `LeadComparisonResult` con todos los campos
- Campos adicionales en comparación:
  - Calificación CRM (solo Dynamics)
  - Última Llamada (solo Dynamics)
  - País (solo Dynamics)
  - Nombre (siempre sincronizado, solo visual)

- Badge de estado general: "Sincronizado" o "X discrepancias"
- Enriquecimiento de datos locales con info del ejecutivo antes de comparar

---

## [1.0.2] - 2025-12-22

### 🔧 Corrección de Comparación de Ejecutivos

#### Corregido
- **Comparación por ID en lugar de nombre**: 
  - Ahora se compara `ejecutivo_id_dynamics` (local) vs `OwnerID` (Dynamics)
  - Anteriormente se comparaba por nombre, causando falsos positivos por diferencias de capitalización
  - El nombre se muestra visualmente para referencia, pero la validación es por UUID

- **Eliminada comparación de nombres**:
  - Ya no se marcan como discrepancias diferencias de capitalización/acentos
  - Ej: "Leticia Álvarez Zavala" vs "LETICIA ALVAREZ ZAVALA" ya no es discrepancia

- **Actualizado `coordinacionService.getEjecutivoById()`**:
  - Ahora retorna `id_dynamics` e `is_operativo` del ejecutivo

#### Agregado
- Campo `ejecutivo_id_dynamics` en la interfaz `Prospecto`
- Función `normalizeUUID()` para comparar UUIDs correctamente
- Enriquecimiento de datos incluye `ejecutivo_id_dynamics`

---

## [1.0.1] - 2025-12-22

### 🔐 Sistema de Permisos

#### Modificado
- Implementado sistema de permisos para acceso al módulo:
  - ✅ **admin**: Acceso completo
  - ✅ **administrador_operativo**: Acceso completo
  - ✅ **coordinador de Calidad**: Acceso completo (coordinadores asignados a coord. "CALIDAD")
  - ❌ Otros coordinadores: Sin acceso
  - ❌ Ejecutivos/Supervisores: Sin acceso

- Agregada pantalla de "Acceso Restringido" para usuarios sin permisos
- Estado de carga mientras se verifican permisos
- Tab de Dynamics visible condicionalmente según permisos

---

## [1.0.0] - 2025-12-22

### ✨ Lanzamiento Inicial

#### Agregado
- **Servicio `dynamicsLeadService.ts`:**
  - Búsqueda de leads por ID de Dynamics
  - Búsqueda de leads por email
  - Búsqueda de leads por teléfono (10 dígitos)
  - Comparación de datos locales vs Dynamics
  - Detección de discrepancias con severidades
  - Formateo de fechas y calificaciones

- **Componente `DynamicsCRMManager.tsx`:**
  - Panel de búsqueda con filtros avanzados
  - Vista split: lista local + comparación CRM
  - Indicadores visuales de estado de sincronización
  - Modal de reasignación con selectores
  - Barra de progreso durante operaciones
  - Animaciones con Framer Motion
  - Diseño responsive y dark mode
  - Verificación de permisos de acceso

- **Integración en Admin:**
  - Nueva pestaña "Dynamics CRM" en AdminDashboardTabs
  - Acceso para: admin, admin operativo, coordinadores de calidad
  - Ícono GitCompare de Lucide

- **Documentación:**
  - README_DYNAMICS_CRM.md con guía completa
  - CHANGELOG_DYNAMICS_CRM.md

#### Funcionalidades
- ✅ Búsqueda de prospectos por múltiples criterios
- ✅ Filtro por coordinación
- ✅ Filtro por estado de Dynamics (con/sin ID)
- ✅ Consulta automática a Dynamics al seleccionar prospecto
- ✅ Detección de discrepancias entre sistemas
- ✅ Reasignación de ejecutivos vía webhook
- ✅ Sincronización con Dynamics CRM (80s timeout)
- ✅ Control de acceso por rol/coordinación
- ⚠️ Sincronización de datos a CRM (en construcción)

---

## Formato de Versiones

Este proyecto sigue [Semantic Versioning](https://semver.org/):
- **MAJOR:** Cambios incompatibles con versiones anteriores
- **MINOR:** Nuevas funcionalidades compatibles
- **PATCH:** Correcciones de bugs compatibles

