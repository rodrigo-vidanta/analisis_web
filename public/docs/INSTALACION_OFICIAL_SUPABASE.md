# Instalación Oficial de Supabase en AWS

## Método: Docker Compose según Documentación Oficial

### Referencias
- Documentación oficial: https://supabase.com/docs/guides/self-hosting/docker
- Repositorio: https://github.com/supabase/supabase

## Plan de Instalación

### 1. Infraestructura EC2

#### Requisitos
- **AMI**: Ubuntu 22.04 LTS
- **Instance Type**: t3.medium o superior (mínimo 4GB RAM)
- **Storage**: 20GB mínimo
- **Security Group**: 
  - HTTP (80) desde 0.0.0.0/0
  - HTTPS (443) desde 0.0.0.0/0
  - SSH (22) desde IP específica
  - PostgreSQL (5432) solo desde VPC
  - Custom ports según servicios Supabase

### 2. Instalación de Dependencias

```bash
# Actualizar sistema
sudo apt-get update -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario a grupo docker
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar para aplicar cambios
sudo reboot
```

### 3. Clonar y Configurar Supabase

```bash
# Clonar repositorio oficial
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con configuración apropiada
nano .env
```

### 4. Configuración de Variables de Entorno

Variables críticas según documentación oficial:

```env
# Database
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=postgres

# API Keys
API_ANON_KEY=your_anon_key
API_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=3600

# URLs
SUPABASE_URL=http://your-domain.com
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Studio
STUDIO_PG_META_URL=http://meta:8080
```

### 5. Iniciar Supabase

```bash
# Iniciar todos los servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 6. Configuración de AWS

#### ALB (Application Load Balancer)
- **Target Type**: Instance
- **Target**: EC2 instance (puerto 3000 para Studio)
- **Health Check**: HTTP GET /api/health
- **Listener HTTP**: Puerto 80
- **Listener HTTPS**: Puerto 443 (con certificado ACM)

#### Route 53
- Crear registro A o CNAME apuntando al ALB
- Configurar validación DNS para certificado SSL

### 7. Verificación

```bash
# Verificar servicios
docker-compose ps

# Verificar logs
docker-compose logs studio
docker-compose logs meta
docker-compose logs postgrest

# Probar acceso
curl http://localhost:3000
```

## Ventajas del Método Oficial

1. ✅ **Sigue documentación oficial** - Sin adaptaciones
2. ✅ **Red Docker compartida** - Los servicios se comunican por nombre
3. ✅ **Configuración simple** - Un solo archivo docker-compose.yml
4. ✅ **Fácil mantenimiento** - Actualización con `docker-compose pull && docker-compose up -d`
5. ✅ **Compatible** - Funciona exactamente como en documentación

## Próximos Pasos

1. Crear instancia EC2
2. Instalar Docker y Docker Compose
3. Clonar y configurar Supabase
4. Configurar ALB apuntando a EC2
5. Configurar HTTPS con certificado ACM
6. Verificar funcionamiento completo




