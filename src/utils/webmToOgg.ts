/**
 * webmToOgg.ts
 * 
 * Remuxer de WebM/Opus → OGG/Opus sin re-encoding.
 * Extrae los paquetes Opus crudos del contenedor WebM (EBML)
 * y los empaqueta en un contenedor OGG válido.
 * 
 * Necesario porque:
 * - Chrome graba audio como WebM/Opus (no soporta OGG directo)
 * - WhatsApp requiere OGG/Opus para notas de voz (PTT)
 * - Los datos Opus son idénticos, solo cambia el contenedor
 */

// ============ OGG CRC-32 (Polynomial 0x04C11DB7) ============

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) {
      r = (r & 0x80000000) ? ((r << 1) ^ 0x04C11DB7) >>> 0 : (r << 1) >>> 0;
    }
    table[i] = r >>> 0;
  }
  return table;
})();

function oggCrc32(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ data[i]) & 0xFF]) >>> 0;
  }
  return crc >>> 0;
}

// ============ EBML Parser (minimal, para WebM) ============

const UNKNOWN_SIZE = -1;

/**
 * Lee un VINT de EBML (con bits de longitud incluidos, para IDs de elementos).
 */
function readVint(data: Uint8Array, offset: number): { value: number; length: number } {
  if (offset >= data.length) throw new Error('EBML: fin de datos inesperado');
  
  const firstByte = data[offset];
  let length = 1;
  let mask = 0x80;
  
  while (length <= 8 && !(firstByte & mask)) {
    length++;
    mask >>= 1;
  }
  
  if (length > 8) throw new Error('EBML: VINT inválido');
  if (offset + length > data.length) throw new Error('EBML: VINT truncado');
  
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = value * 256 + data[offset + i];
  }
  
  return { value, length };
}

/**
 * Lee un VINT de tamaño EBML (con bits de longitud enmascarados).
 */
function readVintSize(data: Uint8Array, offset: number): { value: number; length: number } {
  if (offset >= data.length) throw new Error('EBML: fin de datos inesperado');
  
  const firstByte = data[offset];
  let length = 1;
  let mask = 0x80;
  
  while (length <= 8 && !(firstByte & mask)) {
    length++;
    mask >>= 1;
  }
  
  if (length > 8) throw new Error('EBML: VINT inválido');
  if (offset + length > data.length) throw new Error('EBML: VINT truncado');
  
  // Mask out length bits
  const firstByteMasked = firstByte & (mask - 1);
  
  // Check for unknown size (all bits set after masking)
  let allOnes = firstByteMasked === (mask - 1);
  if (allOnes) {
    for (let i = 1; i < length; i++) {
      if (data[offset + i] !== 0xFF) { allOnes = false; break; }
    }
  }
  if (allOnes) return { value: UNKNOWN_SIZE, length };
  
  let result = firstByteMasked;
  for (let i = 1; i < length; i++) {
    result = result * 256 + data[offset + i];
  }
  
  return { value: result, length };
}

function readUint(data: Uint8Array, offset: number, length: number): number {
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = value * 256 + data[offset + i];
  }
  return value;
}

// ============ EBML Element IDs ============

const EBML_ID = 0x1A45DFA3;
const SEGMENT_ID = 0x18538067;
const SEGMENT_INFO_ID = 0x1549A966;
const TRACKS_ID = 0x1654AE6B;
const TRACK_ENTRY_ID = 0xAE;
const CODEC_PRIVATE_ID = 0x63A2;
const CODEC_DELAY_ID = 0x56AA;  // CodecDelay en nanosegundos
const CLUSTER_ID = 0x1F43B675;
const TIMESTAMP_ID = 0xE7;
const SIMPLE_BLOCK_ID = 0xA3;

// Master elements que debemos descender
const MASTER_IDS = new Set([
  EBML_ID, SEGMENT_ID, SEGMENT_INFO_ID,
  TRACKS_ID, TRACK_ENTRY_ID, CLUSTER_ID,
]);

