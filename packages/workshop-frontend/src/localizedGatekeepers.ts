import type { SupportedResource, VendorDescription } from '@gadgets/workshop-shared/gatekeeper'

type Translate = (key: string, options?: Record<string, unknown>) => string

const GOOGLE_RESOURCE_COPY_KEYS = {
  'Gmail Mailbox': 'gmail',
  'Google Doc': 'doc',
  'Google Spreadsheet': 'spreadsheet',
  'Google Calendar': 'calendar',
  'Google Drive Account': 'driveAccount',
  'Google Workspace Shared Drive': 'sharedDrive',
  'Google Drive File': 'driveFile',
  BigQuery: 'bigQuery',
} as const

const VENDOR_COPY_KEYS = {
  cloudflare: 'cloudflare',
  confluence: 'confluence',
  context: 'context',
  email: 'email',
  github: 'github',
  homeassistant: 'homeAssistant',
  linear: 'linear',
  mcp: 'mcp',
  'mcp-portal': 'mcpPortal',
  mcp_portal: 'mcpPortal',
  notion: 'notion',
  scheduler: 'scheduler',
  slack: 'slack',
  spotify: 'spotify',
  supabase: 'supabase',
  zoominfo: 'zoominfo',
} as const

/** Localize built-in connector presentation while preserving provider IDs and resource URLs. */
export function localizeGatekeeperPresentation(
  vendorId: string,
  description: VendorDescription,
  supportedResources: SupportedResource[],
  siteName: string,
  t: Translate,
): { description: VendorDescription; supportedResources: SupportedResource[] } {
  const normalizedVendorId = vendorId.toLowerCase()
  if (normalizedVendorId === 'google') {
    return {
      description: {
        ...description,
        tagline: t('connections.google.tagline'),
        description: t('connections.google.description', { siteName }),
      },
      supportedResources: supportedResources.map(resource => {
        const copyKey = GOOGLE_RESOURCE_COPY_KEYS[
          resource.title as keyof typeof GOOGLE_RESOURCE_COPY_KEYS
        ]
        if (!copyKey) return resource
        return {
          ...resource,
          title: t(`connections.google.resources.${copyKey}.title`),
          description: t(`connections.google.resources.${copyKey}.description`),
        }
      }),
    }
  }

  const copyKey = VENDOR_COPY_KEYS[normalizedVendorId as keyof typeof VENDOR_COPY_KEYS]
  if (!copyKey) return { description, supportedResources }

  const vendorPath = `connections.vendors.${copyKey}`
  const isMcpPortal = copyKey === 'mcpPortal'
  const tagline = isMcpPortal
    ? description.tagline?.startsWith('Connect a server behind ')
      ? t(`${vendorPath}.taglineConfigured`, {
        host: description.tagline.slice('Connect a server behind '.length),
      })
      : t(`${vendorPath}.taglineUnavailable`)
    : t(`${vendorPath}.tagline`)

  return {
    description: {
      ...description,
      displayName: normalizedVendorId === 'scheduler'
        ? t(`${vendorPath}.displayName`)
        : description.displayName,
      tagline,
      description: t(`${vendorPath}.description`),
    },
    supportedResources: isMcpPortal
      ? supportedResources.map(resource => ({
        ...resource,
        description: t(`${vendorPath}.resourceDescription`),
      }))
      : supportedResources,
  }
}
