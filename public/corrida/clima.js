// Corrida da Galera — o clima no navegador (regras de F1): a chuva e a água na pista de AGORA, para a física, o box e o visual.
// O servidor sorteia o roteiro pela semente do GP e manda em `E.S.clima` (f1-regras.js: `sortearClima`, `climaEm`); aqui só se
// lê a hora certa dele. `clima` é o objeto vivo que o resto do jogo lê (o céu, a neblina e as gotas também):
//   agua (0 seco a 1 encharcado) · chuva (a força da chuva agora: 0, GAROA 0,45 ou 1) · garoa · molhada · encharcada ·
//   chove (o roteiro desta sessão tem chuva) · t (segundos do relógio do roteiro)
import { E, sNow } from "./estado.js";

export const clima = { agua: 0, chuva: 0, garoa: false, molhada: false, encharcada: false, chove: false, t: 0 };
// Atualiza `clima` para a hora `agora` (ms do relógio do servidor) e devolve ele. Chamado por quadro (jogo.js) e pela física.
export function atualizarClima(agora = sNow()) {
  const c = window.F1Regras.climaEm(E.S && E.S.config && E.S.config.regras === "f1" ? E.S.clima : null, agora);
  return Object.assign(clima, c);
}
