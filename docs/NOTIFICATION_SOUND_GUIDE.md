# 🎵 Guía para Crear Sonidos de Notificación

## 📋 Formatos Recomendados

### **1. OGG Vorbis (Recomendado)**
- **Extensión**: `.ogg`
- **Ventajas**: 
  - Excelente compresión sin pérdida notable de calidad
  - Código abierto
  - Soporte nativo en navegadores modernos
  - Archivos pequeños (ideal para web)
- **Tamaño típico**: 5-15 KB para una notificación corta

### **2. MP3**
- **Extensión**: `.mp3`
- **Ventajas**:
  - Máxima compatibilidad (todos los navegadores)
  - Buena compresión
- **Desventajas**:
  - Formato propietario
  - Calidad ligeramente inferior a OGG con mismo bitrate
- **Tamaño típico**: 8-20 KB para una notificación corta

### **3. WAV (Sin compresión)**
- **Extensión**: `.wav`
- **Ventajas**:
  - Calidad perfecta (sin pérdida)
  - Compatible universalmente
- **Desventajas**:
  - Archivos más grandes (50-200 KB)
  - No recomendado para web (carga más lenta)
- **Tamaño típico**: 50-200 KB para una notificación corta

## 🎚️ Características Técnicas Recomendadas

### **Duración**
- **Ideal**: 0.1 - 0.5 segundos
- **Máximo**: 1 segundo (para no ser molesto)
- **Recomendado**: 0.2 - 0.3 segundos

### **Frecuencia de Muestreo (Sample Rate)**
- **Recomendado**: 44.1 kHz (estándar CD) o 48 kHz
- **Mínimo**: 22.05 kHz (aceptable pero no ideal)
- **Máximo**: 48 kHz (suficiente, más es innecesario)

### **Bitrate**
- **OGG/MP3**: 128 kbps - 192 kbps
- **WAV**: No aplica (sin compresión)

### **Canales**
- **Mono**: Recomendado (archivos más pequeños, suficiente para notificaciones)
- **Estéreo**: Opcional (archivos más grandes, no necesario para notificaciones)

### **Formato de Audio**
- **Tipo**: Sonido corto y agudo (chime, bell, ting)
- **Frecuencia**: 800 Hz - 2000 Hz (rango agudo/brillante)
- **Características**: 
  - Ataque rápido (inicio inmediato)
  - Decay rápido (desvanecimiento rápido)
  - Sin reverberación o muy poca

## 🎨 Ejemplos de Sonidos Ideales

### **Tipo "Ting" (Campanita)**
- Frecuencia: 1200-1500 Hz
- Duración: 0.2-0.3 segundos
- Características: Sonido agudo, brillante, corto

### **Tipo "Ping" (Notificación moderna)**
- Frecuencia: 800-1200 Hz
- Duración: 0.15-0.25 segundos
- Características: Sonido más suave pero claro

### **Tipo "Chime" (Campana)**
- Frecuencia: 1000-1800 Hz con armónicos
- Duración: 0.3-0.5 segundos
- Características: Sonido más complejo con resonancia

## 🛠️ Herramientas Recomendadas

### **Para Crear/Editar Audio**
1. **Audacity** (Gratis, código abierto)
   - Exportar como OGG o MP3
   - Ajustar duración, volumen, efectos
   - URL: https://www.audacityteam.org/

2. **GarageBand** (Mac, gratis)
   - Crear sonidos desde cero
   - Exportar en varios formatos

3. **Online Audio Editors**
   - https://www.audiotool.com/
   - https://www.soundtrap.com/

### **Para Convertir Formatos**
- **CloudConvert**: https://cloudconvert.com/
- **Online-Convert**: https://www.online-convert.com/

## 📁 Ubicación del Archivo en el Proyecto

Coloca tu archivo de audio en:
```
public/sounds/notification.ogg
```
o
```
public/sounds/notification.mp3
```

## ✅ Checklist de Características

- [ ] Duración: 0.1 - 0.5 segundos
- [ ] Sample Rate: 44.1 kHz o 48 kHz
- [ ] Bitrate: 128-192 kbps (si es comprimido)
- [ ] Mono (recomendado) o Estéreo
- [ ] Formato: OGG (recomendado) o MP3
- [ ] Volumen: Normalizado (no muy alto ni muy bajo)
- [ ] Sin silencio al inicio o final
- [ ] Tamaño del archivo: < 30 KB (ideal < 20 KB)

## 🎯 Ejemplo de Configuración en Audacity

1. Crear nuevo proyecto
2. Generar tono: `Generate > Tone`
   - Frequency: 1200 Hz
   - Amplitude: 0.3
   - Duration: 0.25 segundos
3. Aplicar fade out: `Effect > Fade Out` (últimos 0.05 segundos)
4. Normalizar: `Effect > Normalize` (a -1.0 dB)
5. Exportar: `File > Export > Export as OGG`
   - Quality: 5 (128 kbps)
   - Channels: Mono

## 📝 Notas Adicionales

- **Compatibilidad**: OGG tiene mejor soporte en Chrome/Firefox, MP3 en Safari/Edge
- **Tamaño**: Archivos pequeños cargan más rápido
- **Calidad**: Para notificaciones cortas, 128 kbps es suficiente
- **Pruebas**: Prueba el sonido en diferentes dispositivos y navegadores

