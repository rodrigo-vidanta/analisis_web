-- Script para crear tablas necesarias para el wizard de agentes
-- Base de datos: rnhejbuubpbnojalljso.supabase.co (Base Principal)

-- Tabla para variables del sistema
CREATE TABLE IF NOT EXISTS system_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variable_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  variable_code TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para números telefónicos
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_id VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  description VARCHAR(255) NOT NULL,
  country_code VARCHAR(5) DEFAULT '+1',
  is_active BOOLEAN DEFAULT true,
  created_by_user UUID, -- Para futura integración con usuarios
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para pasos del wizard
CREATE TABLE IF NOT EXISTS agent_wizard_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_data JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para borradores de agentes
CREATE TABLE IF NOT EXISTS agent_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- Para futura integración con usuarios
  draft_name VARCHAR(255) NOT NULL,
  base_template_id UUID REFERENCES agent_templates(id),
  wizard_data JSONB NOT NULL,
  generated_json JSONB,
  status VARCHAR(50) DEFAULT 'draft', -- draft, completed, generated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar variable de fecha por defecto
INSERT INTO system_variables (variable_name, display_name, variable_code, description, category) VALUES
(
  'fecha_completa',
  'Fecha completa',
  '{{(() => {
  const fecha = new Date();
  const dias = [''Domingo'', ''Lunes'', ''Martes'', ''Miércoles'', ''Jueves'', ''Viernes'', ''Sábado''];
  const meses = [''enero'', ''febrero'', ''marzo'', ''abril'', ''mayo'', ''junio'', ''julio'', ''agosto'', ''septiembre'', ''octubre'', ''noviembre'', ''diciembre''];
  
  // Convertir a hora Nueva York (ET: GMT-5 normal, GMT-4 en verano)
  // Usando toLocaleString para manejar automáticamente el horario de verano
  const nyTime = new Date(fecha.toLocaleString(""en-US"", {timeZone: ""America/New_York""}));
  
  const diaSemana = dias[nyTime.getDay()];
  const dia = nyTime.getDate();
  const mes = meses[nyTime.getMonth()];
  const año = nyTime.getFullYear();
  const hora = nyTime.getHours();
  const minutos = nyTime.getMinutes();
  
  // Convertir hora a 12 horas
  const hora12 = hora === 0 ? 12 : hora > 12 ? hora - 12 : hora;
  const ampm = hora >= 12 ? ''PM'' : ''AM'';
  const minutosFormateados = minutos < 10 ? ''0'' + minutos : minutos;
  
  return `${diaSemana} ${dia} de ${mes} del dos mil veinticinco y son las ${hora12}:${minutosFormateados} ${ampm} (Hora Nueva York)`;
})()}}',
  'Variable que devuelve la fecha y hora actual en formato legible en español, hora de Nueva York',
  'datetime'
) ON CONFLICT (variable_name) DO NOTHING;

-- Insertar algunos números telefónicos de ejemplo
INSERT INTO phone_numbers (phone_id, phone_number, description, country_code) VALUES
('+1234567890', '+1 (234) 567-8900', 'Número principal de ventas', '+1'),
('+1987654321', '+1 (987) 654-3210', 'Número de soporte técnico', '+1'),
('+1555123456', '+1 (555) 123-4567', 'Número de atención al cliente', '+1')
ON CONFLICT (phone_id) DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_system_variables_active ON system_variables(is_active);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_active ON phone_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_wizard_steps_template ON agent_wizard_steps(agent_template_id);
CREATE INDEX IF NOT EXISTS idx_agent_drafts_user ON agent_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_drafts_status ON agent_drafts(status);
