# Santa Bruma · Plantão Zero

Um episódio curto de survival horror 3D com câmera fixa, cenários low-poly e controles inspirados em jogos de console do fim dos anos 1990. Personagens, história e materiais são originais.

## Jogar

- URL: `https://game.kokoapi.space`
- A entrada é protegida por HTTP Basic Auth. O usuário é `player`; a senha fica no segredo `GAME_ACCESS_PASSWORD` do repositório e no `.env` privado da VM.
- Teclado: WASD para andar, segure Espaço para mirar, F para atirar, R para recarregar, E para interagir e Esc para pausar.
- Celular: use os controles de toque na tela.
- É uma experiência single-player. O navegador desenha a cena 3D; a VM serve arquivos, autentica o acesso e guarda um único slot de progresso.

## Desenvolvimento

Requer Node.js 24 ou superior.

```sh
npm ci
npm run dev
npm run build
```

O serviço usa Three.js e Vite no cliente e apenas módulos nativos do Node.js no servidor. O servidor precisa de `GAME_ACCESS_PASSWORD` com ao menos 24 caracteres. Saves ficam em `DATA_DIR/santa-bruma.sqlite`; em produção, o Docker Compose monta o volume `game-data` em `/data`.

O endpoint `/health` é usado pelo healthcheck do Compose. Todo o restante exige autenticação. A rota `/api/save` recebe somente o estado necessário para continuar a partida.
