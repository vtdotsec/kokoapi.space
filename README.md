# kokoapi.space

kokoapi.space is a catalog of self-hostable software. Every entry is a Markdown file in
this repository; the build reads those files and generates a static website. There is no
database, no server-side runtime and no accounts.

Entries are written for people who run their own hardware. Beyond a short description and
the usual links, each one records structured data — license, supported architectures,
typical RAM/CPU footprint, database requirements, Docker/Kubernetes packaging and SSO
support — which the site turns into search filters, spec sheets and side-by-side
comparisons.

## What the site contains

- `/` — index page with summary stats, featured apps, a category index and recently
  reviewed entries.
- `/apps/` — the full catalog. Search and filters are rendered server-side first; when
  JavaScript is available, a small script narrows and sorts the list and keeps the state
  in the URL.
- `/apps/<slug>/` — one page per app: prose, spec list and a comparison table against
  alternative software.
- `/categories/` and `/categories/<slug>/` — category index and per-category listings.
- `/about/` — how entries are chosen, how to read the resource figures, how to
  contribute.

## Stack and architecture

| Concern       | What is used                                                        |
| ------------- | ------------------------------------------------------------------- |
| Framework     | [Astro](https://astro.build), static output                         |
| Content       | Markdown content collections, validated with Zod at build time      |
| Styling       | Hand-written CSS in `src/styles/global.css`, system fonts           |
| Client script | One dependency-free file (`public/catalog.js`) for `/apps/` filtering |
| SEO           | Per-page meta, canonical URLs, Open Graph, JSON-LD, `@astrojs/sitemap` |
| Serving       | nginx inside a Docker container (see `Dockerfile`, `nginx.conf`)    |

The build runs at deploy time and produces plain HTML/CSS/JS in `dist/`. In production the
container serves that directory with a hardened nginx configuration; nothing executes at
request time except the static file server.

## Repository layout

```
.
├── astro.config.mjs        # site config (static output, sitemap)
├── Dockerfile              # multi-stage build → nginx
├── docker-compose.yml
├── nginx.conf              # static hosting, security headers, caching
├── public/
│   ├── catalog.js          # /apps/ filtering (plain JS, no dependencies)
│   ├── favicon.svg
│   ├── og.svg
│   └── robots.txt
└── src/
    ├── content.config.ts   # Zod schemas — source of truth for all fields
    ├── content/
    │   ├── products/       # one Markdown file per app
    │   └── categories/     # one Markdown file per category
    ├── lib/catalog.ts      # query and formatting helpers
    ├── layouts/            # Base.astro (page shell, head/meta)
    ├── components/         # header, footer, product card, compare table
    ├── pages/              # routes
    └── styles/global.css   # design tokens and styles (no framework)
```

## Running locally

Requires Node.js >= 20.

```sh
npm ci
npm run dev       # http://localhost:4321
```

Other scripts:

```sh
npm run build      # static site → dist/
npm run preview    # serve the built site locally
npm run check      # Astro + content schema validation
npm run typecheck  # TypeScript only
```

## Docker Compose

```sh
docker compose up -d --build
```

The site is served on port 8080 of the host. TLS is intentionally left to a reverse proxy
in front of the container. The container runs nginx as a non-root user with a read-only
root filesystem, dropped capabilities and a health check; the `nginx.conf` bundled in the
image sets security headers (including a strict Content-Security-Policy), gzip and long
caching for hashed assets.

## Adding or editing content

All content lives in `src/content/`. The filename (without the extension) becomes the URL
slug.

### Products — `src/content/products/<slug>.md`

One file per app. Frontmatter holds the structured data; the Markdown body is the "About"
section on the app page. The complete list of fields, allowed values and defaults lives in
`src/content.config.ts` as a Zod schema — read it before editing, it is the reference.

A minimal example:

```md
---
title: Example
category: monitoring
tagline: One sentence describing what it does.
website: https://example.org
source: https://github.com/example/example
license: MIT
language: Go
arch: [amd64, arm64]
ramMb: 256
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: false
alternatives: [other-app]
tags: [metrics, dashboards]
updated: 2026-01-15
---

Longer notes about the project, deployment caveats, hardware assumptions, etc.
```

### Categories — `src/content/categories/<slug>.md`

`title`, `emoji`, `tagline` and an optional `order` number; the Markdown body appears on
the category page.

To add an app you usually add a single Markdown file, referencing an existing category
slug. Inventing a category without creating its file breaks the build. Run `npm run check`
and `npm run build` before pushing changes; both fail on schema mismatches or unknown
category references.

Some conventions to keep entries consistent:

- Write prose in English.
- `ramMb` and `cpu` describe a *typical baseline* for a small single-node deployment, not
  certified minimums. State big assumptions in the prose.
- Internal links use trailing slashes (`/apps/<slug>/`); the nginx config resolves `$uri`,
  `$uri.html` and `$uri/index.html`.
- Keep frontmatter factual — figures and links change as projects evolve, so corrections
  are welcome.

## License

MIT — see [LICENSE](LICENSE).

---

# kokoapi.space

O kokoapi.space é um catálogo de software autohospedável. Cada verbete é um arquivo
Markdown neste repositório; o build lê esses arquivos e gera um site estático. Não há
banco de dados, nem runtime no servidor, nem contas de usuário.

Os verbetes são escritos para quem roda a própria infraestrutura. Além de uma descrição
curta e dos links usuais, cada um registra dados estruturados — licença, arquiteturas
suportadas, consumo típico de RAM/CPU, requisitos de banco de dados, empacotamento
(Docker/Kubernetes) e suporte a SSO — que o site converte em filtros de busca, fichas
técnicas e comparações lado a lado.

## O que o site contém

- `/` — página inicial com resumo de dados, aplicativos em destaque, índice de categorias
  e verbetes revisados recentemente.
- `/apps/` — o catálogo completo. Busca e filtros são renderizados no servidor primeiro;
  com JavaScript disponível, um script pequeno filtra e ordena a lista e mantém o estado
  na URL.
- `/apps/<slug>/` — uma página por aplicativo: texto, ficha técnica e tabela de comparação
  com alternativas.
- `/categories/` e `/categories/<slug>/` — índice de categorias e listagens por categoria.
- `/about/` — como os verbetes são escolhidos, como interpretar os números de recursos e
  como contribuir.

## Stack e arquitetura

| Tema          | O que é usado                                                     |
| ------------- | ----------------------------------------------------------------- |
| Framework     | [Astro](https://astro.build), saída estática                      |
| Conteúdo      | Content collections em Markdown, validadas com Zod no build       |
| Estilo        | CSS escrito à mão em `src/styles/global.css`, fontes do sistema   |
| Script cliente| Um arquivo sem dependências (`public/catalog.js`) para os filtros de `/apps/` |
| SEO           | Meta por página, canonical, Open Graph, JSON-LD, `@astrojs/sitemap` |
| Servir        | nginx em um contêiner Docker (ver `Dockerfile`, `nginx.conf`)     |

O build roda na hora de publicar e gera HTML/CSS/JS puro em `dist/`. Em produção, o
contêiner serve esse diretório com uma configuração de nginx endurecida; nada é executado
no momento da requisição além do servidor de arquivos estático.

## Estrutura do repositório

```
.
├── astro.config.mjs        # config do site (saída estática, sitemap)
├── Dockerfile              # build multi-estágio → nginx
├── docker-compose.yml
├── nginx.conf              # hospedagem estática, headers de segurança, cache
├── public/
│   ├── catalog.js          # filtros de /apps/ (JS puro, sem dependências)
│   ├── favicon.svg
│   ├── og.svg
│   └── robots.txt
└── src/
    ├── content.config.ts   # schemas Zod — fonte da verdade dos campos
    ├── content/
    │   ├── products/       # um arquivo Markdown por aplicativo
    │   └── categories/     # um arquivo Markdown por categoria
    ├── lib/catalog.ts      # helpers de consulta e formatação
    ├── layouts/            # Base.astro (shell das páginas, head/meta)
    ├── components/         # header, footer, card de produto, tabela de comparação
    ├── pages/              # rotas
    └── styles/global.css   # tokens de design e estilos (sem framework)
```

## Executando localmente

Requer Node.js >= 20.

```sh
npm ci
npm run dev       # http://localhost:4321
```

Outros comandos:

```sh
npm run build      # site estático → dist/
npm run preview    # serve o site compilado localmente
npm run check      # validação do Astro + schemas de conteúdo
npm run typecheck  # apenas TypeScript
```

## Docker Compose

```sh
docker compose up -d --build
```

O site é servido na porta 8080 do host. O TLS fica intencionalmente a cargo de um reverse
proxy na frente do contêiner. O contêiner roda nginx como usuário não-root, com sistema de
arquivos somente leitura, capabilities removidas e health check; o `nginx.conf` embutido
na imagem define headers de segurança (incluindo uma Content-Security-Policy estrita),
gzip e cache longo para os assets com hash.

## Adicionando ou alterando conteúdo

Todo o conteúdo fica em `src/content/`. O nome do arquivo (sem a extensão) vira o slug da
URL.

### Produtos — `src/content/products/<slug>.md`

Um arquivo por aplicativo. O frontmatter guarda os dados estruturados; o corpo em Markdown
é a seção "About" da página do aplicativo. A lista completa de campos, valores permitidos
e padrões está em `src/content.config.ts` como um schema Zod — leia esse arquivo antes de
editar, ele é a referência.

Um exemplo mínimo:

```md
---
title: Example
category: monitoring
tagline: Uma frase sobre o que o software faz.
website: https://example.org
source: https://github.com/example/example
license: MIT
language: Go
arch: [amd64, arm64]
ramMb: 256
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: false
alternatives: [other-app]
tags: [metrics, dashboards]
updated: 2026-01-15
---

Anotações mais longas sobre o projeto, ressalvas de deploy, premissas de hardware etc.
```

### Categorias — `src/content/categories/<slug>.md`

`title`, `emoji`, `tagline` e um `order` numérico opcional; o corpo em Markdown aparece na
página da categoria.

Para adicionar um aplicativo, normalmente basta criar um arquivo Markdown referenciando
uma categoria existente. Inventar uma categoria sem criar o arquivo dela quebra o build.
Rode `npm run check` e `npm run build` antes de enviar alterações; os dois falham em caso
de schema inválido ou referência a categoria desconhecida.

Algumas convenções para manter os verbetes consistentes:

- Escreva os textos em inglês.
- `ramMb` e `cpu` descrevem um *baseline típico* para uma implantação pequena em um único
  nó, não mínimos certificados. Assuma isso e documente no texto quando houver exceções.
- Links internos usam barra no final (`/apps/<slug>/`); a config do nginx resolve `$uri`,
  `$uri.html` e `$uri/index.html`.
- Mantenha o frontmatter factual — números e links mudam conforme os projetos evoluem,
  então correções são bem-vindas.

## Licença

MIT — veja [LICENSE](LICENSE).
