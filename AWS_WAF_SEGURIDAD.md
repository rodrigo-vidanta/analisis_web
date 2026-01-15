# AWS WAF - IMPLEMENTACIÓN ECONÓMICA

**Proyecto:** PQNC QA AI Platform  
**Costo:** $6-7 USD/mes (económico)  
**Fecha:** 15 Enero 2026  

---

## ⚠️ PRECAUCIÓN

**Tu dominio YA tiene IP Restriction configurada.**

El WAF se agregará ADEMÁS de las restricciones existentes:
```
Capa 1: Route 53 → IP Restriction (ya configurada)
Capa 2: WAF → Rate Limiting (nuevo)
Capa 3: CloudFront → Entrega contenido
```

Ambas trabajan juntas, NO se reemplazan.

---

## 📊 CONFIGURACIÓN ECONÓMICA

### Solo Rate Limiting (Regla esencial)

```json
{
  "Rate Limit": "2,000 requests/5min por IP",
  "Action": "Block con código 429",
  "Métricas": "Sí (sin CloudWatch Alarms costosos)",
  "Managed Rules": "NO (ahorro de $15 USD/mes)"
}
```

**Costo:**
- WAF base: $5 USD/mes
- Reglas adicionales: $0 (solo 1 regla básica)
- Requests: ~$1 USD por millón
- **Total: $6-7 USD/mes**

vs

**Configuración completa (costosa):**
- WAF base: $5 USD/mes
- Managed Rules (4): $4 USD/mes c/u = $16 USD/mes
- CloudWatch Alarms: $0.10 USD c/u
- **Total: $22-30 USD/mes**

---

## 🚀 IMPLEMENTACIÓN

**Ejecutar:**
```bash
cd ~/Documents/pqnc-qa-ai-platform
./scripts/aws/deploy-waf-economico.sh
```

**El script:**
1. ✅ Hace backup de configuración actual
2. ✅ Crea WAF con 1 regla (rate limiting)
3. ✅ Asocia a CloudFront
4. ✅ Pide confirmación antes de aplicar

---

## ⚡ MEJORES PRÁCTICAS ADICIONALES (SIN COSTO)

### 1. Headers de Seguridad en CloudFront

Ya están configurados en tu CloudFront:
- ✅ HSTS
- ✅ X-Frame-Options
- ⚠️ CSP (puede mejorarse)

### 2. Logging (Opcional, $0.50 USD/mes)

```bash
# Habilitar WAF logging para auditoría
aws wafv2 put-logging-configuration \
  --logging-configuration \
    ResourceArn=$WEB_ACL_ARN,\
    LogDestinationConfigs=arn:aws:s3:::pqnc-waf-logs
```

### 3. Monitoreo Básico (Gratis)

CloudWatch métricas básicas incluidas:
- Requests bloqueadas
- Tráfico total
- Sin alarmas (para ahorrar)

---

## 📋 CHECKLIST PRE-DEPLOY

- [ ] Backup de CloudFront config ✅ (script lo hace)
- [ ] Verificar que CloudFront ID es correcto
- [ ] Confirmar que no rompe IP restrictions existentes
- [ ] Tener ARN del WAF anotado (para rollback)

---

## 🔄 ROLLBACK (Si algo sale mal)

```bash
# Desasociar WAF
aws cloudfront update-distribution \
  --id DISTRIBUTION_ID \
  --distribution-config file:///tmp/cloudfront-backup-TIMESTAMP.json \
  --if-match ETAG
```

---

## 📊 RESUMEN DE COSTOS

```
Infraestructura actual: $710 USD/mes
WAF económico:          +$7 USD/mes
──────────────────────────────────
TOTAL NUEVO:            $717 USD/mes (1% de incremento)
```

**vs WAF completo:** +$25 USD/mes (3.5% incremento)

---

**Script listo para ejecutar en:** `scripts/aws/deploy-waf-economico.sh`
