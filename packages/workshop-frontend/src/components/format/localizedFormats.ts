import type { BlueprintPublicInfo, OutputFormatOffer } from '@gadgets/workshop-shared/api'
import type { Locale } from '../../i18n'

type LocalizedFormatCopy = {
  title: string
  noun: string
  plural: string
  description: string
}

const PT_BR_FORMATS: Readonly<Record<string, LocalizedFormatCopy>> = {
  'format.document': {
    title: 'Documentos do workspace',
    noun: 'Documento',
    plural: 'Documentos',
    description: 'Escreva, formate e edite documentos de texto com interação direta ou linguagem natural.',
  },
  'format.spreadsheet': {
    title: 'Planilhas do workspace',
    noun: 'Planilha',
    plural: 'Planilhas',
    description: 'Escreva, formate e edite planilhas com interação direta ou linguagem natural.',
  },
  'format.slides': {
    title: 'Apresentações do workspace',
    noun: 'Slides',
    plural: 'Slides',
    description: 'Crie apresentações com o estilo da sua empresa usando interação direta ou linguagem natural. Depois, conecte dados reais para gerar textos e gráficos.',
  },
}

/** Localize bundled blueprint presentation without changing stable identifiers or backend data. */
export function localizeBlueprintPresentation(
  blueprint: BlueprintPublicInfo,
  locale: Locale,
): BlueprintPublicInfo {
  const copy = PT_BR_FORMATS[blueprint.id]
  if (!copy) return blueprint
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      ...(locale === 'pt-BR' && {
        title: copy.title,
        description: copy.description,
      }),
      author: {
        ...blueprint.metadata.author,
        name: 'ScaleOS',
      },
    },
  }
}

/** Localize bundled format presentation without changing its stable identifiers or backend data. */
export function localizeOutputFormatOffer(
  format: OutputFormatOffer,
  locale: Locale,
): OutputFormatOffer {
  if (locale !== 'pt-BR') return format
  const copy = PT_BR_FORMATS[format.blueprintId]
  if (!copy) return format
  return {
    ...format,
    description: copy.description,
    output: {
      ...format.output,
      noun: copy.noun,
      plural: copy.plural,
    },
  }
}
