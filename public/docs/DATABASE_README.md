# 🗄️ Estructura de Base de Datos PQNC - Documentación Técnica

**Fecha:** 2025-01-24  
**Versión:** 1.0  
**Base de datos:** hmmfuhqgvsehkizlfzga.supabase.co  
**Esquema:** public

---

## 📊 **Resumen Ejecutivo**

La base de datos PQNC contiene **5 tablas principales** organizadas en dos grupos funcionales:

1. **Sistema de Autenticación** (4 tablas): Usuarios, roles, sesiones y configuración
2. **Análisis de Llamadas** (2 tablas): Registros de llamadas y segmentos de transcripción

---

## 🏢 **TABLA: `calls`** (Tabla Principal de Análisis)

### **Propósito**
Almacena los registros completos de llamadas analizadas con métricas de calidad, datos de cliente y evaluaciones de performance.

### **Estructura de Columnas**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del registro (PK) |
| `verint_id` | STRING | ID del sistema Verint |
| `crm_id` | STRING | ID del CRM |
| `tsw_id` | STRING | ID del sistema TSW (nullable) |
| `agent_id` | STRING | ID del agente |
| `agent_name` | STRING | Nombre del agente |
| `customer_name` | STRING | Nombre del cliente |
| `phone_numbers` | STRING | Números telefónicos |
| `call_type` | STRING | Tipo de llamada (ej: "primer_contacto") |
| `call_result` | STRING | Resultado (ej: "abandonada", "seguimiento_programado") |
| `requires_followup` | BOOLEAN | Si requiere seguimiento |
| `customer_quality` | STRING | Calidad del cliente (nullable) |
| `start_time` | TIMESTAMP | Hora de inicio |
| `end_time` | TIMESTAMP | Hora de fin |
| `duration` | STRING | Duración (formato HH:MM:SS) |
| `quality_score` | NUMBER | Puntuación de calidad (0-100) |
| `call_summary` | STRING | Resumen de la llamada |
| `summary_embedding` | STRING | Vector embedding del resumen |
| `organization` | STRING | Organización (ej: "COBACA") |
| `direction` | STRING | Dirección ("Inbound"/"Outbound") |
| `audio_file_name` | STRING | Nombre del archivo de audio |
| `audio_file_url` | STRING | URL del archivo de audio |
| `schema_version` | STRING | Versión del esquema (ej: "v1.0") |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

### **Campos JSONB Complejos**

#### `comunicacion_data` (JSONB)
```json
{
  "patrones": {
    "tonos_cliente": ["neutral"],
    "tipos_discovery": [],
    "tecnicas_rapport": ["escucha_activa"],
    "temas_personales": [],
    "tipos_objeciones": []
  },
  "metricas_chunks": {
    "conteo_etapas": {
      "saludo_presentacion": 1
    }
  },
  "rapport_metricas": {
    "empatia": 0,
    "escucha_activa": 1,
    "personalizacion": 0,
    "score_ponderado": 22,
    "diversidad_tecnicas": 1,
    "tecnicas_utilizadas": 1,
    "efectividad_promedio": 40
  },
  "metricas_derivadas": {
    "diversidad_rapport": 13,
    "diversidad_discovery": 0,
    "presencia_objeciones": false,
    "complejidad_interaccion": 7
  }
}
```

#### `customer_data` (JSONB)
```json
{
  "perfil": {
    "ocupacion": "",
    "estadoCivil": "",
    "experiencia": {
      "destinosPrevios": [],
      "hotelesAcostumbra": []
    },
    "composicionGrupo": {
      "total": null,
      "adultos": null,
      "menores": []
    },
    "nivelSocioeconomico": ""
  },
  "contacto": {
    "edad": null,
    "cotitular": "",
    "nombreCompleto": "Nombre Cliente",
    "numeroTelefono": {
      "numero": "",
      "formatoEstandar": false
    },
    "fechaNacimiento": "",
    "correoElectronico": ""
  }
}
```

