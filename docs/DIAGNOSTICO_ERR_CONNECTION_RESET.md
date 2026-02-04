# 🔍 Diagnóstico: ERR_CONNECTION_RESET con Supabase

**Fecha:** 3 de Febrero, 2026  
**IP Afectada:** `189.203.238.35` (Total Play)  
**Estado AWS WAF:** ✅ PERMITIDA  
**Frontend CloudFront:** ✅ Funciona correctamente  
**Conexiones a Supabase:** ❌ ERR_CONNECTION_RESET

---

## 📋 Síntomas

```
glsmifhkoaifvaegsozd.supabase.co/rest/v1/log_config_public?select=enabled:1
Failed to load resource: net::ERR_CONNECTION_RESET

glsmifhkoaifvaegsozd.supabase.co/auth/v1/token?grant_type=password:1
Failed to load resource: net::ERR_CONNECTION_RESET

api.ipify.org/?format=json:1
Failed to load resource: net::ERR_CONNECTION_RESET
```

**Todos los endpoints de Supabase fallan con `ERR_CONNECTION_RESET`**

---

## 🔍 Análisis del Problema

### ✅ Lo que SÍ funciona:
- ✅ IP `189.203.238.35` está en la whitelist de AWS WAF
- ✅ Frontend CloudFront (`ai.vidavacations.com`) carga correctamente
- ✅ El HTML/JS del frontend se descarga sin problemas

### ❌ Lo que NO funciona:
- ❌ Todas las conexiones HTTPS a `glsmifhkoaifvaegsozd.supabase.co` fallan
- ❌ Conexiones a `api.ipify.org` también fallan
- ❌ Error: `ERR_CONNECTION_RESET` (no `ERR_BLOCKED_BY_CLIENT` ni `403`)

---

## 🎯 Causas Probables

### 1. 🔴 Firewall/Proxy Corporativo (MÁS PROBABLE)

**Síntomas:**
- Bloquea conexiones salientes HTTPS
- Intercepta SSL/TLS y puede estar bloqueando dominios específicos
- `ERR_CONNECTION_RESET` es típico de firewalls que cierran conexiones

**Verificación:**
```bash
# Desde el equipo afectado, probar conexión directa:
curl -v https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/

# Si falla con "Connection reset by peer", es firewall/proxy
```

**Solución:**
- Verificar configuración de proxy en el navegador
- Contactar al equipo de IT para whitelist de `*.supabase.co`
- Verificar si hay proxy corporativo configurado

---

### 2. 🔴 ISP Bloqueando Dominio (Total Play)

**Síntomas:**
- Solo afecta a usuarios de Total Play
- Otros ISPs funcionan correctamente
- Bloqueo a nivel de red del ISP

**Verificación:**
```bash
# Probar con VPN desde el mismo equipo
# Si funciona con VPN, es bloqueo del ISP
```

**Solución:**
- Contactar a Total Play para desbloquear `*.supabase.co`
- Usar VPN temporalmente
- Cambiar de ISP si es posible

---

### 3. 🔴 Antivirus/Firewall del Equipo

**Síntomas:**
- Software de seguridad bloqueando conexiones
- Windows Firewall, antivirus corporativo, etc.

**Verificación:**
- Revisar logs del antivirus/firewall
- Deshabilitar temporalmente para probar (solo para diagnóstico)
- Verificar reglas de firewall del sistema operativo

**Solución:**
- Agregar excepción para `*.supabase.co` en el firewall
- Verificar configuración del antivirus

---

### 4. 🔴 Restricciones en Supabase Dashboard

**Síntomas:**
- IP Restrictions configuradas en Supabase
- Network Restrictions activas

**Verificación:**
1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/network
2. Verificar si hay "IP Restrictions" o "Network Restrictions" activas
3. Verificar si `189.203.238.35` está en la lista de IPs permitidas

**Solución:**
- Si hay restricciones, agregar `189.203.238.35` a la whitelist
- O deshabilitar temporalmente las restricciones para probar

---

### 5. 🔴 Rate Limiting o DDoS Protection

