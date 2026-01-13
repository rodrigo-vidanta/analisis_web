-- Script para migrar auth_login_logs en lotes
-- Este script debe ejecutarse manualmente usando los MCPs
-- Migra en lotes de 500 registros manejando foreign keys

-- LOTE 1: Registros 1-500
-- (Ejecutar usando MCP SystemUI para obtener datos y MCP PQNC_AI para insertar)

-- LOTE 2: Registros 501-1000  
-- (Ejecutar usando MCP SystemUI para obtener datos y MCP PQNC_AI para insertar)

-- LOTE 3: Registros 1001-1500
-- (Ejecutar usando MCP SystemUI para obtener datos y MCP PQNC_AI para insertar)

-- LOTE 4: Registros 1501-1529
-- (Ejecutar usando MCP SystemUI para obtener datos y MCP PQNC_AI para insertar)

-- NOTA: Este script es solo una guía. La migración real se hace usando los MCPs
-- directamente sin mostrar datos en el contexto.
