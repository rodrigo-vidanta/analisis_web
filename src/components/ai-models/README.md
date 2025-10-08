# 🤖 Módulo AI Models

## Descripción
Sistema de gestión de modelos de IA incluyendo modelos de voz, generación de imágenes y repositorio.

## Componentes
- **AIModelsManager.tsx**: Gestor principal de modelos IA
- **VoiceModelsSection.tsx**: Gestión de modelos de voz
- **ImageGenerationSection.tsx**: Generación de imágenes
- **ImageRepositorySection.tsx**: Repositorio de imágenes

## Base de Datos
- **Supabase**: `supabase` (rnhejbuubpbnojalljso.supabase.co)
- **Tabla modelos**: `ai_models`
- **Tabla imágenes**: `generated_images`
- **Tabla configuración**: `model_configs`

## Funcionalidades

### Modelos de Voz
- Gestión de modelos ElevenLabs
- Configuración de voces
- Pruebas de síntesis
- Gestión de tokens

### Generación de Imágenes
- Integración con APIs de imágenes
- Generación bajo demanda
- Repositorio de imágenes generadas

## Dependencias
- **supabase**: Base de datos principal
- **elevenLabsService**: Servicio de modelos de voz
- **tokenService**: Gestión de tokens API

## Permisos
- **Admin**: Acceso completo
- **Productor**: Acceso completo
- **Developer**: Acceso completo
- **Otros roles**: Sin acceso

## Integración
- **TokenUsageIndicator**: Monitoreo de uso
- **ElevenLabs API**: Modelos de voz
- **Sistema de tokens**: Límites y uso
