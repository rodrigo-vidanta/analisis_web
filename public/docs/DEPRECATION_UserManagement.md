# Deprecación de UserManagement.tsx

**Fecha:** 22 de Enero 2026  
**Estado:** ⚠️ DEPRECADO  
**Reemplazo:** UserManagementV2

---

## 📋 Resumen

El componente `UserManagement.tsx` ha sido **oficialmente deprecado** y reemplazado por `UserManagementV2`.

---

## ⚠️ NO USAR UserManagement.tsx

### Razones de Deprecación

1. **Duplicación de Código**: Mantener dos módulos de gestión de usuarios causa confusión
2. **Bugs por Edición Incorrecta**: Desarrolladores editaban UserManagement.tsx cuando el sistema usaba UserManagementV2
3. **Arquitectura Obsoleta**: UserManagement.tsx no sigue las mejores prácticas actuales
4. **Funcionalidad Limitada**: UserManagementV2 incluye características enterprise no disponibles en la versión legacy

### Incidentes Previos

**2026-01-22**: Bug de persistencia de campo `inbound` causado por editar UserManagement.tsx cuando el sistema usaba UserManagementV2.

---

## ✅ Usar UserManagementV2

### Ubicación

```
src/components/admin/UserManagementV2/
├── index.tsx                    # Componente principal
├── types.ts                     # Tipos e interfaces
├── hooks/
│   └── useUserManagement.ts    # Lógica de negocio
└── components/
    └── (subcomponentes)
```

### Características

- ✅ Arquitectura enterprise con hooks personalizados
- ✅ Vista jerárquica (roles → coordinaciones → usuarios)
- ✅ Gestión avanzada de permisos
- ✅ Optimización de rendimiento
- ✅ Código modular y mantenible
- ✅ Tipos TypeScript completos
- ✅ Soporte completo para todos los campos de usuario

---

## 🔧 Feature Flag

**Archivo:** `src/components/admin/AdminDashboardTabs.tsx`

```typescript
const USE_NEW_USER_MANAGEMENT = true; // ⚠️ NO CAMBIAR A FALSE
```

**Estado Actual:** ✅ ACTIVO (UserManagementV2 en producción)

---

## 📝 Cómo Editar Gestión de Usuarios

### ❌ INCORRECTO
```typescript
// NO editar este archivo
src/components/admin/UserManagement.tsx
```

### ✅ CORRECTO
```typescript
// Editar estos archivos
src/components/admin/UserManagementV2/hooks/useUserManagement.ts
src/components/admin/UserManagementV2/types.ts
src/components/admin/UserManagementV2/index.tsx
```

---

## 🗑️ Plan de Eliminación

### Fase 1 (Actual): Deprecación Suave
- ✅ Advertencias en código
- ✅ Banner de deprecación en UI
- ✅ Documentación actualizada
- ⏳ Componente legacy se mantiene para rollback de emergencia

### Fase 2 (Futuro): Eliminación Completa
- ⏳ Después de 3 meses sin incidentes
- ⏳ Eliminar `UserManagement.tsx` completamente
- ⏳ Eliminar flag `USE_NEW_USER_MANAGEMENT`
- ⏳ Renombrar `UserManagementV2` → `UserManagement`

---

## 🚨 Si Encuentras Código usando UserManagement.tsx

1. **NO edites UserManagement.tsx**
2. **Realiza los cambios en UserManagementV2**
3. **Reporta el hallazgo** para actualizar referencias

---

## 📚 Documentación Relacionada

- [Arquitectura UserManagementV2](./UserManagementV2/README.md)
- [Fix Bug Inbound](../../docs/FIX_INBOUND_COORDINACION_COMPLETO.md)
- [Guía de Migración](./MIGRACION_USERMANAGEMENT_V2.md) *(próximamente)*

---

## 🔗 Referencias

| Archivo | Propósito | Estado |
|---------|----------|--------|
| `UserManagement.tsx` | Versión legacy | ⚠️ DEPRECADO |
| `UserManagementV2/` | Versión enterprise | ✅ ACTIVO |
| `AdminDashboardTabs.tsx` | Enrutador con flag | ✅ ACTIVO |

---

## ⚡ Checklist para Desarrolladores

Antes de editar gestión de usuarios:

- [ ] ¿Estás editando UserManagementV2? (NO UserManagement.tsx)
- [ ] ¿Verificaste el flag `USE_NEW_USER_MANAGEMENT`?
- [ ] ¿Leíste la documentación de UserManagementV2?
- [ ] ¿Probaste localmente antes de commit?

---

**Última actualización:** 22 de Enero 2026  
**Autor:** Deprecación oficial  
**Versión:** 1.0.0
