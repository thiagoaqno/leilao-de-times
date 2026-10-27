const P = globalThis.Pistas;
export const { PISTAS, sample, elevate, WORLD, SECTORS, checkpoint, CARROS } = P;
export const $ = () => ({ getContext: () => null });
export const rng = (seed) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };
export const E = { S: null, ME: null };
