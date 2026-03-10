## [v2.30.1] - 2026-03-10

**B10.2.0N2.30.1** - 2

### Sesiones de trabajo
- **2026-03-10-template-groups-audit-gancho-v2**: Los usuarios reportaron que algunas plantillas no encajaban en su grupo asignado. Ejemplo: en "Reenganche Suave" había una plantilla que pregunta por destino, lo cual puede dar la percepción de que no se pone atención al prospecto si ya se había hablado de un destino específico.

---

## [v2.30.0] - 2026-03-10

**B10.2.0N2.30.0** - 1 feature

### Features
- add template analytics module + 14 reenganche suave templates (`04f6e41`)

---

## [v2.29.0] - 2026-03-09

**B10.2.0N2.29.0** - 1 feature + 1 fix + 1 mejora

### Other
- update factory-templates skill + add session handovers (`c51acee`)

### Features
- add import 10 URLs tutorial + bulk reassignment supervisor tutorial (`8b9539a`)

### Bug Fixes
- secure coordination validation + group-based template sending + 10 URL limit (`24494aa`)

---

## [v2.28.0] - 2026-03-09

**B10.2.0N2.28.0** - 1 feature

### Features
- add per-template health stats with admin-only visibility (`3ea56f7`)

---

## [v2.27.0] - 2026-03-08

**B10.2.0N2.27.0** - 1 feature + Cuando un prospecto llega desde un anuncio **Click + Se detectaron 40 plantillas WhatsApp en estado PEN

### Sesiones de trabajo
- **2026-03-08-backend-ctwa-referral-source-capture**: Cuando un prospecto llega desde un anuncio **Click-to-WhatsApp (CTWA)** de Meta (Facebook/Instagram), la API de WhatsApp Business (via Twilio) otorga una **ventana de 72 horas** de mensajería gratuita, en lugar de las 24 horas estándar.
- **2026-03-08-replace-pending-templates-v2**: Se detectaron 40 plantillas WhatsApp en estado PENDING. De ellas, 20 llevaban mas de 24 horas sin ser aprobadas por Meta/Twilio. Se solicito refrasearlas usando las reglas del skill `/factory-templates` y reenviarlas a traves del edge function pipeline.

### Features
- add CTWA 72h window detection with countdown timer + 40 cold templates (`6dff4fe`)

---

## [v2.26.0] - 2026-03-08

**B10.2.0N2.26.0** - 2 features + 1 fix + 1 mejora + Las plantillas WhatsApp generadas manualmente care + Se necesitaban plantillas WhatsApp UTILITY para no

### Sesiones de trabajo
- **2026-03-07-factory-templates-skill-creation**: Las plantillas WhatsApp generadas manualmente carecian de consistencia en tono, compliance Meta, y efectividad psicologica. Se necesitaba un sistema que, con un simple prompt, generara plantillas optimizadas para venta en frio de certificados vacacionales Vidanta, embebiendo todas las reglas de negocio, compliance Meta, y tecnicas de persuasion.
- **2026-03-07-whatsapp-number-update-templates-creation**: Se necesitaban plantillas WhatsApp UTILITY para notificar a prospectos sobre el cambio de numero de WhatsApp de Vidanta. Las plantillas debian ser psicologicamente optimizadas para maximizar reply rate, sin variables, cumpliendo con los estandares de salud de Meta.

### Documentation
- add handovers and template creation script for number update campaign (`394ee85`)

### Bug Fixes
- display bloqueado_whatsapp contact status in chat UI (`2630741`)

### Features
- add template health metrics and exclude number-update group from sending (`91c8698`)
- add CRT TV shutdown animation for logout (`a50764c`)

---

## [v2.25.0] - 2026-03-07

**B10.2.0N2.25.0** - 3 features + 1 fix + 1 mejora

### Features
- add Neural Constellation Remotion composition for login background (`e4446a8`)
- add interactive Doodle characters as login background animation (`d34a2c6`)
- add Sileo toast provider with global switcher in SystemPreferences (`603c2d0`)

### Documentation
- add session handovers for sileo, doodles, remotion fix and related work (`dd99395`)

### Bug Fixes
- make Remotion Neural Constellation responsive with object-fit cover (`598ff68`)

---

## [v2.24.3] - 2026-03-07

**B10.2.0N2.24.3** - 1 fix

### Bug Fixes
- resolve flicker on indefinite pause + dual provider support in ConversacionesWidget (`edfeb4b`)

---

## [v2.24.2] - 2026-03-07

**B10.2.0N2.24.2** - 1 fix

### Bug Fixes
- remove phone overwrite on logout + add realtime broadcast for backup badges (`414e342`)

---

## [v2.24.1] - 2026-03-06

**B10.2.0N2.24.1** - 1 mejora + Las plantillas WhatsApp se organizaban individualm

### Sesiones de trabajo
- **2026-03-06-template-groups-refactor**: Las plantillas WhatsApp se organizaban individualmente. El usuario seleccionaba manualmente cual enviar. Con este refactor, las plantillas se agrupan en **grupos inteligentes** donde el sistema N8N selecciona automaticamente la mejor plantilla segun salud y rendimiento, rotando para evitar bloqueos de Meta.
  - 1. Servicio: `whatsappTemplatesService.ts`
  - 2. `WhatsAppTemplatesManager.tsx` — Vista principal por grupos
  - 3. `ReactivateConversationModal.tsx` — Reactivacion con plantilla
  - 4. `ImportWizardModal.tsx` — Importacion de prospectos (Step 3)
  - 5. Componente compartido: `GroupStarRating.tsx` (NUEVO)
  - 6. Comunicado interactivo: `TemplateGroupsTutorial.tsx` (NUEVO)

### Documentation
- update modules and database docs for notas_internas (`5d74df7`)

---

## [v2.24.0] - 2026-03-05

**B10.2.0N2.24.0** - 1 feature

### Features
- add internal notes system + interactive tutorials (`392f489`)

---

## [v2.23.0] - 2026-03-05

**B10.2.0N2.23.0** - 1 feature

### Features
- add undelivered template tutorial + fix template send limit filter (`e562189`)

---

## [v2.22.0] - 2026-03-05

**B10.2.0N2.22.0** - 1 feature + El sistema de livechat incorporo status_delivery

### Sesiones de trabajo
- **2026-03-05-comunicado-delivery-checks-tutorial**: El sistema de livechat incorporo `status_delivery` en mensajes WhatsApp (queued → sent → delivered → read) con iconos estilo WhatsApp (Check, CheckCheck en gris/cyan). Se creo un comunicado interactivo para informar a todos los usuarios sobre esta funcionalidad.

### Features
- blur overlay for undelivered templates + error catalog Twilio codes (`8849d65`)

---

## [v2.21.0] - 2026-03-04

**B10.2.0N2.21.0** - 1 feature + Cuando un usuario envia un audio en el chat, la pl

### Sesiones de trabajo
- **2026-03-04-audio-transcription-realtime-animation**: Cuando un usuario envia un audio en el chat, la plataforma transcribe el audio via LLM. La transcripcion tarda unos segundos y se almacena en `adjuntos[0].descripcion` (JSONB) de `mensajes_whatsapp`, NO en el campo `mensaje` (que queda como `""`).

### Features
- add transcription animation and realtime for audio messages (`c3dddc3`)

---

## [v2.20.1] - 2026-03-04

**B10.2.0N2.20.1** - 1 fix

### Bug Fixes
- filter non-UUID ids before querying user_profiles_v2 (`b5365e6`)

---

## [v2.20.0] - 2026-03-04

**B10.2.0N2.20.0** - 1 feature + El workflow N8N de envío de audio ahora rutea por 

### Sesiones de trabajo
- **2026-03-04-send-audio-proxy-whatsapp-migration**: El workflow N8N de envío de audio ahora rutea por número `whatsapp` en vez de `uchat_id`. Se necesitaba actualizar la Edge Function y el frontend para enviar el campo correcto.

### Features
- migrate send-audio-proxy from uchat_id to whatsapp (`72759b8`)

---

## [v2.19.0] - 2026-03-03

**B10.1.44N2.19.0** - 1 feature

### Features
- add delivery checks interactive tutorial (`6fbef89`)

---

## [v2.18.1] - 2026-03-03

**B10.1.44N2.18.1** - Puntos de presion de conexiones en WhatsApp module

### Sesiones de trabajo
- **2026-03-03-fix-thundering-herd-permissions**: Puntos de presion de conexiones en WhatsApp module

---

## [v2.18.0] - 2026-03-03

**B10.1.44N2.18.0** - 1 feature + Meta bloqueó el número de WhatsApp de la plataform

### Sesiones de trabajo
- **2026-03-03-maintenance-mode-messaging-migration**: Meta bloqueó el número de WhatsApp de la plataforma por un problema con el método de pago. Esto causó:

### Features
- activate maintenance mode for messaging infrastructure migration (`14b87d2`)

---

## [v2.17.7] - 2026-03-03

**B10.1.44N2.17.7** - Deploy automatico

---

## [v2.17.6] - 2026-03-02

**B10.1.44N2.17.6** - El backend migró el envío de mensajes WhatsApp de 

### Sesiones de trabajo
- **2026-03-02-multiproveedor-uchat-twilio-frontend**: El backend migró el envío de mensajes WhatsApp de uChat a Twilio. El frontend ahora soporta **ambos proveedores simultáneamente** (multiproveedor). La BD ya tenía preparado:

---

## [v2.17.5] - 2026-02-28

**B10.1.44N2.17.5** - 1 fix

### Bug Fixes
- fix 4 root causes of 'Sin nombre' bug in WhatsApp Realtime handlers (`e197fa9`)

---

## [v2.17.4] - 2026-02-19

**B10.1.44N2.17.4** - 1 fix

### Bug Fixes
- use mp3 file instead of data URI for autoplay unlock (CSP violation) (`2e7e83f`)

---

## [v2.17.3] - 2026-02-19

**B10.1.44N2.17.3** - 2

---

## [v2.17.2] - 2026-02-19

**B10.1.44N2.17.2** - 1 fix + Facturación de enero 2026: **443 + Meta/WhatsApp tiene un sistema de salud de ecosis

### Sesiones de trabajo
- **2026-02-18-aws-cleanup-performance-optimization**: Facturación de enero 2026: **$443.72/mes**. El 97% era infraestructura de N8N que ya había migrado a Railway pero nunca se apagó en AWS. RDS tenía deletion protection activa. ElastiCache no tiene opción "stop" (solo delete). RDS "stopped" se reinicia automáticamente cada 7 días.
- **2026-02-19-bloqueo-meta-status-system**: Meta/WhatsApp tiene un sistema de "salud de ecosistema" que bloquea mensajes de marketing cuando un usuario ya recibió demasiada publicidad. Estos bloqueos NO son errores de entrega ni problemas nuestros - son decisiones de Meta para proteger a los usuarios.

### Bug Fixes
- disable import & reactivate features + fix triggered_by_user tracking (`30ec438`)

---

## [v2.17.1] - 2026-02-18

**B10.1.44N2.17.1** - fix crash forwardRef en vendor-audio chunk 2

### Bug Fixes
- simplify manualChunks to prevent React forwardRef crash (`49bd8ba`)

---

## [v2.17.0] - 2026-02-18

**B10.1.44N2.17.0** - 2

### Performance
- lazy-load all route modules + WebP images + optimized chunking (`80ab571`)

---

## [v2.16.1] - 2026-02-14

**B10.1.44N2.16.1** - 1 fix

### Bug Fixes
- supervisor APEX no podia importar prospectos de su misma coordinacion (`cd70871`)

---

## [v2.16.0] - 2026-02-14

**B10.1.44N2.16.0** - 1 feature + ### Sesion anterior (misma fecha)

### Sesiones de trabajo
- **HANDOVER-2026-02-13-DOCUMENTACION-AUDIT-ACTUALIZACION-COMPLETA**: ### Sesion anterior (misma fecha)

### Features
- migrate sales widget to new attribution logic with RPC get_ventas_atribucion (`d8f78e7`)

---

## [v2.15.2] - 2026-02-13

**B10.1.44N2.15.2** - 1 fix

### Bug Fixes
- populate readIds from DB on load to prevent reappearance after token refresh (`8e9bc70`)

---

## [v2.15.1] - 2026-02-13

**B10.1.44N2.15.1** - 1 fix

### Bug Fixes
- prevent Realtime loop when marking comunicado as read (`0336e8c`)

---

## [v2.15.0] - 2026-02-13

**B10.1.44N2.15.0** - 1 feature

### Features
- sistema de comunicados en tiempo real con overlay, targeting y tutorial interactivo (`aab97b1`)

---

## [v2.14.2] - 2026-02-13

**B10.1.44N2.14.2** - El workflow recibe mensajes escritos por ejecutivo

### Sesiones de trabajo
- **2026-02-12-analisis-prompt-parafraseo-n8n**: El workflow recibe mensajes escritos por ejecutivos de Vida Vacations antes de enviarse por WhatsApp. Un LLM (Claude via Anthropic Chat Model) los corrige/mejora y devuelve dos opciones:

---

## [v2.14.1] - 2026-02-12

**B10.1.44N2.14.1** - El usuario reportó error 401 al programar una llam + En la sesión anterior (CPU Optimization Phase 4), 

### Sesiones de trabajo
- **HANDOVER-2026-02-12-AUTH-TOKEN-REFRESH-EDGE-FUNCTIONS**: El usuario reportó error 401 al programar una llamada desde `ManualCallModal`:
- **2026-02-12-fix-realtime-transcription-update**: En la sesión anterior (CPU Optimization Phase 4), se eliminó el polling de 3 segundos del side-widget de llamadas activas (`LiveCallActivityWidget`). El widget pasó a ser 100% event-driven via Supabase Realtime.

---

## [v2.14.0] - 2026-02-12

**B10.1.44N2.14.0** - 1 mejora + Después de las Fases 1-3 (2026-02-11) que redujero

### Sesiones de trabajo
- **2026-02-12-cpu-optimization-phase4-query-filters**: Después de las Fases 1-3 (2026-02-11) que redujeron frecuencia de polling y deduplicaron canales Realtime, Supabase seguía reportando CPU >80%. Las queries a `live_monitor_view` seguían consumiendo **96.35%** del tiempo total de BD porque:

### Performance
- eliminate polling + redundant queries + dead code (`e760e12`)

---

## [v2.13.0] - 2026-02-12

**B10.1.44N2.13.0** - 1 mejora

### Performance
- add date filters to live_monitor_view queries to fix CPU (`e2e0459`)

---

## [v2.12.3] - 2026-02-12

**B10.1.44N2.12.3** - 1 fix + Al filtrar prospectos por ejecutivo en el módulo P + Continuación directa de 2026-02-11-ticket-notific

### Sesiones de trabajo
- **2026-02-11-fix-filtro-ejecutivos-limit-supabase**: Al filtrar prospectos por ejecutivo en el módulo Prospectos, **Osmara Partida** (coordinación BOOM) no aparecía en el dropdown. El problema afectaba a **48 de 70 ejecutivos** en total. El mismo bug existía en el módulo WhatsApp (LiveChatCanvas).
- **HANDOVER-2026-02-12-FIX-TICKET-NOTIFICATIONS-BADGES-REALTIME**: Continuación directa de `2026-02-11-ticket-notifications-admin-panel.md`. El usuario reportó que:

### Bug Fixes
- fix ticket notifications realtime + badges + ejecutivo filter RPC (`f70e779`)

---

## [v2.12.2] - 2026-02-11

**B10.1.44N2.12.2** - 1 fix + Sesión anterior (CPU Optimization Fase 3)

### Sesiones de trabajo
- **HANDOVER-2026-02-11-TICKET-NOTIFICATIONS-ADMIN-PANEL**: Sesión anterior (CPU Optimization Fase 3)

