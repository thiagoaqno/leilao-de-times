const nada = () => {};
export const Sound = new Proxy({}, { get: () => nada });
