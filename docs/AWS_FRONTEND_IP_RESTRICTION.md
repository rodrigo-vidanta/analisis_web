# 🔒 Restricción de IPs para Frontend CloudFront

**Fecha de configuración:** 16 de Diciembre, 2025  
**Última actualización:** 8 de Febrero, 2026 (Fix DefaultAction Block, cambio IP oficina, agregada DGV Oficina, renombrados labels)
**Estado:** ✅ Configurado y activo

---

## 📋 Resumen

Se ha configurado AWS WAF para restringir el acceso al frontend CloudFront solo a las siguientes IPs autorizadas:

### IPs Permitidas:

| # | IP | Descripcion |
|---|----|-------------|
| 1 | `189.203.238.35` | Vidanta PQNC |
| 2 | `187.210.107.179` | Vidanta PQNC 2 |
| 3 | `189.178.124.238` | IP del usuario 1 |
| 4 | `189.177.138.158` | IP del usuario 2 |
| 5 | `189.203.97.130` | drosales |
| 6 | `189.177.48.132` | oficinaIA |
| 7 | `187.144.87.193` | casa rodrigo |
| 8 | `189.177.141.218` | DGV Oficina |

---

## 🛡️ Configuración AWS WAF

### IP Set:
- **Nombre:** `frontend-allowed-ips`
- **ARN:** `arn:aws:wafv2:us-east-1:307621978585:global/ipset/frontend-allowed-ips/9ed33da4-fb8e-498e-baf7-ff0b672d7725`
- **Scope:** `CLOUDFRONT`
- **IPs:** 8 direcciones IPv4 (/32)

### Web ACL:
- **Nombre:** `frontend-ip-restriction`
- **ARN:** `arn:aws:wafv2:us-east-1:307621978585:global/webacl/frontend-ip-restriction/8352dae0-3029-4406-97b4-a47c00ec5e1d`
- **Scope:** `CLOUDFRONT`
- **Default Action:** `BLOCK` (bloquear todo por defecto)
- **Rules:** 
  - **Rule 1:** `allow-listed-ips`
    - **Priority:** 0
    - **Action:** `ALLOW`
    - **Condition:** IP está en el IP Set `frontend-allowed-ips`

### CloudFront Distribution:
- **Distribution ID:** `E19ZID7TVR08JG`
- **Domain:** `d3m6zgat40u0u1.cloudfront.net`
- **Custom Domain:** `ai.vidavacations.com`
- **Web ACL asociado:** ✅ `frontend-ip-restriction`

---

## 🔐 Comportamiento

### ✅ Acceso Permitido:
- Solo las IPs listadas arriba pueden acceder al frontend
- Las solicitudes desde estas IPs pasan el filtro WAF y llegan a CloudFront

### ❌ Acceso Bloqueado:
- Todas las demás IPs son bloqueadas por WAF
- Reciben un error HTTP 403 (Forbidden)
- No llegan a CloudFront ni al origen S3

---

## ⏱️ Tiempo de Propagación

- **Cambios en WAF:** Inmediatos (1-2 minutos)
- **Cambios en CloudFront:** 15-20 minutos
- **Estado actual:** ✅ Configurado y propagándose

---

## 🔧 Gestión y Mantenimiento

### Agregar una Nueva IP:

1. **Opción 1: Desde AWS Console**
   - Ir a AWS WAF > IP Sets
   - Seleccionar `frontend-allowed-ips`
   - Editar y agregar la nueva IP
   - Guardar cambios

2. **Opción 2: Desde CLI**
   ```bash
   aws wafv2 get-ip-set \
     --scope CLOUDFRONT \
     --id 9ed33da4-fb8e-498e-baf7-ff0b672d7725 \
     --name frontend-allowed-ips \
     --region us-east-1
   
   # Luego actualizar con UpdateIPSetCommand
   ```

3. **Opción 3: Usar el script**
   - Editar `scripts/aws/aws-restrict-frontend-ips.ts`
   - Agregar la nueva IP al array `ALLOWED_IPS`
   - Ejecutar: `npx tsx scripts/aws/aws-restrict-frontend-ips.ts`

### Eliminar una IP:

- Seguir los mismos pasos pero removiendo la IP del IP Set

### Deshabilitar Temporalmente la Restricción:

1. **Opción 1: Remover Web ACL de CloudFront**
   ```bash
   aws cloudfront get-distribution-config --id E19ZID7TVR08JG
   # Luego actualizar sin WebACLId
   ```

2. **Opción 2: Cambiar Default Action a ALLOW**
   - Editar el Web ACL desde AWS Console
   - Cambiar Default Action de BLOCK a ALLOW
   - Guardar cambios

---

## 📊 Monitoreo

### CloudWatch Metrics:

El Web ACL está configurado para enviar métricas a CloudWatch:

- **Metric Name:** `frontend-ip-restriction`
- **Namespace:** `AWS/WAFV2`
- **Dimensions:** 
  - `WebACL`: `frontend-ip-restriction`
  - `Region`: `global` (CloudFront)

### Métricas Disponibles:

- `AllowedRequests`: Solicitudes permitidas
- `BlockedRequests`: Solicitudes bloqueadas
- `CountedRequests`: Total de solicitudes procesadas

### Ver Métricas:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name AllowedRequests \
  --dimensions Name=WebACL,Value=frontend-ip-restriction Name=Region,Value=global \
  --start-time 2025-12-16T00:00:00Z \
  --end-time 2025-12-16T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

---

## 🧪 Pruebas

### Verificar que Funciona:

1. **Desde una IP permitida:**
   ```bash
   curl -I https://ai.vidavacations.com
   # Debe responder: HTTP/2 200
   ```

2. **Desde una IP no permitida:**
   ```bash
   curl -I https://ai.vidavacations.com
   # Debe responder: HTTP/2 403 Forbidden
   ```

### Ver Logs de WAF:

Los logs de WAF están habilitados y se pueden ver en:
- CloudWatch Logs: `/aws/wafv2/webacl/frontend-ip-restriction`
- S3 (si se configuró): `s3://waf-logs-bucket/`

---

## ⚠️ Consideraciones Importantes

### 1. IPs Dinámicas:
- Si alguna de las IPs es dinámica (cambia frecuentemente), necesitarás actualizarla regularmente
- Considera usar rangos CIDR si las IPs están en un rango conocido

### 2. Desarrollo y Testing:
- Los desarrolladores necesitarán agregar sus IPs para poder acceder
- Considera crear un IP Set separado para desarrollo/testing

### 3. Móviles y Redes Móviles:
- Las IPs móviles cambian frecuentemente
- Puede ser necesario usar rangos CIDR de los operadores

### 4. VPNs y Proxies:
- Si usas VPN, necesitarás agregar la IP del servidor VPN
- Los proxies corporativos también necesitan estar en la lista

### 5. Costos:
- AWS WAF tiene costos asociados:
  - $1.00 por millón de solicitudes web procesadas
  - $0.60 por millón de reglas evaluadas
  - Los IP Sets son gratuitos

---

## 📝 Script de Configuración

El script utilizado para configurar esta restricción está en:
```
scripts/aws/aws-restrict-frontend-ips.ts
```

Para ejecutarlo nuevamente (por ejemplo, para agregar IPs):
```bash
npx tsx scripts/aws/aws-restrict-frontend-ips.ts
```

---

## 🔗 Referencias

- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [CloudFront + WAF Integration](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-awswaf.html)
- [WAF Pricing](https://aws.amazon.com/waf/pricing/)

---

**Última actualización:** 16 de Diciembre, 2025  
**Configurado por:** Script automatizado  
**Estado:** ✅ Activo y funcionando

