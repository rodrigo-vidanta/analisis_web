# 🚀 PQNC AI Platform v2.0.4

## 📋 **Descripción**

Plataforma integral de IA para análisis de llamadas y entrenamiento de vendedores, con sistema gamificado tipo Duolingo y interfaz dual intercambiable.

## ✨ **Funcionalidades Principales**

### 🎓 **Academia de Ventas Gamificada**
- **Sistema tipo Duolingo** para entrenamiento de vendedores
- **Llamadas virtuales** con asistentes de IA (VAPI)
- **3 niveles progresivos** con actividades diversificadas
- **Sistema XP/Logros** con badges y ranking competitivo
- **Panel administrativo** para gestión de contenido

### 📊 **Live Monitor Kanban**
- **Vista Kanban** con 5 checkpoints de venta
- **Monitoreo en tiempo real** de llamadas activas
- **Controles de llamada** (transferir, colgar)
- **Feedback obligatorio** para todas las acciones

### 🎨 **Sistema Dual de UIs**
- **UI Corporativa**: Diseño homologado con efectos elegantes
- **UI Linear**: Diseño minimalista estilo Linear.app
- **Intercambio dinámico** desde panel de administración

### 🔧 **Análisis Avanzado**
- **Natalia IA**: Análisis automático de llamadas
- **PQNC Humans**: Análisis manual especializado
- **Métricas detalladas** y reportes personalizados

## 🛠️ **Tecnologías**

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** para styling responsive
- **Vite** para desarrollo rápido
- **Zustand** para manejo de estado

### Backend & Servicios
- **Supabase** para base de datos y autenticación
- **VAPI** para llamadas virtuales con IA
- **PostgreSQL** como base de datos principal
- **Railway** para webhooks y proxy

### Librerías Especializadas
- **@vapi-ai/web**: SDK para llamadas virtuales
- **lucide-react**: Iconos vectoriales modernos
- **tone.js**: Procesamiento de audio avanzado

## 🚀 **Instalación y Configuración**

### 1. Clonar Repositorio
```bash
git clone https://github.com/rodrigo-vidanta/analisis_web.git
cd analisis_web
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```env
# Supabase Principal
VITE_MAIN_SUPABASE_URL=your_main_supabase_url
VITE_MAIN_SUPABASE_ANON_KEY=your_main_anon_key

# Supabase PQNC
VITE_PQNC_SUPABASE_URL=your_pqnc_supabase_url
VITE_PQNC_SUPABASE_ANON_KEY=your_pqnc_anon_key

# VAPI Configuration
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
```

### 4. Configurar Base de Datos
```bash
# Ejecutar migraciones en orden
psql -d your_db < scripts/sql/create_academia_tables.sql
psql -d your_db < scripts/sql/populate_academia_initial_data.sql
psql -d your_db < scripts/sql/cleanup_and_setup_themes.sql
```

### 5. Iniciar Desarrollo
```bash
npm run dev
```

## 📱 **Uso de la Plataforma**

### 🎓 **Academia de Ventas**
1. **Accede** al módulo Academia desde el sidebar
2. **Explora niveles** disponibles en el dashboard
3. **Completa actividades**: Llamadas, quiz, juegos, repaso
4. **Gana XP y logros** por cada actividad completada
5. **Compite** en el ranking con otros vendedores

### 📊 **Live Monitor**
1. **Accede** al Live Monitor (permisos requeridos)
2. **Monitorea llamadas** en tiempo real por checkpoints
3. **Usa controles** de transferencia y colgar
4. **Proporciona feedback** obligatorio para cada llamada

### ⚙️ **Administración**
1. **Gestiona usuarios** y permisos
2. **Configura temas** de la aplicación
3. **Administra Academia**: Asistentes virtuales y niveles
4. **Monitorea sistema** y configuraciones

## 🎨 **Temas Disponibles**

### 🏢 **Tema Corporativo**
- Paleta homologada con colores indigo elegantes
- Efectos sutiles: shimmer, glow, gradientes
- Iconos vectorizados modernos
- Animaciones fluidas y profesionales

### ⚡ **Tema Linear**
- Diseño minimalista estilo Linear.app
- Colores de contraste sobrios
- Micro-interacciones suaves
- Layout completamente diferente

## 📊 **Estructura del Proyecto**

```
src/
├── components/
│   ├── academia/           # Módulo Academia completo
│   ├── analysis/           # Live Monitor y análisis
│   ├── admin/              # Panel administrativo
│   ├── linear/             # Componentes UI Linear
│   └── ...
├── services/
│   ├── academiaService.ts  # Servicio Academia
│   ├── authService.ts      # Autenticación
│   └── ...
├── hooks/
│   ├── useTheme.ts         # Gestión de temas
│   ├── useUserProfile.ts   # Perfil de usuario
│   └── ...
└── config/
    ├── supabase.ts         # Configuración Supabase
    └── ...
```

## 🔐 **Roles y Permisos**

- **Admin**: Acceso completo a todos los módulos
- **Developer**: Constructor, Agent Studio, Plantillas
- **Evaluator**: Análisis, Live Monitor (con permisos específicos)
- **User**: Academia (disponible para todos)

## 🎯 **Roadmap**

### v2.1.0 - Mejoras Academia
- Constructor visual de niveles
- Editor avanzado de asistentes virtuales
- Análitica detallada de rendimiento

### v2.2.0 - Funcionalidades Avanzadas  
- Modo multijugador/competitivo
- Integración con CRM
- Notificaciones push

## 📞 **Soporte**

Para soporte técnico o preguntas:
- **Email**: soporte@pqnc.ai
- **Documentación**: Ver archivos en `/src/components/academia/README.md`

---

**🎓 PQNC AI Platform v2.0.4** - Plataforma integral de IA para análisis y entrenamiento

## 📂 **Proyectos Relacionados**

### 🧠 **Clever Ideas AI Platform**
- **Ubicación**: `/Users/darigsamuelrosalesrobledo/Documents/clever-ideas-ai-platform/`
- **Módulos**: Agent Studio + Análisis AI únicamente
- **Cliente**: Clever Ideas (versión simplificada)
- **Estado**: Independiente, no conectado a git