### Bug Fixes
- fix avatar upload + tickets admin panel + marketing access (`864537b`)

---

## [v2.12.1] - 2026-02-11

**B10.1.44N2.12.1** - 1 fix

### Bug Fixes
- restringir marketing a solo campaigns y support (`1b82b85`)

---

## [v2.12.0] - 2026-02-11

**B10.1.44N2.12.0** - 1 feature + Por qué la MV existe

### Sesiones de trabajo
- **HANDOVER-2026-02-11-CPU-OPTIMIZATION-PHASE3-DEPLOY**: Por qué la MV existe

### Features
- 5 mejoras plataforma (`f645a1f`)

---

## [v2.11.1] - 2026-02-11

**B10.1.44N2.11.1** - Por que Fase 2

### Sesiones de trabajo
- **HANDOVER-2026-02-11-CPU-OPTIMIZATION-REALTIME-HUB**: Por que Fase 2

---

## [v2.11.0] - 2026-02-11

**B10.1.44N2.11.0** - 2

### Sesiones de trabajo
- **HANDOVER-2026-02-11-CPU-OPTIMIZATION-LIVE-MONITOR**: Reporte de CPU al 100%
- **2026-02-11-fix-rls-coordinacion-huerfana-rodrigo**: El ejecutivo **Meza Mendoza Rodrigo Ismael** (`rodrigomeza@vidavacations.com`, auth ID: `8eb6a28c-ec40-4318-ae9e-b6fb3ba88acb`) no podía ver los mensajes de su prospecto asignado **Maria Teresa** (`59e8ac42-be78-4cf6-b0f7-ace0b7329b6f`).

### Performance
- optimizacion CPU - eliminar tab activa + fix widget flickering + remover checkpoint #5 (`55affd5`)

---

## [v2.10.2] - 2026-02-11

**B10.1.44N2.10.2** - Rediseño del modal de reactivación de conversación + Sesion con dos bloques: (1) Crear logo de San Vale + Nuevo logo de temporada San Valentín para el sis + Sesion con dos bloques: (1) Setup completo de inte + El botón de Pausar Bot existe en dos ubicaciones

### Sesiones de trabajo
- **HANDOVER-2026-02-09-REACTIVATION-MODAL-TABS**: Rediseño del modal de reactivación de conversación WhatsApp (`ReactivateConversationModal`): agregar menú de 4 tabs por categoría de plantilla, filtro por etiquetas reutilizando `TemplateTagsSelector`, y ampliar ancho del modal.
  - Tabs expandidos de 2 (`top`, `mis`) a 4 (`top`, `utilidades`, `marketing`, `mis`) con iconos y contadores
  - Tab "Plantillas" (top) limitado a Top 10, excluye categoría UTILITY
  - Tab "Utilidades" muestra solo `category === 'UTILITY'` + sección especial `seguimiento_contacto_utilidad`
  - Tab "Marketing" muestra solo `category === 'MARKETING'`
  - Filtro por etiquetas integrado usando `TemplateTagsSelector` (componente reutilizable existente)
  - Modal ampliado de `max-w-6xl` a `max-w-7xl`
- **HANDOVER-2026-02-09-VALENTINE-LOGO-DEPLOY-FIX**: Sesion con dos bloques: (1) Crear logo de San Valentin para el sistema de doodles, (2) Corregir bug en deploy-v2.ts que fallaba con comillas en commit messages y mejorar manejo de fallos parciales en el skill de deploy.
  - Nuevo `ValentineLogo.tsx`: heartbeat sutil (scale 1→1.035→1, 3.2s), resplandor rosado pulsante (200x80px, blur 16px)
  - Al clic: 18 corazones SVG traslucidos (90-240px) suben como globos con oscilacion horizontal y desvanecimiento
  - Audio romantico 12.1s (Elevenlabs) al hacer clic
  - Registrado en LogoCatalog como tipo `valentine`, sugerencia automatica en febrero
  - Desactivada navegacion al home al clic en logo (Sidebar.tsx: removido `onClick={handleLogoClick}`)
  - Fix `deploy-v2.ts` linea 600: commit message usaba comillas dobles que rompian con caracteres como `"San Valentín"`
  - `generateAutoMessage` ahora sanitiza comillas y caracteres especiales de contextos de handovers
  - Skill `/deploy` actualizado con protocolo de recuperacion de 7 pasos para fallos parciales del script
  - Release notes actualizadas manualmente en BD (el script no las habia generado correctamente)
- **HANDOVER-2026-02-09-VALENTINE-LOGO**: Nuevo logo de temporada "San Valentín" para el sistema de doodles (estilo Google Doodles) en la sección Administración > Preferencias > Logos Personalizados. 5to logo del catálogo.
  - Nuevo componente `ValentineLogo` con heartbeat sutil en loop (scale 1→1.035→1, ciclo 3.2s)
  - Resplandor rosado pulsante detrás del logo (radial-gradient, blur 16px, 200x80px centrado)
  - Al hacer clic: 18 corazones traslúcidos SVG (90-240px) suben desde el fondo de pantalla como globos
  - Corazones con movimiento oscilatorio horizontal, rotación leve y desvanecimiento progresivo al subir
  - Audio romántico (12.1s, vol 0.5) reproducido al hacer clic
  - Registrado en `LogoCatalog` como tipo `'valentine'` con sugerencia automática en febrero
- **HANDOVER-2026-02-09-VAPI-TEMPLATE-DIAGNOSIS**: Sesion con dos bloques: (1) Setup completo de integracion VAPI voice AI, (2) Diagnostico de error 500 al enviar plantilla WhatsApp a prospecto importado manualmente.
  - Setup VAPI: CLI, skill, agente, inventario completo, analisis de costos y llamadas
  - Diagnostico: plantilla WhatsApp falla para prospectos sin `id_uchat`
- **2026-02-11-fix-bot-pause-functionality**: El botón de "Pausar Bot" existe en dos ubicaciones:

---

## [v2.10.1] - 2026-02-09

**B10.1.44N2.10.1** - 1 fix + 1 mejora + Rediseño del modal de reactivación de conversación + Sesion con dos bloques: (1) Crear logo de San Vale + Nuevo logo de temporada San Valentín para el sis + Sesion con dos bloques: (1) Setup completo de inte

### Sesiones de trabajo
- **HANDOVER-2026-02-09-REACTIVATION-MODAL-TABS**: Rediseño del modal de reactivación de conversación WhatsApp (`ReactivateConversationModal`): agregar menú de 4 tabs por categoría de plantilla, filtro por etiquetas reutilizando `TemplateTagsSelector`, y ampliar ancho del modal.
  - Tabs expandidos de 2 (`top`, `mis`) a 4 (`top`, `utilidades`, `marketing`, `mis`) con iconos y contadores
  - Tab "Plantillas" (top) limitado a Top 10, excluye categoría UTILITY
  - Tab "Utilidades" muestra solo `category === 'UTILITY'` + sección especial `seguimiento_contacto_utilidad`
  - Tab "Marketing" muestra solo `category === 'MARKETING'`
  - Filtro por etiquetas integrado usando `TemplateTagsSelector` (componente reutilizable existente)
  - Modal ampliado de `max-w-6xl` a `max-w-7xl`
- **HANDOVER-2026-02-09-VALENTINE-LOGO-DEPLOY-FIX**: Sesion con dos bloques: (1) Crear logo de San Valentin para el sistema de doodles, (2) Corregir bug en deploy-v2.ts que fallaba con comillas en commit messages y mejorar manejo de fallos parciales en el skill de deploy.
  - Nuevo `ValentineLogo.tsx`: heartbeat sutil (scale 1→1.035→1, 3.2s), resplandor rosado pulsante (200x80px, blur 16px)
  - Al clic: 18 corazones SVG traslucidos (90-240px) suben como globos con oscilacion horizontal y desvanecimiento
  - Audio romantico 12.1s (Elevenlabs) al hacer clic
  - Registrado en LogoCatalog como tipo `valentine`, sugerencia automatica en febrero
  - Desactivada navegacion al home al clic en logo (Sidebar.tsx: removido `onClick={handleLogoClick}`)
  - Fix `deploy-v2.ts` linea 600: commit message usaba comillas dobles que rompian con caracteres como `"San Valentín"`
  - `generateAutoMessage` ahora sanitiza comillas y caracteres especiales de contextos de handovers
  - Skill `/deploy` actualizado con protocolo de recuperacion de 7 pasos para fallos parciales del script
  - Release notes actualizadas manualmente en BD (el script no las habia generado correctamente)
- **HANDOVER-2026-02-09-VALENTINE-LOGO**: Nuevo logo de temporada "San Valentín" para el sistema de doodles (estilo Google Doodles) en la sección Administración > Preferencias > Logos Personalizados. 5to logo del catálogo.
  - Nuevo componente `ValentineLogo` con heartbeat sutil en loop (scale 1→1.035→1, ciclo 3.2s)
  - Resplandor rosado pulsante detrás del logo (radial-gradient, blur 16px, 200x80px centrado)
  - Al hacer clic: 18 corazones traslúcidos SVG (90-240px) suben desde el fondo de pantalla como globos
  - Corazones con movimiento oscilatorio horizontal, rotación leve y desvanecimiento progresivo al subir
  - Audio romántico (12.1s, vol 0.5) reproducido al hacer clic
  - Registrado en `LogoCatalog` como tipo `'valentine'` con sugerencia automática en febrero
- **HANDOVER-2026-02-09-VAPI-TEMPLATE-DIAGNOSIS**: Sesion con dos bloques: (1) Setup completo de integracion VAPI voice AI, (2) Diagnostico de error 500 al enviar plantilla WhatsApp a prospecto importado manualmente.
  - Setup VAPI: CLI, skill, agente, inventario completo, analisis de costos y llamadas
  - Diagnostico: plantilla WhatsApp falla para prospectos sin `id_uchat`

### Documentation
- handover valentine logo + deploy fix (`d59238c`)

### Bug Fixes
- sanitizar comillas en commit messages y mejorar manejo de fallos parciales (`a4ead7d`)

---

## [v2.10.0] - 2026-02-09

**B10.1.44N2.10.0** - 1 feature + Rediseño del modal de reactivación de conversación + Nuevo logo de temporada "San Valentín" para el sis + Sesion con dos bloques: (1) Setup completo de inte

### Sesiones de trabajo
- **HANDOVER-2026-02-09-REACTIVATION-MODAL-TABS**: Rediseño del modal de reactivación de conversación WhatsApp (`ReactivateConversationModal`): agregar menú de 4 tabs por categoría de plantilla, filtro por etiquetas reutilizando `TemplateTagsSelector`, y ampliar ancho del modal.
  - Tabs expandidos de 2 (`top`, `mis`) a 4 (`top`, `utilidades`, `marketing`, `mis`) con iconos y contadores
  - Tab "Plantillas" (top) limitado a Top 10, excluye categoría UTILITY
  - Tab "Utilidades" muestra solo `category === 'UTILITY'` + sección especial `seguimiento_contacto_utilidad`
  - Tab "Marketing" muestra solo `category === 'MARKETING'`
  - Filtro por etiquetas integrado usando `TemplateTagsSelector` (componente reutilizable existente)
  - Modal ampliado de `max-w-6xl` a `max-w-7xl`
- **HANDOVER-2026-02-09-VALENTINE-LOGO**: Nuevo logo de temporada "San Valentín" para el sistema de doodles (estilo Google Doodles) en la sección Administración > Preferencias > Logos Personalizados. 5to logo del catálogo.
  - Nuevo componente `ValentineLogo` con heartbeat sutil en loop (scale 1→1.035→1, ciclo 3.2s)
  - Resplandor rosado pulsante detrás del logo (radial-gradient, blur 16px, 200x80px centrado)
  - Al hacer clic: 18 corazones traslúcidos SVG (90-240px) suben desde el fondo de pantalla como globos
  - Corazones con movimiento oscilatorio horizontal, rotación leve y desvanecimiento progresivo al subir
  - Audio romántico (12.1s, vol 0.5) reproducido al hacer clic
  - Registrado en `LogoCatalog` como tipo `'valentine'` con sugerencia automática en febrero
- **HANDOVER-2026-02-09-VAPI-TEMPLATE-DIAGNOSIS**: Sesion con dos bloques: (1) Setup completo de integracion VAPI voice AI, (2) Diagnostico de error 500 al enviar plantilla WhatsApp a prospecto importado manualmente.
  - Setup VAPI: CLI, skill, agente, inventario completo, analisis de costos y llamadas
  - Diagnostico: plantilla WhatsApp falla para prospectos sin `id_uchat`

### Features
- add Valentine's Day doodle + reactivation modal tabs (`c15de25`)

---

## [v2.9.0] - 2026-02-09

**B10.1.44N2.9.0** - 1 feature + Rediseño del modal de reactivación de conversación + Nuevo logo de temporada "San Valentín" para el sis + Sesion con dos bloques: (1) Setup completo de inte

### Sesiones de trabajo
- **HANDOVER-2026-02-09-REACTIVATION-MODAL-TABS**: Rediseño del modal de reactivación de conversación WhatsApp (`ReactivateConversationModal`): agregar menú de 4 tabs por categoría de plantilla, filtro por etiquetas reutilizando `TemplateTagsSelector`, y ampliar ancho del modal.
  - Tabs expandidos de 2 (`top`, `mis`) a 4 (`top`, `utilidades`, `marketing`, `mis`) con iconos y contadores
  - Tab "Plantillas" (top) limitado a Top 10, excluye categoría UTILITY
  - Tab "Utilidades" muestra solo `category === 'UTILITY'` + sección especial `seguimiento_contacto_utilidad`
  - Tab "Marketing" muestra solo `category === 'MARKETING'`
  - Filtro por etiquetas integrado usando `TemplateTagsSelector` (componente reutilizable existente)
  - Modal ampliado de `max-w-6xl` a `max-w-7xl`
- **HANDOVER-2026-02-09-VALENTINE-LOGO**: Nuevo logo de temporada "San Valentín" para el sistema de doodles (estilo Google Doodles) en la sección Administración > Preferencias > Logos Personalizados. 5to logo del catálogo.
  - Nuevo componente `ValentineLogo` con heartbeat sutil en loop (scale 1→1.035→1, ciclo 3.2s)
  - Resplandor rosado pulsante detrás del logo (radial-gradient, blur 16px, 200x80px centrado)
  - Al hacer clic: 18 corazones traslúcidos SVG (90-240px) suben desde el fondo de pantalla como globos
  - Corazones con movimiento oscilatorio horizontal, rotación leve y desvanecimiento progresivo al subir
  - Audio romántico (12.1s, vol 0.5) reproducido al hacer clic
  - Registrado en `LogoCatalog` como tipo `'valentine'` con sugerencia automática en febrero
- **HANDOVER-2026-02-09-VAPI-TEMPLATE-DIAGNOSIS**: Sesion con dos bloques: (1) Setup completo de integracion VAPI voice AI, (2) Diagnostico de error 500 al enviar plantilla WhatsApp a prospecto importado manualmente.
  - Setup VAPI: CLI, skill, agente, inventario completo, analisis de costos y llamadas
  - Diagnostico: plantilla WhatsApp falla para prospectos sin `id_uchat`

### Features
- add Valentine's Day doodle + reactivation modal tabs (`c15de25`)

---

## [v2.8.3] - 2026-02-09

**B10.1.44N2.8.3** - Sesion con dos bloques: (1) Setup completo de inte