#### `service_offered` (JSONB)
```json
{
  "estadia": {
    "fechas": {
      "fin": "",
      "inicio": "",
      "abierta": false
    },
    "resort": "",
    "destino": "",
    "duracion": {
      "dias": null,
      "noches": null
    },
    "tipo_habitacion": ""
  }
}
```

#### `agent_performance` (JSONB)
```json
{
  "score_ponderado": 7,
  "datos_originales": {
    "nombreAgente": "Agente",
    "proactividad": {
      "justificacion": "...",
      "confianzaEvaluacion": "baja",
      "anticipacionNecesidades": false,
      "ofrecimientoAlternativas": false
    },
    "escuchaActiva": { /* ... */ },
    "cierreEfectivo": { /* ... */ },
    "amabilidadYTono": { /* ... */ },
    "manejoInformacion": { /* ... */ }
  },
  "areas_performance": {
    "fortalezas": [],
    "debilidades": ["proactividad", "escuchaActiva"]
  },
  "metricas_calculadas": {
    "proactividad_score": 0,
    "escuchaActiva_score": 0,
    "cierreEfectivo_score": 0,
    "amabilidadYTono_score": 67,
    "manejoInformacion_score": 0
  }
}
```

#### `script_analysis` (JSONB)
```json
{
  "etapas": {
    "cierre": {
      "realizado": false,
      "justificacion": "...",
      "procesamiento": false
    },
    "discovery": { /* ... */ },
    "motivoLlamada": { /* ... */ },
    "debateObjeciones": { /* ... */ },
    "presentacionCostos": { /* ... */ },
    "saludoYPresentacion": { /* ... */ },
    "introduccionProducto": { /* ... */ }
  },
  "metricas_script": {
    "etapas": {
      "total": 7,
      "completadas": 1,
      "porcentaje_completitud": 14
    },
    "calidad_etapas": { /* scores por etapa */ },
    "calidad_promedio": 0,
    "factor_entrenamiento": 4
  }
}
```

#### `call_evaluation` (JSONB)
```json
{
  "FODA": {
    "amenazas": [],
    "fortalezas": ["El agente saluda de manera cordial"],
    "debilidades": ["No se desarrolla ninguna etapa posterior"],
    "oportunidades": ["Mejorar la identificación completa"]
  },
  "metricas_foda": {
    "balance_foda": 67,
    "amenazas_count": 0,
    "fortalezas_count": 1,
    "debilidades_count": 1,
    "oportunidades_count": 1
  },
  "analisisGeneral": {
    "descripcion": "...",
    "puntosClave": ["...", "..."]
  },
  "objeciones_resumen": {
    "total": 0,
    "superadas": 0,
    "no_superadas": 0,
    "tasa_superacion": 100,
    "tipos_distintos": 0,
    "momento_primera_objecion": null
  },
  "problemasDetectados": [
    {
      "tipo": "omision_importante",
      "impacto": "Medio",
      "elemento": "identificacionCompleta",
      "descripcion": "...",
      "recomendacion": "...",
      "segmentoEvidencia": "..."
    }
  ]
}
```

#### `compliance_data` (JSONB)
```json
{
  "elementosObligatorios": {
    "tour": {
      "mencionado": false,
      "textoExacto": "",
      "duracionMencionada": false,
      "mencionAmbosConyuges": false
    },
    "checkInOut": { /* ... */ },
    "impuestoHotelero": { /* ... */ },
    "descripcionHabitacion": { /* ... */ }
  },
  "metricas_cumplimiento": {
    "riesgo_normativo": "alto",
    "elementos_requeridos": 4,
    "elementos_mencionados": 0,
    "porcentaje_cumplimiento": 0
  }
}
```

---

## 📝 **TABLA: `call_segments`** (Segmentos de Transcripción)

### **Propósito**
Almacena los segmentos individuales de las transcripciones con análisis detallado por fragmento.

