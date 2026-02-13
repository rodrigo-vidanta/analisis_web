# Handover: Registro IP-Etiqueta WAF + Cambio IP drosales

**Fecha**: 2026-02-12
**Tipo**: Infraestructura AWS + Documentacion interna (NO deploy)

---

## Problema

Al pedir las IPs del WAF, no se mostraban con sus etiquetas (a quien pertenece cada IP). AWS WAF no soporta labels por IP — el registro existia solo en `docs/AWS_FRONTEND_IP_RESTRICTION.md`, pero ni el skill `/aws` ni el agente `aws-agent.md` lo tenian, por lo que en conversaciones nuevas se perdia esa informacion.

## Acciones Realizadas

### 1. Registro IP-Etiqueta agregado a 3 archivos

Se agrego la tabla de IPs con etiquetas y una REGLA de sincronizacion obligatoria a:

- **`.claude/agents/aws-agent.md`** — Seccion "WAF - Registro de IPs Permitidas" antes de "Alertas Conocidas"
- **`.claude/skills/aws/SKILL.md`** — Misma seccion antes de "Reglas de Operacion"
- **`docs/AWS_FRONTEND_IP_RESTRICTION.md`** — Tabla actualizada con las 9 IPs y fecha

La regla indica que al listar IPs se muestren siempre las etiquetas, y al modificar el WAF se actualicen los 3 archivos.

### 2. Cambio IP drosales en AWS WAF

| Campo | Valor |
|-------|-------|
| **IP Set** | `frontend-allowed-ips` (ID: `9ed33da4-fb8e-498e-baf7-ff0b672d7725`) |
| **IP anterior** | `189.203.97.130/32` |
| **IP nueva** | `187.190.202.130/32` |
| **LockToken anterior** | `33855c9d-05ad-4786-b159-c05f6a65f7a6` |
| **LockToken nuevo** | `e3edd188-5360-4f29-a609-7e76229ec14d` |

## Estado Final del IP Set (9 IPs)

| # | IP | Etiqueta |
|---|-----|----------|
| 1 | `189.203.238.35` | Vidanta PQNC |
| 2 | `187.210.107.179` | Vidanta PQNC 2 |
| 3 | `189.178.124.238` | IP del usuario 1 |
| 4 | `189.177.138.158` | IP del usuario 2 |
| 5 | `187.190.202.130` | drosales |
| 6 | `189.177.48.132` | oficinaIA |
| 7 | `187.144.87.193` | casa rodrigo |
| 8 | `189.177.141.218` | DGV Oficina |
| 9 | `189.177.28.203` | Marketing |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `.claude/agents/aws-agent.md` | +Seccion WAF con tabla IP-etiqueta y regla de sync |
| `.claude/skills/aws/SKILL.md` | +Seccion WAF con tabla IP-etiqueta y regla de sync |
| `docs/AWS_FRONTEND_IP_RESTRICTION.md` | Actualizada tabla (9 IPs), nueva IP drosales, fecha |

## Notas

- El cambio en WAF es inmediato, no requiere invalidacion de CloudFront
- AWS WAF IP Sets NO soportan metadata por IP — las etiquetas son documentacion local
- La regla de sincronizacion en los 3 archivos asegura que futuras sesiones mantengan el registro actualizado
