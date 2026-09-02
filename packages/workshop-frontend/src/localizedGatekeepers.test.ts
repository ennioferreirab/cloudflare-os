import { describe, expect, it } from 'vitest'
import type { SupportedResource, VendorDescription } from '@gadgets/workshop-shared/gatekeeper'
import { localizeGatekeeperPresentation } from './localizedGatekeepers'

const google: VendorDescription = {
  displayName: 'Google',
  url: 'https://google.com',
  tagline: 'Original tagline',
  description: 'Original description',
}
const github: VendorDescription = {
  displayName: 'GitHub',
  url: 'https://github.com',
  tagline: 'Original tagline',
  description: 'Original description',
}
const mcpPortal: VendorDescription = {
  displayName: 'MCP Server Portal',
  url: 'https://developers.cloudflare.com',
  tagline: 'Connect a server behind example.com',
  description: 'Original description',
}
const scheduler: VendorDescription = {
  displayName: 'Scheduled Tasks',
  url: 'https://workers.cloudflare.com',
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
  'connections.vendors.github.tagline': 'Faça triagem de issues',
  'connections.vendors.github.description': 'Conecte o GitHub ao ScaleOS.',
  'connections.vendors.mcpPortal.taglineConfigured': 'Conecte um servidor por trás de example.com',
  'connections.vendors.mcpPortal.description': 'Use os servidores MCP aprovados.',
  'connections.vendors.scheduler.displayName': 'Tarefas Agendadas',
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

  it('localizes built-in connector copy without changing resource identity', () => {
    const result = localizeGatekeeperPresentation('github', github, resources, 'ScaleOS', t)
    expect(result.description).toMatchObject({
      displayName: 'GitHub',
      tagline: 'Faça triagem de issues',
      description: 'Conecte o GitHub ao ScaleOS.',
    })
    expect(result.supportedResources).toBe(resources)
  })

  it('preserves unknown providers', () => {
    const result = localizeGatekeeperPresentation('unknown', google, resources, 'ScaleOS', t)
    expect(result).toEqual({ description: google, supportedResources: resources })
  })

  it('keeps the configured MCP portal host while translating its copy', () => {
    const result = localizeGatekeeperPresentation('mcp-portal', mcpPortal, [], 'ScaleOS', t)
    expect(result.description).toMatchObject({
      tagline: 'Conecte um servidor por trás de example.com',
      description: 'Use os servidores MCP aprovados.',
    })
  })

  it('localizes the Scheduler display name', () => {
    const result = localizeGatekeeperPresentation('scheduler', scheduler, [], 'ScaleOS', t)
    expect(result.description.displayName).toBe('Tarefas Agendadas')
  })
})