### **Estructura de Columnas**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del segmento (PK) |
| `call_id` | UUID | ID de la llamada (FK → calls.id) |
| `segment_index` | NUMBER | Índice del segmento en la transcripción |
| `text` | STRING | Texto del segmento (diálogo completo) |
| `context_text` | STRING | Contexto y análisis del segmento |
| `embedding` | STRING | Vector embedding del segmento |
| `etapa_script` | STRING | Etapa del script (ej: "presentacion_costos") |
| `elementos_obligatorios` | JSONB | Elementos obligatorios mencionados |
| `tipos_discovery` | JSONB | Tipos de discovery realizados |
| `tipos_objeciones` | JSONB | Tipos de objeciones (nullable) |
| `tecnicas_cierre` | JSONB | Técnicas de cierre (nullable) |
| `tecnicas_persuasion` | JSONB | Técnicas de persuasión utilizadas |
| `tono_cliente` | STRING | Tono del cliente (ej: "interesado") |
| `tono_agente` | STRING | Tono del agente (ej: "informativo") |
| `temas_personales` | JSONB | Temas personales tratados |
| `tecnicas_rapport` | JSONB | Técnicas de rapport utilizadas |
| `efectividad_rapport` | NUMBER | Efectividad del rapport (1-5) |
| `training_quality` | NUMBER | Calidad para entrenamiento (0-100) |
| `importance_score` | NUMBER | Puntuación de importancia (0-100) |
| `quality_score` | NUMBER | Puntuación de calidad del segmento (0-100) |
| `metadata` | JSONB | Metadatos adicionales del procesamiento |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

### **Ejemplo de `metadata` (JSONB)**
```json
{
  "word_count": 324,
  "text_length": 1973,
  "intervenciones": ["cliente", "agente", "cliente", "agente"],
  "recuento_palabras": 328,
  "scores_base_sin_ajuste": {
    "quality_score": 18,
    "importance_score": 25,
    "training_quality": 0
  },
  "factores_ajuste_aplicados": {
    "etapa_script": "presentacion_costos",
    "factor_etapa": 1.1,
    "factor_total": 1.21,
    "factor_resultado": 1.1,
    "resultado_llamada": "seguimiento_programado"
  },
  "bonificaciones_por_categoria": {
    "cumplimiento": 17,
    "tecnicasVenta": 15,
    "aspectosFormales": 11,
    "manejoObjeciones": 0,
    "discoveryComunciacion": 0
  }
}
```

---

## 🔐 **SISTEMA DE AUTENTICACIÓN**

### **TABLA: `auth_users`**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del usuario (PK) |
| `email` | STRING | Email único |
| `password_hash` | STRING | Hash de la contraseña |
| `first_name` | STRING | Nombre |
| `last_name` | STRING | Apellido |
| `full_name` | STRING | Nombre completo |
| `phone` | STRING | Teléfono |
| `department` | STRING | Departamento |
| `position` | STRING | Posición |
| `organization` | STRING | Organización |
| `role_id` | UUID | ID del rol (FK → auth_roles.id) |
| `is_active` | BOOLEAN | Usuario activo |
| `email_verified` | BOOLEAN | Email verificado |
| `last_login` | TIMESTAMP | Último login |
| `failed_login_attempts` | NUMBER | Intentos fallidos |
| `locked_until` | TIMESTAMP | Bloqueado hasta |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

### **TABLA: `auth_roles`**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del rol (PK) |
| `name` | STRING | Nombre del rol (admin, developer, evaluator) |
| `display_name` | STRING | Nombre para mostrar |
| `description` | STRING | Descripción del rol |
| `created_at` | TIMESTAMP | Fecha de creación |

### **TABLA: `auth_sessions`**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único de la sesión (PK) |
| `user_id` | UUID | ID del usuario (FK → auth_users.id) |
| `session_token` | STRING | Token único de sesión |
| `expires_at` | TIMESTAMP | Fecha de expiración |
| `ip_address` | STRING | Dirección IP |
| `user_agent` | STRING | User agent |
| `created_at` | TIMESTAMP | Fecha de creación |
| `last_activity` | TIMESTAMP | Última actividad |

