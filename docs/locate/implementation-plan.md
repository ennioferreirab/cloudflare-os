# Plano executado: pt-BR + ScaleOS

Status: concluído em 2026-09-02.

## Fase 1 — fundação de locale

Entregue:

- fachada local sobre `i18next`/`react-i18next`;
- catálogos `en` e `pt-BR` organizados por superfície;
- persistência segura em `scaleos:locale`;
- detecção de idioma suportado do navegador;
- fallback em inglês para traduções ausentes;
- helpers de `Intl` com locale explícito;
- atualização de `document.documentElement.lang`.

## Fase 2 — identidade ScaleOS

Entregue:

- manifesto `.scaleos-design.json` vinculado à revisão canônica do design system;
- tokens visuais, tipografia e ativos locais da ScaleOS;
- experiência light preservando os componentes Kumo;
- nome padrão da implantação alterado para ScaleOS;
- logotipo/ícone usados nas superfícies de autenticação, shell e diagrama de Guardiões.

## Fase 3 — superfícies do Workshop

Entregue:

- login, cadastro, onboarding, navegação, home, workspaces, resultados, atividade, configurações, administração, billing, compartilhamento e editores localizados;
- seletor de idioma no shell público e autenticado;
- terminologia pt-BR consolidada: blueprints são **Playbooks** e gatekeepers são **Guardiões**;
- conteúdo do usuário, IDs, payloads e mensagens dinâmicas de provedores preservados.

## Fase 4 — Google/Gmail e configuradores isolados

Entregue:

- locale propagado ao iframe do configurador via `ResourceConfiguratorIframe.updateLocale(locale)`;
- contexto público do configurador com `locale` documentado;
- artefatos gerados pelo builder atualizados;
- configurador Gmail bilíngue;
- nomes e descrições conhecidos dos recursos Google localizados na borda da UI;
- teste de integração do configurador e compatibilidade de `URLPattern` no ambiente Node de teste.

## Fase 5 — fechamento

Executado na raiz do repositório:

```sh
pnpm lint
pnpm build
pnpm test
```

Também foi executado o validador do ScaleOS Design System e uma sessão ao vivo em Chrome com backend local, frontend Vite e login de desenvolvimento. Foram verificados:

- idioma antes do login;
- persistência após reload;
- onboarding e shell autenticado;
- troca ao vivo entre `en` e `pt-BR`;
- responsividade móvel em 390 × 844;
- rotas `/blueprints` e `/gatekeepers`;
- modal Google/Gmail;
- ícone ScaleOS no diagrama de Guardiões;
- console final sem erros ou avisos.

## Limites mantidos

- nenhuma tradução de conteúdo do usuário ou dados retornados por provedores;
- nenhuma mudança no kernel `workshop-backend`;
- nenhum locale acoplado a `GatekeeperAppTheme`;
- nenhum deploy de uma instância de produção;
- dark mode não faz parte da experiência localizada atual.

## Publicação

O branch `start-cloudflare-os` foi publicado em `ennioferreirab/cloudflare-os`. O [PR #1](https://github.com/ennioferreirab/cloudflare-os/pull/1) está aberto contra a `main` desse fork, não contra o repositório upstream.
