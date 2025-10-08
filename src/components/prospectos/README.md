# 📊 Módulo de Prospectos

## Descripción
Sistema de gestión completa de prospectos con data grid avanzado, filtros inteligentes y navegación integrada.

## Componentes
- **ProspectosManager.tsx**: Componente principal con data grid y sidebar
- **CallDetailModal**: Modal de detalle de llamadas integrado

## Base de Datos
- **Supabase**: `analysisSupabase` (glsmifhkoaifvaegsozd.supabase.co)
- **Tabla principal**: `prospectos`
- **Tabla llamadas**: `llamadas_ventas`
- **Tabla chat**: `uchat_conversations` (supabaseSystemUI)

## Funcionalidades
- Data grid con 23+ prospectos reales
- Filtros por etapa, score, campaña origen
- Sorting dinámico en columnas
- Sidebar con información completa del prospecto
- Historial de llamadas por prospecto
- Modal de detalle de llamada con transcripción y audio
- Navegación a Live Chat si hay conversación activa
- Navegación a Análisis IA desde historial

## Dependencias
- **Framer Motion**: Animaciones elegantes
- **Lucide React**: Iconos vectoriales
- **Chart.js**: Gráfica radar en modal de llamadas
- **analysisSupabase**: Conexión a base de datos
- **supabaseSystemUI**: Verificación de chats activos

## Permisos
- Admin: Acceso completo
- Developer: Acceso completo
- Otros roles: Sin acceso

## Navegación
- **A Live Chat**: Click botón chat verde en sidebar
- **A Análisis IA**: Click llamada en historial
- **Desde otros módulos**: Botón "Prospectos" en sidebar
