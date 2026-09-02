# Localização pt-BR e identidade ScaleOS

Status: implementação concluída e validada em 2026-09-01.

Este diretório registra o plano executado, as decisões de produto e as evidências da localização `en`/`pt-BR` com a identidade ScaleOS.

## Resultado entregue

- localização da SPA em inglês e português do Brasil;
- preferência persistida em `localStorage` sob `scaleos:locale`;
- resolução na ordem: preferência salva, idioma suportado do navegador e `pt-BR` como padrão final;
- inglês como fallback para chaves ausentes;
- seletor de idioma antes e depois do login;
- formatação por `Intl` com locale explícito;
- identidade ScaleOS, fonte e ativos locais, com experiência light;
- terminologia de produto em português: **Playbooks** para blueprints e **Guardiões** para gatekeepers;
- ícone oficial da ScaleOS no bloco de destino do diagrama de Guardiões;
- configurador do Gmail e metadados conhecidos do Google localizados, sem traduzir conteúdo do usuário ou respostas dinâmicas do provedor;
- locale propagado aos configuradores isolados por uma ponte RPC pequena e documentada.

O kernel em `packages/workshop-backend` não foi alterado. As mudanças compartilhadas ficaram restritas ao nome padrão ScaleOS e ao contrato documentado de locale do configurador.

## Evidências

| Verificação | Resultado |
| --- | --- |
| `pnpm lint` | Aprovado; apenas avisos preexistentes/não bloqueantes. |
| `pnpm build` | Aprovado em todo o workspace. |
| `pnpm test` | Aprovado em todo o workspace, incluindo frontend, backend, Guardiões e testes de integração. |
| ScaleOS validator | Aprovado contra o manifesto `.scaleos-design.json`. |
| Login e onboarding | Validados em Chrome, em `en` e `pt-BR`. |
| Shell autenticado | Troca de idioma, reload, persistência, navegação e layout móvel validados. |
| Playbooks | Rota `/blueprints` exibida como “Playbooks” em pt-BR. |
| Guardiões | Rota `/gatekeepers` exibida como “Guardiões”, com o ícone ScaleOS no diagrama. |
| Google/Gmail | Modal do Google validado em pt-BR com Gmail, Drive, Docs, Sheets e Calendar. |
| Console do navegador | Execução final com 0 erros e 0 avisos. |

Capturas principais:

- [`final-guardioes-scaleos.png`](./screenshots/final-guardioes-scaleos.png)
- [`playbooks-pt-br.png`](./screenshots/playbooks-pt-br.png)
- [`google-guardiao-pt-br.png`](./screenshots/google-guardiao-pt-br.png)
- [`login-scaleos-pt-br.png`](./screenshots/login-scaleos-pt-br.png)
- [`home-mobile-pt-br.png`](./screenshots/home-mobile-pt-br.png)

## Estado do Git

A implementação está no branch `start-cloudflare-os` do fork `ennioferreirab/cloudflare-os`, com PR aberto contra a `main` do mesmo fork.

## Documentos

- [implementation-plan.md](./implementation-plan.md): fases executadas, limites e critérios de aceite.
- [decisions.md](./decisions.md): decisões técnicas e de produto consolidadas.
