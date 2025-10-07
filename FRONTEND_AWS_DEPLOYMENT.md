# 🚀 Frontend AWS Deployment Guide

## 📋 Infraestructura Desplegada

### 🌐 URLs del Frontend

#### ✅ **Producción (Recomendado)**
```
https://d3m6zgat40u0u1.cloudfront.net
```
- **CDN Global** con CloudFront
- **HTTPS** habilitado automáticamente
- **Sin problemas CORS** con AWS APIs
- **Cache optimizado** para rendimiento
- **Disponibilidad global**

#### 🔧 **S3 Directo (Desarrollo)**
```
http://pqnc-qa-ai-frontend.s3-website.us-west-2.amazonaws.com
```
- **Acceso directo** a S3
- **HTTP** únicamente
- **Región específica** (us-west-2)

## 🏗️ Arquitectura Desplegada

### 📦 **S3 Bucket**
- **Nombre**: `pqnc-qa-ai-frontend`
- **Región**: `us-west-2`
- **Tipo**: Static Website Hosting
- **Política**: Acceso público para lectura
- **Index**: `index.html`
- **Error**: `index.html` (SPA routing)

### 🌍 **CloudFront Distribution**
- **ID**: `E19ZID7TVR08JG`
- **Domain**: `d3m6zgat40u0u1.cloudfront.net`
- **Origin**: S3 bucket
- **Cache**: Optimizado para SPA
- **HTTPS**: Habilitado automáticamente
- **Compresión**: Gzip habilitado

## ⚡ Ventajas del Despliegue AWS

### 🔧 **Problemas Resueltos**
- ✅ **Sin errores CORS** - Frontend y APIs en AWS
- ✅ **Rendimiento optimizado** - CDN global
- ✅ **Escalabilidad automática** - S3 + CloudFront
- ✅ **HTTPS gratuito** - Certificados AWS
- ✅ **Alta disponibilidad** - Multi-región

### 📊 **Consolas AWS Funcionales**
- ✅ **Consola AWS** - Gestión básica sin CORS
- ✅ **Consola Avanzada** - Terminal CLI completo
- ✅ **Monitoreo** - Métricas en tiempo real
- ✅ **Logs integrados** - CloudWatch accesible

## 🎛️ Scripts de Gestión

### 🚀 **Despliegue Inicial**
```bash
./deploy-frontend-aws.sh
```

### 🔄 **Actualización**
```bash
./update-frontend.sh
```

### 📋 **Comandos Manuales**

#### **Build y Deploy**
```bash
# 1. Build
npm run build

# 2. Upload a S3
aws s3 sync dist/ s3://pqnc-qa-ai-frontend --region us-west-2 --delete

# 3. Invalidar CloudFront
aws cloudfront create-invalidation --distribution-id E19ZID7TVR08JG --paths "/*"
```

## 🔗 Servicios AWS Integrados

### 🎯 **Backend Services (Accesibles desde Frontend)**
- **n8n**: `http://n8n-alb-226231228.us-west-2.elb.amazonaws.com`
- **RDS PostgreSQL**: `n8n-postgres.c9memqg6633m.us-west-2.rds.amazonaws.com:5432`
- **ElastiCache Redis**: `n8n-redis-001/002`

### 🛡️ **Seguridad**
- **CORS**: Resuelto al estar en AWS
- **HTTPS**: Habilitado automáticamente
- **IAM**: Credenciales configuradas
- **VPC**: Red privada para backend

## 📊 Costos Estimados

### 💰 **Mensual**
- **S3**: ~$5-15 (storage + requests)
- **CloudFront**: ~$10-30 (data transfer)
- **Total Frontend**: ~$15-45/mes

### 🎯 **Optimizaciones**
- **Compresión Gzip** habilitada
- **Cache TTL** optimizado
- **Edge locations** globales
- **Origin Shield** disponible

## 🔧 Configuración Técnica

### 📁 **Estructura S3**
```
s3://pqnc-qa-ai-frontend/
├── index.html
├── assets/
│   ├── index-[hash].css
│   ├── index-[hash].js
│   └── vendor-[hash].js
├── vite.svg
└── audio-processor.js
```

### 🌐 **CloudFront Settings**
- **Price Class**: 100 (US, Canada, Europe)
- **HTTP Version**: HTTP/2
- **IPv6**: Habilitado
- **Compression**: Gzip automático
- **Error Pages**: SPA routing configurado

## 🚀 Acceso a las Consolas AWS

### 📱 **URL Principal**
```
https://d3m6zgat40u0u1.cloudfront.net
```

### 🎛️ **Funcionalidades Disponibles**
1. **AWS Manager** → **Consola AWS**
   - Gestión de ECS, RDS, ElastiCache
   - IPs públicas/privadas visibles
   - Acciones en tiempo real

2. **AWS Manager** → **Consola Avanzada**
   - Terminal CLI integrado
   - Variables de entorno editables
   - Logs de runtime y deployment
   - Configuración granular

3. **AWS Manager** → **Monitoreo**
   - Métricas en tiempo real
   - Gráficos históricos
   - Alertas automáticas

## 🎯 Verificación de Funcionamiento

### ✅ **Checklist Post-Despliegue**
- [ ] Frontend accesible vía CloudFront
- [ ] Consola AWS sin errores CORS
- [ ] ECS service visible (n8n-service)
- [ ] RDS y ElastiCache listados
- [ ] Logs funcionando
- [ ] Acciones ejecutables

### 🔍 **Troubleshooting**
- **CloudFront lento**: Esperar 10-15 minutos
- **Cache issues**: Usar invalidación
- **CORS errors**: Usar CloudFront, no S3 directo

## 📞 **Información del Proyecto**
- **Proyecto**: PQNC QA AI Platform
- **Región**: us-west-2 (Oregon)
- **Account**: 307621978585
- **Optimizado para**: VAPI integration (<50ms latency)
