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

/** Localize the Google presentation while preserving provider IDs and resource URL patterns. */
export function localizeGatekeeperPresentation(
  vendorId: string,
  description: VendorDescription,
  supportedResources: SupportedResource[],
  siteName: string,
  t: Translate,
): { description: VendorDescription; supportedResources: SupportedResource[] } {
  if (vendorId !== 'google') return { description, supportedResources }
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
