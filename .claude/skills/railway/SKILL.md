---
name: railway
description: Gestion completa de infraestructura Railway. Status de servicios, logs, deploys, variables, volumes, escalado, funciones, bases de datos, y administracion de toda la infraestructura Railway de PQNC y proyectos asociados.
---

# Railway - PQNC Infrastructure Management

## REGLA: ESCRITURA requiere autorizacion explicita del usuario. LECTURA es libre.

## Conexion
- **Cuenta**: rodrigomora@grupovidanta.com | User ID: `8d4a5d94-5782-418e-a618-f56b4d230955`
- **CLI**: `railway` v4.6.1 (autenticado via `~/.railway/config.json`)
- **GraphQL API**: `https://backboard.railway.com/graphql/v2` (token en `~/.railway/config.json`)
- **Dashboard**: https://railway.com/project/{project_id}
- **Agente**: `.claude/agents/railway-agent.md`

## NOTA IMPORTANTE: CLI v4.6.1 instalado, ultima version disponible 4.30.2

## Invocacion

### Status & Reportes (sin restricciones)
- `/railway status` - Estado de todos los servicios del proyecto PQNC
- `/railway status all` - Status de los 4 proyectos Railway
- `/railway services` - Lista servicios con estado de deployment
- `/railway health` - Health check de servicios criticos (Primary, Workers, DBs)

### Logs (sin restricciones)
- `/railway logs` - Logs recientes del servicio Primary (N8N) produccion
- `/railway logs <servicio>` - Logs de un servicio especifico
- `/railway logs <servicio> build` - Logs de build de un servicio
- `/railway logs dev` - Logs del environment Dev

### Deploys (sin restricciones para lectura)
- `/railway deploys` - Historial de deployments recientes
- `/railway deploys <servicio>` - Deploys de un servicio especifico

### Variables (sin restricciones para lectura)
- `/railway vars` - Variables del servicio linkeado actual
- `/railway vars <servicio>` - Variables de un servicio especifico
- `/railway vars <servicio> prod` - Variables en produccion

### Volumes (sin restricciones para lectura)
- `/railway volumes` - Estado de volumenes y uso de disco

### Funciones (sin restricciones para lectura)
- `/railway functions` - Lista de funciones serverless

### Servicios Individuales
- `/railway n8n` - Status detallado de N8N (Primary + Workers)
- `/railway postgres` - Status de bases de datos PostgreSQL
- `/railway redis` - Status de instancias Redis
- `/railway frontend` - Status de React Frontend (Dev)

### Operaciones (REQUIEREN autorizacion explicita)
- `/railway redeploy <servicio>` - Re-deploy del ultimo deployment
- `/railway vars set <servicio> KEY=VALUE` - Establecer variable
- `/railway scale <servicio> <region> <instances>` - Escalar instancias
- `/railway restart <servicio>` - Reiniciar servicio (via GraphQL API)
- `/railway down <servicio>` - Remover ultimo deployment

## Implementacion

### CLI Commands con --json (para parseo automatico)
Los siguientes comandos soportan `--json`:
- `railway list --json` - Proyectos
- `railway status --json` - Status completo con metadata de deployments
- `railway logs --json` - Logs como JSON
- `railway variables --json` - Variables como {key: value}
- `railway domain --json` - Dominios y DNS
- `railway check_updates --json` - Version CLI

### GraphQL API (para operaciones avanzadas no disponibles en CLI)
Usar cuando se necesite:
- HTTP logs (`httpLogs` query) - method, path, status, duration, IP
- Volume backups (create, restore, lock, delete)
- Service configuration (health checks, restart policy, cron, sleep-when-idle)
- Deployment management avanzado (rollback, stop, cancel)
- TCP proxy listing
- Build logs con severity

Token de autenticacion:
```python
import json
token = json.load(open('/Users/darigsamuelrosalesrobledo/.railway/config.json'))['user']['token']
# Header: Authorization: Bearer {token}
```

### Proyectos Railway (IDs)

| Proyecto | ID | Servicios | Environments |
|----------|-----|-----------|-------------|
| **PQNC** | `8fa42ea2-4d9f-40ec-9090-60d5ea05ba66` | 22 | production, Dev |
| **Multimedia-AI** | `77155a15-3f3d-4fd5-99c4-2cdbb58b9db9` | 4 | production, DEV |
| **Agentes ventas IA** | `fd59dc3f-7238-4767-bc9e-7389db4e9a83` | 1 | production |
| **Reclutamiento** | `3abc9817-3ccf-44cd-a33e-f5b99091017c` | 2 | production |

### Servicios Criticos PQNC

| Servicio | ID | Env | Rol |
|----------|-----|-----|-----|
| Primary (N8N) | `3dc49dfe` | prod+dev | N8N principal |
| Worker | `44679e61` | prod+dev | N8N worker |
| Postgres | `32b7fcd6` | prod+dev | BD principal |
| Redis | `8d26af31` | prod+dev | Cache |
| React Frontend | `4d420adb` | dev | Frontend Dev |
| Crawl4AI | `77f59404` | prod+dev | Web scraping |

### Dominios Clave
- N8N Prod: `primary-production-5b63a.up.railway.app`
- N8N Dev: `primary-dev-d75a.up.railway.app`
- Postgres Prod: `postgres-production-9c1b.up.railway.app`
- Postgres Dev: `postgres-dev-c91b.up.railway.app`

### Environments
- **production**: `64facf22-ffe4-4d14-9d60-edd2a2f87aed`
- **Dev**: `c6de92a8-8f83-48b5-930b-e73d32e6f66b`
