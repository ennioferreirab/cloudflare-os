import { describe, expect, it } from 'vitest'
import type { SupportedResource, VendorDescription } from '@gadgets/workshop-shared/gatekeeper'
import { localizeGatekeeperPresentation } from './localizedGatekeepers'

const google: VendorDescription = {
  displayName: 'Google',
  url: 'https://google.com',
  tagline: 'Original tagline',
  description: 'Original description',
}
const resources: SupportedResource[] = [{
  title: 'Gmail Mailbox',
  description: 'Original Gmail description',
  urlPattern: 'https://mail.google.com/*',
}]

const translations: Record<string, string> = {
  'connections.google.tagline': 'Recursos do Google',
  'connections.google.description': 'Conecte o Google ao ScaleOS.',
  'connections.google.resources.gmail.title': 'Caixa de correio do Gmail',
  'connections.google.resources.gmail.description': 'Leia e gerencie seus e-mails.',
}

const t = (key: string) => translations[key] ?? key

describe('localizeGatekeeperPresentation', () => {
  it('localizes Google copy without changing resource identity', () => {
    const localized = localizeGatekeeperPresentation(
      'google',
      google,
      resources,
      'ScaleOS',
      t,
    )

    expect(localized.description).toMatchObject({
      displayName: 'Google',
      tagline: 'Recursos do Google',
      description: 'Conecte o Google ao ScaleOS.',
    })
    expect(localized.supportedResources[0]).toMatchObject({
      title: 'Caixa de correio do Gmail',
      description: 'Leia e gerencie seus e-mails.',
      urlPattern: 'https://mail.google.com/*',
    })
    expect(resources[0].title).toBe('Gmail Mailbox')
  })

  it('preserves other providers', () => {
    const result = localizeGatekeeperPresentation('github', google, resources, 'ScaleOS', t)
    expect(result).toEqual({ description: google, supportedResources: resources })
  })
})