// Pre-skip por defecto para Opus (312 samples = 6.5ms @ 48kHz)
// Usado como fallback si CodecDelay no está presente en el WebM
const DEFAULT_OPUS_PRESKIP = 312;

// ============ WebM Parser ============

interface OpusFrame {
  data: Uint8Array;
}

interface WebMParseResult {
  codecPrivate: Uint8Array;
  codecDelayNs: number;
  frames: OpusFrame[];
}

function parseWebM(data: Uint8Array): WebMParseResult {
  let codecPrivate: Uint8Array | null = null;
  let codecDelayNs = 0;
  const frames: OpusFrame[] = [];
  let currentClusterTimestamp = 0;
  
  function parseLevel(start: number, end: number, parentId: number) {
    let offset = start;
    
    while (offset < end - 1) {
      try {
        const idResult = readVint(data, offset);
        const sizeResult = readVintSize(data, offset + idResult.length);
        const dataOffset = offset + idResult.length + sizeResult.length;
        const elementId = idResult.value;
        const elementSize = sizeResult.value;
        
        const childEnd = elementSize === UNKNOWN_SIZE
          ? end
          : Math.min(dataOffset + elementSize, end);
        
        if (MASTER_IDS.has(elementId)) {
          parseLevel(dataOffset, childEnd, elementId);
        } else if (elementId === CODEC_PRIVATE_ID && elementSize > 0) {
          codecPrivate = data.slice(dataOffset, dataOffset + elementSize);
        } else if (elementId === CODEC_DELAY_ID && elementSize > 0) {
          // CodecDelay: delay del encoder en nanosegundos
          codecDelayNs = readUint(data, dataOffset, elementSize);
        } else if (elementId === TIMESTAMP_ID && parentId === CLUSTER_ID) {
          currentClusterTimestamp = readUint(data, dataOffset, elementSize);
          void currentClusterTimestamp;
        } else if (elementId === SIMPLE_BLOCK_ID && parentId === CLUSTER_ID && elementSize > 0) {
          const trackVint = readVintSize(data, dataOffset);
          const headerSize = trackVint.length + 2 + 1;
          
          if (elementSize > headerSize) {
            const frameData = data.slice(dataOffset + headerSize, dataOffset + elementSize);
            if (frameData.length > 0) {
              frames.push({ data: frameData });
            }
          }
        }
        
        if (elementSize === UNKNOWN_SIZE) {
          break;
        }
        offset = dataOffset + elementSize;
      } catch {
        break;
      }
    }
  }
  
  parseLevel(0, data.length, 0);
  
  if (!codecPrivate) {
    throw new Error('WebM: No se encontró OpusHead en CodecPrivate');
  }
  
  return { codecPrivate, codecDelayNs, frames };
}

// ============ OGG Page Writer ============

function createSegmentTable(packetSizes: number[]): Uint8Array {
  const segments: number[] = [];
  
  for (const size of packetSizes) {
    let remaining = size;
    while (remaining >= 255) {
      segments.push(255);
      remaining -= 255;
    }
    segments.push(remaining);
  }
  
  return new Uint8Array(segments);
}

function createOggPage(
  packets: Uint8Array[],
  granulePosition: bigint,
  serialNumber: number,
  pageSequence: number,
  flags: number
): Uint8Array {
  const segmentTable = createSegmentTable(packets.map(p => p.length));
  const totalDataSize = packets.reduce((sum, p) => sum + p.length, 0);
  
  const headerSize = 27 + segmentTable.length;
  const page = new Uint8Array(headerSize + totalDataSize);
  const view = new DataView(page.buffer);
  
  // "OggS" capture pattern
  page[0] = 0x4F; page[1] = 0x67; page[2] = 0x67; page[3] = 0x53;
  page[4] = 0;     // Version
  page[5] = flags; // Header type flags
  
  // Granule position (int64 LE)
  view.setBigInt64(6, granulePosition, true);
  
  // Serial number
  view.setUint32(14, serialNumber, true);
  
  // Page sequence number
  view.setUint32(18, pageSequence, true);
  
  // CRC placeholder (0 para el cálculo)
  view.setUint32(22, 0, true);
  
  // Segment count
  page[26] = segmentTable.length;
  
  // Segment table
  page.set(segmentTable, 27);
  
  // Packet data
  let offset = headerSize;
  for (const p of packets) {
    page.set(p, offset);
    offset += p.length;
  }
  
  // Calcular CRC sobre la página completa
  const crc = oggCrc32(page);
  view.setUint32(22, crc, true);
  
  return page;
}

