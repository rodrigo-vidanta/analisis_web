# 📝 Módulo Prompts Manager

## Descripción
Sistema de gestión de prompts con versionado, métricas de performance y configuración VAPI.

## Componentes
- **PromptsManager.tsx**: Gestor principal de prompts
- **VAPIConfigEditor.tsx**: Editor de configuración VAPI

## Base de Datos
- **Supabase**: `supabaseSystemUI` (zbylezfyagwrxoecioup.supabase.co)
- **Tabla prompts**: `prompt_versions`
- **Tabla métricas**: `workflow_metrics`
- **Tabla cambios**: `prompt_change_log`

## Funcionalidades
- Gestión de versiones de prompts
- Editor de configuración VAPI
- Métricas de performance
- Historial de cambios
- Activación/desactivación de prompts

## Dependencias
- **supabaseSystemUI**: Base de datos
- **Monaco Editor**: Editor de código (si aplica)
- **VAPI Configuration**: Configuraciones de IA

## Permisos
- **Admin**: Acceso completo
- **Developer**: Acceso completo
- **Otros roles**: Sin acceso

## Integración
- **VAPI**: Configuración de agentes IA
- **N8N**: Workflows de automatización
- **Sistema de versiones**: Control de cambios
