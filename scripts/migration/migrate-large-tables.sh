#!/bin/bash

# Script para migrar tablas grandes sin saturar la ventana de contexto
# Usa pg_dump y psql para exportar/importar directamente

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de entorno (ajustar según tu configuración)
SYSTEM_UI_DB_URL="${VITE_SYSTEM_UI_SUPABASE_DB_URL:-}"
PQNC_AI_DB_URL="${VITE_PQNC_AI_SUPABASE_DB_URL:-}"

if [ -z "$SYSTEM_UI_DB_URL" ] || [ -z "$PQNC_AI_DB_URL" ]; then
    echo "Error: Variables de entorno no configuradas"
    echo "Configurar: VITE_SYSTEM_UI_SUPABASE_DB_URL y VITE_PQNC_AI_SUPABASE_DB_URL"
    exit 1
fi

# Tablas grandes a migrar (>100 registros)
LARGE_TABLES=(
    "paraphrase_logs"
    "whatsapp_conversation_labels"
    "assignment_logs"
    "prospect_assignments"
    "user_permission_groups"
)

# Tablas medianas (10-100 registros)
MEDIUM_TABLES=(
    "group_audit_log"
    "whatsapp_labels_custom"
    "timeline_activities"
    "coordinador_coordinaciones_legacy"
    "user_warning_counters"
    "user_avatars"
    "uchat_bots"
    "whatsapp_labels_preset"
    "coordinacion_statistics"
    "log_server_config"
)

# Tablas vacías (solo crear estructura)
EMPTY_TABLES=(
    "uchat_conversations"
    "uchat_messages"
    "api_tokens"
    "prospect_assignment_logs"
)

echo -e "${GREEN}=== Migración de Tablas Grandes ===${NC}"
echo ""

# Función para migrar una tabla usando pg_dump/psql
migrate_table() {
    local table_name=$1
    local source_db=$2
    local target_db=$3
    
    echo -e "${YELLOW}Migrando tabla: $table_name${NC}"
    
    # Exportar datos a CSV temporal
    local temp_file="/tmp/${table_name}_migration.csv"
    
    # Exportar desde system_ui
    psql "$source_db" -c "\COPY (SELECT * FROM $table_name) TO '$temp_file' WITH CSV HEADER" || {
        echo "Error exportando $table_name"
        return 1
    }
    
    # Importar a pqnc_ai (asumiendo que la tabla ya existe)
    psql "$target_db" -c "\COPY $table_name FROM '$temp_file' WITH CSV HEADER" || {
        echo "Error importando $table_name"
        return 1
    }
    
    # Limpiar archivo temporal
    rm -f "$temp_file"
    
    echo -e "${GREEN}✓ $table_name migrada${NC}"
}

# Migrar tablas grandes
echo -e "${GREEN}Migrando tablas grandes (>100 registros)...${NC}"
for table in "${LARGE_TABLES[@]}"; do
    migrate_table "$table" "$SYSTEM_UI_DB_URL" "$PQNC_AI_DB_URL"
done

echo ""
echo -e "${GREEN}Migración completada${NC}"
