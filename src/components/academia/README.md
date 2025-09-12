# 🎓 Academia de Ventas - Módulo Gamificado

## Descripción General

La **Academia de Ventas** es un módulo completamente gamificado diseñado como un "Duolingo para vendedores". Permite a los usuarios progresar a través de diferentes niveles de venta, desbloqueando logros y mejorando sus habilidades mediante llamadas virtuales con clientes de IA.

## 🚀 Características Principales

### ✅ Sistema de Niveles Progresivos
- **Nivel 1**: Fundamentos de Vidanta
- **Nivel 2**: Técnicas de Conexión
- **Nivel 3**: Presentación de Beneficios
- Cada nivel requiere XP específico para desbloquearse
- Progresión lineal con prerrequisitos

### ✅ Actividades Diversificadas
1. **📞 Llamadas Virtuales**: Interacción con clientes de IA usando VAPI
2. **❓ Quiz Interactivos**: Evaluaciones con timer y explicaciones
3. **🎮 Juegos**: Mini-juegos para practicar habilidades específicas
4. **📖 Repaso**: Material de estudio y casos reales

### ✅ Llamadas Virtuales con IA
- **20 Asistentes Virtuales** únicos con personalidades diferentes
- Integración completa con **VAPI Web SDK**
- Dificultad progresiva (1-5 estrellas)
- Objetivos específicos por llamada
- Feedback automático post-llamada
- Transcripción y análisis en tiempo real

### ✅ Sistema de Gamificación
- **XP (Puntos de Experiencia)**: Ganados por completar actividades
- **Logros/Badges**: Desbloqueables por diferentes condiciones
- **Racha de Días**: Motivación para uso diario
- **Leaderboard**: Competencia sana entre usuarios
- **Progreso Visual**: Barras de progreso y estadísticas

### ✅ Panel de Administración
- Gestión de Asistentes Virtuales (CRUD)
- Constructor de Niveles (en desarrollo)
- Gestión de Actividades (en desarrollo)
- Análitica de Rendimiento (en desarrollo)

## 🎨 Integración UI Dual

### Tema Corporativo
- Colores homologados: Indigo elegante + grises refinados
- Efectos sutiles: Shimmer, glow, gradientes
- Iconos vectorizados modernos
- Animaciones fluidas

### Tema Linear
- Diseño minimalista estilo Linear.app
- Colores de contraste sobrios
- Efectos micro-interacciones
- Layout completamente diferente

## 📊 Arquitectura Técnica

### Frontend (React + TypeScript)
```
src/components/academia/
├── AcademiaLayout.tsx          # Layout principal con navegación
├── AcademiaDashboard.tsx       # Dashboard principal con niveles
├── LevelView.tsx               # Vista individual de nivel
├── VirtualCallComponent.tsx    # Componente de llamadas VAPI
├── QuizComponent.tsx           # Sistema de quiz interactivo
├── AchievementsView.tsx        # Vista de logros y badges
├── AcademiaAdminPanel.tsx      # Panel administrativo
└── README.md                   # Esta documentación
```

### Backend (Supabase + PostgreSQL)
```sql
-- Tablas principales
academia_niveles                 # Definición de niveles
academia_actividades            # Actividades por nivel
academia_asistentes_virtuales   # Configuración de IAs
academia_progreso_usuario       # Progreso individual
academia_actividades_completadas # Historial de completadas
academia_logros                 # Definición de logros
academia_logros_usuario         # Logros obtenidos
academia_llamadas_virtuales     # Sesiones de llamadas
```

### Servicios
```typescript
// academiaService.ts - Servicio principal
- getLevels()                   # Obtener niveles
- getActivitiesByLevel()        # Actividades por nivel
- getUserProgress()             # Progreso del usuario
- completeActivity()            # Completar actividad
- saveVirtualCallSession()      # Guardar sesión de llamada
- checkAndUnlockAchievements()  # Verificar logros
- getLeaderboard()              # Ranking de usuarios
```

## 🔧 Configuración e Instalación

### 1. Dependencias Requeridas
```bash
npm install @vapi-ai/web  # SDK para llamadas virtuales
```

### 2. Variables de Entorno
```env
# VAPI Configuration
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_WEBHOOK_URL=https://your-webhook.com/vapi
```

### 3. Base de Datos
```bash
# Ejecutar scripts SQL en orden:
psql -d your_db < scripts/sql/create_academia_tables.sql
psql -d your_db < scripts/sql/populate_academia_initial_data.sql
```

### 4. Configuración VAPI
1. Crear asistentes en VAPI Dashboard
2. Configurar Assistant IDs en el panel admin
3. Establecer webhooks para callbacks

## 🎯 Flujo de Usuario

### 1. Dashboard Principal
- Vista general de progreso
- Próxima actividad sugerida
- Estadísticas de racha y XP
- Logros recientes

### 2. Selección de Nivel
- Cards visuales con progreso
- Indicadores de desbloqueado/bloqueado
- Información de XP requerido

### 3. Actividades del Nivel
- Lista de actividades disponibles
- Tipos: Llamada Virtual, Quiz, Juego, Repaso
- Puntos XP por actividad

### 4. Llamada Virtual
- Pantalla de preparación con info del cliente
- Llamada en tiempo real con VAPI
- Transcript en vivo
- Pantalla de resultados con feedback

### 5. Progresión
- XP automático al completar
- Verificación de logros desbloqueados
- Actualización de racha
- Notificaciones de progreso

## 🏆 Sistema de Logros

### Tipos de Logros
- **XP Total**: Alcanzar cierta cantidad de XP
- **Racha**: Mantener días consecutivos
- **Niveles**: Completar niveles específicos
- **Excelencia**: Obtener puntuaciones altas
- **Actividades**: Completar secuencias

### Colores de Badges
- 🥉 **Bronze**: Logros básicos
- 🥈 **Silver**: Logros intermedios  
- 🥇 **Gold**: Logros avanzados
- 💎 **Diamond**: Logros excepcionales
- 🟣 **Platinum**: Logros elite

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px - Stack vertical, navegación colapsada
- **Tablet**: 768px - 1024px - Grid 2 columnas
- **Desktop**: > 1024px - Grid completo, todas las características

### Adaptaciones Móviles
- Navegación por pestañas en lugar de sidebar
- Cards optimizadas para touch
- Modales full-screen en móvil
- Controles de llamada adaptados

## 🔮 Roadmap Futuro

### Próximas Características
- [ ] Constructor visual de niveles
- [ ] Editor de asistentes virtuales avanzado
- [ ] Análitica detallada de rendimiento
- [ ] Sistema de mentorías entre usuarios
- [ ] Integración con CRM existente
- [ ] Certificaciones oficiales
- [ ] Modo multijugador/competitivo
- [ ] IA para feedback personalizado

### Mejoras Técnicas
- [ ] Optimización de rendimiento
- [ ] Cache inteligente de progreso
- [ ] Sincronización offline
- [ ] PWA capabilities
- [ ] Notificaciones push
- [ ] Integración con calendarios

## 🤝 Contribución

### Agregar Nuevos Asistentes
1. Crear asistente en VAPI
2. Usar panel admin para configurar
3. Definir personalidad y objetivos
4. Probar con usuarios beta

### Crear Nuevos Tipos de Actividad
1. Extender interfaz `AcademiaActivity`
2. Crear componente específico
3. Integrar en `LevelView`
4. Actualizar sistema de puntuación

## 📞 Soporte

Para soporte técnico o preguntas sobre implementación, contactar al equipo de desarrollo.

---

**🎓 Academia de Ventas v1.0** - Gamificación avanzada para el crecimiento profesional
