import { describe, expect, it } from 'vitest'
import type { OutputFormatOffer } from '@gadgets/workshop-shared/api'
import { localizeOutputFormatOffer } from './localizedFormats'

const documentFormat: OutputFormatOffer = {
  blueprintId: 'format.document',
  output: { id: 'document', noun: 'Doc', plural: 'Docs', icon: 'fileText' },
  description: 'Write rich text documents.',
  requiresSetup: false,
}

describe('localizeOutputFormatOffer', () => {
  it('localizes bundled presentation without changing identifiers', () => {
    const localized = localizeOutputFormatOffer(documentFormat, 'pt-BR')

    expect(localized).toMatchObject({
      blueprintId: 'format.document',
      output: { id: 'document', noun: 'Documento', plural: 'Documentos', icon: 'fileText' },
      requiresSetup: false,
    })
    expect(localized.description).toContain('documentos de texto')
  })

  it('preserves English and custom formats', () => {
    expect(localizeOutputFormatOffer(documentFormat, 'en')).toBe(documentFormat)
    expect(localizeOutputFormatOffer({ ...documentFormat, blueprintId: 'custom' }, 'pt-BR'))
      .toMatchObject({ blueprintId: 'custom', output: { noun: 'Doc' } })
  })
})
