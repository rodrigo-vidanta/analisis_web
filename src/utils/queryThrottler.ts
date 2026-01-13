/**
 * ============================================
 * QUERY THROTTLER - Control de Concurrencia
 * ============================================
 * 
 * Controla el número de consultas simultáneas a Supabase
 * para evitar ERR_INSUFFICIENT_RESOURCES
 */

class QueryThrottler {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent = 6; // Máximo de consultas simultáneas
  
  /**
   * Ejecuta una consulta con throttling
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Si hay espacio, ejecutar inmediatamente
    if (this.running < this.maxConcurrent) {
      return this.run(fn);
    }
    
    // Si no hay espacio, encolar y esperar
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
  
  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
  
  private processQueue() {
    while (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.run(next);
      }
    }
  }
  
  /**
   * Ejecuta múltiples consultas en batches controlados
   */
  async batchExecute<T>(
    items: any[],
    fn: (item: any) => Promise<T>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => this.execute(() => fn(item)))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}

export const queryThrottler = new QueryThrottler();
