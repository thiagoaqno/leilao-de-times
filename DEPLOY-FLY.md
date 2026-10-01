# Como colocar o projeto no ar no Fly.io (São Paulo)

O projeto já está configurado para rodar no Fly.io, em um servidor em **São Paulo** (`gru`).
Você só precisa seguir os passos abaixo **uma vez**. Depois disso, atualizar o site é um comando só (ou nenhum, se ativar o deploy automático).

Arquivos que fazem isso funcionar:

| Arquivo | Para que serve |
|---|---|
| `Dockerfile` | Diz como montar o "computador" que roda o `server.js` |
| `fly.toml` | Configuração do Fly: região São Paulo, porta, desligar quando ninguém usa |
| `.dockerignore` | Arquivos que não precisam ir para o servidor |
| `.github/workflows/fly-deploy.yml` | (Opcional) Publica sozinho toda vez que você der push na `main` |

---

## 1. Criar a conta

1. Acesse https://fly.io/app/sign-up e crie a conta (dá pra entrar com o GitHub).
2. Cadastre um cartão de crédito em **Billing**. O Fly exige isso, mesmo para gastos pequenos.

## 2. Instalar o programa `fly` no seu computador

**Windows** (abra o PowerShell):
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Mac / Linux** (abra o Terminal):
```bash
curl -L https://fly.io/install.sh | sh
```

Feche e abra o terminal de novo e confira se funcionou:
```bash
fly version
```

## 3. Fazer login
```bash
fly auth login
```
Vai abrir o navegador para você confirmar.

## 4. Baixar o projeto e entrar na pasta
Se ainda não tiver o projeto no computador:
```bash
git clone https://github.com/thiagoaqno/leilao-de-times.git
cd leilao-de-times
```

## 5. Criar o app no Fly (só na primeira vez)
```bash
fly launch --copy-config --no-deploy --ha=false
```
- Se ele perguntar se quer **ajustar as configurações** (*tweak these settings*), responda **não** (`N`).
- Se disser que o nome `leilao-de-times` já existe, rode de novo escolhendo outro nome:
  ```bash
  fly launch --copy-config --no-deploy --ha=false --name leilao-do-thiago
  ```
  (o nome vira o endereço: `https://leilao-do-thiago.fly.dev`)

## 6. Publicar 🚀
```bash
fly deploy --ha=false
```
Quando terminar, ele mostra o endereço. Para abrir direto:
```bash
fly open
```

> ⚠️ **Por que `--ha=false`?** Os jogos guardam as salas na memória do servidor.
> Se existissem 2 máquinas, um jogador poderia cair numa e o amigo na outra, e eles não se veriam.
> Com `--ha=false` fica só **1 máquina**. Se algum dia aparecerem 2, rode: `fly scale count 1`

---

## Para atualizar o site depois

Mudou o código? Na pasta do projeto:
```bash
fly deploy --ha=false
```

### (Opcional) Deploy automático pelo GitHub
Assim, todo `git push` na branch `main` publica sozinho:

1. Gere um token:
   ```bash
   fly tokens create deploy
   ```
   Copie o texto inteiro que aparecer (começa com `FlyV1`).
2. No GitHub, abra o repositório → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Nome: `FLY_API_TOKEN` · Valor: o token copiado → **Add secret**.

Pronto. Dá pra acompanhar na aba **Actions** do repositório.
Enquanto o segredo não existir, a action só avisa e não faz nada (não dá erro).

---

## Comandos úteis

| Comando | O que faz |
|---|---|
| `fly logs` | Mostra o que o servidor está imprimindo (ótimo para achar erros) |
| `fly status` | Mostra se a máquina está ligada |
| `fly open` | Abre o site no navegador |
| `fly scale count 1` | Garante que só existe 1 máquina |
| `fly apps destroy NOME` | Apaga o app (para de cobrar) |

## Quanto custa?

- A máquina configurada é a menor (`shared-cpu-1x`, 256 MB). O servidor usa uns 70 MB, então sobra memória.
- A máquina **desliga sozinha quando ninguém está conectado** e **liga sozinha** quando alguém abre o site.
  Você só paga pelo tempo em que ela está ligada. A primeira pessoa a entrar espera uns 2 segundos.
- Ligada o mês inteiro, a máquina custa alguns dólares. Desligando quando está parada, fica bem menos.
  Confira os preços atuais em https://fly.io/pricing e acompanhe o gasto em **Billing** no painel.
- Quando a máquina desliga, as salas abertas somem. Isso só acontece quando não tem ninguém conectado.
  Se preferir que ela nunca desligue (custa mais), troque no `fly.toml`:
  ```toml
  auto_stop_machines = 'off'
  min_machines_running = 1
  ```

## Deu problema?

- **"Could not find App"**: rode o passo 5 de novo.
- **Site não abre / erro 502**: rode `fly logs` e veja a mensagem de erro.
- **Jogadores na mesma sala não se veem**: rode `fly scale count 1`.
