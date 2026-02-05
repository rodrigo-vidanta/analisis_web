/**
 * Wrapper ESM para lamejs Mp3Encoder
 * 
 * lamejs tiene un bug: Lame.js usa MPEGMode como variable libre
 * sin require(). Esto solo funciona en lame.all.js donde todo
 * comparte un mismo scope. Vite no puede resolver los módulos CJS
 * individuales correctamente.
 * 
 * Solución: Cargar lame.all.js como raw string y ejecutarlo en
 * un scope controlado con new Function(), capturando Mp3Encoder.
 */

// @ts-expect-error - Vite ?raw import returns string
import lameSource from 'lamejs/lame.all.js?raw';

interface Mp3EncoderInstance {
  encodeBuffer(samples: Int16Array): Int8Array;
  flush(): Int8Array;
}

interface Mp3EncoderConstructor {
  new (channels: number, sampleRate: number, bitRate: number): Mp3EncoderInstance;
}

interface LamejsExports {
  Mp3Encoder: Mp3EncoderConstructor;
}

// Ejecutar el bundle en un scope aislado
// lame.all.js define function lamejs() y luego llama lamejs()
// Después de la ejecución, lamejs.Mp3Encoder queda disponible
const initLamejs = (): LamejsExports => {
  const wrapper = new Function(`
    ${lameSource}
    return { Mp3Encoder: lamejs.Mp3Encoder };
  `);
  return wrapper() as LamejsExports;
};

let _cached: LamejsExports | null = null;

/**
 * Obtiene Mp3Encoder de lamejs (con lazy init y cache)
 */
export const getMp3Encoder = (): Mp3EncoderConstructor => {
  if (!_cached) {
    _cached = initLamejs();
  }
  return _cached.Mp3Encoder;
};
