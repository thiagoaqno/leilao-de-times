const { parentPort, workerData } = require("node:worker_threads");
const { otimizar } = require("./corrida-linha.js");
try {
  const lat = otimizar(workerData.pontos, workerData.limites);
  parentPort.postMessage({ lat }, [lat.buffer]);
} catch (e) {
  parentPort.postMessage({ erro: e.message });
}
