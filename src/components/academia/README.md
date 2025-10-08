# 🎓 Módulo Academia

## Descripción
Sistema de capacitación y academia para vendedores y desarrolladores.

## Componentes
- **AcademiaDashboard.tsx**: Dashboard principal de academia
- **AcademiaLayout.tsx**: Layout específico de academia

## Base de Datos
- **Supabase**: Conexión según configuración
- **Tabla cursos**: `courses` (si aplica)
- **Tabla progreso**: `user_progress` (si aplica)

## Funcionalidades
- Dashboard de cursos
- Progreso de capacitación
- Recursos de aprendizaje
- Evaluaciones

## Dependencias
- **academiaService**: Servicio de academia
- **Supabase**: Base de datos

## Permisos
- **Vendedor**: Acceso completo
- **Developer**: Acceso completo
- **Otros roles**: Sin acceso

## Integración
- **Sistema de usuarios**: Progreso por usuario
- **AuthContext**: Autenticación