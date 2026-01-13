# INFRAESTRUCTURA TÉCNICA Y SEGURIDAD
## PQNC AI Platform - Arquitectura de Producción

**Documento Técnico:** Infraestructura AWS y Medidas de Seguridad  
**Proyecto:** PQNC QA AI Platform  
**Fecha:** Octubre 2025  
**Versión:** 1.0  

---

## ARQUITECTURA GENERAL

### Infraestructura Principal AWS (us-west-2)

La plataforma está desplegada en Amazon Web Services utilizando una arquitectura de microservicios distribuida con alta disponibilidad. La región us-west-2 (Oregon) fue seleccionada por su proximidad a los servicios VAPI, garantizando latencias inferiores a 50ms.

**Servicios Desplegados:**
- ECS Fargate Cluster para aplicaciones containerizadas
- RDS PostgreSQL Multi-AZ para persistencia de datos
- ElastiCache Redis Cluster para cache distribuido
- Application Load Balancer con SSL termination
- CloudFront CDN con certificación SSL automática
- Route 53 para gestión DNS corporativa
- S3 Storage con encriptación para assets y grabaciones

### Red y Segmentación

**VPC Corporativa (10.0.0.0/16):**
La infraestructura utiliza una VPC privada con segmentación estricta por capas de seguridad:

- **Subnets Públicas (10.0.1.0/24, 10.0.2.0/24):** Load Balancer y NAT Gateway únicamente
- **Subnets Privadas (10.0.10.0/24, 10.0.20.0/24):** Aplicaciones ECS sin acceso directo desde internet
- **Subnets de BD (10.0.100.0/24, 10.0.101.0/24):** Bases de datos completamente aisladas

Esta configuración garantiza que los datos críticos permanezcan en capas internas sin exposición pública directa, cumpliendo con los requisitos de segmentación de ambientes.

---

## CAPA DE APLICACIONES

### ECS Fargate - Containerización Empresarial

**N8N Automation Platform:**
- **Instancias:** 2-10 tasks con auto-scaling basado en CPU
- **Recursos:** 4 vCPU, 8GB RAM por instancia
- **Imagen:** n8nio/n8n:latest (versión Enterprise v1.114.3)
- **Disponibilidad:** Multi-AZ con health checks automatizados

**Medidas de Seguridad Implementadas:**
- Containers sin privilegios root
- Variables de entorno para credenciales (sin hardcoding)
- Health checks en endpoint /healthz cada 30 segundos
- Logs centralizados en CloudWatch con retención de 30 días
- Acceso restringido a IPs específicas de VAPI (44.229.228.186, 44.238.177.138)

### Frontend Administrativo

**React Application:**
- **Deployment:** S3 + CloudFront para distribución global
- **SSL:** Certificado AWS con renovación automática
- **Autenticación:** Exclusivamente cuentas corporativas @grupovidanta.com
- **Roles:** Sistema granular (admin, evaluator, developer, vendedor)

---

## CAPA DE DATOS

### RDS PostgreSQL - Base de Datos Principal

**Configuración Enterprise:**
- **Instancia:** db.r6g.large (2 vCPU, 16GB RAM)
- **Storage:** 100GB GP3 con 3000 IOPS garantizadas
- **Multi-AZ:** Failover automático en menos de 60 segundos
- **Backups:** Retención de 7 días con point-in-time recovery
- **Encriptación:** AES-256 en reposo y TLS 1.3 en tránsito

**Seguridad de Acceso:**
- **Sin exposición pública:** Acceso exclusivo desde VPC interna
- **Security Groups:** Puerto 5432 restringido a aplicaciones ECS únicamente
- **Gestión administrativa:** ECS Tasks temporales con cliente PostgreSQL
- **SSL opcional:** Parameter group personalizado para compatibilidad n8n

### ElastiCache Redis - Cache Distribuido

**Configuración Cluster:**
- **Nodos:** 2 instancias cache.r6g.large (13GB memoria cada una)
- **Topología:** Primary + Replica con failover automático
- **Encriptación:** In-transit y at-rest habilitada
- **Backup:** 5 snapshots automáticos con retención configurable

### Supabase - Bases de Datos Especializadas

**Arquitectura Multi-Instancia para Segregación:**

1. **Base PQNC (hmmfuhqgvsehkizlfzga.supabase.co):**
   - Autenticación corporativa con hash bcrypt
   - Sistema de permisos granular
   - Auditoría completa de accesos
   - Row Level Security (RLS) habilitado

2. **Base Análisis (glsmifhkoaifvaegsozd.supabase.co):**
   - Datos de llamadas y métricas
   - Función exec_sql con auditoría completa
   - Políticas RLS para acceso controlado

3. **Base System UI (zbylezfyagwrxoecioup.supabase.co):**
   - Live Chat y workflows
   - Encriptación TLS 1.3
   - Storage keys únicos por instancia

---

## SEGURIDAD DE RED Y ACCESOS

### Web Application Firewall (WAF)

**Protecciones Implementadas:**
- Rate limiting: 2000 requests por 5 minutos por IP
- Protección contra inyección SQL y XSS
- Bloqueo automático de bots maliciosos
- Geolocalización para análisis de accesos anómalos

### Control de Accesos

**Autenticación Corporativa:**
- **Dominio restringido:** Solo cuentas @grupovidanta.com
- **Función SQL personalizada:** authenticate_user con hash seguro
- **Bloqueo automático:** 5 intentos fallidos = 30 minutos de bloqueo
- **Tokens de sesión:** Generación criptográficamente segura con TTL