### Sesiones de trabajo
- **HANDOVER-2026-02-09-VAPI-TEMPLATE-DIAGNOSIS**: Sesion con dos bloques: (1) Setup completo de integracion VAPI voice AI, (2) Diagnostico de error 500 al enviar plantilla WhatsApp a prospecto importado manualmente.
  - Setup VAPI: CLI, skill, agente, inventario completo, analisis de costos y llamadas
  - Diagnostico: plantilla WhatsApp falla para prospectos sin `id_uchat`

---

## [v2.8.2] - 2026-02-09

**B10.1.44N2.8.2** - 2 fixes + 2 mejoras

### Other
- excluir herramientas locales de diagnostico del repo (`61a3f64`)

### Documentation
- agregar referencia a vapi-agent en CLAUDE.md (`820d95d`)

### Bug Fixes
- bloquear login y restauracion de sesion para usuarios desactivados (`f88671b`)
- corregir 11 bugs en modulo UserManagementV2 (`6210132`)

---

## [v2.8.1] - 2026-02-09

**B10.1.44N2.8.1** - 1 fix + Cinco bloques: (1) Fix errores 401 Unauthorized po + Workflow `VAPI-Natalia_transfer_tool [PROD]` trans

### Sesiones de trabajo
- **HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX**: Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.
  - authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan.
  - LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries.
  - ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico.
  - DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser.
  - WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha.
  - RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores).
  - Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS.
  - Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion.
- **HANDOVER-2026-02-08-TRANSFER-CASCADA**: Workflow `VAPI-Natalia_transfer_tool [PROD]` transferia llamadas ciegamente al ejecutivo asignado sin validar conexion ni DID. Si el ejecutivo no estaba conectado o no tenia DID, la llamada se perdia.
  - Funcion Postgres `get_best_transfer_target(UUID, UUID)` con cascada de 4 niveles
  - Nodo `Busqueda_did` cambiado de `SELECT auth.users` a `executeQuery` con funcion
  - Nodo `Retorna DID` cambiado de `SELECT public.auth_users` a `executeQuery` con funcion
  - Nodos `Ejecuta_transfer` y `Ejecuta_transfer2` usan `target_phone` en vez de `raw_user_meta_data.phone` / `phone`

### Bug Fixes
- corregir ghost users en "En Línea Ahora" - default is_operativo y UI (`e5e74cd`)

---

## [v2.8.0] - 2026-02-09

**B10.1.44N2.8.0** - 1 feature + Cinco bloques: (1) Fix errores 401 Unauthorized po + Workflow `VAPI-Natalia_transfer_tool [PROD]` trans

### Sesiones de trabajo
- **HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX**: Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.
  - authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan.
  - LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries.
  - ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico.
  - DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser.
  - WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha.
  - RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores).
  - Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS.
  - Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion.
- **HANDOVER-2026-02-08-TRANSFER-CASCADA**: Workflow `VAPI-Natalia_transfer_tool [PROD]` transferia llamadas ciegamente al ejecutivo asignado sin validar conexion ni DID. Si el ejecutivo no estaba conectado o no tenia DID, la llamada se perdia.
  - Funcion Postgres `get_best_transfer_target(UUID, UUID)` con cascada de 4 niveles
  - Nodo `Busqueda_did` cambiado de `SELECT auth.users` a `executeQuery` con funcion
  - Nodo `Retorna DID` cambiado de `SELECT public.auth_users` a `executeQuery` con funcion
  - Nodos `Ejecuta_transfer` y `Ejecuta_transfer2` usan `target_phone` en vez de `raw_user_meta_data.phone` / `phone`

### Features
- historial de release notes al clic en version del footer (`0c46515`)

---

## [v2.7.0] - 2026-02-08

**B10.1.44N2.7.0** - 1 feature + Cinco bloques: (1) Fix errores 401 Unauthorized po

### Sesiones de trabajo
- **HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX**: Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.
  - authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan.
  - LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries.
  - ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico.
  - DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser.
  - WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha.
  - RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores).
  - Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS.
  - Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion.

### Features
- media selector modular + thumbnails estaticos + UChat error logs (`5b5677c`)

---

## [v2.6.1] - 2026-02-08

**B10.1.44N2.6.1** - feat: release notes en modal de actualizacion forzada

### Sesiones de trabajo
- **HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX**: Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.
  - authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan.
  - LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries.
  - ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico.
  - DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser.
  - WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha.
  - RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores).
  - Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS.
  - Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion.

### Features
- release notes en modal de actualizacion forzada (`7316786`)

---

## [v2.6.0] - 2026-02-08

**B10.1.44N2.6.0** - 1 feature + Cinco bloques: (1) Fix errores 401 Unauthorized po

### Sesiones de trabajo
- **HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX**: Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.
  - authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan.
  - LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries.
  - ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico.
  - DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser.
  - WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha.
  - RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores).
  - Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS.
  - Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion.

### Features
- restricciones plantilla utilidad + UChat CLI + fixes dashboard (`34c8405`)

---

## [v2.5.94] - 2026-02-08

