/**
 * Web Worker para conversión de audio WebM a MP3
 * Usa lamejs para la conversión sin bloquear el UI thread
 */

import lamejs from 'lamejs';

interface ConversionMessage {
  audioBuffer: ArrayBuffer;
  sampleRate: number;
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

type WorkerMessage = ProgressMessage | SuccessMessage | ErrorMessage;

self.onmessage = async (e: MessageEvent<ConversionMessage>) => {
  try {
    const { audioBuffer, sampleRate } = e.data;

    // Paso 1: Decodificar audio (10%)
    postMessage({ type: 'progress', progress: 10 } as ProgressMessage);

    const audioContext = new OfflineAudioContext(1, audioBuffer.byteLength, sampleRate);
    const source = audioContext.createBufferSource();
    
    const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
    postMessage({ type: 'progress', progress: 30 } as ProgressMessage);

    // Paso 2: Obtener samples (40%)
    const samples = decodedBuffer.getChannelData(0);
    const actualSampleRate = decodedBuffer.sampleRate;
    postMessage({ type: 'progress', progress: 40 } as ProgressMessage);

    // Paso 3: Convertir a 16-bit PCM (50%)
    const samples16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      samples16[i] = Math.max(-32768, Math.min(32767, samples[i] * 32767));
    }
    postMessage({ type: 'progress', progress: 50 } as ProgressMessage);

    // Paso 4: Codificar a MP3 (50-90%)
    const mp3encoder = new lamejs.Mp3Encoder(1, actualSampleRate, 128);
    const mp3Data: Uint8Array[] = [];
    const blockSize = 1152; // Tamaño de bloque estándar para MP3

    const totalBlocks = Math.ceil(samples16.length / blockSize);
    let processedBlocks = 0;

    for (let i = 0; i < samples16.length; i += blockSize) {
      const chunk = samples16.subarray(i, Math.min(i + blockSize, samples16.length));
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }

      processedBlocks++;
      const progress = 50 + Math.floor((processedBlocks / totalBlocks) * 40);
      postMessage({ type: 'progress', progress } as ProgressMessage);
    }

    // Paso 5: Finalizar codificación (95%)
    const end = mp3encoder.flush();
    if (end.length > 0) {
      mp3Data.push(new Uint8Array(end));
    }
    postMessage({ type: 'progress', progress: 95 } as ProgressMessage);

    // Paso 6: Crear Blob final (100%)
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
      error: error instanceof Error ? error.message : 'Error desconocido en conversión'
    } as ErrorMessage);
  }
};
