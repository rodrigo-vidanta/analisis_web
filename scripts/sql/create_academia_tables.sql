-- ============================================
-- ACADEMIA GAMIFICADA - ESTRUCTURA BASE DE DATOS
-- ============================================

-- TABLA: academia_niveles
-- Definición de todos los niveles disponibles
CREATE TABLE IF NOT EXISTS academia_niveles (
    id SERIAL PRIMARY KEY,
    nivel_numero INTEGER NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    xp_requerido INTEGER DEFAULT 0,
    es_activo BOOLEAN DEFAULT true,
    orden_display INTEGER,
    icono_url VARCHAR(255),
    color_tema VARCHAR(20) DEFAULT 'indigo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: academia_actividades
-- Tipos de actividades disponibles en cada nivel
CREATE TABLE IF NOT EXISTS academia_actividades (
    id SERIAL PRIMARY KEY,
    nivel_id INTEGER REFERENCES academia_niveles(id) ON DELETE CASCADE,
    tipo_actividad VARCHAR(50) NOT NULL, -- 'llamada_virtual', 'quiz', 'juego', 'repaso'
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden_actividad INTEGER NOT NULL,
    xp_otorgado INTEGER DEFAULT 10,
    es_obligatoria BOOLEAN DEFAULT true,
    configuracion JSONB, -- Configuración específica por tipo de actividad
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: academia_asistentes_virtuales
-- Configuración de los asistentes de VAPI para llamadas virtuales
CREATE TABLE IF NOT EXISTS academia_asistentes_virtuales (
    id SERIAL PRIMARY KEY,
    actividad_id INTEGER REFERENCES academia_actividades(id) ON DELETE CASCADE,
    assistant_id VARCHAR(100) NOT NULL, -- ID del asistente en VAPI
    nombre_cliente VARCHAR(100) NOT NULL,
    personalidad TEXT NOT NULL,
    dificultad INTEGER DEFAULT 1 CHECK (dificultad >= 1 AND dificultad <= 5),
    objetivos_venta TEXT[], -- Array de objetivos que debe cumplir el vendedor
    objeciones_comunes TEXT[], -- Objeciones que presenta este cliente
    avatar_url VARCHAR(255),
    es_activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: academia_progreso_usuario
-- Progreso individual de cada usuario
CREATE TABLE IF NOT EXISTS academia_progreso_usuario (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    nivel_actual INTEGER REFERENCES academia_niveles(id),
    xp_total INTEGER DEFAULT 0,
    racha_dias INTEGER DEFAULT 0,
    ultima_actividad TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    es_activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email)
);

-- TABLA: academia_actividades_completadas
-- Registro de actividades completadas por usuario
CREATE TABLE IF NOT EXISTS academia_actividades_completadas (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    actividad_id INTEGER REFERENCES academia_actividades(id) ON DELETE CASCADE,
    puntuacion DECIMAL(5,2), -- Puntuación obtenida (0-100)
    xp_ganado INTEGER DEFAULT 0,
    tiempo_completado INTEGER, -- Tiempo en segundos
    intentos INTEGER DEFAULT 1,
    datos_sesion JSONB, -- Datos específicos de la sesión (transcripción, respuestas, etc.)
    completada_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: academia_logros
-- Definición de logros/badges disponibles
CREATE TABLE IF NOT EXISTS academia_logros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono_url VARCHAR(255),
    condicion_tipo VARCHAR(50) NOT NULL, -- 'xp_total', 'racha_dias', 'nivel_completado', 'actividades_seguidas'
    condicion_valor INTEGER NOT NULL,
    xp_bonus INTEGER DEFAULT 0,
    es_secreto BOOLEAN DEFAULT false,
    color_badge VARCHAR(20) DEFAULT 'gold',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA: academia_logros_usuario
-- Logros obtenidos por cada usuario
CREATE TABLE IF NOT EXISTS academia_logros_usuario (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    logro_id INTEGER REFERENCES academia_logros(id) ON DELETE CASCADE,
    obtenido_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_email, logro_id)
);

-- TABLA: academia_llamadas_virtuales
-- Registro de llamadas virtuales realizadas
CREATE TABLE IF NOT EXISTS academia_llamadas_virtuales (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    actividad_id INTEGER REFERENCES academia_actividades(id) ON DELETE CASCADE,
    assistant_id VARCHAR(100) NOT NULL,
    call_id VARCHAR(100), -- ID de la llamada en VAPI
    duracion_segundos INTEGER,
    transcripcion_completa TEXT,
    objetivos_cumplidos TEXT[],
    objeciones_manejadas TEXT[],
    puntuacion_final DECIMAL(5,2),
    feedback_ia TEXT, -- Feedback generado por IA
    areas_mejora TEXT[],
    iniciada_at TIMESTAMP WITH TIME ZONE,
    finalizada_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_academia_progreso_email ON academia_progreso_usuario(user_email);
CREATE INDEX IF NOT EXISTS idx_academia_actividades_nivel ON academia_actividades(nivel_id);
CREATE INDEX IF NOT EXISTS idx_academia_completadas_user ON academia_actividades_completadas(user_email);
CREATE INDEX IF NOT EXISTS idx_academia_logros_user ON academia_logros_usuario(user_email);
CREATE INDEX IF NOT EXISTS idx_academia_llamadas_user ON academia_llamadas_virtuales(user_email);

-- ============================================
-- DATOS INICIALES - PRIMEROS 3 NIVELES
-- ============================================

-- NIVEL 1: FUNDAMENTOS DE VIDANTA
INSERT INTO academia_niveles (nivel_numero, nombre, descripcion, xp_requerido, orden_display, icono_url, color_tema) 
VALUES (1, 'Fundamentos de Vidanta', 'Aprende los conceptos básicos sobre Vidanta y sus resorts', 0, 1, '/icons/foundation.svg', 'blue')
ON CONFLICT (nivel_numero) DO NOTHING;

-- NIVEL 2: TÉCNICAS DE CONEXIÓN
INSERT INTO academia_niveles (nivel_numero, nombre, descripcion, xp_requerido, orden_display, icono_url, color_tema) 
VALUES (2, 'Técnicas de Conexión', 'Domina el arte de conectar emocionalmente con el cliente', 100, 2, '/icons/connection.svg', 'emerald')
ON CONFLICT (nivel_numero) DO NOTHING;

-- NIVEL 3: PRESENTACIÓN DE BENEFICIOS
INSERT INTO academia_niveles (nivel_numero, nombre, descripcion, xp_requerido, orden_display, icono_url, color_tema) 
VALUES (3, 'Presentación de Beneficios', 'Aprende a presentar los beneficios de manera persuasiva', 250, 3, '/icons/presentation.svg', 'purple')
ON CONFLICT (nivel_numero) DO NOTHING;

-- ============================================
-- LOGROS INICIALES
-- ============================================

INSERT INTO academia_logros (nombre, descripcion, icono_url, condicion_tipo, condicion_valor, xp_bonus, color_badge) VALUES
('Primer Paso', 'Completa tu primera actividad en la Academia', '/icons/first-step.svg', 'actividades_seguidas', 1, 10, 'bronze'),
('Estudiante Dedicado', 'Alcanza 100 XP en total', '/icons/dedicated.svg', 'xp_total', 100, 25, 'silver'),
('Racha de Fuego', 'Mantén una racha de 3 días consecutivos', '/icons/fire-streak.svg', 'racha_dias', 3, 30, 'orange'),
('Maestro del Nivel 1', 'Completa todos los ejercicios del Nivel 1', '/icons/master-level.svg', 'nivel_completado', 1, 50, 'gold'),
('Llamada Perfecta', 'Obtén 90+ puntos en una llamada virtual', '/icons/perfect-call.svg', 'puntuacion_alta', 90, 40, 'diamond')
ON CONFLICT DO NOTHING;

SELECT 'Academia - Estructura de base de datos creada exitosamente' AS resultado;
