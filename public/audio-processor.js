// Audio Worklet Processor para streaming en tiempo real
class AudioStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferQueue = [];
    this.isPlaying = false;
    this.sampleRate = 16000; // Default
    this.bytesPerSample = 2; // 16-bit
    this.encoding = 'pcm';
    
    // Escuchar mensajes del hilo principal
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'audio-data':
          this.addAudioData(data);
          break;
        case 'set-config':
          this.sampleRate = data.sampleRate;
          this.encoding = data.encoding;
          break;
        case 'clear-buffer':
          this.bufferQueue = [];
          break;
      }
    };
  }
  
  addAudioData(audioData) {
    // Convertir ArrayBuffer a Float32Array
    let samples;
    
    if (this.encoding === 'mulaw') {
      // Decodificar μ-law a PCM
      const uint8Array = new Uint8Array(audioData);
      const int16Array = this.decodeMulaw(uint8Array);
      samples = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        samples[i] = int16Array[i] / 32768.0;
      }
    } else {
      // PCM directo
      const int16Array = new Int16Array(audioData);
      samples = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        samples[i] = int16Array[i] / 32768.0;
      }
    }
    
    this.bufferQueue.push(samples);
    
    // Mantener buffer razonable (máximo 100 chunks)
    if (this.bufferQueue.length > 100) {
      this.bufferQueue.shift();
    }
  }
  
  decodeMulaw(mulawArray) {
    const pcmArray = new Int16Array(mulawArray.length);
    const mulawToLinear = [
      -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
      -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
      -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
      -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
      -876, -844, -812, -780, -748, -716, -684, -652,
      -620, -588, -556, -524, -492, -460, -428, -396,
      -372, -356, -340, -324, -308, -292, -276, -260,
      -244, -228, -212, -196, -180, -164, -148, -132,
      -120, -112, -104, -96, -88, -80, -72, -64,
      -56, -48, -40, -32, -24, -16, -8, 0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
      7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
      5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
      3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
      2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
      1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
      1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
      876, 844, 812, 780, 748, 716, 684, 652,
      620, 588, 556, 524, 492, 460, 428, 396,
      372, 356, 340, 324, 308, 292, 276, 260,
      244, 228, 212, 196, 180, 164, 148, 132,
      120, 112, 104, 96, 88, 80, 72, 64,
      56, 48, 40, 32, 24, 16, 8, 0
    ];
    
    for (let i = 0; i < mulawArray.length; i++) {
      pcmArray[i] = mulawToLinear[mulawArray[i]];
    }
    
    return pcmArray;
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputChannel = output[0];
    
    if (this.bufferQueue.length === 0) {
      // Sin audio, llenar con silencio
      outputChannel.fill(0);
      return true;
    }
    
    // Obtener próximo chunk de audio
    const audioChunk = this.bufferQueue.shift();
    const chunkLength = Math.min(audioChunk.length, outputChannel.length);
    
    // Copiar audio al output
    for (let i = 0; i < chunkLength; i++) {
      outputChannel[i] = audioChunk[i];
    }
    
    // Llenar resto con silencio si es necesario
    for (let i = chunkLength; i < outputChannel.length; i++) {
      outputChannel[i] = 0;
    }
    
    return true;
  }
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);
