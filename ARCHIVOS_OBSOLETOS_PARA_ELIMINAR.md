# Archivos Obsoletos y Temporales - Movidos a Respaldo

**Fecha de revisión:** 22 de Enero 2026  
**Fecha de movimiento:** 21 de Enero 2026  
**Total de archivos movidos:** 75 archivos  
**Ubicación del respaldo:** `../backups-pqnc/archivos-obsoletos-20260121/`  
**Categorías:** Backups, Reportes temporales, Configuraciones obsoletas, Scripts de una sola ocasión, Logs

> ✅ **ESTADO:** Los archivos han sido movidos a la carpeta de respaldos fuera del proyecto. No fueron eliminados.

---

## 📋 Resumen por Categoría

| Categoría | Cantidad | Tamaño estimado |
|-----------|----------|-----------------|
| Archivos de backup | 2 | ~170 KB |
| Reportes temporales | 8 | ~50 KB |
| Configuraciones JSON obsoletas | 25 | ~200 KB |
| Scripts temporales | 12 | ~30 KB |
| Archivos de log | 3 | ~10 KB |
| Archivos de diagnóstico | 5 | ~20 KB |
| Archivos de texto temporales | 4 | ~5 KB |
| Archivos SQL temporales | 6 | ~15 KB |
| Otros temporales | 22 | ~100 KB |
| **TOTAL** | **87** | **~600 KB** |

---

## 🗑️ Archivos para Eliminar

### 1. Archivos de Backup con Timestamps

| Archivo | Tamaño | Justificación |
|---------|--------|---------------|
| `src/components/chat/LiveChatCanvas.tsx.backup-20260114-222720` | ~170 KB | Backup temporal creado durante refactorización. El archivo original ya fue actualizado y este backup ya no es necesario. |
| `src/components/chat/LiveChatCanvas.backup.tsx` | ~170 KB | Backup anterior del mismo componente. Ya existe el backup con timestamp más reciente. |

**Total:** 2 archivos, ~340 KB

---

### 2. Reportes Temporales de Auditoría y Limpieza

| Archivo | Fecha | Justificación |
|---------|-------|---------------|
| `AUDIT_DOCUMENTATION_PARES_2026-01-22.md` | 2026-01-22 | Reporte temporal de auditoría de documentación. La información ya fue incorporada en documentación permanente. |
| `AUDIT_INVENTORY.json` | 2026-01-22 | Inventario temporal generado por script de auditoría. Se puede regenerar ejecutando `scripts/audit-documentation.ts`. |
| `AUDIT_REPORT.md` | 2026-01-22 | Reporte temporal de auditoría. La información relevante ya está en documentación permanente. |
| `CLEANUP_REPORT.md` | 2026-01-22 | Reporte temporal de limpieza de documentación. Información ya incorporada en `CHANGELOG.md`. |
| `ESTADO_FINAL_2026-01-16.txt` | 2026-01-16 | Reporte temporal de estado de limpieza de BD. Información ya documentada en `docs/CHANGELOG_LIMPIEZA_BD_2026-01-16.md`. |
| `REPORTE_FINAL_LIMPIEZA_2026-01-16.txt` | 2026-01-16 | Reporte temporal duplicado. Misma información que `ESTADO_FINAL_2026-01-16.txt`. |
| `DIAGNOSTIC_DEPLOY_RULE_2026-01-22.md` | 2026-01-22 | Diagnóstico temporal de un problema específico ya resuelto. |
| `DOCUMENTACION_ACTUALIZADA_2026-01-22.md` | 2026-01-22 | Reporte temporal de actualización de documentación. Información ya en `CHANGELOG.md` y `VERSIONS.md`. |

**Total:** 8 archivos, ~50 KB

---

### 3. Archivos de Configuración JSON Obsoletos (Supabase Studio/PGMeta)

Estos archivos son configuraciones temporales de pruebas de Supabase Studio en AWS. Ya no se usan.

