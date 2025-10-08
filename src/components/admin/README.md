# 🛡️ Módulo de Administración

## Descripción
Sistema completo de administración de usuarios, tokens, configuración del sistema y gestión de agentes.

## Componentes
- **AdminDashboardTabs.tsx**: Dashboard principal con pestañas
- **UserManagement.tsx**: Gestión completa de usuarios
- **TokenManagement.tsx**: Administración de tokens API
- **SystemPreferences.tsx**: Configuraciones del sistema
- **AgentTemplateCard.tsx**: Cards de plantillas de agentes
- **ImportAgentModal.tsx**: Modal para importar agentes
- **SystemMessageEditor.tsx**: Editor de mensajes del sistema
- **AvatarUpload.tsx**: Subida de avatares

## Base de Datos
- **Supabase**: `pqncSupabase` (hmmfuhqgvsehkizlfzga.supabase.co)
- **Tabla usuarios**: `users`
- **Tabla tokens**: `api_tokens`
- **Tabla configuración**: `system_config`
- **Tabla plantillas**: `agent_templates`

## Funcionalidades

### Gestión de Usuarios
- CRUD completo de usuarios
- Asignación de roles y permisos
- Subida de avatares
- Gestión de evaluadores

### Gestión de Tokens
- Tokens API por usuario
- Límites mensuales y actuales
- Generación y revocación
- Monitoreo de uso

### Configuración del Sistema
- Preferencias globales
- Mensajes del sistema
- Configuraciones de módulos

## Dependencias
- **pqncSupabase**: Base de datos principal
- **Lucide React**: Iconos
- **React Hook Form**: Formularios
- **Supabase Storage**: Almacenamiento de archivos

## Permisos
- **Solo Admin**: Acceso exclusivo
- **Otros roles**: Sin acceso

## Integración
- **AuthContext**: Sistema de autenticación
- **useUserProfile**: Gestión de perfiles
- **useSystemConfig**: Configuraciones globales
