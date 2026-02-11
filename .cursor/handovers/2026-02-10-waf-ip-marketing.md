# Handover: Alta de IP Marketing en WAF

**Fecha**: 2026-02-10
**Tipo**: Infraestructura AWS (NO deploy)

---

## Accion Realizada

Se agrego la IP `189.177.28.203/32` (Marketing) al WAF IP set que controla el acceso a `ai.vidavacations.com`.

## Detalles Tecnicos

| Componente | Valor |
|------------|-------|
| **WAF Web ACL** | `frontend-ip-restriction` (us-east-1, scope CLOUDFRONT) |
| **IP Set** | `frontend-allowed-ips` (ID: `9ed33da4-fb8e-498e-baf7-ff0b672d7725`) |
| **CloudFront** | `E19ZID7TVR08JG` → `ai.vidavacations.com` |
| **IP agregada** | `189.177.28.203/32` - Marketing |

## IP Set Actualizado (9 IPs)

| IP | Nota |
|----|------|
| `189.177.48.132/32` | Existente |
| `189.203.238.35/32` | Existente |
| `189.177.138.158/32` | Existente |
| `189.178.124.238/32` | Existente |
| `187.210.107.179/32` | Existente |
| `189.177.141.218/32` | Existente |
| `189.203.97.130/32` | Existente |
| `187.144.87.193/32` | Existente |
| **`189.177.28.203/32`** | **Nueva - Marketing** |

## Arquitectura WAF

El WAF `frontend-ip-restriction` tiene 5 reglas en orden de prioridad:

1. **allow-listed-ips** (P1) → Allow: Permite trafico de IPs en `frontend-allowed-ips`
2. **RateLimitPerIP** (P2) → Block: Rate limiting por IP
3. **AWSManagedRulesCommon** (P3) → Managed: Reglas comunes AWS
4. **AWSManagedKnownBadInputs** (P4) → Managed: Inputs maliciosos
5. **AWSManagedSQLi** (P5) → Managed: SQL injection

## Notas

- El cambio es inmediato, no requiere invalidacion de cache
- Para agregar/quitar IPs en el futuro: modificar el IP set `frontend-allowed-ips` en WAFv2 (region us-east-1, scope CLOUDFRONT)
- El LockToken actual es `33855c9d-05ad-4786-b159-c05f6a65f7a6`
