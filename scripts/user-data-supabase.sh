#!/bin/bash
# User data script para instalar Supabase según documentación oficial
# Se ejecuta automáticamente al iniciar la instancia EC2

set -e

# Log everything
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=== Iniciando instalación de Supabase (método oficial) ==="
echo "Fecha: $(date)"

# 1. Actualizar sistema
echo "1. Actualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# 2. Instalar dependencias
echo "2. Instalando dependencias..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip

# 3. Instalar Docker
echo "3. Instalando Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Agregar usuario ubuntu a grupo docker
usermod -aG docker ubuntu

# 4. Instalar Docker Compose
echo "4. Instalando Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# 5. Clonar repositorio oficial de Supabase
echo "5. Clonando repositorio oficial de Supabase..."
cd /home/ubuntu
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# 6. Configurar .env
echo "6. Configurando variables de entorno..."
cp .env.example .env

# Generar keys seguras
ANON_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
SERVICE_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Actualizar .env con valores seguros
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|g" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=$ANON_KEY|g" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_KEY|g" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env

# 7. Iniciar Supabase
echo "7. Iniciando Supabase con Docker Compose..."
cd /home/ubuntu/supabase/docker
docker-compose up -d

# 8. Esperar a que los servicios estén listos
echo "8. Esperando a que los servicios estén listos..."
sleep 30

# 9. Verificar estado
echo "9. Verificando estado de servicios..."
docker-compose ps

# 10. Guardar información importante
echo "10. Guardando información de configuración..."
cat > /home/ubuntu/supabase-info.txt <<EOF
=== Información de Supabase ===
Fecha instalación: $(date)

Variables de entorno importantes:
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_KEY
JWT_SECRET=$JWT_SECRET

URLs:
- Studio: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000
- API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000

Comandos útiles:
- Ver logs: docker-compose logs -f
- Ver estado: docker-compose ps
- Reiniciar: docker-compose restart
- Detener: docker-compose down
- Actualizar: docker-compose pull && docker-compose up -d
EOF

chmod 600 /home/ubuntu/supabase-info.txt

echo ""
echo "=== Instalación completada ==="
echo "Supabase Studio disponible en: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo ""
echo "Información guardada en: /home/ubuntu/supabase-info.txt"
echo "Para ver las keys: cat /home/ubuntu/supabase-info.txt"