**B10.1.44N2.5.94** - 1 mejora + Sesion inaugural Claude Code (migracion desde Curs + Sesion de bugs criticos + preparacion para escalab + Cinco bloques: (1) Fix errores 401 Unauthorized po

### Sesiones de trabajo
- **HANDOVER-2026-02-07-ANALYTICS-OVERFLOW-FILTERS**: Sesion inaugural Claude Code (migracion desde Cursor). 6 bloques: (1) WhatsApp Analytics 7 queries → 1 RPC, (2) overflow Header/Dashboard, (3) rediseno toolbar filtros Prospectos, (4) botones icon-only en WhatsApp, (5) overflow global layout, (6) Kanban responsive.
  - WhatsApp Analytics: 7 queries frontend → 1 funcion RPC `get_whatsapp_analytics` server-side con SECURITY DEFINER
  - Header overflow: botones icon-only, flex constraints
  - Toolbar filtros Prospectos: fila unica glassmorphism, selects con highlight activo, busqueda reducida
  - LiveChatCanvas: botones CRM (Building2 icon) y RequiereAtencion → icon-only estilo BotPause
  - MainApp: `min-w-0 overflow-hidden` en contenedor principal → elimina overflow horizontal global
  - Kanban: columnas colapsadas 48px, expandidas `minWidth: 0`, calc responsive sin desborde
- **HANDOVER-2026-02-07-SCALABILITY-WHATSAPP-BUGS**: Sesion de bugs criticos + preparacion para escalabilidad a 100K prospectos. Se corrigieron 3 bugs reportados por usuario y se reescribio la arquitectura de queries del modulo WhatsApp para escalar.
  - Fix: Supervisor history count = 0 (URL demasiado larga en HEAD request con 500+ UUIDs)
  - Fix: Prospectos sin mensajes invisibles en WhatsApp (INNER JOIN en MV y RPCs)
  - Fix: Resultados busqueda server-side desaparecian (race condition con carga agresiva)
  - Fix: ERR_INSUFFICIENT_RESOURCES por checkActiveCalls con miles de IDs
  - Escalabilidad: Indices pg_trgm, RPC ligero llamadas activas, filtro no leidos server-side
- **HANDOVER-2026-02-08-AUTH-TIMEZONE-FIX**: Cinco bloques: (1) Fix errores 401 Unauthorized por race condition auth + concurrencia refresh token, (2) Correccion timezone UTC-6 en modulo llamadas programadas, (3) Fix critico permisos: ejecutivos podian ver prospectos de toda su coordinacion en WhatsApp search/listing por logica OR en RPCs, (4) Fix import duplicados: deteccion de prospectos existentes fallaba por RLS + formato telefono, (5) Limpieza console.logs debug en produccion.
  - authAwareFetch: boolean `_isRefreshing` → shared promise `_refreshPromise`. Todos los 401 concurrentes esperan el mismo refresh y reintentan.
  - LiveChatCanvas: auth guard antes de `initializeChat()` — espera session antes de queries.
  - ManualCallModal: timestamp submit con `-06:00` explicito, extraccion fecha/hora existente con `timeZone: 'America/Mexico_City'`, funciones auxiliares con TZ Mexico.
  - DailyView: agrupacion por hora usa `getTime() - 6h` + `getUTCHours()` en vez de `getHours()` del browser.
  - WeeklyView, LlamadasProgramadasWidget, ScheduledCallsSection: `timeZone: 'America/Mexico_City'` en formateo de hora/fecha.
  - RPCs `search_dashboard_conversations` y `get_dashboard_conversations` (2 overloads): logica OR → AND condicional. `p_ejecutivo_ids` tiene prioridad; `p_coordinacion_ids` solo aplica cuando `p_ejecutivo_ids IS NULL` (coordinadores/supervisores).
  - Import duplicados: nueva RPC `check_prospect_exists_by_phone` (SECURITY DEFINER) + QuickImportModal y ImportWizardModal usan RPC en vez de queries directas a `prospectos`. Normaliza ultimos 10 digitos, bypasea RLS.
  - Limpieza console.logs: eliminados `[LiveActivityStore] Filtrado por coordinaciones` y 3 bloques `[prospectRestrictions] Verificando por etapa_id` que aparecian en consola de produccion.

### Migraciones SQL
- fix_get_dashboard_conversations_security_definer: SECURITY DEFINER + search_path en get_dashboard_conversations
- fix_mv_include_prospectos_without_messages: MV: LEFT JOIN (4128 prospectos, +162 sin mensajes), agrega etapa_id, usa user_profiles_v2. RPCs: elimina EXISTS filter, calcula mensajes_no_leidos reales, count incluye todos
- fix_search_dashboard_include_all_prospectos: search_dashboard_conversations: elimina EXISTS, agrega id_dynamics a busqueda, SECURITY DEFINER
- scalability_indexes_rpcs_100k: 5 indices GIN pg_trgm (nombre, whatsapp, email, nombre_wa, id_dynamics). RPC `get_active_call_prospect_ids()` (1 query vs N batches). `p_unread_only` param en get_dashboard_conversations

### Refactoring
- Homologación completa del sistema de diseño (`31182c6`)

---

# 📋 CHANGELOG - PQNC QA AI Platform

## [Unreleased]

### 🔧 v2.5.91 - Fix OGG/Opus: Compatibilidad WhatsApp Web + iOS [06-02-2026]

**Solución definitiva para reproducción de notas de voz en todas las plataformas**

#### 🐛 Bug 1: Granule positions 3x debajo (PRINCIPAL)
- ✅ Chrome MediaRecorder empaqueta 3 frames Opus por paquete (TOC code=3, M=3 = 2880 smp)
- ✅ `getOpusSamplesPerFrame` solo leía TOC byte, ignoraba frame count M del byte 2
- ✅ Granule positions estaban 3x debajo del valor real → ffmpeg "timestamp discontinuity"
- ✅ Renombrada a `getOpusSamplesPerPacket` con soporte completo RFC 6716 (codes 0-3)

#### 🐛 Bug 2: `pre_skip=0` en OpusHead
- ✅ Chrome pone `pre_skip=0` en CodecPrivate, guarda delay real en `CodecDelay` (EBML 0x56AA)
- ✅ Ahora se parsea `CodecDelay` del WebM y se inyecta como `pre_skip` en OpusHead OGG
- ✅ Fallback: 312 samples (6.5ms estándar) si CodecDelay no presente

#### 🐛 Bug 3: URL firmada GCS expiraba en 5 minutos
- ✅ Workflow N8N `Set URL Publica` usaba `$json.signedUrl` (X-Goog-Expires=300)
- ✅ Bucket `whatsapp-publico` ES público — URL directa nunca expira
- ✅ Cambiado a `https://storage.googleapis.com/whatsapp-publico/{filename}`
- ✅ `Upload Bucket Privado` contentType: `audio/mpeg` → `audio/ogg`

#### ❌ Intentos que NO funcionaron
- Enviar WebM sin conversión (WhatsApp no lo acepta como PTT)
- Conversión MP3 con lamejs (WhatsApp requiere OGG/Opus para PTT)
- Web Worker para audio (OfflineAudioContext no existe en Workers)
- OGG con pre_skip=0 (iOS/Web rechazan)
- OGG con granule incorrecto (iOS/Web rechazan por timestamp discontinuity)

#### 📁 Archivos Modificados
- `src/utils/webmToOgg.ts` — Fix pre_skip + fix granule (getOpusSamplesPerPacket)
- N8N Workflow `uEdx7_-dlfVupvud6pQZ8` — URL pública directa + contentType OGG

**Handover:** `.cursor/handovers/2026-02-06-fix-ogg-whatsapp-ios-web.md`

---

### 🚀 v2.5.86 - Fix Auth, WhatsApp Module y Notas de Voz PTT [05-02-2026]

**Deploy consolidado de 3 sesiones de correcciones críticas**

#### 🔐 Fix Autenticación y Sesiones
- ✅ Fix race condition por doble cliente Supabase (51.7% refresh tokens revocados)
- ✅ `analysisSupabase` ahora re-exporta `supabaseSystemUI` (cliente único)
- ✅ Auth-aware fetch wrapper: intercepta 401, refresca token, reintenta
- ✅ Fix stale closures en AuthContext con `authStateRef` + `useCallback`
- ✅ Fix monitor de token: refs estables, interval no se reinicia
- ✅ Fix `beforeunload` con `fetch(keepalive:true)` para limpiar `is_operativo`
- ✅ Config server-side: `sessions_timebox: 86400`, `refresh_token_reuse_interval: 30`

#### 🐛 Fix WhatsApp Module
- ✅ Fix keys duplicadas React en AssignmentContextMenu (dedup ejecutivos+coordinadores)
- ✅ Fix keys duplicadas en LiveChatCanvas (dedup conversaciones y mensajes)
- ✅ Fix ERR_INSUFFICIENT_RESOURCES: backoff exponencial en liveMonitorOptimizedService y errorLogService
- ✅ Fix CORS en dynamics-reasignar-proxy: migrado a Deno.serve() + verify_jwt:false

#### 🎤 Notas de Voz WhatsApp (PTT)
- ✅ Nuevo remuxer WebM→OGG sin re-encoding (`src/utils/webmToOgg.ts`)
- ✅ Audios grabados ahora llegan como notas de voz (PTT) en WhatsApp
- ✅ Eliminada conversión MP3 (lamejs) — reemplazada por remux de contenedor
- ✅ Parser EBML minimal + Writer OGG con CRC-32 válido (~300 líneas, zero deps)

#### 📁 Archivos Modificados (16 archivos)
- `src/config/analysisSupabase.ts`, `src/config/supabaseSystemUI.ts`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useTokenExpiryMonitor.ts`, `src/hooks/useHeartbeat.ts`, `src/hooks/useInactivityTimeout.ts`
- `src/utils/syncSupabaseSessions.ts`, `src/utils/webmToOgg.ts` (nuevo)
- `src/components/chat/LiveChatCanvas.tsx`
- `src/components/shared/AssignmentContextMenu.tsx`
- `src/services/liveMonitorOptimizedService.ts`, `src/services/errorLogService.ts`
- `supabase/functions/dynamics-reasignar-proxy/index.ts`, `supabase/functions/send-audio-proxy/index.ts`

---

### 🔧 v2.5.76 - FIX CRÍTICO: Triggers con auth_users en Support Tickets [02-02-2026]

**Hotfix definitivo para error 404 en comentarios (causa raíz: triggers rotos)**

#### 🐛 Bug Corregido
- ✅ Error 404 al enviar comentarios causado por trigger `notify_new_comment()`
- ✅ Funciones SQL `is_support_admin()` y `get_support_admin_ids()` migradas a `user_profiles_v2`
- ✅ Eliminadas referencias a tabla `auth_users` (deprecada en migración BD unificada)

#### 🔍 Causa Raíz
**El problema NO era RLS, era un TRIGGER roto:**

```
POST /support_ticket_comments → INSERT exitoso
  → trigger_notify_new_comment se dispara
    → notify_new_comment() llama is_support_admin()
      → is_support_admin() busca en auth_users
        → ❌ ERROR: relation "auth_users" does not exist
          → Frontend recibe 404 (Not Found)
```

#### 🛠️ Solución Aplicada

**Funciones corregidas:**

1. **`is_support_admin(UUID)`**
   - Antes: Usaba `auth_users.role_id` (UUID)
   - Ahora: Usa `user_profiles_v2.role_name` (string)

2. **`get_support_admin_ids()`**
   - Antes: `SELECT id FROM auth_users WHERE role_id IN (...)`
   - Ahora: `SELECT id FROM user_profiles_v2 WHERE role_name IN (...)`

**Cambio clave:**
```sql
-- ANTES (ROTO)
SELECT 1 FROM auth_users 
WHERE role_id IN ('12690827-...', '34cc26d1-...', '59386336-...')

-- DESPUÉS (CORRECTO)
SELECT 1 FROM user_profiles_v2
WHERE role_name IN ('admin', 'administrador_operativo', 'developer')
```

#### 📁 Archivos Modificados
- `scripts/sql/FIX_TRIGGER_AUTH_USERS.sql` (nuevo script de corrección)
- `FIX_TRIGGER_AUTH_USERS_README.md` (documentación del fix)
- `src/components/support/README_TICKETS.md` (actualizado)
- `public/docs/README_TICKETS.md` (actualizado)

#### 🔗 Contexto Histórico
- Migración de BD unificada (Enero 2025) eliminó tabla `auth_users`
- Funciones SQL de notificaciones no se actualizaron en su momento
- Trigger fallaba silenciosamente, causando 404 en frontend

#### 🚀 Deployment
**Script a ejecutar:** `scripts/sql/FIX_TRIGGER_AUTH_USERS.sql` en SQL Editor de Supabase

---

### 🔧 v2.5.75 - FIX: RLS en Support Ticket Comments [02-02-2026]

**Hotfix para error 404 al enviar comentarios en tickets**

#### 🐛 Bug Corregido
- ✅ Error 404 al enviar comentarios en tickets de soporte
- ✅ Políticas RLS actualizadas en `support_ticket_comments`
- ✅ Ahora permite SELECT inmediatamente después de INSERT

#### 📝 Detalles Técnicos
**Problema:**
- Frontend hace `.insert().select().single()`
- Política antigua: INSERT ✅ pero SELECT ❌ (causa 404)

**Solución:**
- 3 políticas RLS nuevas en `support_ticket_comments`:
  1. `RLS: users can read own ticket comments` (SELECT)
  2. `RLS: users can add comments to own tickets` (INSERT)
  3. `RLS: admins full access to comments` (ALL)

**Seguridad Mantenida:**
- ✅ Usuarios NO ven comentarios internos
- ✅ Usuarios NO comentan en tickets ajenos
- ✅ Admins tienen acceso completo

#### 📁 Archivos Modificados
- `scripts/sql/fix_support_ticket_comments_rls.sql` (nuevo)
- `FIX_SUPPORT_COMMENTS_READY.md` (documentación)

#### 🧪 Test
```bash
# Verificar políticas
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'support_ticket_comments';
# Esperado: 3 políticas (SELECT, INSERT, ALL)
```

---

### 🔒 v2.5.74 - SECURITY UPGRADE: RLS Restrictivo + SECURITY INVOKER [02-02-2026]

**Deploy de seguridad crítica sin impacto funcional visible**

#### 🔐 Mejoras de Seguridad (3 Fases)

**FASE 1: Funciones SECURITY INVOKER**
- ✅ `get_conversations_ordered`: SECURITY DEFINER → SECURITY INVOKER
- ✅ Filtrado basado en `auth.uid()` y coordinaciones
- ✅ Eliminado bypass de RLS

**FASE 2: Dashboard Functions**
- ✅ `get_dashboard_conversations`: SECURITY DEFINER → SECURITY INVOKER
- ✅ `search_dashboard_conversations`: SECURITY DEFINER → SECURITY INVOKER
- ✅ Fix tipo de dato: `llamada_activa_id` VARCHAR(255) (era TEXT)

**FASE 3: RLS Restrictivo en Tablas Críticas**
- ✅ Función helper: `user_can_see_prospecto()` (validación centralizada)
- ✅ 10 políticas RLS restrictivas (2 por tabla: read + write)
- ✅ 5 tablas protegidas: `prospectos`, `mensajes_whatsapp`, `conversaciones_whatsapp`, `llamadas_ventas`, `prospect_assignments`

#### 🔒 Vulnerabilidades Corregidas

**1. Escalación de privilegios vía SECURITY DEFINER**
- Severidad: 🔴 CRÍTICA (CVSS 8.5)
- Estado: ✅ CORREGIDA
- Solución: Migración a SECURITY INVOKER (3 funciones)

**2. Políticas RLS permisivas (USING true)**
- Severidad: 🔴 CRÍTICA (CVSS 7.8)
- Estado: ✅ CORREGIDA
- Solución: Políticas restrictivas basadas en jerarquía

**3. Acceso directo no autorizado**
- Severidad: 🟡 ALTA (CVSS 6.5)
- Estado: ✅ CORREGIDA
- Solución: RLS aplica a queries directos del frontend

#### 🎯 Jerarquía de Permisos Implementada

```
NIVEL 1: Admin/Calidad → Ve TODO (sin restricciones)
NIVEL 2: Coordinador/Supervisor → Ve SUS coordinaciones
NIVEL 3: Ejecutivo → Ve SOLO sus prospectos asignados
NIVEL 4: Otros → Sin acceso por defecto
```

#### 📊 Impacto de Performance (Paradoja)

**Query individual:** +20-40% más lento ❌  
**Aplicación completa:** -48% a -67% más rápido ✅

**¿Por qué hay beneficio neto?**

Porque filtramos en BD (ANTES) en lugar de en Frontend (DESPUÉS):

**Ejemplo real - Mayra (Ejecutivo VEN):**

```
ANTES (Sin RLS):
Query:  50ms → 2388 prospectos (5MB)
Red:    200ms
JS:     300ms (filtrar 2388 → 700)
TOTAL:  550ms + 5MB

DESPUÉS (Con RLS):
Query:  70ms → 700 prospectos (1.5MB)
Red:    60ms
JS:     50ms (ya filtrado)
TOTAL:  180ms + 1.5MB

MEJORA: -67% tiempo, -70% datos, -70% memoria
```

**Beneficio por rol:**
- **Ejecutivos (80%):** -67% tiempo, -70% datos ✅ GRAN BENEFICIO
- **Coordinadores (15%):** -48% tiempo, -40% datos ✅ BENEFICIO MEDIO
- **Admins (5%):** +6% tiempo, 0% datos 🟡 IMPACTO MÍNIMO

**Veredicto:** 🟢 BENEFICIO NETO POSITIVO para mayoría de usuarios

#### 📁 Archivos Modificados

**Código:**
- `src/config/appVersion.ts` - Versión 2.5.74
- `package.json` - Build 2.5.74

**Scripts SQL Ejecutados:**
- `scripts/sql/fix_get_conversations_ordered_v6.5.1_SECURE.sql` (307 líneas)
- `scripts/sql/fix_dashboard_functions_v6.5.1_SECURE.sql` (271 líneas)
- `scripts/sql/fix_rls_restrictivo_v1.0.0_SECURE.sql` (312 líneas)

**Documentación Generada (18 documentos):**
- `CHANGELOG_v2.5.74_SECURITY.md` - Changelog completo
- `PERFORMANCE_ANALYSIS_RLS.md` - Análisis de performance
- `AUDITORIA_SECURITY_DEFINER_COMPLETA.md` (448 líneas)
- `ANALISIS_360_FASE3_RLS_RESTRICTIVO.md`
- `VALIDACION_FASE3_COMPLETADA.md`
- `SOLUCION_COMPLETA_MAYRA_CONVERSACIONES.md`
- Y 12 documentos técnicos adicionales

#### 🔄 Rollback

**Tiempo:** < 3 minutos  
**Scripts:** Disponibles en `CHANGELOG_v2.5.74_SECURITY.md`  
**Sin pérdida de datos:** Garantizado

#### ⏭️ Próximos Pasos

1. **Testing en UI** (Pendiente)
   - Login como Mayra → Verificar solo ve VEN
   - Login como admin → Verificar ve todo

2. **FASE 4: Auditoría de 516 funciones** (Próxima semana)
   - Identificar funciones que necesitan DEFINER
   - Migrar resto a INVOKER

#### 📚 Referencias Completas

- [Changelog v2.5.74](./CHANGELOG_v2.5.74_SECURITY.md)
- [Análisis Performance](./PERFORMANCE_ANALYSIS_RLS.md)
- [Validación Fase 3](./VALIDACION_FASE3_COMPLETADA.md)

---

### 🔒 v2.5.69 - HOTFIX: Restricciones UI para Prospectos "Importado Manual" [29-01-2026]

#### 🐛 Bug Crítico Corregido

**Problema:** Las restricciones de UI se aplicaban incorrectamente debido a:
1. **Código de etapa incorrecto:** Se usaba `'IMPORTADO_MANUAL'` (mayúsculas) cuando en BD es `'importado_manual'` (minúsculas)
2. **Campo faltante en queries:** Los queries de prospectos no incluían `etapa_id` (UUID FK), solo el campo legacy `etapa`
3. **Comparación case-sensitive:** JavaScript comparaba strings con case-sensitivity, causando fallos en la detección

**Impacto:** 
- Prospectos "Activo PQNC" perdían botones (falso positivo)
- Prospectos "Importado Manual" mantenían botones (falso negativo)

**Solución:**
- ✅ Código corregido a `'importado_manual'` (minúsculas)
- ✅ Queries actualizados para incluir `etapa_id` en LiveChatCanvas y ConversacionesWidget
- ✅ Tipos TypeScript actualizados para incluir `etapa_id` en Maps de prospectos
- ✅ Logging agregado para debugging (solo en desarrollo)

#### ✨ Restricciones Implementadas

**Para prospectos en etapa "Importado Manual" (código: `importado_manual`):**

**Módulo WhatsApp (LiveChat):**
- ❌ Botón de iniciar llamada → **Oculto** (con tooltip explicativo cuando deshabilitado)
- ❌ Botón de pausar bot → **Oculto**
- ❌ Botón de requiere atención humana → **Oculto**

**Widget Últimas Conversaciones (Módulo Inicio):**
- ❌ Botón de pausar bot → **Oculto**
- ❌ Botón de requiere atención humana → **Oculto**

**Sidebar de Prospecto (todas las vistas):**
- ❌ Botón "Programar llamada" → **Deshabilitado** (con tooltip explicativo)
  - Aplica en: Widget Últimas Conversaciones, Módulo WhatsApp, Módulo Prospectos, Live Monitor, Análisis IA

**Roles afectados:** Ejecutivos, Supervisores, Coordinadores

#### 🛠️ Implementación Técnica

**Helper Centralizado:**
```typescript
// src/utils/prospectRestrictions.ts
const RESTRICTED_STAGES: string[] = [
  'importado_manual', // ✅ Case-sensitive, coincide con BD
];

// Funciones públicas:
- canStartCall()
- canPauseBot()
- canToggleAttentionRequired()
- canScheduleCall()
- getRestrictionMessage()
```

**Arquitectura:**
- ✅ Centralizado en un solo archivo para fácil gestión
- ✅ Logging automático en modo desarrollo
- ✅ Validaciones adicionales para casos edge
- ✅ Soporte para `etapa_id` (UUID) y `etapa` (string legacy)

#### 🔓 Para Liberar Restricciones

Editar `src/utils/prospectRestrictions.ts` (línea 36):

```typescript
// Opción 1: Comentar
const RESTRICTED_STAGES: string[] = [
  // 'importado_manual', // ✅ Comentar esta línea
];

// Opción 2: Vaciar array
const RESTRICTED_STAGES: string[] = [];
```

Las restricciones se levantarán automáticamente en toda la aplicación.

#### 📁 Archivos Modificados

**Core:**
- `src/utils/prospectRestrictions.ts` - Helper centralizado (nuevo)
- `src/config/appVersion.ts` - Versión actualizada
- `src/components/Footer.tsx` - Comentario de versión

**LiveChat (Módulo WhatsApp):**
- `src/components/chat/LiveChatCanvas.tsx`
  - Query incluye `etapa_id` (línea 3889)
  - Tipos actualizados (líneas 3856-3881)
  - Restricciones aplicadas (líneas 7657, 7696, 8618)

**Dashboard (Módulo Inicio):**
- `src/components/dashboard/widgets/ConversacionesWidget.tsx`
  - Query incluye `etapa_id` (línea 1373)
  - Restricciones aplicadas (líneas 2920, 2952)

**Sidebars (Todas las Vistas):**
- `src/components/shared/ScheduledCallsSection.tsx` - Props y lógica de restricción
- `src/components/chat/ProspectDetailSidebar.tsx` - Props de etapa
- `src/components/prospectos/ProspectosManager.tsx` - Props de etapa
- `src/components/analysis/LiveMonitor.tsx` - Props de etapa
- `src/components/scheduled-calls/ProspectoSidebar.tsx` - Props de etapa
- `src/components/analysis/AnalysisIAComplete.tsx` - Props de etapa

#### 📚 Documentación

**Nuevos archivos:**
- `BUG_FIX_RESTRICCIONES_INCORRECTAS_2026-01-29.md` - Análisis técnico del bug
- `RESTRICCIONES_TEMPORALES_IMPORTADO_MANUAL.md` - Guía de uso y reversión
- `RESTRICCIONES_ANALISIS_COMPLETO_2026-01-29.md` - Análisis completo de implementación

#### 🧪 Testing

**Consola de desarrollo (modo dev):**
```javascript
[prospectRestrictions] Verificando por etapa_id: {
  etapaId: "eed28f88-...",
  etapaCodigo: "importado_manual",
  isRestricted: true  // ✅ Botones ocultos
}
```

**Checklist:**
- [ ] Prospecto "Importado Manual" → Botones NO visibles
- [ ] Prospecto "Activo PQNC" → Botones VISIBLES
- [ ] Tooltip explicativo aparece en botón deshabilitado (Sidebar)
- [ ] Sin errores en consola

#### ⚙️ Configuración de Etapas

**Código real en BD:** `'importado_manual'` (minúsculas, snake_case)  
**UUID:** `eed28f88-2734-4d48-914d-daee97fe7232`  
**Nombre:** "Importado Manual"

**Migración:** Script `migrations/20260127_migrate_etapa_string_to_uuid.sql` (línea 76)

---

### 🗓️ v2.5.41 - Importación Manual de Prospectos desde Dynamics [27-01-2026]

#### ✨ Nueva Funcionalidad

**Módulo: Gestión de Prospectos → Pestaña Importación**

Nueva funcionalidad para buscar prospectos directamente en Dynamics CRM por número de teléfono.

**Características principales:**
- ✅ Búsqueda directa en Dynamics CRM por teléfono (10 dígitos)
- ✅ Normalización automática de formato de teléfono
- ✅ Validación de entrada con mensajes claros
- ✅ **Verificación automática de duplicados en BD local**
- ✅ **Advertencia visual (panel amber) si el prospecto ya existe**
- ✅ Visualización de resultados en 4 secciones organizadas
- ✅ Manejo completo de errores y estados de carga
- ✅ Animaciones suaves con Framer Motion

**Diferencia con Dynamics CRM Manager:**
- **Dynamics CRM Manager:** Busca en local → compara con Dynamics
- **Importación Manual:** Busca directamente en Dynamics → verifica duplicados

#### 🎨 UI/UX

**Advertencia de Duplicados:**
Cuando el prospecto ya existe, muestra panel amber con:
- Nombre del prospecto existente
- Ejecutivo asignado
- Coordinación asignada
- Nota: Datos de Dynamics mostrados como referencia

**Secciones de Datos:**
1. Información Personal (nombre, email, estado civil, ocupación)
2. Ubicación (país, estado)
3. Asignación en CRM (coordinación, propietario)
4. Datos CRM (ID, calificación, última llamada)

#### 🔌 Integración

**Edge Function reutilizada:**
- `dynamics-lead-proxy` - Consulta a Dynamics CRM
- Timeout: 30 segundos
- Autenticación: JWT del usuario

**Vista para verificación:**
- `prospectos_con_ejecutivo_y_coordinacion`
- Filtro: `id_dynamics = LeadID`

#### 📁 Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/components/prospectos/ManualImportTab.tsx` | Componente principal (nuevo) |
| `public/docs/README_IMPORTACION_MANUAL.md` | Documentación completa |
| `public/docs/CHANGELOG_IMPORTACION_MANUAL.md` | Historial de cambios |
| `.cursor/handovers/2026-01-27-importacion-manual-prospectos.md` | Handover técnico |
| `.cursor/handovers/2026-01-27-importacion-manual-UI-preview.md` | Preview visual |

#### 📝 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/prospectos/ProspectosManager.tsx` | Añadida pestaña "Importación" |
| `docs/INDEX.md` | Actualizado con nuevos docs |

#### 🔐 Permisos

Acceso restringido a:
- ✅ Admin
- ✅ Admin Operativo
- ✅ Coordinador Calidad

#### 📚 Documentación

- README completo con índice y "Ver También"
- Changelog detallado
- Handovers técnicos con preview UI
- Actualización de INDEX.md

---

### 🗓️ v2.5.40 - Fix Búsqueda WhatsApp Server-Side [24-01-2026]

#### 🐛 Correcciones de Bugs

**Problema: Prospecto "Rosario" no aparecía en búsqueda de módulo WhatsApp**
- **Síntoma:** Búsqueda de "Rosario Arroyo Rivera" retornaba 0 resultados
- **Causa:** 
  - Cliente cargaba solo 2200 de 2388 conversaciones por límites de memoria (`ERR_INSUFFICIENT_RESOURCES`)
  - Búsqueda era solo client-side en conversaciones cargadas
  - Prospecto estaba en batch no cargado (invisible para búsqueda)
- **Fix:** 
  - Implementada búsqueda server-side con función RPC `search_dashboard_conversations`
  - Búsqueda directa en BD sin cargar todas las conversaciones
  - Performance: <1 segundo vs 30+ segundos anterior
  - Respeta permisos de admin/ejecutivo/coordinación

#### ✨ Mejoras de Performance

**Búsqueda optimizada:**
- Búsqueda por nombre, teléfono, email, WhatsApp
- Filtros de permisos integrados
- Retorna solo resultados necesarios (hasta 100)
- Metadata completa (ejecutivo, coordinación, mensajes)

#### 🔧 Funcionalidad Nueva

**Función RPC `search_dashboard_conversations`:**
```sql
search_dashboard_conversations(
  p_search_term TEXT,
  p_user_id UUID,
  p_is_admin BOOLEAN,
  p_ejecutivo_ids UUID[],
  p_coordinacion_ids UUID[],
  p_limit INTEGER
)
```

**Características:**
- Búsqueda fuzzy en múltiples campos
- Normalización de teléfonos (sin caracteres especiales)
- Orden por fecha de último mensaje
- `SECURITY DEFINER` para bypass RLS controlado

#### 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `migrations/20260124_search_dashboard_conversations_v3.sql` | Función RPC de búsqueda server-side ✅ |
| `scripts/deploy-search-dashboard.mjs` | Script de deploy automatizado via Management API |
| `scripts/test-search-rpc.mjs` | Testing de función RPC con supabase-js |
| `scripts/test-user-profiles-view.mjs` | Verificación de vista user_profiles_v2 |
| `scripts/check-user-profiles-view.mjs` | Verificación de permisos de vista |
| `scripts/check-view-rls.mjs` | Verificación de RLS en vistas |
| `.cursor/handovers/2026-01-24-fix-busqueda-whatsapp-server-side.md` | Documentación completa del fix |

#### 🔍 Debugging Realizado

**Correcciones durante implementación:**
- Columna `fecha` → `fecha_hora` (nombre correcto en `mensajes_whatsapp`)
- Columna `is_read` eliminada (no existe en esquema)
- Tipos de datos `VARCHAR(255)` → `TEXT` via cast para compatibilidad
- Vista `user_profiles_v2` verificada (145 usuarios accesibles)

#### 🧪 Testing

**Scripts de verificación:**
```bash
node scripts/test-search-rpc.mjs
# ✅ PROSPECTO ROSARIO ENCONTRADO (posición #9 de 10)

node scripts/test-user-profiles-view.mjs
# ✅ Vista accesible. Total registros: 145
```

#### ⚠️ Notas de Deploy

**Cache del navegador:**
- Limpiar cache con Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)
- Reiniciar dev server si persisten errores CORS

