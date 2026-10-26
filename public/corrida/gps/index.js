// Os GPs: cada pista de F1 diz quais peças do kit usa (kit/README.md). pista.js monta, nesta ordem: asfalto, chão, escape,
// guard-rail, cenario (o que só a pista tem), ambiente, passarelas, marcos, postes, montanha, vida, fachadas e depois.
// Pista nova de GP: um arquivo nesta pasta exportando a configuração e uma linha aqui.
import { GP_MONACO } from "./monaco.js";
import { GP_INTERLAGOS } from "./interlagos.js";
import { GP_BARCELONA } from "./barcelona.js";
import { GP_SILVERSTONE } from "./silverstone.js";
import { GP_MONZA } from "./monza.js";
import { GP_MELBOURNE } from "./melbourne.js";
import { GP_XANGAI } from "./xangai.js";
import { GP_SUZUKA } from "./suzuka.js";
import { GP_BAHREIN } from "./bahrein.js";
import { GP_JEDDAH } from "./jeddah.js";
import { GP_MIAMI } from "./miami.js";
import { GP_MONTREAL } from "./montreal.js";
import { GP_REDBULLRING } from "./redbullring.js";
import { GP_SPA } from "./spa.js";
import { GP_HUNGARORING } from "./hungaroring.js";
import { GP_ZANDVOORT } from "./zandvoort.js";
import { GP_MADRI } from "./madri.js";
import { GP_BAKU } from "./baku.js";
import { GP_SINGAPURA } from "./singapura.js";
import { GP_AUSTIN } from "./austin.js";
import { GP_MEXICO } from "./mexico.js";
import { GP_LASVEGAS } from "./lasvegas.js";
import { GP_CATAR } from "./catar.js";
import { GP_ABUDHABI } from "./abudhabi.js";

export const GPS = { monaco: GP_MONACO, interlagos: GP_INTERLAGOS, barcelona: GP_BARCELONA, silverstone: GP_SILVERSTONE, monza: GP_MONZA };

// as pistas do calendário de F1 de 2026 convertidas de bacinger/f1-circuits (ferramentas/circuitos-f1.js), com o GP simples
// do kit (kit/gp-simples.js)
Object.assign(GPS, { melbourne: GP_MELBOURNE, xangai: GP_XANGAI, suzuka: GP_SUZUKA, bahrein: GP_BAHREIN, jeddah: GP_JEDDAH, miami: GP_MIAMI, montreal: GP_MONTREAL, redbullring: GP_REDBULLRING, spa: GP_SPA, hungaroring: GP_HUNGARORING, zandvoort: GP_ZANDVOORT, madri: GP_MADRI, baku: GP_BAKU, singapura: GP_SINGAPURA, austin: GP_AUSTIN, mexico: GP_MEXICO, lasvegas: GP_LASVEGAS, catar: GP_CATAR, abudhabi: GP_ABUDHABI });
