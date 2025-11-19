#!/bin/bash

# ============================================
# SCRIPT DE MIGRACIÓN AUTOMÁTICA
# ============================================
# 
# Este script ejecuta la migración completa de usuarios y roles
# de pqnc_qa a System_UI usando el script Node.js
# 
# Uso: ./EJECUTAR_MIGRACION.sh
# ============================================

echo "🚀 Iniciando migración de usuarios y roles..."
echo ""

# Verificar que las variables de entorno estén configuradas
if [ -z "$VITE_PQNC_SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: VITE_PQNC_SUPABASE_SERVICE_KEY no está configurada"
    echo "   Configúrala con: export VITE_PQNC_SUPABASE_SERVICE_KEY='tu-service-key'"
    exit 1
fi

if [ -z "$VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY no está configurada"
    echo "   Configúrala con: export VITE_SYSTEM_UI_SUPABASE_SERVICE_KEY='tu-service-key'"
    exit 1
fi

# Cambiar al directorio del script
cd "$(dirname "$0")"

# Ejecutar el script Node.js
echo "📤 Exportando datos de pqnc_qa..."
echo "📥 Importando datos a System_UI..."
echo ""

node 04_migration_script_node.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migración completada exitosamente"
    echo ""
    echo "📋 Próximos pasos:"
    echo "   1. Verificar que todos los usuarios se migraron correctamente"
    echo "   2. Verificar que todos los roles se migraron correctamente"
    echo "   3. Actualizar el código para usar System_UI en lugar de pqncSupabase"
else
    echo ""
    echo "❌ Error durante la migración"
    echo "   Revisa los logs anteriores para más detalles"
    exit 1
fi

