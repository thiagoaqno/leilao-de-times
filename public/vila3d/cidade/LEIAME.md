# Cidade (ainda não usada na Vila)

`cidade-reduzida.glb` (6,4 MB): "Neighbourhood City Modular lowpoly" de **golukumar**
(https://sketchfab.com/3d-models/neighbourhood-city-modular-lowpoly-6a0e3b97a8a54f2a909d351322916293), licença
Sketchfab Standard (o Thiago baixou para usar em projeto pequeno). O original tinha 70 MB.

O que o arquivo é: **um quarteirão só** (cerca de 42 x 39 unidades, 1.787 nós e 415 mil triângulos): seis prédios de
tijolo com sacadas, ruas com faixas, calçadas, árvores, postes, cones e alguns carros. Não são peças soltas em grade como
as do KayKit.

Como foi reduzido (`@gltf-transform`): `dedup`, `prune`, `weld`, texturas em WebP de no máximo 512 px (60 imagens,
24 MB no original), `quantize` e compressão `meshopt`. Para abrir: `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)`, com
`three/addons/libs/meshopt_decoder.module.js`.