function createOpusTags(): Uint8Array {
  const vendor = 'pqnc-audio';
  const vendorBytes = new TextEncoder().encode(vendor);
  
  // OpusTags: magic(8) + vendorLen(4) + vendor + commentCount(4)
  const tags = new Uint8Array(8 + 4 + vendorBytes.length + 4);
  const view = new DataView(tags.buffer);
  
  tags.set(new TextEncoder().encode('OpusTags'), 0);
  view.setUint32(8, vendorBytes.length, true);
  tags.set(vendorBytes, 12);
  view.setUint32(12 + vendorBytes.length, 0, true);
  
  return tags;
}

// ============ Opus TOC Parser ============

/**
 * Calcula las muestras PCM (a 48kHz) de un paquete Opus completo.
 * Lee el TOC byte (byte 0) para determinar duración por frame,
 * y el code field para determinar cuántos frames hay por paquete.
 * 
 * RFC 6716 Section 3.1 - TOC byte:
 *   Bits 7-3: config (determina modo y duración del frame)
 *   Bit 2: s (stereo flag)
 *   Bits 1-0: c (code, determina cuántos frames por paquete)
 *     c=0: 1 frame
 *     c=1: 2 frames (CBR)
 *     c=2: 2 frames (VBR)
 *     c=3: M frames (M está en byte 2, bits 0-5)
 * 
 * Chrome MediaRecorder típicamente usa c=3 con M=3 (60ms por paquete).
 */
function getOpusSamplesPerPacket(packet: Uint8Array): number {
  if (packet.length === 0) return 960; // Fallback
  
  const tocByte = packet[0];
  const config = (tocByte >> 3) & 0x1F;
  const code = tocByte & 0x03;
  
  // Determinar duración por frame según config (RFC 6716, Table 2)
  let frameSamples: number;
  if (config <= 11) {
    // SILK-only (NB/MB/WB): 10, 20, 40, 60ms
    frameSamples = [480, 960, 1920, 2880][config % 4];
  } else if (config <= 15) {
    // Hybrid (SWB/FB): 10, 20ms
    frameSamples = config % 2 === 0 ? 480 : 960;
  } else {
    // CELT-only (NB/WB/SWB/FB): 2.5, 5, 10, 20ms
    frameSamples = [120, 240, 480, 960][(config - 16) % 4];
  }
  
  // Determinar número de frames según code
  let frameCount: number;
  switch (code) {
    case 0: frameCount = 1; break;
    case 1: frameCount = 2; break;
    case 2: frameCount = 2; break;
    case 3:
      // Code 3: frame count M está en byte 2, bits 0-5
      if (packet.length < 2) {
        frameCount = 1; // Fallback si el paquete es demasiado corto
      } else {
        frameCount = packet[1] & 0x3F;
        if (frameCount === 0) frameCount = 1; // Protección contra M=0
      }
      break;
    default: frameCount = 1;
  }
  
  return frameSamples * frameCount;
}

// ============ Remuxer Principal ============

/**
 * Valida y normaliza el OpusHead header.
 * WebM CodecPrivate debe contener un OpusHead válido (RFC 7845).
 */
function validateOpusHead(codecPrivate: Uint8Array): Uint8Array {
  // Verificar magic "OpusHead" (8 bytes)
  const magic = String.fromCharCode(...codecPrivate.slice(0, 8));
  if (magic !== 'OpusHead') {
    throw new Error(`OpusHead inválido: magic="${magic}", esperado="OpusHead"`);
  }
  
  // Verificar version (byte 8, debe ser 1)
  if (codecPrivate[8] !== 1) {
    throw new Error(`OpusHead versión ${codecPrivate[8]} no soportada, esperada 1`);
  }
  
  // Verificar longitud mínima (19 bytes para mono/stereo con mapping family 0)
  if (codecPrivate.length < 19) {
    throw new Error(`OpusHead demasiado corto: ${codecPrivate.length} bytes, mínimo 19`);
  }
  
  return codecPrivate;
}

