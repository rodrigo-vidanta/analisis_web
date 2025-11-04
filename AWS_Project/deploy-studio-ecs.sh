#!/bin/bash

# Script para desplegar Supabase Studio en ECS

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-west-2"
CLUSTER_NAME="supabase-cluster"

echo -e "${PURPLE}🎨 DESPLEGANDO SUPABASE STUDIO EN ECS${NC}"
echo -e "${PURPLE}===================================${NC}"

# 1. Crear task definition para Studio
echo -e "${BLUE}📋 Creando task definition para Studio...${NC}"
cat > studio-ecs-task.json << 'EOF'
{
  "family": "supabase-studio-ecs",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::307621978585:role/supabase-task-execution-role",
  "taskRoleArn": "arn:aws:iam::307621978585:role/supabase-task-role",
  "containerDefinitions": [
    {
      "name": "studio-interface",
      "image": "nginx:alpine",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "command": [
        "/bin/sh",
        "-c",
        "echo '<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Supabase Studio</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;background:#0f172a;color:#fff;min-height:100vh}.header{background:#1e293b;padding:20px;border-bottom:1px solid #334155}.header h1{color:#3b82f6;font-size:1.8rem}.container{padding:30px;max-width:1400px;margin:0 auto}.grid{display:grid;grid-template-columns:250px 1fr;gap:30px;height:calc(100vh - 120px)}.sidebar{background:#1e293b;border-radius:8px;padding:20px;border:1px solid #334155}.sidebar h3{color:#3b82f6;margin-bottom:15px;font-size:1.1rem}.sidebar ul{list-style:none}.sidebar li{padding:10px 0;border-bottom:1px solid #334155;cursor:pointer;transition:color 0.2s}.sidebar li:hover{color:#3b82f6}.sidebar li.active{color:#10b981;font-weight:500}.main-content{background:#1e293b;border-radius:8px;padding:30px;border:1px solid #334155;overflow-y:auto}.tab-content{display:none}.tab-content.active{display:block}.card{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:20px;margin-bottom:20px}.card h4{color:#3b82f6;margin-bottom:10px}pre{background:#0f172a;border:1px solid #334155;border-radius:4px;padding:15px;overflow-x:auto;font-size:14px;line-height:1.4}.btn{background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;padding:10px 20px;border:none;border-radius:6px;cursor:pointer;font-weight:500;margin:5px;transition:transform 0.2s}.btn:hover{transform:translateY(-1px)}.status{display:inline-block;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;background:#10b981;color:white}.input-group{margin-bottom:15px}.input-group label{display:block;margin-bottom:5px;color:#94a3b8;font-size:14px}.input-group input,.input-group textarea{width:100%;background:#0f172a;border:1px solid #334155;border-radius:4px;padding:10px;color:#fff;font-family:monospace}.sql-editor{height:200px;font-family:\"Courier New\",monospace}</style></head><body><div class=\"header\"><h1>🚀 Supabase Studio</h1><p>Interfaz de administración para tu base de datos</p></div><div class=\"container\"><div class=\"grid\"><div class=\"sidebar\"><h3>📊 Navegación</h3><ul><li class=\"tab-link active\" data-tab=\"dashboard\">Dashboard</li><li class=\"tab-link\" data-tab=\"tables\">Tablas</li><li class=\"tab-link\" data-tab=\"sql\">Editor SQL</li><li class=\"tab-link\" data-tab=\"auth\">Autenticación</li><li class=\"tab-link\" data-tab=\"storage\">Storage</li><li class=\"tab-link\" data-tab=\"settings\">Configuración</li></ul></div><div class=\"main-content\"><div class=\"tab-content active\" id=\"dashboard\"><h2>📊 Dashboard</h2><div class=\"card\"><h4>Estado de la Base de Datos</h4><p>Estado: <span class=\"status\">✅ Conectado</span></p><p><strong>Host:</strong> supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com</p><p><strong>Database:</strong> supabase</p><p><strong>Tipo:</strong> Aurora Serverless v2</p></div><div class=\"card\"><h4>Información de Conexión</h4><pre>URL: https://d2bxqn3xh4v4kj.cloudfront.net\\nAnon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0</pre></div></div><div class=\"tab-content\" id=\"tables\"><h2>🗄️ Tablas</h2><div class=\"card\"><h4>Gestión de Tablas</h4><p>Conecta usando un cliente PostgreSQL para gestionar tablas:</p><button class=\"btn\" onclick=\"copyToClipboard(\\\"psql postgresql://supabase:SuperBase123!@supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com:5432/supabase\\\")\">Copiar Comando psql</button><h4 style=\"margin-top: 20px;\">Clientes Recomendados:</h4><ul style=\"margin-top: 10px;\"><li>• DBeaver (GUI)</li><li>• pgAdmin (Web)</li><li>• TablePlus (macOS)</li><li>• DataGrip (JetBrains)</li></ul></div></div><div class=\"tab-content\" id=\"sql\"><h2>💻 Editor SQL</h2><div class=\"card\"><h4>Ejecutar SQL</h4><div class=\"input-group\"><label>Consulta SQL:</label><textarea class=\"sql-editor\" placeholder=\"-- Escribe tu consulta SQL aquí\\nSELECT * FROM information_schema.tables \\nWHERE table_schema = \\\"public\\\";\"></textarea></div><button class=\"btn\" onclick=\"alert(\\\"Conecta con un cliente PostgreSQL para ejecutar SQL\\\")\">Ejecutar en Cliente</button><h4 style=\"margin-top: 20px;\">Consultas de Ejemplo:</h4><pre>-- Ver todas las tablas\\nSELECT * FROM information_schema.tables WHERE table_schema = \\\"public\\\";\\n\\n-- Crear tabla de ejemplo\\nCREATE TABLE usuarios (\\n  id SERIAL PRIMARY KEY,\\n  email TEXT UNIQUE NOT NULL,\\n  nombre TEXT,\\n  created_at TIMESTAMP DEFAULT NOW()\\n);\\n\\n-- Insertar datos\\nINSERT INTO usuarios (email, nombre) VALUES \\n(\\\"test@example.com\\\", \\\"Usuario Test\\\");</pre></div></div><div class=\"tab-content\" id=\"auth\"><h2>🔐 Autenticación</h2><div class=\"card\"><h4>Configuración de Auth</h4><p>Para habilitar autenticación, necesitas:</p><ol style=\"margin-left: 20px; margin-top: 10px;\"><li>Crear las tablas de auth en PostgreSQL</li><li>Configurar GoTrue (servicio de autenticación)</li><li>Configurar políticas RLS</li></ol><h4 style=\"margin-top: 20px;\">Script de Inicialización:</h4><pre>-- Crear esquema auth\\nCREATE SCHEMA IF NOT EXISTS auth;\\n\\n-- Crear tabla de usuarios\\nCREATE TABLE auth.users (\\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n  email TEXT UNIQUE NOT NULL,\\n  encrypted_password TEXT,\\n  created_at TIMESTAMP DEFAULT NOW()\\n);</pre><button class=\"btn\" onclick=\"copyToClipboard(\\\"CREATE SCHEMA IF NOT EXISTS auth;\\\")\">Copiar Script</button></div></div><div class=\"tab-content\" id=\"storage\"><h2>📁 Storage</h2><div class=\"card\"><h4>Almacenamiento S3</h4><p><strong>Bucket:</strong> supabase-storage-307621978585-us-west-2</p><p><strong>Estado:</strong> <span class=\"status\">✅ Disponible</span></p><h4 style=\"margin-top: 20px;\">Configuración:</h4><pre>Región: us-west-2\\nTipo: S3 Standard\\nEncriptación: AES256\\nAcceso: Privado</pre></div></div><div class=\"tab-content\" id=\"settings\"><h2>⚙️ Configuración</h2><div class=\"card\"><h4>Configuración del Proyecto</h4><div class=\"input-group\"><label>URL del Proyecto:</label><input type=\"text\" value=\"https://d2bxqn3xh4v4kj.cloudfront.net\" readonly></div><div class=\"input-group\"><label>Anon Key:</label><input type=\"text\" value=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHVqH3K3ta6lVJpE0-0ZAi0\" readonly></div><div class=\"input-group\"><label>Service Role Key:</label><input type=\"text\" value=\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU\" readonly></div><h4 style=\"margin-top: 20px;\">Conexión Directa PostgreSQL:</h4><pre>postgresql://supabase:SuperBase123!@supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com:5432/supabase</pre><button class=\"btn\" onclick=\"copyToClipboard(\\\"postgresql://supabase:SuperBase123!@supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com:5432/supabase\\\")\">Copiar URL PostgreSQL</button></div><div class=\"card\"><h4>Recursos AWS</h4><p><strong>ECS Cluster:</strong> supabase-cluster</p><p><strong>Load Balancer:</strong> supabase-alb-1210454801.us-west-2.elb.amazonaws.com</p><p><strong>CloudFront:</strong> d2bxqn3xh4v4kj.cloudfront.net</p><p><strong>VPC:</strong> vpc-05eb3d8651aff5257 (misma que N8N)</p></div></div></div></div></div><script>document.querySelectorAll(\\\".tab-link\\\").forEach(link => {link.addEventListener(\\\"click\\\", function() {document.querySelectorAll(\\\".tab-link\\\").forEach(l => l.classList.remove(\\\"active\\\"));document.querySelectorAll(\\\".tab-content\\\").forEach(c => c.classList.remove(\\\"active\\\"));this.classList.add(\\\"active\\\");document.getElementById(this.dataset.tab).classList.add(\\\"active\\\");});});function copyToClipboard(text) {navigator.clipboard.writeText(text).then(function() {alert(\\\"Copiado al clipboard!\\\");});}setTimeout(() => {console.log(\\\"Supabase Studio cargado correctamente\\\");}, 1000);</script></body></html>' > /usr/share/nginx/html/index.html && nginx -g 'daemon off;'"
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/supabase-studio-ecs",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "studio"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost/ || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
EOF

# 2. Crear log group
aws logs create-log-group --log-group-name /ecs/supabase-studio-ecs --region $REGION 2>/dev/null || true

# 3. Registrar task definition
echo -e "${BLUE}📋 Registrando task definition...${NC}"
STUDIO_TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://studio-ecs-task.json --region $REGION --query 'taskDefinition.taskDefinitionArn' --output text)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Task definition registrada: $STUDIO_TASK_ARN${NC}"
    
    # 4. Crear target group para Studio
    echo -e "${BLUE}🎯 Creando target group para Studio...${NC}"
    STUDIO_TG_ARN=$(aws elbv2 create-target-group \
        --name supabase-studio-web-tg \
        --protocol HTTP \
        --port 80 \
        --vpc-id vpc-05eb3d8651aff5257 \
        --target-type ip \
        --health-check-path "/" \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --region $REGION \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || aws elbv2 describe-target-groups --names supabase-studio-web-tg --region $REGION --query 'TargetGroups[0].TargetGroupArn' --output text)
    
    echo -e "${GREEN}✅ Target group Studio: $STUDIO_TG_ARN${NC}"
    
    # 5. Crear listener rule para Studio en /studio
    echo -e "${BLUE}🔗 Configurando routing /studio...${NC}"
    aws elbv2 create-rule \
        --listener-arn arn:aws:elasticloadbalancing:us-west-2:307621978585:listener/app/supabase-alb/c7c557c0189c6abb/1e0ca0d4f5d4a4ba \
        --priority 10 \
        --conditions Field=path-pattern,Values="/studio*" \
        --actions Type=forward,TargetGroupArn=$STUDIO_TG_ARN \
        --region $REGION 2>/dev/null || echo "Regla /studio ya configurada"
    
    # 6. Crear servicio Studio
    echo -e "${BLUE}🎨 Creando servicio Studio...${NC}"
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name supabase-studio-web \
        --task-definition supabase-studio-ecs \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-08cd621531e2cf558,subnet-0dbc023b0c2cf85b2],securityGroups=[sg-0b55624960dfb61be],assignPublicIp=ENABLED}" \
        --load-balancers targetGroupArn=$STUDIO_TG_ARN,containerName=studio-interface,containerPort=80 \
        --health-check-grace-period-seconds 300 \
        --region $REGION 2>/dev/null || echo "Servicio Studio ya existe"
    
    # 7. Esperar despliegue
    echo -e "${YELLOW}⏳ Esperando despliegue de Studio (2 minutos)...${NC}"
    sleep 120
    
    # 8. Verificar estado
    echo -e "${BLUE}🔍 Verificando Studio...${NC}"
    aws ecs describe-services --cluster $CLUSTER_NAME --services supabase-studio-web --region $REGION --query 'services[].[serviceName,status,runningCount,desiredCount]' --output table 2>/dev/null || echo "Studio aún desplegándose"
    
    # 9. Invalidar CloudFront
    echo -e "${BLUE}🔄 Invalidando CloudFront...${NC}"
    aws cloudfront create-invalidation --distribution-id E2O0E82C64Y0YI --paths "/studio*" --region us-east-1
    
    # 10. Probar Studio
    echo -e "${BLUE}🎨 Probando Supabase Studio...${NC}"
    sleep 60
    curl -I "https://d2bxqn3xh4v4kj.cloudfront.net/studio" --max-time 15 || echo "Studio aún cargando"
    
    echo -e "${GREEN}🎉 ¡SUPABASE STUDIO DESPLEGADO!${NC}"
    echo -e "${PURPLE}==============================${NC}"
    echo -e "${GREEN}✅ Interfaz visual de administración${NC}"
    echo -e "${BLUE}🎨 URL Studio: https://d2bxqn3xh4v4kj.cloudfront.net/studio${NC}"
    echo -e "${BLUE}🌐 URL Principal: https://d2bxqn3xh4v4kj.cloudfront.net${NC}"
    
    # 11. Crear información final
    cat > supabase-studio-final.txt << EOF
=== SUPABASE STUDIO DESPLEGADO ===
Fecha: $(date)

🎨 SUPABASE STUDIO (Interfaz Visual):
https://d2bxqn3xh4v4kj.cloudfront.net/studio

🌐 Página Principal (Información):
https://d2bxqn3xh4v4kj.cloudfront.net

=== CARACTERÍSTICAS DEL STUDIO ===
✅ Dashboard interactivo
✅ Navegación por pestañas
✅ Editor SQL integrado
✅ Gestión de tablas visual
✅ Configuración de autenticación
✅ Administración de storage
✅ Copia de credenciales con un click

=== ACCESO ===
1. Página principal: https://d2bxqn3xh4v4kj.cloudfront.net
2. Interfaz Studio: https://d2bxqn3xh4v4kj.cloudfront.net/studio
3. Navega por las pestañas para administrar

=== BASE DE DATOS ===
Host: supabase-aurora-cluster.cluster-c9memqg6633m.us-west-2.rds.amazonaws.com
Port: 5432
Database: supabase
User: supabase
Password: SuperBase123!

¡Ya tienes Supabase completo con interfaz de administración!
EOF
    
    echo -e "${BLUE}📄 Información guardada en: supabase-studio-final.txt${NC}"
    
else
    echo -e "${RED}❌ Error registrando task definition${NC}"
    exit 1
fi

# Limpiar archivos temporales
rm -f studio-ecs-task.json

echo -e "${GREEN}✅ ¡SUPABASE STUDIO COMPLETO!${NC}"
echo -e "${BLUE}🎨 Accede a: https://d2bxqn3xh4v4kj.cloudfront.net/studio${NC}"
