# Modo Ninja - Documentación Técnica

**Versión:** 1.0.0  
**Fecha:** 21 Enero 2026  
**Release:** v2.5.35

---

## Resumen

El Modo Ninja permite a los administradores suplantar la sesión de cualquier usuario (ejecutivo, supervisor, coordinador) para visualizar la interfaz exactamente como la vería ese usuario, incluyendo:

- Permisos y accesos a módulos
- Datos filtrados según su rol/coordinación
- Errores que pueda experimentar el usuario

---

## Arquitectura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                         Header.tsx                          │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │ NinjaButton  │→ │ NinjaModeModal  │→ │ ninjaStore   │   │
│  └──────────────┘  └─────────────────┘  └──────┬───────┘   │
└────────────────────────────────────────────────┼───────────┘
                                                 │
                    ┌────────────────────────────┼────────────┐
                    │                            ▼            │
                    │            useNinjaAwarePermissions     │
                    │                            │            │
                    └────────────────────────────┼────────────┘
                                                 │
        ┌────────────────────────────────────────┼────────────────────┐
        │                                        ▼                    │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
        │  │ Prospectos  │  │  WhatsApp   │  │  Dashboard  │  ...    │
        │  │  Manager    │  │ LiveChat    │  │  Widgets    │         │
        │  └─────────────┘  └─────────────┘  └─────────────┘         │
        │                      Módulos Integrados                     │
        └─────────────────────────────────────────────────────────────┘
```

---

## Store: ninjaStore

**Ubicación:** `src/stores/ninjaStore.ts`

### Estado

| Propiedad | Tipo | Descripción |
|---|---|---|
| `isNinjaMode` | boolean | Si el modo está activo |
| `targetUser` | NinjaTargetUser | Usuario suplantado |
| `targetUserPermissions` | NinjaPermission[] | Permisos del usuario |
| `targetUserCoordinaciones` | string[] | IDs de coordinaciones |
| `originalAdminId` | string | ID del admin real |

### Acciones

```typescript
// Activar modo ninja
activateNinjaMode(
  targetUser: NinjaTargetUser,
  permissions: NinjaPermission[],
  coordinaciones: string[],
  adminId: string
)

// Desactivar modo ninja
deactivateNinjaMode()

// Obtener rol efectivo
getEffectiveRole(): string | null
```

---

## Hook: useNinjaAwarePermissions

**Ubicación:** `src/hooks/useNinjaAwarePermissions.ts`

### Retorno

| Propiedad | Tipo | Descripción |
|---|---|---|
| `isNinjaMode` | boolean | Si ninja está activo |
| `effectiveUser` | User | Usuario efectivo (real o suplantado) |
| `effectiveRoleName` | string | Rol efectivo |
| `isEffectiveAdmin` | boolean | Si el rol efectivo es admin |
| `isEffectiveCoordinador` | boolean | Si el rol efectivo es coordinador |
| `canAccessModule` | (module, subModule?) => boolean | Verificar acceso |
| `hasPermission` | (permission) => boolean | Verificar permiso |

### Uso

```typescript
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';