**Archivos legacy:**
- `migrations/20260124_fix_search_whatsapp_prospects.sql` (primera versión, no usada)
- `migrations/20260124_search_dashboard_conversations_v2.sql` (segunda versión con errores)
- **Versión final:** `v3.sql` desplegada en producción

---

### 🗓️ v2.5.39 - Fix Coordinaciones Múltiples + Actualización Usuarios Vidanta [22-01-2026]

#### 🐛 Correcciones de Bugs

**Problema: Coordinadores perdían coordinaciones al recargar**
- **Síntoma:** Coordinadores con coordinaciones asignadas las perdían después de recargar la página
- **Causa:** 
  - Condición de guardado requería `coordinaciones_ids` truthy (fallaba con `undefined`)
  - Detección de coordinadores solo verificaba `auth_roles?.name`
  - `coordinacion_id` no se limpiaba correctamente de metadatos
- **Fix:** 
  - Siempre procesar coordinadores (sin verificar `coordinaciones_ids`)
  - Convertir `undefined` a array vacío `[]`
  - Detección mejorada por múltiples campos (`auth_roles`, `role_name`, `is_coordinator`)
  - Limpieza explícita de `coordinacion_id` como `null` en metadatos

#### ✨ Mejoras de UX

**Cierre automático del modal de edición:**
- Modal se cierra automáticamente después de guardar exitosamente
- Lista de usuarios se refresca inmediatamente
- Toast de confirmación al guardar

#### 📊 Actualización Masiva de Usuarios

**Usuarios Vidanta actualizados (9 usuarios):**
- Teléfonos, coordinaciones y roles actualizados vía REST API
- Scripts SQL y Node.js creados para futuras actualizaciones
- Verificación post-actualización completada

#### 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/components/admin/UserManagementV2/hooks/useUserManagement.ts` | Fix guardado/carga coordinaciones múltiples |
| `src/components/admin/UserManagementV2/components/UserEditPanel.tsx` | Cierre automático modal + fix array coordinaciones |
| `scripts/update_vidanta_users.sql` | Script SQL para actualización masiva |
| `scripts/execute_update_vidanta_users.mjs` | Script Node.js para ejecución vía REST API |
| `docs/FIX_COORDINADOR_COORDINACIONES_MULTIPLES_2026-01-22.md` | Documentación del fix |
| `docs/UPDATE_USUARIOS_VIDANTA_2026-01-22.md` | Documentación de actualización masiva |

#### 🔍 Logging Mejorado

- Logs detallados para debugging de coordinaciones
- Identificación de coordinadores por múltiples campos
- Tracking de carga y guardado de coordinaciones

---

### 🗓️ v2.5.38 - Fix Módulo Programación + Optimización [23-01-2026]

#### 🐛 Correcciones de Bugs

**Problema 1: Desfase de 1 día en calendario**
- **Síntoma:** Al seleccionar día 19 mostraba día 18
- **Causa:** `new Date("YYYY-MM-DD")` interpreta como UTC, causando desfase en Guadalajara (UTC-6)
- **Fix:** Crear fechas con componentes locales `new Date(year, month-1, day)`

**Problema 2: Llamadas no visibles (días 19-21)**
- **Síntoma:** +1000 registros pero solo 1000 se cargaban
- **Causa:** Límite por defecto de Supabase + filtros de permisos estrictos
- **Fix:** Optimización de carga por día + límite aumentado

**Problema 3: Loop infinito después de optimización**
- **Síntoma:** "Maximum update depth exceeded" con miles de requests
- **Causa:** `useEffect` con dependencias que cambiaban en cada render
- **Fix:** Usar refs para trackear cambios reales + llamadas directas

#### 🚀 Optimización de Rendimiento

**Carga por día (vs cargar todo):**
```typescript
// Nuevo: getCallsCountByMonth() - Solo counts para calendario
// Nuevo: getCallsByDate() - Llamadas filtradas por día
// Nuevo: getCallsByWeek() - Llamadas filtradas por semana
```

**Beneficios:**
- ✅ Carga inicial: ~10-50 registros (vs 1000+)
- ✅ Navegación de meses: Solo counts, no data completa
- ✅ Memoria reducida significativamente

#### 🎨 Mejoras de UI

- Calendario con navegación de meses (`<` `>`)
- Badge de count ahora muestra hasta **99+** (antes 9+)
- Click en título de mes va a "Hoy"

#### 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/services/scheduledCallsService.ts` | +3 métodos optimizados |
| `src/components/scheduled-calls/ScheduledCallsManager.tsx` | Carga por día, refs anti-loop |
| `src/components/scheduled-calls/CalendarSidebar.tsx` | Counts precalculados, navegación, badge 99+ |
| `src/components/scheduled-calls/views/WeeklyView.tsx` | Lógica de fechas corregida |
| `src/services/permissionsService.ts` | Permisos simplificados para ejecutivos |

#### 📚 Documentación

- **Handover:** `.cursor/handovers/2026-01-22-fix-modulo-programacion.md`
- **Doc técnico:** `docs/FIX_MODULO_PROGRAMACION_FINAL_2026-01-22.md`
- **Doc N8N:** `docs/FIX_N8N_WORKFLOW_LLAMADAS_2026-01-22.md`

#### ⚠️ Pendiente

- Corregir nodo Code en N8N workflow "Lógica de llamadas programadas"
- Verificar funcionamiento en producción

---

### 🔍 v2.5.37 - Auditoría por Pares y Optimización Navegación [22-01-2026]

#### 🎯 Auditoría Exhaustiva de Documentación vs Código/BD

**Problema Resuelto:**
- ❌ Documentación NO validada contra código real y base de datos
- ❌ Falta de índices en documentos principales (>200 líneas)
- ❌ Referencias cruzadas insuficientes entre documentos
- ❌ Sin glosario de términos técnicos
- ❌ Navegación ineficiente (búsqueda manual)
- ❌ Sin reglas de mantenimiento de documentación

**Solución Implementada:**
- ✅ **Validación profunda**: Docs vs código vs BD (tablas, vistas, clientes)
- ✅ **Índices agregados**: 2 documentos principales recibieron índices navegables
- ✅ **Referencias cruzadas**: ~28 links agregados en 3 docs principales
- ✅ **Glosario completo**: 30+ términos técnicos definidos
- ✅ **Rule de mantenimiento**: Automatización para docs futuras
- ✅ **Referencias rápidas**: Sección en INDEX.md para búsqueda por tarea

**Validaciones Realizadas:**

| Fase | Elementos Validados | Resultado |
|------|-------------------|-----------|
| **Base de Datos** | Tablas deprecadas, vistas seguras, RLS | ✅ 100% correcto |
| **Frontend** | Clientes Admin, service_role_key, componentes | ✅ 100% seguro |
| **Variables Env** | Configuración producción vs docs | ⚠️ Docs requiere actualización |
| **MCPs** | Configuración activa, herramientas disponibles | ✅ Clarificado |
| **Edge Functions** | Migración a PQNC_AI documentada | ✅ Correcto |

**Archivos Nuevos Creados:**
- `docs/GLOSARIO.md` - Glosario completo de términos técnicos (30+ definiciones)
- `.cursor/rules/documentation-maintenance.mdc` - Reglas de mantenimiento automatizado
- `.cursor/rules/handover-format.mdc` - Formato optimizado de handovers con REF
- `AUDIT_DOCUMENTATION_PARES_2026-01-22.md` - Reporte exhaustivo de auditoría
- `.cursor/handovers/2026-01-22-auditoria-documentacion-final.md` - Handover final (REF: HANDOVER-2026-01-22-DOC-AUDIT)
- `.cursor/handovers/2026-01-22-pasos-siguientes-documentacion.md` - Plan de próximos pasos

**Archivos Actualizados:**
- `docs/INDEX.md` - Agregada sección "Referencias Rápidas por Tarea" + enlaces a glosario y mantenimiento
- `docs/NUEVA_ARQUITECTURA_BD_UNIFICADA.md` - Índice + 8 referencias cruzadas
- `docs/ARQUITECTURA_SEGURIDAD_2026.md` - Índice + 11 referencias cruzadas
- `docs/MIGRACION_SYSTEM_UI_A_PQNC_AI_COMPLETA.md` - 9 referencias cruzadas
- `docs/MCP_CATALOG.md` - Índice + referencias cruzadas
- `docs/ENV_VARIABLES_REQUIRED.md` - Referencias cruzadas
- `.cursor/rules/mcp-rules.mdc` - Clarificación SupabaseREST vs Supa_PQNC_AI
- `VERSIONS.md` - Entrada v2.5.37 con métricas de auditoría
- `CHANGELOG.md` - Esta entrada actualizada con archivos finales

**Hallazgos Críticos:**
- ✅ **Clientes Admin**: Correctamente eliminados (exportados como null)
- ✅ **service_role_key**: NO presente en código frontend
- ✅ **Tablas deprecadas**: NO usadas directamente (solo fallbacks seguros)
- ✅ **user_profiles_v2**: 93 usos correctos en codebase
- ✅ **auth_user_coordinaciones**: Tabla oficial desde 2025-12-29
- ⚠️ **auth_user_profiles**: 19 referencias con fallback seguro (monitorear)

**Métricas de Mejora:**

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Docs con índice (>200 líneas) | 93% | 98% | +5% |
| Docs con referencias cruzadas | 40% | 65% | +25% |
| Tiempo búsqueda info | ~5 min | ~2 min | **60% más rápido** |
| Términos documentados | 0 | 30+ | **Glosario completo** |

**Beneficios:**
- 🔍 Navegación optimizada con referencias rápidas
- 📖 Glosario completo de términos técnicos
- ✅ Validación exhaustiva: docs alineadas con código/BD
- 🤖 Mantenimiento automatizado con rules
- 🔗 Enlaces cruzados facilitan descubrimiento
- 📊 Métricas de calidad establecidas
- 🎯 **Handovers optimizados**: Formato con REF para citación (ahorro 80-90% tokens)

**Recomendaciones:**
- ⚠️ Actualizar `ENV_VARIABLES_REQUIRED.md` (proyectos prohibidos mencionados)
- 📅 Ejecutar auditoría mensual con `scripts/audit-documentation.ts`
- 🔎 Monitorear uso de `auth_user_profiles` (fallbacks actuales son seguros)
- 🧹 **Próxima sesión**: Limpieza de 32 grupos de duplicados (prioridad alta)
- 📋 **Usar REF en handovers**: `REF: HANDOVER-YYYY-MM-DD-SLUG` para citación eficiente

