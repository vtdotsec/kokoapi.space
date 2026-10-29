# Repasses

Ferramenta web para fechar vendas em consignação. A pessoa importa um CSV, confirma o mapeamento de colunas, revisa o cálculo e exporta os valores a pagar por consignante.

## Privacidade e funcionamento

- O processamento, os cálculos e as exportações acontecem no navegador. O conteúdo do CSV não é enviado a uma API nem persistido em armazenamento do navegador.
- O beta não exige cadastro e não tem cobrança, limites de uso ou armazenamento em nuvem.
- CSV de até 10 MB e 50 mil registros. Campos necessários: consignante, item e valor bruto. O status vazio é tratado como venda; devoluções e itens não vendidos ficam fora do repasse.
- A comissão pode ser padrão, configurada por consignante ou incluída na linha do item. Precedência: taxa do item, taxa do consignante e taxa padrão.
- Descontos reduzem a base da comissão. Valores são calculados em centavos inteiros.
- Linhas inválidas aparecem na revisão. Duplicatas possíveis são sinalizadas e a repetição após a primeira fica fora por padrão, com opção de incluir.
- Exportações: CSV detalhado e PDF consolidado ou individual por consignante.

O heurístico de duplicidade (sem ID) compara consignante, item, data, status, valor e desconto. Ele não substitui a conferência humana: duas vendas legítimas idênticas podem ser marcadas como possíveis duplicatas. O CSV completo pode conter dados sensíveis; baixe os arquivos em dispositivo confiável.

## Desenvolvimento

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

## Verificações

```sh
npm run check
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm run build
```

Os testes unitários cobrem valores BRL, arredondamento, validação, duplicatas e regras de fechamento. Os testes Playwright percorrem importação, revisão, exportações e layout móvel.

## Compose da suite

O serviço de produção é definido no Compose da raiz do repositório e publica o subdomínio através do Nginx da suite:

```sh
docker compose up -d --build kokoapi-repasses kokoapi-tools-web
```

O container `kokoapi-repasses` fica somente na rede privada do Compose. O Nginx encaminha `Host: repasses.kokoapi.space` para ele; não há uma porta pública extra.

## Publicação na OCI

O workflow do repositório reconstrói todos os serviços do Compose ao publicar na branch `main`. O Caddy do host precisa encaminhar o subdomínio ao Nginx da suite:

1. Clone este repositório no servidor, ou copie apenas `apps/repasses` para uma pasta própria.
2. Entre em `apps/repasses` e execute `docker compose -f compose.yaml up -d --build`.
3. No Caddy, acrescente o bloco abaixo ao Caddyfile ativo, valide a configuração e recarregue o serviço:

```caddyfile
repasses.kokoapi.space {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
```

Na Cloudflare, use um registro `A` chamado `repasses` apontando para o IP público da VM, com proxy habilitado. Confirme HTTPS e `https://repasses.kokoapi.space/robots.txt`.

Para atualizar manualmente, faça `git pull` no clone e rode `docker compose up -d --build kokoapi-repasses kokoapi-tools-web`. Reversão: volte o checkout à versão anterior e reconstrua os mesmos serviços.

## SEO e acessibilidade

O build estático fornece title, description, canonical, Open Graph, sitemap XML, robots.txt, idioma `pt-BR`, navegação por etapas com rótulos, tabela de prévia e mensagens acessíveis de estado. O bundle não carrega fontes ou scripts de terceiros.

## Evolução comercial

Checkout, contas e limites continuam desativados. As flags em `src/scripts/feature-flags.ts` registram essa decisão; venda vitalícia/ilimitada deve ser desenhada separadamente, incluindo termos de suporte, atualizações, antifraude e custos de manutenção antes de habilitar cobrança.
