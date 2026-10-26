// Os GPs: cada pista de F1 diz quais peças do kit usa (kit/README.md). pista.js monta, nesta ordem: asfalto, chão, escape,
// guard-rail, cenario (o que só a pista tem), ambiente, passarelas, marcos, postes, montanha, vida, fachadas e depois.
// Pista nova de GP: um arquivo nesta pasta exportando a configuração e uma linha aqui.
import { GP_MONACO } from "./monaco.js";
import { GP_INTERLAGOS } from "./interlagos.js";
import { GP_BARCELONA } from "./barcelona.js";
import { GP_MONZA } from "./monza.js";

export const GPS = { monaco: GP_MONACO, interlagos: GP_INTERLAGOS, barcelona: GP_BARCELONA, monza: GP_MONZA };
