/**
 * Módulo de métricas simulado
 */

export function createMetrics(context) {
  return {
    record: (name, value) => console.log(`[METRICS] [${context}] ${name}: ${value}`),
    increment: (name) => console.log(`[METRICS] [${context}] ${name} incrementado`),
    decrement: (name) => console.log(`[METRICS] [${context}] ${name} decrementado`),
    timing: (name, timeMs) => console.log(`[METRICS] [${context}] ${name}: ${timeMs}ms`)
  };
}

export default createMetrics;
