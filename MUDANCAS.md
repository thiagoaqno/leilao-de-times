# Fly: o volume do banco de dados

## Como fica
- O site passa a guardar o banco de dados (`bd.js`, as carreiras de treinador) no volume `galera_dados`, em São Paulo.
  Antes, o arquivo ficava dentro da máquina e sumia a cada deploy.
- O volume já foi criado no Fly (`vol_vp273oydy273n1w4`, 1 GB, região `gru`, com foto diária guardada por 5 dias).

## Por dentro
- `fly.toml`:
  - `[mounts]` liga o volume `galera_dados` em `/data`;
  - `[env]` diz ao servidor onde fica o banco: `DB_PATH = "/data/galera.db"`.
- `DEPLOY-FLY.md`: anota que, neste app, o volume já existe.

## Para conferir depois do deploy
- No `fly logs -a leilao-de-times`, não pode aparecer "Banco de dados não abriu".
- `fly ssh console -a leilao-de-times -C "ls -la /data"` mostra o `galera.db`.
