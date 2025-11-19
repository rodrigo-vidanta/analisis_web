# 📋 PLAN DE ACTUALIZACIÓN A SYSTEM_UI

## ✅ Estado Actual
- ✅ Datos migrados exitosamente a System_UI
- ✅ 5 roles migrados
- ✅ 6 usuarios migrados
- ✅ 37 permisos migrados
- ✅ Relaciones roles-permisos migradas
- ✅ Avatares migrados

## 🔄 Archivos a Actualizar

### 1. Servicios de Autenticación
- [ ] `src/services/authService.ts` - Cambiar de pqncSupabase a supabaseSystemUI
- [ ] Verificar que las funciones RPC existan en System_UI

### 2. Contextos
- [ ] `src/contexts/AuthContext.tsx` - Actualizar referencias a System_UI

### 3. Componentes de Administración
- [ ] `src/components/admin/UserManagement.tsx` - Cambiar todas las consultas a System_UI
- [ ] `src/components/admin/AvatarUpload.tsx` - Verificar si necesita cambios

### 4. Hooks
- [ ] `src/hooks/useUserProfile.ts` - Actualizar para usar System_UI
- [ ] `src/hooks/useAnalysisPermissions.ts` - Verificar si necesita cambios

### 5. Otros Servicios
- [ ] Verificar otros servicios que usen pqncSupabase para auth

## ⚠️ Consideraciones Importantes

1. **Vista auth_user_profiles**: Necesitamos verificar si existe en System_UI o crear una
2. **Funciones RPC**: Verificar que las funciones de autenticación existan en System_UI
3. **Sesiones**: Las sesiones activas pueden necesitar migración también
4. **Compatibilidad**: Mantener compatibilidad con código existente durante la transición

## 🎯 Orden de Actualización

1. Primero: Actualizar `authService.ts` (base de todo)
2. Segundo: Actualizar `AuthContext.tsx` 
3. Tercero: Actualizar `UserManagement.tsx`
4. Cuarto: Actualizar hooks y otros componentes
5. Quinto: Testing completo

