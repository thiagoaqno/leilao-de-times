"""Empacota os ZIPs (ou GLB soltos) fornecidos pelo usuário em GLB autocontidos.

Uso: python tools/importar-carros-drag.py C:/caminho/dos/zips
Importa só os carros que estiverem na pasta. Não extrai caminhos do ZIP no disco; lê apenas os recursos referidos
pelo glTF. Sem license.txt, a licença sai dos dados do próprio GLB (asset.extras, como o Sketchfab exporta).

Depois, comprima cada GLB (malha com meshopt, texturas em WebP de até 1024 px; o drag já liga o MeshoptDecoder):
  npx @gltf-transform/cli optimize carro.glb carro.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false
Sem simplificar (os faróis e o banco de modelos.js continuam no lugar) e sem palette (que juntaria a pintura com
outros materiais).
"""
import json
import mimetypes
import pathlib
import struct
import sys
import zipfile

SOURCE = {
    "1993_toyota_supra_turbo_mk_iv_versus_2f2f": "supra",
    "2022_bmw_g82_m4_adro_carbon_fiber_widebody_kit": "bmw-m4",
    "ferrari_sf90_xx__www.vecarz.com": "ferrari-sf90",
    "free_porsche_911_carrera_4s": "porsche-911",
    "nissan-skyline-gtr-r33-nismo-wwwvecarzcom": "skyline-r33",
    "porsche_718_cayman_gt4_2020__www.vecarz.com": "porsche-718",
    "2002_nissan_skyline_r34_gt-r": "skyline-r34",
    "2009-lamborghini-gallardo-lp560-4-spyder": "gallardo",
    "2021_volkswagen_phideon_380_tsi": "vw-phideon",
    "2021_volkswagen_polo_plus": "vw-polo",
    "2021_volkswagen_t-cross_280_tsi": "vw-tcross",
}
OUT = pathlib.Path(__file__).resolve().parents[1] / "public/corrida/drag/models"


def read_resource(archive, name):
    path = pathlib.PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or str(path).startswith("/"):
        raise ValueError(f"Caminho inseguro no glTF: {name}")
    return archive.read(str(path))


def pad(data, byte=b"\0"):
    return data + byte * ((-len(data)) % 4)


def gltf_to_glb(archive, scene_name):
    gltf = json.loads(archive.read(scene_name))
    assert len(gltf["buffers"]) == 1, "Esperado um buffer binário"
    binary = bytearray(read_resource(archive, gltf["buffers"][0]["uri"]))
    for image in gltf.get("images", []):
        uri = image.pop("uri", None)
        if not uri:
            continue
        blob = read_resource(archive, uri)
        binary.extend(b"\0" * ((-len(binary)) % 4))
        image["bufferView"] = len(gltf.setdefault("bufferViews", []))
        image["mimeType"] = mimetypes.guess_type(uri)[0] or "image/png"
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(blob)})
        binary.extend(blob)
    gltf["buffers"][0] = {"byteLength": len(binary)}
    json_chunk = pad(json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode(), b" ")
    bin_chunk = pad(bytes(binary))
    length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    return (struct.pack("<III", 0x46546C67, 2, length)
            + struct.pack("<II", len(json_chunk), 0x4E4F534A) + json_chunk
            + struct.pack("<II", len(bin_chunk), 0x004E4942) + bin_chunk)


def licenca_do_glb(data):
    """O texto de crédito que o Sketchfab grava em asset.extras (title, author, license, source)."""
    tamanho = struct.unpack("<I", data[12:16])[0]
    extras = json.loads(data[20:20 + tamanho]).get("asset", {}).get("extras", {})
    if not extras.get("license"):
        return None
    return (f"Model Information:\n* title:\t{extras.get('title', '')}\n* source:\t{extras.get('source', '')}\n"
            f"* author:\t{extras.get('author', '')}\n\nModel License:\n* license type:\t{extras['license']}\n").encode()


def main():
    folder = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path.home() / "Downloads/carro"
    OUT.mkdir(parents=True, exist_ok=True)
    for stem, slug in SOURCE.items():
        licenca = None
        if (folder / f"{stem}.glb").exists():
            data = (folder / f"{stem}.glb").read_bytes()
        elif (folder / f"{stem}.zip").exists():
            with zipfile.ZipFile(folder / f"{stem}.zip") as archive:
                files = archive.namelist()
                glbs = [f for f in files if f.lower().endswith(".glb")]
                if glbs:
                    data = read_resource(archive, glbs[0])
                else:
                    scene_name = next(f for f in files if f.lower().endswith(".gltf"))
                    data = gltf_to_glb(archive, scene_name)
                if "license.txt" in files:
                    licenca = archive.read("license.txt")
        else:
            continue
        (OUT / f"{slug}.glb").write_bytes(data)
        licenca = licenca or licenca_do_glb(data)
        if licenca:
            (OUT / f"{slug}-license.txt").write_bytes(licenca)
        print(slug, f"{len(data) / 1024 / 1024:.1f} MB", "" if licenca else "(sem licença)")


if __name__ == "__main__":
    main()
