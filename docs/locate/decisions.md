# Decisões — localização e ScaleOS

Status: decisões aplicadas e validadas.

## ADR-001 — Locale e persistência

**Decisão:** suportar `en` e `pt-BR`; resolver primeiro a preferência persistida em `scaleos:locale`, depois um idioma suportado do navegador e, por fim, `pt-BR`. Usar `en` como fallback de catálogo.

**Motivo:** respeita a escolha do usuário e o navegador sem deixar a experiência sem um padrão brasileiro determinístico.

## ADR-002 — Fachada local sobre i18next

**Decisão:** concentrar configuração, catálogos, normalização e persistência em `src/i18n`.

**Motivo:** evita espalhar regras de infraestrutura e fornece uma única fronteira para os componentes.

## ADR-003 — `Intl` explícito

**Decisão:** passar o locale resolvido explicitamente para datas, horas, números e listas.

**Motivo:** a escolha persistida pode ser diferente do locale do navegador; a apresentação precisa ser determinística.

## ADR-004 — ScaleOS light e ativos locais

**Decisão:** aplicar o brandkit ScaleOS, preservar Kumo e servir fonte, logos e ícones a partir de ativos versionados localmente.

**Motivo:** mantém a interface coerente, revisável e independente de rede externa em runtime.

## ADR-005 — Tema e locale continuam separados

**Decisão:** `GatekeeperAppTheme` permanece exclusivamente visual. O locale é propagado ao configurador por `updateLocale(locale)` e exposto em seu contexto próprio.

**Motivo:** idioma não é tema. A ponte explícita mantém o contrato claro e permite atualização ao vivo no iframe.

## ADR-006 — Mudança compartilhada mínima

**Decisão:** não alterar o kernel. No código compartilhado, limitar o diff ao nome padrão ScaleOS e ao contrato público documentado necessário para o locale dos configuradores.

**Motivo:** preserva a fronteira de segurança e reduz o custo de revisão das APIs públicas.

## ADR-007 — Playbooks e Guardiões

**Decisão:** na apresentação pt-BR, usar **Playbooks** para blueprints e **Guardiões** para gatekeepers. “Modelo” continua reservado a modelos de IA.

**Motivo:** separa claramente o artefato reutilizável do modelo de linguagem e dá à camada de segurança um nome de produto compreensível.

## ADR-008 — Localização de dados Google na borda

**Decisão:** localizar somente nomes e descrições conhecidos do catálogo Google/Gmail. Não traduzir nomes fornecidos por terceiros, assuntos, corpos, nomes de arquivos ou outros dados dinâmicos.

**Motivo:** evita alterar dados reais e mantém a localização restrita à apresentação controlada pelo produto.

## ADR-009 — Compatibilidade de testes explícita

**Decisão:** carregar `urlpattern-polyfill` no teste do pacote Google quando o runtime Node não oferece `URLPattern` global.

**Motivo:** torna o teste portátil sem modificar o comportamento do Worker em produção.

## ADR-010 — Validação em três camadas

**Decisão:** exigir lint/build/test do workspace, validador do design system e inspeção ao vivo no navegador.

**Motivo:** localização e branding dependem simultaneamente de tipos, geração de artefatos, runtime, persistência e fidelidade visual.

## ADR-011 — Publicação separada

**Decisão:** manter a implementação no branch local e não criar/pushar um fork remoto implicitamente.

**Motivo:** a publicação altera estado externo e exige uma decisão operacional separada; o estado atual do Git fica documentado sem presumir credenciais ou destino.
