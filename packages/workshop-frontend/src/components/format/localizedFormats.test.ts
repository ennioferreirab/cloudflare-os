import { describe, expect, it } from 'vitest'
import type { BlueprintPublicInfo, OutputFormatOffer } from '@gadgets/workshop-shared/api'
import { localizeBlueprintPresentation, localizeOutputFormatOffer } from './localizedFormats'

const documentFormat: OutputFormatOffer = {
  blueprintId: 'format.document',
  output: { id: 'document', noun: 'Doc', plural: 'Docs', icon: 'fileText' },
  description: 'Write rich text documents.',
  requiresSetup: false,
}

const documentBlueprint: BlueprintPublicInfo = {
  id: 'format.document',
  metadata: {
    title: 'Workspace Docs',
    description: 'Write rich text documents.',
    author: { type: 'user', id: 'cloudflare', name: 'Cloudflare' },
    created: new Date('2026-01-01T00:00:00Z'),
    version: 1,
    lastUpdated: new Date('2026-01-01T00:00:00Z'),
    bindings: {},
  },
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

describe('localizeBlueprintPresentation', () => {
  it('localizes the bundled blueprint and brands it as ScaleOS', () => {
    const localized = localizeBlueprintPresentation(documentBlueprint, 'pt-BR')

    expect(localized.metadata).toMatchObject({
      title: 'Documentos do workspace',
      description: expect.stringContaining('documentos de texto'),
      author: { id: 'cloudflare', name: 'ScaleOS' },
    })
    expect(localized.id).toBe(documentBlueprint.id)
  })

  it('keeps the bundled blueprint copy in English while still branding the author', () => {
    const localized = localizeBlueprintPresentation(documentBlueprint, 'en')

    expect(localized.metadata).toMatchObject({
      title: 'Workspace Docs',
      description: 'Write rich text documents.',
      author: { name: 'ScaleOS' },
    })
  })

  it('preserves custom blueprints', () => {
    expect(localizeBlueprintPresentation({ ...documentBlueprint, id: 'custom' }, 'pt-BR'))
      .toEqual({ ...documentBlueprint, id: 'custom' })
  })
})