const MiComponente = () => {
  const { 
    isNinjaMode, 
    effectiveUser, 
    canAccessModule 
  } = useNinjaAwarePermissions();
  
  // ID para queries
  const queryUserId = isNinjaMode && effectiveUser 
    ? effectiveUser.id 
    : user?.id;
  
  // Verificar acceso
  if (!canAccessModule('prospectos')) {
    return <AccessDenied />;
  }
};
```

---

## Componentes UI

### NinjaButton

Botón circular en el header con estrellas ninja animadas.

- **Visibilidad:** Solo administradores (`isRealAdmin`)
- **Animación:** Estrellas grises que salen volando al hover
- **Ubicación:** Header, junto a otros iconos

### NinjaModeModal

Modal de selección de usuario con flujo de 3 pasos:

1. **Búsqueda Directa:** Campo de búsqueda (máx 3 resultados)
2. **Tipo de Usuario:** Ejecutivo, Supervisor, Coordinador
3. **Selección:** Lista de usuarios filtrada

**Características:**
- Portal a `document.body` (z-index alto)
- Búsqueda por nombre/email
- Filtro opcional por coordinación

### NinjaModeIndicator

Badge que aparece cuando el modo está activo:
- Nombre del usuario suplantado
- Botón para salir

### NinjaAvatar

Avatar ninja que reemplaza la foto del usuario en el header.

---

## Tema Visual

**Archivo:** `src/index.css`

Cuando el body tiene la clase `ninja-theme`:

```css
body.ninja-theme {
  /* Fondo más oscuro */
  --bg-primary: #0a0a0a;
  
  /* Iconos sidebar rojos */
  .sidebar-icon { color: #ef4444; }
  
  /* Borde superior pulsante */
  border-top: 2px solid #ef4444;
  animation: ninja-pulse 2s infinite;
}
```

---

## Integración en Módulos

### Patrón Estándar

```typescript
import { useAuth } from '../../contexts/AuthContext';
import { useNinjaAwarePermissions } from '../../hooks/useNinjaAwarePermissions';

const MiModulo = () => {
  const { user } = useAuth();
  const { isNinjaMode, effectiveUser } = useNinjaAwarePermissions();
  
  // ID efectivo para todas las queries
  const queryUserId = isNinjaMode && effectiveUser 
    ? effectiveUser.id 
    : user?.id;
  
  // Recargar al cambiar modo
  useEffect(() => {
    if (queryUserId) {
      loadData(queryUserId);
    }
  }, [queryUserId]);
  
  const loadData = async (userId: string) => {
    // Usar userId para filtros
    const filter = await permissionsService.getEjecutivoFilter(userId);
    const coords = await permissionsService.getCoordinacionesFilter(userId);
    // ... cargar datos
  };
};
```

### Módulos Integrados

| Módulo | Archivo | Integración |
|---|---|---|
| Prospectos | `ProspectosManager.tsx` | Filtros de prospecto |
| WhatsApp | `LiveChatCanvas.tsx` | Conversaciones visibles |
| Dashboard | `OperativeDashboard.tsx` | Widgets con queryUserId |
| Llamadas IA | `LiveMonitor.tsx` | Llamadas activas |
| Historial | `AnalysisIAComplete.tsx` | Historial filtrado |
| Programación | `ScheduledCallsManager.tsx` | Llamadas programadas |
| Sidebar | `Sidebar.tsx` | Menú según permisos |

---

## AuthContext: isRealAdmin

El `AuthContext` expone `isRealAdmin` para distinguir el admin real:

```typescript
const { isRealAdmin } = useAuth();

// isRealAdmin = true solo si el usuario LOGUEADO es admin
// No cambia aunque esté en modo ninja
```

**Uso:** Mostrar el botón ninja solo al admin real.

---

## Flujo Completo

```
1. Admin ve NinjaButton en header
   ↓
2. Click → abre NinjaModeModal
   ↓
3. Búsqueda directa o selección por coordinación
   ↓
4. Click en usuario objetivo
   ↓
5. Modal carga permisos y coordinaciones del usuario
   ↓
6. activateNinjaMode() actualiza ninjaStore
   ↓
7. body recibe clase 'ninja-theme'
   ↓
8. useNinjaAwarePermissions retorna datos del suplantado
   ↓
9. Todos los módulos recargan con queryUserId del suplantado
   ↓
10. Admin ve la UI como el usuario suplantado
```

---

## Consideraciones de Seguridad

1. **Solo admins** pueden activar el modo ninja
2. **Auditoría:** El modal indica que las acciones se registran
3. **No modifica datos reales:** Solo visualización
4. **originalAdminId** se preserva para logs

---

## Archivos del Módulo

```
src/
├── stores/
│   └── ninjaStore.ts           # Store Zustand
├── hooks/
│   └── useNinjaAwarePermissions.ts  # Hook principal
├── components/
│   └── ninja/
│       ├── index.ts            # Exports
│       ├── NinjaButton.tsx     # Botón + Indicator + Avatar
│       └── NinjaModeModal.tsx  # Modal de selección
├── utils/
│   └── ninjaContext.ts         # Utilidades para servicios
└── index.css                   # Estilos .ninja-theme

.cursor/rules/
└── ninja-mode.mdc              # Reglas para IA

docs/
└── NINJA_MODE_TECHNICAL.md     # Este documento
```

---

## Troubleshooting

### Datos no se filtran correctamente
- Verificar que el componente use `useNinjaAwarePermissions`
- Verificar que use `queryUserId` en lugar de `user.id`
- Agregar `useEffect` con dependencia de `isNinjaMode`

### Modal no aparece centrado
- Verificar que use `ReactDOM.createPortal`
- z-index debe ser > 99999

### Permisos no se aplican
- Verificar que el módulo use `canAccessModule` del hook ninja
- No usar `canAccessModule` de `useAuth` directamente

---

**Última actualización:** 21 Enero 2026