| Archivo | Justificación |
|---------|---------------|
| `pgmeta-aws-correct.json` | Configuración temporal de prueba de PGMeta en AWS. Ya no se usa. |
| `pgmeta-clean-new.json` | Versión temporal de configuración. Obsoleta. |
| `pgmeta-correct.json` | Versión temporal de configuración. Obsoleta. |
| `pgmeta-corrected-endpoint.json` | Configuración temporal con endpoint corregido. Ya no se usa. |
| `pgmeta-fixed.json` | Versión temporal "fixed". Obsoleta. |
| `pgmeta-independent.json` | Configuración temporal independiente. Obsoleta. |
| `pgmeta-service.json` | Configuración temporal de servicio. Obsoleta. |
| `pgmeta-stable-final.json` | Versión "final" temporal. Obsoleta. |
| `pgmeta-synchronized.json` | Configuración temporal sincronizada. Obsoleta. |
| `pgmeta-ultra-stable.json` | Versión temporal "ultra-stable". Obsoleta. |
| `pgmeta-with-n8n-db.json` | Configuración temporal con N8N DB. Obsoleta. |
| `pgmeta-with-real-aurora.json` | Configuración temporal con Aurora. Obsoleta. |
| `pgmeta-working.json` | Versión temporal "working". Obsoleta. |
| `studio-aws-final.json` | Configuración temporal final de Studio en AWS. Obsoleta. |
| `studio-clean-final.json` | Versión temporal "clean final". Obsoleta. |
| `studio-complete-fixed.json` | Versión temporal "complete fixed". Obsoleta. |
| `studio-complete-railway.json` | Configuración temporal de Railway. Obsoleta. |
| `studio-direct-ip.json` | Configuración temporal con IP directa. Obsoleta. |
| `studio-final-with-aurora.json` | Configuración temporal final con Aurora. Obsoleta. |
| `studio-final-working.json` | Versión temporal "final working". Obsoleta. |
| `studio-independent.json` | Configuración temporal independiente. Obsoleta. |
| `studio-with-clean-pgmeta.json` | Configuración temporal con PGMeta limpio. Obsoleta. |
| `studio-with-corrected-pgmeta.json` | Configuración temporal con PGMeta corregido. Obsoleta. |
| `studio-with-nlb-dns.json` | Configuración temporal con NLB DNS. Obsoleta. |
| `studio-with-ultra-stable-pgmeta.json` | Configuración temporal con PGMeta ultra-stable. Obsoleta. |
| `original_studio_env.json` | Configuración original temporal. Obsoleta. |

**Total:** 25 archivos, ~200 KB

---

### 4. Archivos de Prueba y Test Temporales

| Archivo | Justificación |
|---------|---------------|
| `test-alb.json` | Archivo de prueba temporal de ALB. Ya no se usa. |
| `test-aurora-connection.json` | Archivo de prueba temporal de conexión Aurora. Ya no se usa. |
| `test-connectivity.json` | Archivo de prueba temporal de conectividad. Ya no se usa. |
| `test-pgmeta-current.json` | Archivo de prueba temporal de PGMeta. Ya no se usa. |
| `test-pgmeta-internal.json` | Archivo de prueba temporal interno. Ya no se usa. |
| `test-pgmeta-to-postgres.json` | Archivo de prueba temporal PGMeta a Postgres. Ya no se usa. |
| `postgres-railway-simple.json` | Configuración temporal simple de Railway. Obsoleta. |
| `postgres-railway.json` | Configuración temporal de Railway. Obsoleta. |

**Total:** 8 archivos, ~40 KB

---

### 5. Archivos de Log Temporales

| Archivo | Justificación |
|---------|---------------|
| `audit-aggressive-results.log` | Log temporal de auditoría agresiva. Ya no se necesita. |
| `audit-vidavacations-results.log` | Log temporal de auditoría. Ya no se necesita. |
| `waf-verification.log` | Log temporal de verificación WAF. Ya no se necesita. |

**Total:** 3 archivos, ~10 KB

---

### 6. Archivos de Texto Temporales

| Archivo | Justificación |
|---------|---------------|
| `COMMIT_MESSAGE.txt` | Mensaje de commit temporal usado una vez. Ya no se necesita. |
| `new_target_group_arn.txt` | ARN temporal de target group guardado durante configuración. Ya no se usa. |
| `nlb_target_group.txt` | Información temporal de NLB target group. Ya no se usa. |
| `razon_finalizacion.ilike.%customer-ended-call%,datos_llamada-` | Archivo temporal con query SQL parcial. Parece ser resultado accidental de un comando. |
| `razon_finalizacion.ilike.%no` | Archivo temporal con query SQL parcial. Parece ser resultado accidental de un comando. |

**Total:** 5 archivos, ~5 KB

---

### 7. Scripts Temporales de Una Sola Ocasión

| Archivo | Justificación |
|---------|---------------|
| `scripts/create-test-workflow.ts` | Script temporal para crear workflow de prueba en N8N. Ya no se necesita (tiene API key hardcodeada). |
| `scripts/instalar-supabase-oficial.sh.bak` | Backup de script de instalación. Ya existe la versión sin .bak. |
| `create-aws-diagram-table.js` | Script temporal para crear tabla de diagramas AWS. Ya ejecutado. |
| `deploy-error-analisis-proxy.sh` | Script temporal de deploy de proxy de análisis de errores. Ya no se usa. |
| `deploy-edge-manual.sh` | Script temporal de deploy manual de Edge Functions. Ya no se usa. |
| `check-n8n-status.sh` | Script temporal de verificación de estado N8N. Ya no se usa. |
| `security-audit-aggressive.js` | Script temporal de auditoría de seguridad agresiva. Ya ejecutado. |
| `security-audit-jungala.js` | Script temporal de auditoría de seguridad. Ya ejecutado. |
| `security-audit-vidavacations.js` | Script temporal de auditoría de seguridad. Ya ejecutado. |
| `verify-waf-jungala.js` | Script temporal de verificación WAF. Ya ejecutado. |