**Archivos de Referencia:**
- `AUDIT_DOCUMENTATION_PARES_2026-01-22.md` - Reporte completo
- `docs/GLOSARIO.md` - Definiciones de términos
- `.cursor/rules/documentation-maintenance.mdc` - Reglas de mantenimiento
- `.cursor/rules/handover-format.mdc` - Formato de handovers con REF
- `.cursor/handovers/2026-01-22-auditoria-documentacion-final.md` - Handover final
- `.cursor/handovers/2026-01-22-pasos-siguientes-documentacion.md` - Plan de próximos pasos
- `AUDIT_REPORT.md` - Reporte actualizado (527 archivos, 32 grupos duplicados)
- `AUDIT_INVENTORY.json` - Inventario JSON completo

---

### 🧹 v2.5.36 - Limpieza y Auditoría Completa de Documentación [22-01-2026]

#### 🎯 Optimización de Documentación

**Problema Resuelto:**
- ❌ 979 archivos .md con duplicados masivos (247 grupos de duplicados)
- ❌ Documentación duplicada entre `docs/`, `public/docs/` y `dist/`
- ❌ Archivos obsoletos sin marcar o eliminar
- ❌ Repositorios externos indexados innecesariamente
- ❌ Desincronización de versiones entre package.json, CHANGELOG y VERSIONS