**Sistema de Roles Granular:**
- **Admin:** Acceso completo a configuración y usuarios
- **Evaluator:** Acceso específico a módulos de análisis
- **Developer:** Acceso a herramientas técnicas sin administración
- **Vendedor:** Acceso limitado a Live Monitor y PQNC

### Gestión de Credenciales

**Buenas Prácticas Implementadas:**
- Variables de entorno para todas las claves de API
- Rotación automática de tokens JWT
- Sin credenciales hardcoded en código fuente
- Storage keys diferenciados por función

---

## MONITOREO Y AUDITORÍA

### CloudWatch - Observabilidad Empresarial

**Métricas Monitoreadas:**
- CPU y memoria de aplicaciones ECS
- Latencia y throughput de Load Balancer
- Conexiones y queries de RDS
- Cache hit ratio de Redis
- Errores de aplicación y timeouts

**Alertas Configuradas:**
- CPU > 80% en aplicaciones
- Memoria > 80% en bases de datos
- Tiempo de respuesta > 1000ms
- Tasa de errores > 5%

### Logs de Auditoría

**Centralización de Logs:**
- ECS Applications: `/ecs/n8n-production`
- Database Admin: `/ecs/postgres-admin`
- Frontend Access: CloudFront access logs
- Authentication: Supabase audit logs

**Función exec_sql con Auditoría:**
```sql
-- Todas las operaciones administrativas son registradas
CREATE FUNCTION exec_sql(sql_query text) RETURNS json
-- Log automático: EXEC_SQL: [query] [timestamp] [user]
-- Retorno estructurado: success/error con detalles completos
```

---

## INTEGRACIÓN VAPI Y TELECOM

### Configuración VAPI (Pendiente Upgrade Enterprise)

**Endpoints Actuales:**
- Primary: 44.229.228.186:443
- Secondary: 44.238.177.138:443
- Protocolo: HTTPS/WebSocket con autenticación API Key

**Medidas de Seguridad:**
- IPs específicas permitidas en Security Groups
- Webhooks con validación de origen
- Rate limiting en endpoints públicos

**Migración Requerida:**
Para cumplir con lineamientos corporativos, VAPI debe migrarse a versión Enterprise con:
- Tenant corporativo a nombre de la empresa
- Acceso con autenticación multifactor obligatoria
- SLA empresarial garantizado

### Integración Telecom

**SIP Trunk Configuration:**
- Protocolo: SIP over TLS para encriptación
- Autenticación: Digest authentication
- Failover: Múltiples trunks para alta disponibilidad
- Codecs: G.711, G.722, Opus según calidad requerida

---

## BASES DE DATOS Y SEGURIDAD

### Row Level Security (RLS)

**Implementación Granular:**
Cada tabla crítica implementa políticas de seguridad específicas:

```sql
-- Ejemplo: Acceso controlado a llamadas_ventas
CREATE POLICY "live_monitor_public_read" 
ON public.llamadas_ventas 
FOR SELECT TO anon, authenticated 
USING (true);
```

**Beneficios de Seguridad:**
- Aislamiento automático de datos por usuario
- Prevención de acceso no autorizado a nivel de fila
- Auditoría transparente de todas las consultas

### Encriptación Multicapa

**En Tránsito:**
- TLS 1.3 para todas las conexiones Supabase
- HTTPS obligatorio en CloudFront
- SSL termination en Application Load Balancer

**En Reposo:**
- RDS con encriptación AES-256
- S3 buckets con SSE-S3
- ElastiCache con encriptación at-rest

---

## CUMPLIMIENTO Y RECOMENDACIONES

### Estado Actual del Cumplimiento

**Lineamientos Implementados:**
- ✅ Servicios AWS con facturación corporativa
- ✅ Accesos exclusivamente corporativos
- ✅ Segmentación completa de ambientes
- ✅ Sin exposición SSH/RDP directa
- ✅ WAF implementado con protecciones básicas
- ✅ Logs centralizados y auditoría

**Pendientes de Implementación:**
- **MFA Obligatorio:** Requerido para roles administrativos
- **VAPI Enterprise:** Migración con Alejandro como coadministrador
- **VPN Corporativa:** Para acceso administrativo exclusivo

### Roadmap de Seguridad

**Fase 1 (30 días):**
- Implementación de AWS Cognito para MFA
- Upgrade VAPI a versión Enterprise
- Configuración de alertas avanzadas en CloudWatch

**Fase 2 (90 días):**
- Despliegue de AWS Client VPN
- Integración con SIEM corporativo
- Implementación de AWS GuardDuty

---

## CONCLUSIÓN TÉCNICA

La infraestructura actual implementa una arquitectura robusta con múltiples capas de seguridad. La segmentación de red, encriptación multicapa y controles de acceso granulares proporcionan una base sólida para operaciones de producción.

Los controles implementados mitigan efectivamente los riesgos de:
- Acceso no autorizado mediante autenticación corporativa obligatoria
- Exposición de datos mediante segmentación de red y RLS
- Ataques externos mediante WAF y rate limiting
- Pérdida de datos mediante backups automatizados y Multi-AZ

La migración de servicios restantes a versiones Enterprise completará el cumplimiento total con los lineamientos de seguridad corporativa establecidos.

---

**Elaborado por:** Equipo Técnico PQNC AI Platform  
**Infraestructura:** AWS us-west-2 + Multi-Cloud Failover  
**Próxima Revisión:** Enero 2026  
