// Servidor proxy para mejorar audio de VAPI
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
app.use(cors());

// Almacenar conexiones activas
const activeConnections = new Map();

class AudioProcessor {
  constructor() {
    this.audioBuffer = [];
    this.isProcessing = false;
  }
  
  // Procesar audio con filtros simples pero efectivos
  processAudioChunk(rawAudio) {
    try {
      // Convertir a Int16Array
      const int16Array = new Int16Array(rawAudio);
      const processedArray = new Int16Array(int16Array.length);
      
      // Aplicar filtros básicos:
      for (let i = 0; i < int16Array.length; i++) {
        let sample = int16Array[i];
        
        // 1. Normalización suave
        sample = Math.max(-32767, Math.min(32767, sample * 1.2));
        
        // 2. Filtro pasa-bajos simple para reducir ruido
        if (i > 0 && i < int16Array.length - 1) {
          sample = (int16Array[i-1] + sample + int16Array[i+1]) / 3;
        }
        
        processedArray[i] = sample;
      }
      
      return processedArray.buffer;
    } catch (error) {
      console.error('Error procesando audio:', error);
      return rawAudio;
    }
  }
  
  // Combinar múltiples chunks para mejor calidad
  combineChunks(chunks) {
    if (chunks.length === 0) return null;
    
    // Calcular tamaño total
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new ArrayBuffer(totalLength);
    const view = new Uint8Array(combined);
    
    // Combinar chunks con suavizado en las uniones
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = new Uint8Array(chunks[i]);
      
      // Aplicar fade en las uniones
      if (i > 0) {
        // Fade in en los primeros 64 bytes
        for (let j = 0; j < Math.min(64, chunk.length); j++) {
          chunk[j] *= (j / 64);
        }
      }
      
      if (i < chunks.length - 1) {
        // Fade out en los últimos 64 bytes
        for (let j = Math.max(0, chunk.length - 64); j < chunk.length; j++) {
          chunk[j] *= ((chunk.length - 1 - j) / 64);
        }
      }
      
      view.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }
}

// Crear servidor HTTP
const server = createServer(app);

// Servidor WebSocket proxy
const wss = new WebSocketServer({ server });

wss.on('connection', (clientWs, req) => {
  console.log('🔌 Cliente conectado al proxy de audio');
  
  // Obtener call_id de la query
  const callId = new URL(req.url, 'http://localhost').searchParams.get('call_id');
  if (!callId) {
    clientWs.close(1000, 'call_id requerido');
    return;
  }
  
  const processor = new AudioProcessor();
  let vapiWs = null;
  
  // Conectar a VAPI WebSocket
  const vapiUrl = `wss://phone-call-websocket.aws-us-west-2-backend-production2.vapi.ai/${callId}/listen`;
  console.log('🔗 Conectando a VAPI:', vapiUrl);
  
  try {
    vapiWs = new WebSocket(vapiUrl);
    
    vapiWs.on('open', () => {
      console.log('✅ Conectado a VAPI WebSocket');
      clientWs.send(JSON.stringify({ type: 'status', message: 'Conectado a VAPI' }));
    });
    
    let chunkBuffer = [];
    let lastSendTime = Date.now();
    
    vapiWs.on('message', (data) => {
      try {
        if (data instanceof Buffer) {
          // Acumular chunks para procesamiento en lotes
          chunkBuffer.push(data.buffer);
          
          // Procesar cada 100ms o cuando tengamos 10 chunks
          const now = Date.now();
          if (chunkBuffer.length >= 10 || (now - lastSendTime) >= 100) {
            
            // Combinar y procesar lote
            const combinedAudio = processor.combineChunks(chunkBuffer);
            if (combinedAudio) {
              const processedAudio = processor.processAudioChunk(combinedAudio);
              
              // Enviar audio mejorado al cliente
              clientWs.send(processedAudio);
            }
            
            chunkBuffer = [];
            lastSendTime = now;
          }
        }
      } catch (error) {
        console.error('Error procesando mensaje VAPI:', error);
      }
    });
    
    vapiWs.on('error', (error) => {
      console.error('❌ Error VAPI WebSocket:', error);
      clientWs.send(JSON.stringify({ type: 'error', message: 'Error en VAPI' }));
    });
    
    vapiWs.on('close', () => {
      console.log('🔌 VAPI WebSocket desconectado');
      clientWs.close();
    });
    
  } catch (error) {
    console.error('❌ Error conectando a VAPI:', error);
    clientWs.close(1000, 'Error conectando a VAPI');
  }
  
  // Manejar desconexión del cliente
  clientWs.on('close', () => {
    console.log('🔌 Cliente desconectado');
    if (vapiWs) {
      vapiWs.close();
    }
  });
});

// Servidor HTTP para servir el proxy
app.get('/health', (req, res) => {
  res.json({ status: 'Servidor proxy de audio funcionando', port: 8080 });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor proxy de audio corriendo en puerto ${PORT}`);
  console.log(`📡 WebSocket proxy en puerto ${PORT}`);
  console.log(`🎧 Uso: ws://localhost:${PORT}?call_id=tu-call-id`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});
