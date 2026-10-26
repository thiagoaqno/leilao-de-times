// Interlagos: por enquanto só o asfalto de GP e o ambiente próprio (../interlagos.js: painéis, postos, placas, cercas e
// arquibancadas). As zebras, o grid e o resto continuam os de pista.js; dá para trocar pelas peças do kit (kit/README.md).
import { ambienteInterlagos } from "../interlagos.js";

export const GP_INTERLAGOS = {
  asfalto: true,
  depois: (tr, { add }) => ambienteInterlagos(tr, add),
};