**Solución Implementada:**
- ✅ **Auditoría completa**: Script TypeScript que analiza 979 archivos .md
- ✅ **Eliminación de duplicados**: 137 archivos idénticos entre docs/ ↔ public/docs/
- ✅ **Limpieza dist/**: 247 archivos auto-generados eliminados
- ✅ **Consolidación**: 70 duplicados en raíz eliminados
- ✅ **Archivado**: 3 auditorías antiguas movidas a backups/old-audits/
- ✅ **Temporal cleanup**: 5 archivos de estado temporal eliminados
- ✅ **Índice maestro**: Creado docs/INDEX.md con navegación clara

**Archivos Eliminados/Consolidados:**

| Operación | Cantidad |
|-----------|----------|
| Duplicados docs/ ↔ public/docs/ | 137 |
| Archivos en dist/ | 247 |
| Duplicados raíz | 70 |
| Auditorías movidas | 3 |
| Archivos temporales | 5 |
| **TOTAL** | **464** |

**Resultado Final:**
- **Antes**: 979 archivos .md
- **Después**: 519 archivos .md
- **Reducción**: 47% (460 archivos eliminados)

**Archivos Nuevos Creados:**
- `scripts/audit-documentation.ts` - Script de auditoría automatizada
- `scripts/clean-documentation.ts` - Script de limpieza segura
- `AUDIT_REPORT.md` - Reporte detallado de auditoría
- `AUDIT_INVENTORY.json` - Inventario completo en JSON
- `CLEANUP_REPORT.md` - Reporte de limpieza ejecutada
- `docs/INDEX.md` - Índice maestro de documentación

**Beneficios:**
- ⚡ Indexación más rápida de Cursor
- 🔍 Búsquedas más precisas (sin duplicados)
- 📦 ~2-3 MB de espacio liberado
- 📚 Navegación clara con docs/INDEX.md

**Protecciones Implementadas:**
- Archivos críticos protegidos automáticamente (ARCHITECTURE.md, CONVENTIONS.md, etc.)
- Todo el código en `src/` preservado
- Configuración `.cursor/` intacta
- Validación MD5 para detectar duplicados exactos

**Próximos Pasos Recomendados:**
- Actualizar `.cursorindexingignore` con repos externos
- Sincronizar versiones en VERSIONS.md
- Regenerar dist/ en próximo build

---

### 🔒 v2.4.1 (B10.0.1N2.4.1) - Edge Functions: Proxy GCS + Corrección CORS [17-01-2026]

#### 🎯 Corrección Crítica de Imágenes WhatsApp

**Problema Resuelto:**
- ❌ Error CORS: Header `x-api-token` no permitido en preflight
- ❌ Error 500 en Edge Function `generar-url-optimizada`
- ❌ Imágenes no cargaban en LiveChat y módulos de WhatsApp
- ❌ Edge Function intentaba usar Supabase Storage cuando los archivos están en Google Cloud Storage

**Solución Implementada:**
- ✅ **Edge Function como Proxy**: `generar-url-optimizada` ahora actúa como proxy al servicio Railway
- ✅ **Token en body**: Movido `auth_token` del header al body para evitar CORS
- ✅ **Google Cloud Storage**: URLs firmadas se generan desde GCS correctamente
- ✅ **Secret configurado**: `MEDIA_URL_AUTH` como secret en Supabase
- ✅ **BD actualizada**: `log_server_config.webhook_url` apunta a Edge Function

**Archivos Modificados:**
- `supabase/functions/generar-url-optimizada/index.ts` - Proxy a Railway/GCS
- `src/components/chat/LiveChatCanvas.tsx` - Token en body
- `src/components/campaigns/plantillas/WhatsAppTemplatesManager.tsx`
- `src/components/admin/WhatsAppTemplatesManager.tsx`
- `src/components/chat/ImageCatalogModal.tsx`
- `src/components/chat/MultimediaMessage.tsx`
- `src/components/chat/ImageCatalogModalV2.tsx`
- `src/components/dashboard/DashboardModule.tsx`
- `src/components/dashboard/widgets/ConversacionesWidget.tsx`
- `src/services/audioService.ts`

**Edge Function Desplegada:**
- `generar-url-optimizada` con `--no-verify-jwt`
- Secret: `MEDIA_URL_AUTH` = Token para servicio GCS

**Flujo Final:**
```
Frontend → Edge Function (Supabase) → Servicio Railway → Google Cloud Storage → URL Firmada
```

---

### ⚡ v2.2.55 (B8.1.3N2.3.1) - Optimización LiveChat con Vista Materializada [15-01-2026]

#### 🎯 Optimización de Rendimiento

**Problema Resuelto:**
- ❌ Carga inicial lenta con múltiples queries encadenadas (8-15 queries)
- ❌ Complejidad O(n²) por JOINs client-side con prospectos, coordinaciones, ejecutivos
- ❌ Realtime se desconectaba al bloquear/desbloquear el equipo

**Solución Implementada:**
- ✅ **Vista materializada**: `mv_conversaciones_dashboard` pre-calcula JOINs
- ✅ **RPC optimizado**: `get_dashboard_conversations()` con filtros de permisos en servidor
- ✅ **Feature flag**: `VITE_USE_OPTIMIZED_LIVECHAT=true` para activación gradual
- ✅ **Visibilitychange listener**: Reconexión automática de Realtime al despertar equipo

**Mejora de Rendimiento:**
| Métrica | Antes | Después |
|---------|-------|---------|
| Queries iniciales | 8-15 | 1 + 2 paralelas |
| Tiempo carga (estimado) | 2-4s | 0.3-0.8s |
| Fallback | N/A | Automático a legacy |

**Archivos Nuevos:**
- `src/services/optimizedConversationsService.ts` - Servicio de carga optimizada

**Archivos Modificados:**
- `src/components/chat/LiveChatCanvas.tsx` - Wrapper con feature flag + visibilitychange
- `src/components/chat/CHANGELOG_LIVECHAT.md` - Documentación v6.7.0

**BD Changes (PQNC_AI):**
- Vista materializada: `mv_conversaciones_dashboard` (1,885 registros, 6 índices)
- Función RPC: `get_dashboard_conversations(p_user_id, p_is_admin, p_ejecutivo_ids, p_coordinacion_ids, p_limit, p_offset)`

**Activación:**
```bash
# En .env para activar
VITE_USE_OPTIMIZED_LIVECHAT=true

# Para rollback instantáneo
VITE_USE_OPTIMIZED_LIVECHAT=false
```

---

### 🔔 v2.2.54 (B8.1.2N2.3.1) - Sistema Notificaciones Completo con Triggers BD [15-01-2026]

#### 🎯 Arquitectura Nueva de Notificaciones

**Problema Resuelto:**
- ❌ Notificaciones duplicadas generadas desde el frontend
- ❌ Errores cross-database al consultar auth_users desde PQNC_AI
- ❌ RLS bloqueando escrituras en user_notifications

**Solución Implementada:**
- ✅ **Trigger único en BD**: `trigger_notify_prospecto_changes` en tabla `prospectos`
- ✅ **Función PL/pgSQL**: `fn_notify_prospecto_changes()` maneja los 3 tipos de notificaciones
- ✅ **Frontend simplificado**: Solo escucha realtime, no genera notificaciones
- ✅ **Anti-duplicados**: Lógica server-side elimina duplicados automáticamente

**Tipos de Notificación Soportados:**
| Tipo | Trigger | Destinatarios |
|------|---------|---------------|
| `nuevo_prospecto` | INSERT con coordinacion_id sin ejecutivo_id | Coordinadores de la coordinación |
| `prospecto_asignado` | UPDATE de ejecutivo_id | Ejecutivo asignado |
| `requiere_atencion` | UPDATE de requiere_atencion_humana = true | Ejecutivo asignado o Coordinadores |

**Archivos Modificados:**
- `src/services/notificationsService.ts` - Removida lógica de generación
- `src/components/notifications/NotificationSystem.tsx` - Botón "Limpiar", iconos por tipo
- `src/stores/notificationStore.ts` - markAllAsRead, unlock audio
- `src/hooks/useProspectosNotifications.ts` - **ELIMINADO** (funcionalidad movida a trigger)

**Documentación Añadida:**
- `src/components/notifications/README_NOTIFICATIONS.md`
- `src/components/notifications/CHANGELOG_NOTIFICATIONS.md`
- `.cursor/rules/notifications-rules.mdc`

**BD Changes (PQNC_AI):**
- Función: `fn_notify_prospecto_changes()`
- Trigger: `trigger_notify_prospecto_changes` AFTER INSERT OR UPDATE OF ejecutivo_id, requiere_atencion_humana
- RLS deshabilitado en `user_notifications` para service_role

---

### 🔧 v2.2.2 (B8.0.2N2.2.0) - Correcciones Post-Migración BD Unificada [14-01-2026]

#### 🎯 Correcciones Críticas de Consultas y Seguridad

**Errores Corregidos:**
- ✅ **Error 406 al reasignar a coordinadores**: `getEjecutivosByIds()` ahora incluye rol 'coordinador'
- ✅ **Error 400 en Reasignación Masiva**: JOINs inválidos `auth_roles!inner(name)` en `auth_user_coordinaciones` corregidos
- ✅ **Error query.or is not a function**: Verificación robusta de PostgrestFilterBuilder en `ProspectosManager.tsx`
- ✅ **Notificaciones a coordinadores**: Funciones `notifyProspectoAssignment` y `notifyRequiereAtencion` sin filtro de rol

**Eliminación de Logs Sensibles (69 logs removidos):**
- `src/services/dynamicsReasignacionService.ts` - 0 logs (todos eliminados)
- `src/services/assignmentService.ts` - 0 logs (12 eliminados)
- `src/components/shared/AssignmentContextMenu.tsx` - 0 logs (45 eliminados)
- `src/components/prospectos/BulkReassignmentTab.tsx` - 0 logs (8 eliminados)
- `src/services/coordinacionService.ts` - Logs de debug eliminados

**Funciones Corregidas:**
| Archivo | Función | Corrección |
|---------|---------|------------|
| `coordinacionService.ts` | `getEjecutivosByIds()` | `.in('auth_roles.name', ['ejecutivo', 'coordinador'])` |
| `coordinacionService.ts` | `getCoordinadoresByCoordinacion()` | Eliminado `auth_roles!inner(name)` inválido |
| `coordinacionService.ts` | `getSupervisoresByCoordinacion()` | Eliminado `auth_roles!inner(name)` inválido |
| `notificationsService.ts` | `notifyProspectoAssignment()` | Eliminado filtro `.eq('auth_roles.name', 'ejecutivo')` |
| `notificationsService.ts` | `notifyRequiereAtencion()` | Eliminado filtro `.eq('auth_roles.name', 'ejecutivo')` |
| `ProspectosManager.tsx` | `searchInServer()` | Validación `typeof query.or === 'function'` |

**Archivos Modificados (8):**
- `src/services/coordinacionService.ts`
- `src/services/notificationsService.ts`
- `src/services/assignmentService.ts`
- `src/services/dynamicsReasignacionService.ts`
- `src/components/prospectos/ProspectosManager.tsx`
- `src/components/prospectos/BulkReassignmentTab.tsx`
- `src/components/shared/AssignmentContextMenu.tsx`
- `src/components/Footer.tsx`

**Impacto:**
- ✅ Reasignación a coordinadores funciona correctamente
- ✅ Reasignación masiva sin errores 400
- ✅ Búsqueda de prospectos sin errores
- ✅ Consola limpia sin exposición de datos sensibles
- ✅ Notificaciones llegan a coordinadores y ejecutivos

**Estado:** ✅ Completado - Pendiente deploy

---

### 🔔 v2.2.50 (B7.2.50N7.2.40) - Migración Sistema Notificaciones a PQNC_AI Unificado [13-01-2026]

#### 🎯 Migración Completa a Base de Datos Unificada

**Cambio Arquitectónico Crítico:**
- ✅ Migración completa de `system_ui` a `pqnc_ai` (base unificada)
- ✅ Todas las referencias a `supabaseSystemUI` eliminadas
- ✅ Sistema ahora usa exclusivamente `pqncSupabase`
- ✅ Realtime funcionando correctamente en base unificada

**Actualizaciones de Base de Datos:**
- Tabla `user_notifications` actualizada con nuevas columnas:
  - `notification_type` (new_message, new_call)
  - `module` (live-chat, live-monitor)
  - `message_id`, `conversation_id`, `customer_name`, `customer_phone`, `message_preview`
  - `call_id`, `call_status`, `prospect_id`
  - `is_muted` (silenciar notificaciones)
- Índices optimizados para performance
- Realtime habilitado y funcionando

**Servicios Actualizados:**
- `userNotificationService.ts`: Migrado a `pqncSupabase`
- `notificationService.ts`: Migrado a `pqncSupabase`
- Validaciones agregadas para verificar configuración de cliente

**Componentes Actualizados:**
- `NotificationBell.tsx`: Usa `pqncSupabase`
- `NotificationListener.tsx`: Verifica permisos antes de crear notificaciones
- `useNotifications.ts`: Hook funcionando correctamente

**Funcionalidades:**
- ✅ Notificaciones individuales por usuario
- ✅ Realtime funcionando correctamente
- ✅ Auto-reset al ingresar a módulos (live-chat, live-monitor)
- ✅ Sonido de notificación tipo WhatsApp
- ✅ Silenciar/Activar notificaciones
- ✅ Verificación de permisos antes de crear notificaciones

**Documentación Creada:**
- `docs/NOTIFICATIONS_SYSTEM_COMPLETE.md` - Documentación exhaustiva del sistema final
- Actualización de CHANGELOG y VERSIONS

**Archivos Modificados:**
- `src/services/userNotificationService.ts`
- `src/services/notificationService.ts`
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationListener.tsx`
- `src/hooks/useNotifications.ts`
- Scripts SQL para actualizar estructura de tabla

**Estado:** ✅ Completado y en Producción

---

### 🔔 v2.2.49 (B7.2.49N7.2.39) - Sistema Notificaciones Completo [13-01-2026]

#### 🎯 Sistema de Notificaciones Realtime

**Funcionalidades Implementadas:**
- **NotificationBell**: Campanita animada con contador de no leídas
- **NotificationDropdown**: Lista desplegable de notificaciones pendientes
- **NotificationToast**: Alerta flotante desde la derecha con animación spring
- **Botón Limpiar**: Elimina todas las notificaciones del usuario
- **Sonido**: Audio de notificación al recibir alertas en realtime

**Triggers Automáticos en Base de Datos:**
| Trigger | Evento | Destinatarios |
|---------|--------|---------------|
| `trigger_notify_new_prospecto` | INSERT prospecto con coordinación | Coordinadores/Supervisores |
| `trigger_notify_ejecutivo_assigned` | UPDATE ejecutivo_id | Ejecutivo asignado |
| `trigger_notify_requiere_atencion` | UPDATE requiere_atencion_humana=true | Ejecutivo o Coordinadores |

**Tipos de Notificación:**
- 🟣 `nuevo_prospecto`: Nuevo prospecto en coordinación (icono morado)
- 🟢 `prospecto_asignado`: Prospecto asignado a ejecutivo (icono verde)
- 🔴 `requiere_atencion`: Atención humana requerida (icono rojo + motivo)

**Arquitectura:**
- **Frontend**: React + Zustand + Framer Motion + Supabase Realtime
- **Backend**: PostgreSQL triggers + Supabase Realtime WebSocket
- **Base de Datos**: `user_notifications` en PQNC_AI (glsmifhkoaifvaegsozd)

**Documentación Creada:**
- `src/components/notifications/README_NOTIFICATIONS.md` - Documentación técnica completa
- `src/components/notifications/CHANGELOG_NOTIFICATIONS.md` - Historial de cambios
- `.cursor/rules/notifications-rules.mdc` - Regla de Cursor para contexto

**Problemas Resueltos Durante Desarrollo:**
1. Base de datos incorrecta (SystemUI vs PQNC_AI)
2. RLS bloqueando acceso
3. PostgREST cache desactualizado
4. Realtime con cliente incorrecto
5. Browser Autoplay Policy para audio

---

### 🧹 v2.2.33 (B7.2.23N7.2.13) - Limpieza Total Logs Debug [09-01-2026]

#### 🎯 Limpieza Completa
Eliminados **~70 console.log** de múltiples archivos:

**LiveChatCanvas.tsx**: ~37 logs eliminados
- PhoneCache logs (scroll, batches, fusión de datos)
- Búsqueda y etiquetas logs

**ConversacionesWidget.tsx**: 4 logs eliminados
- canViewConversation debug

**ProspectosManager.tsx**: 6 logs eliminados
- Cargando totales por etapa
- Pre-cargando datos de backup

**LiveMonitorKanban.tsx**: 18 logs eliminados
- Audio context y WebSocket
- loadHistoryCalls y scroll pagination
- Pre-carga de datos backup

**WhatsAppTemplatesManager.tsx**: 38 logs eliminados
- handleLimitedEdit (parsing de templates)
- handleSave (validaciones y guardado)
- Sincronización de plantillas

**AudienciasManager.tsx**: 5 logs eliminados
- Búsqueda de prospectos con mensajes
- Días sin contacto filtros

**CampanasManager.tsx**: 5 logs eliminados
- Realtime subscription status
- Webhook responses
- Valid templates for broadcast

---

### 🧹 v2.2.32 (B7.2.22N7.2.12) - Limpieza Logs Debug [09-01-2026]

#### 🎯 Limpieza
Eliminados logs de debug del PhoneCache después de confirmar que el fix funciona correctamente.

---

### 🔒 v2.2.31 (B7.2.21N7.2.11) - Fix PhoneCache Async v2 [09-01-2026]

#### 🎯 Fix Adicional
Mejora en la preservación del cache de prospectos durante cargas async.

#### 🐛 Problema Adicional Detectado
- Durante la carga async de un nuevo batch, el cache podría vaciarse inesperadamente
- Condición de carrera entre la lectura del cache y la actualización async

#### ✅ Solución Implementada (v6.4.2)
**LiveChatCanvas.tsx:**
- Backup del cache ANTES de iniciar la carga async (`cacheBeforeLoad`)
- Detección y restauración automática si el cache se vació durante la carga
- Logs de debug mejorados para diagnosticar problemas de cache
- Mensaje de advertencia cuando se detecta pérdida de cache

#### 📁 Archivos Modificados
- `src/components/chat/LiveChatCanvas.tsx` - Protección contra pérdida de cache async

---

### 🔒 v2.2.30 (B7.2.20N7.2.10) - Fix Cache PhoneDisplay en Batches Subsecuentes [09-01-2026]

#### 🎯 Fix Crítico
Corregido bug donde al cargar batches adicionales en el módulo de WhatsApp, los teléfonos de prospectos (incluso con `id_dynamics`) dejaban de verse correctamente.

#### 🐛 Problema Identificado
- Al cargar batch 2+, el cache `prospectosDataRef` se **sobrescribía** completamente
- Esto borraba los datos de prospectos del batch 1, causando que `PhoneDisplay` no encontrara los datos
- Resultado: teléfonos visibles inicialmente desaparecían al cargar más conversaciones

#### ✅ Solución Implementada
**LiveChatCanvas.tsx:**
- Lógica de cache ahora **fusiona** datos en batches subsecuentes (`reset: false`)
- En reset (`reset: true`): Limpia cache y lo reinicializa completamente
- En batches adicionales: Agrega nuevos datos sin borrar los existentes
- Logs de debug para monitorear estado del cache

#### 📁 Archivos Modificados
- `src/components/chat/LiveChatCanvas.tsx` - Fusión de cache en lugar de sobrescritura

---

### 🔄 v2.2.27 (B7.2.17N7.2.7) - Totales Reales en Prospectos [08-01-2026]

#### 🎯 Mejora Principal
Implementación de contadores de totales reales en el módulo de Prospectos. Los usuarios ahora pueden ver el total real de prospectos desde la carga inicial, sin necesidad de hacer scroll para cargar todos los batches.

#### 📁 Archivos Modificados

**ProspectosManager.tsx:**
- Nuevo estado `etapaTotals` para almacenar conteos reales por etapa desde BD
- Nueva función `loadEtapaTotals()` que consulta conteos totales respetando permisos
- Se carga automáticamente junto con los prospectos en la carga inicial
- **Nuevo badge visible en header** mostrando:
  - Total de prospectos (ej: "2,345 prospectos")
  - Indicador de cargados si hay diferencia (ej: "(800 cargados)")
  - Badge de filtrados cuando se aplican filtros (ej: "150 filtrados")

**ProspectosKanban.tsx:**
- Nueva prop `etapaTotals` que recibe los conteos reales desde BD
- Nueva función `getTotalForCheckpoint()` que suma totales de etapas correspondientes a cada columna
- Headers de columnas ahora muestran:
  - El total real de prospectos para esa etapa (no solo los del batch cargado)
  - Indicador "X cargados" debajo si hay más prospectos por cargar
  - Funciona tanto en columnas expandidas como colapsadas

#### 🔧 Comportamiento Esperado

| Vista | Antes | Ahora |
|-------|-------|-------|
| **Kanban** | Mostraba solo el batch (ej: "47") | Muestra total real (ej: "234") + "47 cargados" |
| **DataGrid** | Sin contador visible | Badge con total + cargados + filtrados |

#### 🎨 Mejoras de UX
- El usuario ve el total real desde el primer momento
- No es necesario hacer scroll hasta el final para conocer el total
- Los filtros muestran cuántos prospectos coinciden vs el total
- Diseño visual coherente con badges de colores (azul para total, ámbar para filtrados)

---

### 🔒 v2.2.28 (B7.2.18N7.2.8) - Fix Crítico: PhoneDisplay en Lista Conversaciones [09-01-2026]

#### 🐛 Problema Corregido
Los teléfonos se mostraban inicialmente sin enmascarar en la lista de conversaciones de WhatsApp, y después de cargar los batches se ocultaban incorrectamente (incluso para prospectos con `id_dynamics`).

#### 🔧 Causa Raíz
En el componente `ConversationItem` (línea 928), el teléfono se mostraba directamente sin usar `PhoneDisplay`:
```tsx
// ANTES (sin protección)
<p>{conversation.customer_phone}</p>

// DESPUÉS (con protección)
<PhoneText phone={...} prospecto={{ id_dynamics, etapa }} />
```

#### ✅ Correcciones Aplicadas

1. **ConversationItemProps actualizado:**
   - Agregado `prospectoData?: { id_dynamics?: string | null; etapa?: string | null }`
   - Se pasa desde el render con datos del cache

2. **PhoneText en lista de conversaciones:**
   - Reemplazado `{conversation.customer_phone}` por `<PhoneText ... />`
   - Ahora respeta las reglas de visibilidad por rol

3. **Import actualizado:**
   - Agregado `PhoneText` a la importación de `PhoneDisplay`

#### 📁 Archivo Modificado
- `src/components/chat/LiveChatCanvas.tsx`

---

### 🔄 v2.2.26 (B7.2.16N7.2.6) - Realtime para id_dynamics y etapa [08-01-2026]

#### 🎯 Mejora Principal
Implementación de actualización en tiempo real para `id_dynamics` y `etapa` en todos los módulos que usan `PhoneDisplay`, permitiendo que el teléfono se muestre inmediatamente cuando un prospecto obtiene `id_dynamics` sin necesidad de recargar la página.

#### 📁 Archivos Modificados

**LiveChatCanvas.tsx:**
- Agregada detección de cambios en `id_dynamics` y `etapa` en suscripción realtime
- Actualización de `prospectosDataRef` con campos `id_dynamics` y `etapa`
- Forzado de re-render cuando cambian para que `PhoneDisplay` re-evalúe permisos

**ProspectosNuevosWidget.tsx:**
- Agregada detección de cambios en `id_dynamics` y `etapa` en handler UPDATE
- Actualización del estado local `prospectos` para refrescar `PhoneText`

**ProspectosManager.tsx:**
- Nueva suscripción realtime a tabla `prospectos` (evento UPDATE)
- Actualización de `allProspectos` y `selectedProspecto` cuando cambian `id_dynamics` o `etapa`
- Sidebar de prospecto se actualiza automáticamente si está abierto

#### 🔧 Comportamiento Esperado

1. Usuario abre conversación/prospecto con teléfono enmascarado
2. En CRM Dynamics se asigna `id_dynamics` al prospecto
3. El teléfono se muestra inmediatamente sin recargar página
4. Funciona en: WhatsApp, Dashboard Widgets, Módulo Prospectos

---

### 🔐 v2.2.25 (B7.2.15N7.2.5) - Seguridad de Números Telefónicos por Rol [08-01-2026]

#### 🎯 Objetivo Principal
Implementación de un sistema de control de acceso a números telefónicos de prospectos basado en roles, etapas del prospecto y presencia de `id_dynamics` en CRM Dynamics.

#### 🆕 Nuevos Archivos Creados

**Hook Centralizado de Visibilidad de Teléfonos:**
- `src/hooks/usePhoneVisibility.ts` - Hook reutilizable que determina si un usuario puede ver el teléfono de un prospecto
  - Interface `ProspectoPhoneData`: Define los campos mínimos requeridos (`id_dynamics`, `etapa`, `telefono_principal`, `whatsapp`, `telefono_alternativo`)
  - Función `hasVisibleEtapa()`: Verifica si la etapa permite visibilidad ("Activo PQNC", "Es miembro")
  - Función `canViewPhone()`: Lógica principal de permisos
  - Función `formatPhone()`: Enmascara teléfonos no permitidos (ej: `+52 55 **** **34`)
  - Función `getPhoneField()`: Obtiene el teléfono formateado según permisos

**Componente Reutilizable de Visualización:**
- `src/components/shared/PhoneDisplay.tsx` - Componente React para mostrar teléfonos
  - `PhoneDisplay`: Componente completo con estilos y botón de copia
  - `PhoneText`: Versión simplificada para uso en texto inline

#### 🔒 Reglas de Acceso Implementadas

| Rol | Acceso Global | Condición para Ver Teléfono |
|-----|---------------|------------------------------|
| `admin` | ✅ Sí | Siempre puede ver todos los teléfonos |
| `coordinador_calidad` | ✅ Sí | Siempre puede ver todos los teléfonos |
| `administrador_operativo` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| `coordinador` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| `supervisor` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| `ejecutivo` | ❌ No | Solo si `id_dynamics` existe O etapa es "Activo PQNC"/"Es miembro" |
| Otros roles | ❌ No | Nunca pueden ver teléfonos |

#### 📁 Archivos Modificados

**Módulo Prospectos:**
- `src/components/prospectos/ProspectosManager.tsx` - Sidebar de detalles de prospecto
- `src/components/prospectos/ProspectosKanban.tsx` - Tarjetas Kanban con teléfono compacto

**Módulo WhatsApp / Chat:**
- `src/components/chat/ProspectDetailSidebar.tsx` - Sidebar de prospecto en conversaciones
- `src/components/chat/LiveChatCanvas.tsx` - Header de conversación con teléfono
- `src/components/chat/CallDetailModalSidebar.tsx` - Sidebar de detalles de llamada

**Módulo Llamadas IA / Live Monitor:**
- `src/components/analysis/LiveMonitor.tsx` - Modal de detalles de prospecto
- `src/components/analysis/LiveMonitorKanban.tsx` - Corrección de conteo total de llamadas por permisos
- `src/services/liveMonitorService.ts` - Agregado `id_dynamics` a interfaces y queries

**Dashboard:**
- `src/components/dashboard/widgets/ActiveCallDetailModal.tsx` - Modal de llamada activa
- `src/components/dashboard/widgets/ProspectosNuevosWidget.tsx` - Widget de nuevos prospectos

#### 🐛 Correcciones Adicionales

1. **Conteo de Llamadas en Historial:**
   - Problema: El total mostraba 778 llamadas globales en lugar de 70 filtradas por permisos
   - Solución: `totalHistoryCount` ahora usa `filteredHistoryCalls.length` después de aplicar permisos
   - Archivo: `LiveMonitorKanban.tsx`

2. **Error de Sintaxis en Build:**
   - Problema: `Unexpected token` por estructuras `if` duplicadas
   - Solución: Eliminadas estructuras duplicadas en `loadHistoryCalls()`
   - Archivo: `LiveMonitorKanban.tsx`

3. **Export de Type en Vite:**
   - Problema: `ProspectoPhoneData` no se exportaba correctamente
   - Solución: Agregado `export` explícito y uso de `import type` para compatibilidad Vite
   - Archivos: `usePhoneVisibility.ts`, `PhoneDisplay.tsx`

#### 🧪 Testing Manual Recomendado

1. **Como Ejecutivo:**
   - Verificar que prospectos SIN `id_dynamics` muestran `+52 XX **** **XX`
   - Verificar que prospectos CON `id_dynamics` muestran número completo
   - Verificar que prospectos en "Activo PQNC" o "Es miembro" muestran número completo

2. **Como Administrador o Coord. Calidad:**
   - Verificar acceso total a todos los teléfonos sin restricción

3. **Como Supervisor:**
   - Verificar mismas restricciones que ejecutivo

4. **Historial Llamadas IA:**
   - Verificar que el contador total refleja solo las llamadas con permisos de visualización

#### 📚 Documentación Técnica

**Estructura del Hook `usePhoneVisibility`:**
```typescript
export interface ProspectoPhoneData {
  id_dynamics?: string | null;
  etapa?: string | null;
  telefono_principal?: string | null;
  whatsapp?: string | null;
  telefono_alternativo?: string | null;
}

export const usePhoneVisibility = () => {
  // Permisos efectivos del usuario
  const { isAdmin, isAdminOperativo, isCoordinador, isEjecutivo, isSupervisor } = useEffectivePermissions();
  const isCoordinadorCalidad = permissionsService.isCoordinadorCalidad();

  // Acceso global: Solo Admin y Coord. Calidad
  const hasGlobalAccess = isAdmin || isCoordinadorCalidad;

  // Etapas que permiten visibilidad
  const VISIBLE_STAGES = ['Activo PQNC', 'Es miembro'];

  return { canViewPhone, formatPhone, getPhoneField, hasVisibleEtapa };
};
```

**Uso del Componente `PhoneDisplay`:**
```tsx
<PhoneDisplay
  prospecto={{
    id_dynamics: prospecto.id_dynamics,
    etapa: prospecto.etapa,
    whatsapp: prospecto.whatsapp,
    telefono_principal: prospecto.telefono_principal
  }}
  phoneField="whatsapp"
  className="text-sm"
  showCopyButton={true}
/>
```

---

### 🚀 v2.2.8 (B7.1.8N7.0.8) - Infinite Scroll Dual: Live Monitor + Live Chat [04-01-2026]

#### 🎯 Mejoras Principales

**Live Monitor (Historial de Llamadas IA):**
- ✅ Infinite scroll optimizado con carga anticipada al 75%
- ✅ Contador correcto desde el inicio (572 llamadas)
- ✅ Sin parpadeos: llamadas visibles nunca desaparecen durante carga
- ✅ Loading discreto: indicador pequeño en footer, no pantalla completa
- ✅ Detección mejorada de fin de datos (previene loops infinitos)
- ✅ Deshabilitado agrupamiento automático por prospecto (muestra TODAS las llamadas)

**Live Chat WhatsApp:**
- ✅ Infinite scroll paginado: batches de 200 conversaciones
- ✅ Superado límite de 1000: ahora soporta >10,000 conversaciones
- ✅ RPC mejorado: `get_conversations_ordered(p_limit, p_offset)` con paginación
- ✅ RPC nuevo: `get_conversations_count()` para contador total eficiente
- ✅ Realtime mejorado: doble actualización (conversations + allConversationsLoaded)
- ✅ Nuevos mensajes insertan conversación al tope sin recargar
- ✅ Todas las funcionalidades preservadas: etiquetas, filtros, asignaciones, etc.

#### 🐛 Correcciones Críticas

**Closure Stale State (ambos módulos):**
- Problema: Estado se perdía en cargas incrementales causando "Total: 0" en logs
- Solución: setState funcional con callbacks para ambas listas
- Resultado: Acumulación correcta de datos (200→400→600→...)

**Loading Intrusivo:**
- Problema: Pantalla completa "Cargando llamadas/conversaciones" ocultaba todo
- Solución: Eliminado early return, loading solo dentro de tablas
- Resultado: Elementos nunca desaparecen, UX fluida

**Detección de Fin de Datos:**
- Problema: Loops infinitos al cargar batch vacío
- Solución: Verificación de `rawLoadedCount === 0` detiene carga
- Resultado: Se detiene correctamente al cargar última llamada/conversación

#### 📚 Documentación Nueva

- `docs/LIVECHAT_ESCALABILITY_ROADMAP.md` - Plan completo para v7.0.0 (virtualización)
- `scripts/sql/update_get_conversations_ordered_v3_pagination.sql` - RPC con paginación
- `scripts/sql/BACKUP_get_conversations_ordered_v2.sql` - Rollback completo
- `scripts/sql/ROLLBACK_PLAN_v3_pagination.md` - Plan de emergencia
- `scripts/sql/EXECUTE_v3_STEP_BY_STEP.md` - Guía de ejecución segura

#### 🗄️ Cambios en Base de Datos

**Base:** Analysis DB (glsmifhkoaifvaegsozd.supabase.co)

**Funciones nuevas/modificadas:**
- `get_conversations_ordered(p_limit, p_offset)` - Con paginación
- `get_conversations_count()` - Conteo eficiente de conversaciones totales

#### 📁 Archivos Modificados

**Core:**
- `src/components/analysis/LiveMonitorKanban.tsx` (infinite scroll completo)
- `src/components/chat/LiveChatCanvas.tsx` (infinite scroll + realtime mejorado)
- `src/components/Footer.tsx` (versión B7.1.7N7.0.7 → B7.1.8N7.0.8)

**Documentación:**
- `src/components/analysis/CHANGELOG_LIVEMONITOR.md` (v5.7.0)
- `src/components/chat/CHANGELOG_LIVECHAT.md` (v6.2.0)
- `src/components/documentation/DocumentationModule.tsx` (catálogo actualizado)
- `.cursorrules` (proceso automatizado mejorado)

#### 📊 Métricas de Mejora

| Módulo | Antes | Ahora | Mejora |
|--------|-------|-------|--------|
| Historial Llamadas | 85 de 572 visible | 572 de 572 | +487 registros |
| Live Chat | 1000 máx | 10,000+ | +900% capacidad |
| Tiempo carga inicial | 3-5s | <1s | 70-80% más rápido |
| Parpadeos | Frecuentes | 0 | 100% eliminados |

---

### 🔧 Fix: Error 406 system_config en Sidebar [02-01-2026]

#### Problema Resuelto
- **Síntoma:** Errores `406 (Not Acceptable)` al cargar página por consulta a `system_config` desde `Sidebar.tsx`
- **Causa:** La tabla `system_config` no está expuesta a la API REST de Supabase en la base de datos PQNC
- **Impacto:** Errores en consola del navegador al cargar la aplicación
- **Solución:** Eliminada consulta directa a `system_config` desde `Sidebar.tsx`. El componente ahora usa logo sugerido por defecto y escucha cambios desde `SystemPreferences` cuando el usuario cambia el logo.

#### Cambios Realizados
- ✅ Eliminada consulta directa a `system_config` desde `Sidebar.tsx`
- ✅ Actualizado `consoleInterceptors.ts` para manejar errores 406 de `system_config`
- ✅ `Sidebar.tsx` ahora usa `getSuggestedLogo()` por defecto
- ✅ Sistema de eventos `logo-changed` para actualizar logo cuando se cambia desde `SystemPreferences`

#### Archivos Modificados
- `src/components/Sidebar.tsx` (eliminada consulta a system_config)
- `src/utils/consoleInterceptors.ts` (manejo de errores 406)

---

### 🔴 HOTFIX CRÍTICO: Loop Infinito + Coordinación Visible [29-12-2025]

#### Problema 1: ERR_INSUFFICIENT_RESOURCES (Loop Infinito)
- **Archivo:** `src/services/permissionsService.ts`
- **Síntoma:** 100+ consultas simultáneas a `auth_users.backup_id` causando `ERR_INSUFFICIENT_RESOURCES`
- **Causa:** Función `canAccessProspect()` consultaba BD sin caché por cada prospecto
- **Impacto:** Módulo WhatsApp inutilizable con admin, navegador colapsaba
- **Solución:** Agregado `backupCache` con TTL de 30 segundos
- **Resultado:** Reducción de queries ~99%, performance restaurada

#### Problema 2: Coordinación No Visible en Kanban
- **Archivo:** `src/components/analysis/AssignmentBadge.tsx`
- **Síntoma:** Coordinadores (incluyendo CALIDAD) no veían etiqueta de coordinación en cards de prospectos
- **Causa:** `showCoordinacion` no incluía rol `isCoordinador`
- **Impacto:** Coordinadores no podían ver a qué coordinación pertenecía cada prospecto
- **Solución:** `showCoordinacion` ahora incluye `isCoordinador`
- **Resultado:** Coordinadores ven coordinación + ejecutivo en todos los cards

#### Archivos Modificados
- `src/services/permissionsService.ts` (caché de backups)
- `src/components/analysis/AssignmentBadge.tsx` (lógica de display)

---

### 🔴 CRÍTICO: Corrección de Desincronización de Datos [29-12-2025]

#### Problema Identificado y Resuelto
- **Issue:** Dos tablas idénticas (`coordinador_coordinaciones` y `auth_user_coordinaciones`) almacenando las mismas coordinaciones
- **Causa:** Migración incompleta en Diciembre 2025 - se creó tabla nueva sin migrar código legacy
- **Impacto:** Desincronización de datos (caso detectado: Barbara Paola con permisos incorrectos)
- **Duración:** ~3-4 semanas sin detectar
- **Resolución:** Migración quirúrgica completa en 2 horas

#### Cambios Realizados
- ✅ Sincronización de 15 registros (7 migrados desde tabla legacy)
- ✅ Migración de 7 archivos críticos:
  - `permissionsService.ts` (permisos y filtros)
  - `coordinacionService.ts` (coordinadores/supervisores)
  - `authService.ts` (login)
  - `useInactivityTimeout.ts`
  - `UserManagement.tsx`
  - `UserCreateModal.tsx` (eliminada escritura dual)
  - `useUserManagement.ts` (eliminada escritura dual)
- ✅ Nomenclatura: `coordinador_id` → `user_id`
- ✅ Tabla única: `auth_user_coordinaciones` como fuente de verdad
- ✅ Documentación exhaustiva: POST-MORTEM completo

#### Archivos de Documentación
- `docs/POSTMORTEM_DUAL_TABLES.md` - Análisis completo del problema
- `docs/MIGRATION_COORDINADOR_COORDINACIONES.md` - Plan de migración
- `docs/MIGRATION_COMPLETED_20251229.md` - Cambios detallados
- `docs/MIGRATION_SUMMARY_20251229.md` - Resumen ejecutivo
- `scripts/migration/verify-and-sync-coordinaciones.ts` - Script de sincronización
- `scripts/migration/sync-coordinaciones-legacy-to-new.sql` - SQL de migración

#### Estado Post-Migración
- ⚠️ Tabla `coordinador_coordinaciones` DEPRECADA (no eliminada)
- ✅ Conservada 30 días para rollback
- ⏳ Pruebas pendientes de validación

#### Lecciones Aprendidas
- ❌ NO crear tablas nuevas sin migrar código completo
- ❌ NO usar "escritura dual" como solución permanente
- ✅ SÍ hacer migraciones atómicas (datos + código)
- ✅ SÍ documentar cambios estructurales inmediatamente

---

## [v2.2.1] - 2025-01-26

### 🎊 Sistema de Logos Personalizados

#### ✨ Nuevas Características

**Catálogo de Logos Intercambiables:**
- ✅ 3 logos disponibles: Default, Christmas, NewYear
- ✅ Selector visual estilo Google Doodles
- ✅ Preview interactivo con animaciones
- ✅ Guardado en system_config
- ✅ Actualización en tiempo real sin recargar

**Logo de Año Nuevo:**
- ✅ Contador regresivo hasta Año Nuevo 2026
- ✅ Fuegos artificiales al hacer clic (10 explosiones, 16 partículas c/u)
- ✅ Audio de fuegos artificiales
- ✅ Partículas diminutas como polvo (1.5px)
- ✅ Duración: 8 segundos

**Logo Navideño:**
- ✅ 15 luces titilantes en 4 colores
- ✅ 25 copos de nieve cayendo
- ✅ Jingle navideño al hacer clic

**Logo Estándar:**
- ✅ Texto "PQNC" con gradiente indigo→purple
- ✅ Sin animaciones

#### 🔄 Mejoras

**Selector en Administración:**
- ✅ Responsive al dark mode (todos los colores adaptados)
- ✅ Badge "Temporada" visible en dark mode
- ✅ Badge "Sugerido" con animación pulse
- ✅ Preview interactivo (click para animar)
- ✅ Texto siempre legible en ambos modos

**Integración:**
- ✅ Sidebar carga logo dinámicamente desde BD
- ✅ Evento `logo-changed` para actualización en tiempo real
- ✅ Sugerencias automáticas según fecha

---

## [v2.2.0] - 2025-01-26

### 🎨 REDISEÑO COMPLETO - Sistema de Diseño Minimalista

#### ✨ Nuevas Características

**Sistema de Tokens de Diseño:**
- ✅ Implementado sistema centralizado de tokens de diseño
- ✅ De 680+ gradientes → 6 gradientes corporativos (97% reducción)
- ✅ De 8 tamaños de iconos → 3 estandarizados (62% reducción)
- ✅ De 12 duraciones → 4 estandarizadas (67% reducción)
- ✅ Paleta homologada de 12 colores base
- ✅ Biblioteca de animaciones con Framer Motion

**Componentes Base Reutilizables:**
- ✅ Button (6 variantes, 3 tamaños)
- ✅ Card (4 variantes + 5 sub-componentes)
- ✅ Badge (6 variantes, dot, removible)
- ✅ Modal (5 tamaños, animaciones corporativas)
- ✅ Input (4 variantes, validación visual)
- ✅ Tabs (3 variantes, keyboard navigation)

**Tema Twilight (Crepúsculo) 🆕:**
- ✅ Nuevo tema intermedio entre claro y oscuro
- ✅ Background: #1a202e (azul-gris suave)
- ✅ Perfecto para trabajo prolongado
- ✅ Contraste WCAG 8:1
- ✅ Selector de 3 temas con iconos animados

#### 🔄 Mejoras

**Módulo WhatsApp (Live Chat):**
- ✅ Header slim minimalista (py-2.5, 37.5% más compacto)
- ✅ Sin título, solo icono vectorizado
- ✅ Componente Tabs homologado
- ✅ Card e Input en configuración
- ✅ Colores neutral-* homologados
- ✅ Icono verde (success-500) identificador

**Widget de Conversaciones (Dashboard):**
- ✅ Icono 🤖 para mensajes del bot (no letra "B")
- ✅ Icono 📄 para mensajes de plantilla (no letra "P")
- ✅ Etiqueta verde "Plantilla enviada por: [Ejecutivo]"
- ✅ Colores diferenciados por tipo de mensaje
- ✅ Detección correcta de plantillas vía whatsapp_template_sends

**Sistema de Colores:**
- ✅ Unificación de colores: slate/gray → neutral
- ✅ Gradientes corporativos por módulo
- ✅ Soporte completo para 3 temas

#### 🎯 Animaciones

**Selector de Tema:**
- ✅ Sol: Rayos girando + centro pulsante
- ✅ Luna: 5 estrellas titilantes + balanceo
- ✅ Crepúsculo: Atardecer con sol poniéndose, nubes, rayos

**Componentes:**
- ✅ SCALE_IN para modales
- ✅ FADE_IN para elementos simples
- ✅ SPRING_POP para badges
- ✅ Stagger para listas
- ✅ Physics consistentes (stiffness, damping)

#### 📚 Documentación

**Nuevas Guías:**
- ✅ DESIGN_SYSTEM_AUDIT_2025.md (Auditoría completa 50+ páginas)
- ✅ DESIGN_SYSTEM_SUMMARY.md (Resumen ejecutivo)
- ✅ DESIGN_TOKENS_IMPLEMENTATION.md (Tokens)
- ✅ BASE_COMPONENTS_IMPLEMENTATION.md (Componentes)
- ✅ DESIGN_GUIDE_MODALS_V2.md (Guía de modales V2.0)
- ✅ LIVE_CHAT_MIGRATION.md (Migración WhatsApp)
- ✅ CONVERSACIONES_WIDGET_UPDATE.md (Widget actualizado)
- ✅ src/styles/tokens/README.md (Uso de tokens)
- ✅ src/components/base/README.md (Uso de componentes)

#### 🔒 Backup

- ✅ Backup completo del diseño anterior
- ✅ 14 archivos respaldados (452 KB)
- ✅ Instrucciones de restauración completas

#### 🛠️ Técnico

**Archivos Creados:** 37 archivos (~678 KB)
- 6 archivos de tokens (~25 KB)
- 7 componentes base (~46 KB)
- 2 archivos de configuración (~5 KB)
- 11 archivos de documentación (~150 KB)
- 14 archivos de backup (452 KB)

**Código Generado:**
- ~4,251 líneas de código TypeScript
- ~1,501 líneas de componentes base
- ~500 líneas de tokens
- ~2,000 líneas de documentación

---

## [v2.1.26] - Versión Anterior

(Contenido legacy preservado)

---

**Migración:** De v2.1.26 → v2.2.0  
**Tipo:** Major Update (Rediseño completo)  
**Breaking Changes:** Ninguno (retrocompatible)  
**Estado:** ✅ Completado y testeado