/**
 * Convierte un blob WebM/Opus a OGG/Opus sin re-encoding.
 * Solo cambia el contenedor, los datos Opus se copian intactos.
 * Compatible con iOS y Android (cumple RFC 7845).
 */
export async function webmToOgg(webmBlob: Blob): Promise<Blob> {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const webmData = new Uint8Array(arrayBuffer);
  
  const { codecPrivate: rawCodecPrivate, codecDelayNs, frames } = parseWebM(webmData);
  
  if (frames.length === 0) {
    throw new Error('No se encontraron frames de audio en el WebM');
  }
  
  // Validar OpusHead (RFC 7845 compliance)
  const opusHead = validateOpusHead(rawCodecPrivate);
  
  // CRÍTICO: Chrome pone pre_skip=0 en OpusHead y guarda el delay real
  // en el elemento CodecDelay del WebM (en nanosegundos).
  // En OGG, el pre_skip del OpusHead es la ÚNICA fuente de esta info.
  // Sin un pre_skip correcto, iOS y WhatsApp Web rechazan el archivo.
  const currentPreSkip = opusHead[10] | (opusHead[11] << 8);
  if (currentPreSkip === 0) {
    let preSkipSamples: number;
    if (codecDelayNs > 0) {
      // Convertir nanosegundos a samples @ 48kHz
      preSkipSamples = Math.round(codecDelayNs * 48 / 1000000);
    } else {
      // Fallback: usar valor estándar de Opus (312 samples = 6.5ms)
      preSkipSamples = DEFAULT_OPUS_PRESKIP;
    }
    // Escribir pre_skip en OpusHead (bytes 10-11, little-endian)
    opusHead[10] = preSkipSamples & 0xFF;
    opusHead[11] = (preSkipSamples >> 8) & 0xFF;
  }
  
  const serialNumber = Math.floor(Math.random() * 0xFFFFFFFF);
  const pages: Uint8Array[] = [];
  let pageSeq = 0;
  
  // Página 0: OpusHead (BOS = Beginning of Stream)
  pages.push(createOggPage([opusHead], 0n, serialNumber, pageSeq++, 0x02));
  
  // Página 1: OpusTags
  pages.push(createOggPage([createOpusTags()], 0n, serialNumber, pageSeq++, 0x00));
  
  // Páginas de audio: agrupar frames (~4KB por página)
  // RFC 7845: granule_position = conteo acumulado de samples decodificados desde 0
  // El pre_skip está en OpusHead y el decoder lo aplica por separado
  const MAX_PAGE_SIZE = 4000;
  let currentPackets: Uint8Array[] = [];
  let currentSize = 0;
  let granulePosition = 0n;
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const isLast = i === frames.length - 1;
    
    // Saltar frames vacíos (no deberían existir, pero por seguridad)
    if (frame.data.length === 0) continue;
    
    const samples = getOpusSamplesPerPacket(frame.data);
    
    granulePosition += BigInt(samples);
    currentPackets.push(frame.data);
    currentSize += frame.data.length;
    
    if (currentSize >= MAX_PAGE_SIZE || isLast) {
      pages.push(createOggPage(
        currentPackets,
        granulePosition,
        serialNumber,
        pageSeq++,
        isLast ? 0x04 : 0x00 // EOS en última página
      ));
      currentPackets = [];
      currentSize = 0;
    }
  }
  
  // Concatenar todas las páginas
  const totalSize = pages.reduce((s, p) => s + p.length, 0);
  const oggData = new Uint8Array(totalSize);
  let offset = 0;
  for (const page of pages) {
    oggData.set(page, offset);
    offset += page.length;
  }
  
  return new Blob([oggData], { type: 'audio/ogg; codecs=opus' });
}