### **TABLA: `system_config`**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único (PK) |
| `config_key` | STRING | Clave de configuración |
| `config_value` | JSONB | Valor de configuración |
| `config_type` | STRING | Tipo de configuración |
| `display_name` | STRING | Nombre para mostrar |
| `description` | STRING | Descripción |
| `is_active` | BOOLEAN | Configuración activa |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |
| `created_by` | UUID | Creado por usuario |
| `updated_by` | UUID | Actualizado por usuario |

### **TABLA: `user_avatars`**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único (PK) |
| `user_id` | UUID | ID del usuario (FK → auth_users.id) |
| `avatar_url` | STRING | URL del avatar |
| `original_filename` | STRING | Nombre original del archivo |
| `file_size` | NUMBER | Tamaño del archivo |
| `mime_type` | STRING | Tipo MIME |
| `uploaded_at` | TIMESTAMP | Fecha de subida |
| `updated_at` | TIMESTAMP | Fecha de actualización |

---

## 🔗 **Relaciones Principales**

```
auth_users
├── auth_roles (N:1) → role_id
├── auth_sessions (1:N) → user_id
├── user_avatars (1:N) → user_id
└── system_config (1:N) → created_by, updated_by

calls
└── call_segments (1:N) → call_id
```

---

## 📈 **Métricas y Estadísticas**

### **Tipos de Llamadas Comunes**
- `primer_contacto`
- `seguimiento`
- `cierre`

### **Resultados de Llamadas**
- `abandonada`
- `seguimiento_programado`
- `venta_concretada`
- `no_interesado`

### **Etapas de Script**
- `saludo_presentacion`
- `motivoLlamada`
- `discovery`
- `introduccionProducto`
- `presentacion_costos`
- `debateObjeciones`
- `cierre`

### **Rangos de Quality Score**
- **Excelente**: 80-100
- **Bueno**: 60-79
- **Regular**: 40-59
- **Deficiente**: 20-39
- **Muy Deficiente**: 0-19

---

## 🔧 **Funciones RPC Disponibles**

### **Autenticación**
- `authenticate_user(email, password)` → Validar credenciales
- `create_user_with_role(...)` → Crear usuario con rol
- `update_user_info(...)` → Actualizar información de usuario
- `get_user_permissions(user_id)` → Obtener permisos de usuario

### **Configuración**
- `update_system_config(key, value, user_id)` → Actualizar configuración
- `configure_evaluator_analysis_permissions(...)` → Configurar permisos de análisis
- `get_evaluator_analysis_config(user_id)` → Obtener configuración de evaluador

### **Avatares**
- `upload_user_avatar(user_id, url, filename, size, type)` → Subir avatar

---

## 🚀 **Optimizaciones Implementadas**

### **Índices**
- `calls.verint_id` (UNIQUE)
- `calls.crm_id`
- `calls.agent_name`
- `calls.start_time`
- `calls.quality_score`
- `call_segments.call_id`
- `call_segments.segment_index`
- `auth_users.email` (UNIQUE)
- `auth_sessions.session_token` (UNIQUE)

### **Embeddings**
- Vector embeddings para búsqueda semántica
- Almacenados como STRING en formato array
- Utilizados para análisis de similitud

---

## 📝 **Notas Técnicas**

### **Formato de Timestamps**
- Todos en UTC con zona horaria: `2025-07-21T18:49:30.7+00:00`

### **Formato de Duración**
- String en formato HH:MM:SS: `"00:44:32"`

### **Archivos de Audio**
- Almacenados en Google Cloud Storage
- URL formato: `gs://verintpqnc/exports/audio/...`

### **Organización**
- Multi-tenant por campo `organization`
- Principales: "COBACA", "GRUPO_VIDANTA"

---

**📊 Total de Registros Estimados:**
- `calls`: ~500K+ registros
- `call_segments`: ~5M+ registros
- `auth_users`: ~50 usuarios
- `auth_sessions`: ~200 sesiones activas

---

*Documento generado automáticamente el 2025-01-24*  
*Versión: 1.0*
