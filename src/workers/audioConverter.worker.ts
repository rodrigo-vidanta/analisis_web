/**
 * Web Worker para conversión de audio PCM a MP3
 * Recibe samples PCM (Int16Array) ya decodificados desde el main thread
 * y los codifica a MP3 usando lamejs
 * 
 * NOTA: OfflineAudioContext NO está disponible en Web Workers,
 * por lo que la decodificación del audio se hace en el main thread.
 */

import lamejs from 'lamejs';

interface ConversionMessage {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
}

interface SuccessMessage {
  type: 'success';
  mp3Blob: Blob;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

self.onmessage = (e: MessageEvent<ConversionMessage>) => {
  try {
    const { samples, sampleRate, channels } = e.data;

    if (!samples || samples.length === 0) {
      postMessage({ type: 'error', error: 'No se recibieron samples de audio' } as ErrorMessage);
      return;
    }

    // Paso 1: Inicializar encoder (10%)
    postMessage({ type: 'progress', progress: 10 } as ProgressMessage);

    const mp3encoder = new lamejs.Mp3Encoder(channels || 1, sampleRate, 128);
    const mp3Data: Uint8Array[] = [];
    const blockSize = 1152; // Tamaño de bloque estándar para MP3

    // Paso 2: Codificar a MP3 (10-90%)
    const totalBlocks = Math.ceil(samples.length / blockSize);
    let processedBlocks = 0;

    for (let i = 0; i < samples.length; i += blockSize) {
      const chunk = samples.subarray(i, Math.min(i + blockSize, samples.length));
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }

      processedBlocks++;
      // Reportar progreso cada 10 bloques para no saturar
      if (processedBlocks % 10 === 0 || processedBlocks === totalBlocks) {
        const progress = 10 + Math.floor((processedBlocks / totalBlocks) * 80);
        postMessage({ type: 'progress', progress } as ProgressMessage);
      }
    }

    // Paso 3: Finalizar codificación (95%)
    const end = mp3encoder.flush();
    if (end.length > 0) {
      mp3Data.push(new Uint8Array(end));
    }
    postMessage({ type: 'progress', progress: 95 } as ProgressMessage);

    // Paso 4: Crear Blob final (100%)
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
    postMessage({ type: 'progress', progress: 100 } as ProgressMessage);

    // Enviar resultado
    postMessage({ 
      type: 'success', 
      mp3Blob 
    } as SuccessMessage);

  } catch (error) {
    postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Error desconocido en codificación MP3'
    } as ErrorMessage);
  }
};
