# Haxball: cantos chanfrados

## O que muda
- Os quatro cantos do campo viraram uma mureta em diagonal (chanfro de 58 px em cada lado). A bola quica nela com a mesma perda das outras paredes e não fica mais presa na quina.
- Os discos escorregam pelo chanfro, então ninguém prende a bola no canto.
- O desenho do campo acompanha: o contorno corta os cantos e a mureta aparece escura, com listras.

## Testes
- `node --test tests/haxball.test.js`: teste novo com a bola chegando em diagonal ao canto e um disco empurrando a bola contra outro canto.
