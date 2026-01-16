# Análisis de Exposición Pública de n8n

**Fecha:** 16 de Enero 2026  
**Estado:** ⚠️ n8n APAGADO (desired-count: 0)

---

## 🔍 Problema Identificado

El servicio n8n estaba expuesto públicamente a través de un **Application Load Balancer (ALB)** con acceso desde internet.

---

## 📋 Componentes que Exponen n8n

### 1. Application Load Balancer (ALB)

| Propiedad | Valor |
|-----------|-------|
| **Nombre** | `n8n-alb` |
| **DNS** | `n8n-alb-226231228.us-west-2.elb.amazonaws.com` |
| **Scheme** | `internet-facing` ⚠️ **PÚBLICO** |
| **Security Group** | `sg-0b55624960dfb61be` |

### 2. Listeners del ALB

| Puerto | Protocolo | Acción | Estado |
|--------|-----------|--------|--------|
| **80** | HTTP | Forward to Target Group | ⚠️ **PÚBLICO** |
| **443** | HTTPS | Forward to Target Group | ⚠️ **PÚBLICO** |
| **5678** | HTTP | Forward to Target Group | ⚠️ **PÚBLICO** |

### 3. Security Group del ALB (`sg-0b55624960dfb61be`)

| Puerto | Protocolo | Origen | Estado |
|--------|-----------|--------|--------|
| **80** | TCP | `0.0.0.0/0` | ⚠️ **ABIERTO A INTERNET** |
| **3000** | TCP | `0.0.0.0/0` | ⚠️ **ABIERTO A INTERNET** |
| **5678** | TCP | `10.0.0.0/16` (VPC) + 2 IPs VAPI | ✅ Restringido |
| **8080** | TCP | `10.0.0.0/16` (VPC) | ✅ Solo VPC |

---

## ✅ Acción Tomada

**Servicio n8n APAGADO:**

```bash
aws ecs update-service \
  --cluster n8n-production \
  --service n8n-service \
  --desired-count 0 \
  --region us-west-2
```

**Estado Actual:**
- ✅ `desiredCount`: 0
- ✅ `runningCount`: 0 (se está deteniendo)
- ⚠️ ALB sigue activo pero sin tareas detrás

---

## 🔒 Opciones para Restringir Acceso (Cuando se Necesite)

### Opción 1: Cambiar ALB a Internal (Recomendado)

```bash
# Crear nuevo ALB interno
aws elbv2 create-load-balancer \
  --name n8n-alb-internal \
  --scheme internal \
  --type application \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --region us-west-2

# Actualizar servicio ECS para usar nuevo ALB
```

**Ventajas:**
- Solo accesible desde dentro de la VPC
- Más seguro
- Requiere VPN/Bastion para acceso

### Opción 2: Restringir Security Group del ALB

```bash
# Eliminar reglas públicas
aws ec2 revoke-security-group-ingress \
  --group-id sg-0b55624960dfb61be \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-west-2

aws ec2 revoke-security-group-ingress \
  --group-id sg-0b55624960dfb61be \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --region us-west-2

# Agregar solo IPs permitidas
aws ec2 authorize-security-group-ingress \
  --group-id sg-0b55624960dfb61be \
  --protocol tcp \
  --port 80 \
  --cidr TU_IP/32 \
  --region us-west-2
```

**Ventajas:**
- Mantiene ALB público pero restringido
- Fácil de implementar
- Permite acceso desde IPs específicas

### Opción 3: Usar AWS WAF (Como Frontend)

```bash
# Crear Web ACL para n8n
aws wafv2 create-web-acl \
  --scope REGIONAL \
  --name n8n-ip-restriction \
  --default-action Allow={} \
  --rules file://n8n-waf-rules.json \
  --region us-west-2

# Asociar con ALB
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:... \
  --resource-arn arn:aws:elasticloadbalancing:... \
  --region us-west-2
```

**Ventajas:**
- Control granular de acceso
- Logs de intentos de acceso
- Reglas avanzadas (rate limiting, geoblocking)

### Opción 4: Eliminar Listeners Públicos

```bash
# Eliminar listeners 80 y 443
aws elbv2 delete-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --region us-west-2
```

**Ventajas:**
- Solo mantiene puerto 5678 (si está restringido)
- Más simple

---

## 📊 Estado Actual del Servicio

| Componente | Estado | Acceso |
|------------|--------|--------|
| **ECS Service** | ⚠️ Apagado (0 tareas) | N/A |
| **ALB** | ✅ Activo | ⚠️ Público |
| **Security Group** | ⚠️ Abierto (puertos 80, 3000) | ⚠️ Internet |
| **DNS** | ✅ Activo | ⚠️ Público |

---

## 🚨 Recomendaciones

1. **Inmediato:**
   - ✅ Servicio apagado (completado)
   - ⚠️ Considerar eliminar listeners públicos del ALB

2. **Corto Plazo:**
   - Implementar restricción de IPs en Security Group
   - O cambiar ALB a `internal`

3. **Largo Plazo:**
   - Implementar AWS WAF para control granular
   - Considerar VPN/Bastion para acceso administrativo
   - Implementar autenticación adicional (n8n auth)

---

## 📝 Notas

- El ALB sigue activo pero sin tareas detrás, por lo que no hay servicio disponible
- El costo del ALB continúa (~$16-20/mes) aunque no haya tráfico
- Para reactivar: escalar servicio a `desired-count: 1` o más
- Para restringir acceso: implementar una de las opciones arriba

---

---

## ✅ Migración a ALB Interno Completada

**Fecha:** 16 de Enero 2026

### Cambios Realizados

1. ✅ **Nuevo ALB INTERNAL creado**
   - Nombre: `n8n-alb-internal`
   - DNS: `internal-n8n-alb-internal-1927483133.us-west-2.elb.amazonaws.com`
   - Scheme: `internal` (solo accesible desde VPC)

2. ✅ **Listeners migrados**
   - Puerto 80 (HTTP)
   - Puerto 443 (HTTPS)
   - Puerto 5678 (HTTP - n8n)

3. ✅ **ALB público eliminado**
   - Nombre: `n8n-alb` (ELIMINADO)
   - Ya no está expuesto públicamente

### Estado Actual

| Componente | Estado | Acceso |
|------------|--------|--------|
| **ALB** | ✅ `n8n-alb-internal` (INTERNAL) | Solo VPC |
| **ECS Service** | ⚠️ Apagado (0 tareas) | N/A |
| **Target Group** | ✅ Activo | Conectado al ALB interno |
| **Security Group** | ✅ Activo | Restringido a VPC |

### Acceso al Servicio

Para acceder a n8n ahora necesitas:
- ✅ Estar dentro de la VPC (`vpc-05eb3d8651aff5257`)
- ✅ O usar VPN/Bastion host
- ✅ O desde otra instancia EC2 en la misma VPC

**DNS Interno:** `internal-n8n-alb-internal-1927483133.us-west-2.elb.amazonaws.com`

---

**Última actualización:** 16 de Enero 2026
