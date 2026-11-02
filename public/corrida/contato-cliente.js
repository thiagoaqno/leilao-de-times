// O estado público do servidor marca separadamente o fantasma da batida e o do corredor dos boxes.
export function podePreverContato(p) {
  return !!p && p.finish == null && !p.dnf && !p.fantBox && !p.fantasma;
}