**Síntomas:**
- Supabase bloqueando por demasiadas solicitudes
- Rate limiting activo

**Verificación:**
- Revisar logs en Supabase Dashboard
- Verificar métricas de rate limiting

**Solución:**
- Esperar unos minutos y reintentar
- Contactar soporte de Supabase si persiste

---

## ✅ Plan de Acción Recomendado

### Paso 1: Verificar Supabase Dashboard (5 min)
```
1. Ir a: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/network
2. Verificar "IP Restrictions" o "Network Restrictions"
3. Si están activas, agregar 189.203.238.35 o deshabilitar temporalmente
```

### Paso 2: Probar Conexión Directa (2 min)
```bash
# Desde el equipo afectado, ejecutar:
curl -v https://glsmifhkoaifvaegsozd.supabase.co/rest/v1/

# Si falla con "Connection reset by peer", es firewall/proxy
# Si funciona, el problema es en el navegador
```

### Paso 3: Probar con VPN (5 min)
```
1. Conectar VPN desde el mismo equipo
2. Intentar acceder al sitio nuevamente
3. Si funciona con VPN, es bloqueo del ISP o firewall corporativo
```

### Paso 4: Verificar Proxy del Navegador (2 min)
```
Chrome/Edge:
1. Configuración > Avanzado > Sistema
2. Verificar "Usar servidor proxy"
3. Si está activo, deshabilitar temporalmente para probar

Firefox:
1. Configuración > General > Configuración de red
2. Verificar configuración de proxy
```

### Paso 5: Revisar Firewall/Antivirus (5 min)
```
Windows:
1. Windows Defender Firewall > Configuración avanzada
2. Verificar reglas de salida
3. Verificar si hay bloqueos para Chrome/Edge

Antivirus:
1. Revisar logs del antivirus
2. Verificar si está bloqueando conexiones HTTPS
```

---

## 🔧 Soluciones Temporales

### Opción 1: Usar VPN
- Conectar VPN desde el equipo afectado
- Acceder al sitio a través de la VPN

### Opción 2: Usar Hotspot Móvil
- Conectar el equipo a hotspot móvil (diferente ISP)
- Verificar si funciona con otro proveedor

### Opción 3: Acceso Remoto
- Acceder desde otro equipo/location que funcione
- Usar escritorio remoto si es necesario

---

## 📊 Checklist de Diagnóstico

- [ ] Verificar Supabase Dashboard > Settings > Network
- [ ] Probar conexión directa con `curl` desde terminal
- [ ] Probar con VPN para confirmar bloqueo de ISP
- [ ] Verificar configuración de proxy en el navegador
- [ ] Revisar logs del firewall/antivirus del equipo
- [ ] Probar desde otro equipo en la misma red
- [ ] Probar con otro navegador (Chrome, Firefox, Edge)
- [ ] Verificar si otros usuarios con Total Play tienen el mismo problema

---

## 📝 Notas Adicionales

### Diferencia entre Errores:

| Error | Causa Probable | Nivel |
|-------|---------------|-------|
| `ERR_CONNECTION_RESET` | Firewall/Proxy/ISP bloqueando | Red (TCP) |
| `ERR_BLOCKED_BY_CLIENT` | Extensión del navegador bloqueando | Navegador |
| `403 Forbidden` | AWS WAF o Supabase bloqueando | Aplicación |
| `ERR_CONNECTION_TIMED_OUT` | Firewall bloqueando o red caída | Red (TCP) |

### `ERR_CONNECTION_RESET` específicamente indica:
- La conexión TCP se establece inicialmente
- Pero se cierra inmediatamente antes de completar el handshake SSL/TLS
- Esto es típico de firewalls que inspeccionan tráfico y bloquean dominios específicos

---

## 🔗 Referencias

- [Supabase Network Settings](https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/settings/network)
- [AWS WAF IP Restrictions](docs/AWS_FRONTEND_IP_RESTRICTION.md)
- [Chrome ERR_CONNECTION_RESET](https://support.google.com/chrome/answer/95669)

---

**Última actualización:** 3 de Febrero, 2026  
**Estado:** 🔍 En diagnóstico