**Total:** 10 archivos, ~25 KB

---

### 8. Archivos SQL Temporales

| Archivo | Justificación |
|---------|---------------|
| `amplify_existing_exec_sql.sql` | Script SQL temporal de Amplify. Ya ejecutado. |
| `CREATE_TABLE_FIXED.sql` | Script SQL temporal de creación de tabla "fixed". Ya ejecutado. |
| `CREATE_TABLE_MANUAL.sql` | Script SQL temporal de creación manual. Ya ejecutado. |
| `fix-database-now.sql` | Script SQL temporal de fix de BD. Ya ejecutado. |
| `n8n-user-management.sql` | Script SQL temporal de gestión de usuarios N8N. Ya ejecutado. |
| `SEGURIDAD_OTROS_PROYECTOS.sql` | Script SQL temporal de seguridad. Ya ejecutado. |

**Total:** 6 archivos, ~15 KB

---

### 9. Archivos de Configuración Temporales (PostgREST/Gotrue)

| Archivo | Justificación |
|---------|---------------|
| `gotrue-aws-fixed.json` | Configuración temporal "fixed" de GoTrue en AWS. Obsoleta. |
| `postgrest-aws-fixed-tmp.json` | Configuración temporal temporal de PostgREST. Obsoleta. |
| `postgrest-aws-fixed.json` | Configuración temporal "fixed" de PostgREST. Obsoleta. |
| `plantilla_supabase.json` | Plantilla temporal de Supabase. Obsoleta. |

**Total:** 4 archivos, ~20 KB

---

### 10. Otros Archivos Temporales

| Archivo | Justificación |
|---------|---------------|
| `README_NEW.md` | README temporal "new". Ya existe `README.md` actualizado. |
| `proxy_package.json` | package.json temporal de proxy. Ya no se usa. |
| `buildspec.yml` | Buildspec temporal de AWS CodeBuild. Ya no se usa (deploy manual). |
| `setup-ci-cd-pipeline.sh` | Script temporal de setup de CI/CD. Ya no se usa. |

**Total:** 4 archivos, ~10 KB

---

## 📊 Resumen Final

### Archivos por Prioridad de Eliminación

**🔴 Alta Prioridad (Eliminar inmediatamente):**
- Archivos de backup con timestamps (2)
- Reportes temporales de auditoría (8)
- Archivos de log (3)
- Archivos de texto temporales (5)
- Scripts con credenciales hardcodeadas (1: `create-test-workflow.ts`)

**🟡 Media Prioridad (Revisar antes de eliminar):**
- Configuraciones JSON obsoletas (25)
- Archivos de prueba/test (8)
- Scripts temporales ejecutados (9)
- Archivos SQL temporales (6)

**🟢 Baja Prioridad (Pueden mantenerse como referencia):**
- Archivos de configuración temporales (4)
- Otros temporales (4)

---

## ✅ Recomendaciones

1. **Eliminar inmediatamente:** Archivos de backup, logs, reportes temporales y scripts con credenciales.
2. **Revisar antes de eliminar:** Configuraciones JSON y scripts SQL (verificar que no se necesiten para rollback).
3. **Considerar mover a carpeta `archive/`:** Archivos que puedan servir como referencia histórica.

---

## ✅ Archivos Movidos a Respaldo

**Ubicación:** `../backups-pqnc/archivos-obsoletos-20260121/`

Todos los archivos listados anteriormente han sido movidos a la carpeta de respaldos fuera del proyecto, organizados en subcarpetas por categoría:

- ✅ `backups/` - 2 archivos (~574 KB)
- ✅ `reportes-temporales/` - 8 archivos
- ✅ `configuraciones-json/` - 37 archivos (~872 KB)
- ✅ `logs/` - 3 archivos
- ✅ `textos-temporales/` - 5 archivos
- ✅ `scripts-temporales/` - 10 archivos
- ✅ `sql-temporales/` - 6 archivos
- ✅ `otros/` - 4 archivos

**Total:** 75 archivos (~1.5 MB)

Los archivos están disponibles en la carpeta de respaldos y pueden ser recuperados si es necesario. Se creó un `README.md` en la carpeta de respaldo con detalles sobre el contenido.

---

**Última actualización:** 22 de Enero 2026  
**Revisado por:** Claude AI (Sonnet 4.5)
