import { Field, h, RadioCards, Section, TextInput, type ConfiguratorUISpec } from "@gadgets/configurator-ui";
import type { GmailConfiguratorRpc, GmailConfiguratorValues } from "./gmail-configurator-types";

export default {
  initial: { mode: "all" },

  isReady({ values }) {
    const mode = values.mode ?? "all";
    if (mode === "all") return true;
    if (mode === "search") return typeof values.query === "string" && values.query.trim().length > 0;
    if (mode === "label") return typeof values.label === "string" && values.label.trim().length > 0;
    return false;
  },

  // Must mirror `parseGmailUrl` in resources.ts, which is what actually mints the capability. This
  // module is transpiled on its own and cannot import that parser, so `__tests__/configurator-url
  // .test.ts` is what keeps the copies honest.
  initialValuesFromResourceUrl({ resourceUrl }) {
    const hash = new URL(resourceUrl).hash.replace(/^#/, "");
    if (hash.startsWith("search/")) {
      // Gmail encodes spaces in hash searches as `+`, which decodeURIComponent leaves alone. The
      // substitution has to precede the decode so an escaped `%2B` still yields a literal `+`.
      const query = hash.slice("search/".length).replace(/\+/g, " ");
      return { mode: "search", query: decodeURIComponent(query) };
    }
    if (hash.startsWith("label/")) {
      return { mode: "label", label: decodeURIComponent(hash.slice("label/".length)) };
    }
    return { mode: "all" };
  },

  resourceUrl({ values }) {
    const mode = values.mode ?? "all";
    if (mode === "search") {
      return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(values.query ?? "")}`;
    }
    if (mode === "label") {
      return `https://mail.google.com/mail/u/0/#label/${encodeURIComponent(values.label ?? "")}`;
    }
    return "https://mail.google.com/mail/u/0/";
  },

  render({ locale, values, setValues, clearFields }) {
    const ptBR = locale === "pt-BR";
    const mode = values.mode ?? "all";
    return <Section>
      <Field
        label={ptBR ? "Escopo da caixa de entrada" : "Mailbox scope"}
        description={ptBR
          ? "Escolha se esta conexão pode acessar todas as mensagens do Gmail ou uma visualização nativa mais restrita."
          : "Choose whether this connection can access all Gmail messages or a narrower native Gmail view."}
      >
        <RadioCards
          value={mode}
          options={[
            {
              value: "all",
              title: ptBR ? "Todo o Gmail" : "All Gmail",
              description: ptBR ? "Permitir acesso a toda a caixa de entrada." : "Allow access to the whole mailbox.",
            },
            {
              value: "search",
              title: ptBR ? "Pesquisa" : "Search",
              description: ptBR
                ? "Permitir mensagens que correspondam a uma pesquisa do Gmail."
                : "Allow messages matching a Gmail search query.",
            },
            {
              value: "label",
              title: ptBR ? "Marcador" : "Label",
              description: ptBR
                ? "Permitir mensagens com um marcador específico do Gmail."
                : "Allow messages with a specific Gmail label.",
            },
          ]}
          onChange={nextMode => {
            if (nextMode !== "all" && nextMode !== "search" && nextMode !== "label") return;
            clearFields("query", "label");
            setValues({ mode: nextMode, query: null, label: null });
          }}
        />
      </Field>

      {mode === "search" && <Field
        label={ptBR ? "Consulta de pesquisa" : "Search query"}
        description={ptBR ? "Use a mesma sintaxe da pesquisa do Gmail." : "Use the same query syntax as Gmail search."}
      >
        <TextInput
          name="query"
          value={values.query}
          placeholder="from:alerts@example.com newer_than:30d"
          onChange={query => setValues({ query })}
        />
      </Field>}

      {mode === "label" && <Field
        label={ptBR ? "Marcador" : "Label"}
        description={ptBR
          ? "Use o nome do marcador exatamente como aparece no Gmail."
          : "Use the Gmail label name exactly as it appears in Gmail."}
      >
        <TextInput
          name="label"
          value={values.label}
          placeholder={ptBR ? "Recibos" : "Receipts"}
          onChange={label => setValues({ label })}
        />
      </Field>}
    </Section>;
  },
} satisfies ConfiguratorUISpec<GmailConfiguratorRpc, GmailConfiguratorValues>;
