import { useState, useEffect, useRef } from 'react'
import { Dialog, Button, Input, Select, SensitiveInput, Collapsible, useKumoToastManager } from '@cloudflare/kumo'
import { AiChatAuthorInfo, AiModelConfig, AiModelProvider, AiGatewayInfo, SUGGESTED_MODELS } from '@gadgets/workshop-shared/api'
import { RpcStub } from 'capnweb'
import { AuthenticatedApi } from '@gadgets/workshop-shared/api'
import { useLocale } from './i18n'

interface AddModelModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  authenticatedApi: RpcStub<AuthenticatedApi>
  aiConfig: AiGatewayInfo | null
}

type SelectionType =
  | { type: 'suggested', provider: AiModelProvider, modelId: string, displayName: string }
  | { type: 'custom', provider: AiModelProvider }

const PROVIDER_LABELS: Record<AiModelProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  openrouter: 'OpenRouter',
  cloudflare: 'Cloudflare Workers AI',
  ollama: 'Ollama',
}

// Placeholder hinting at the shape of each provider's API token.
const API_TOKEN_PLACEHOLDERS: Record<AiModelProvider, string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
  google: 'AIza...',
  openrouter: 'sk-or-v1-...',
  cloudflare: 'Cloudflare API token',
  ollama: '(optional)',
}

// Example used in the custom-model placeholders for providers that have no suggested models
// (currently Ollama and OpenRouter).
const CUSTOM_MODEL_EXAMPLES: Partial<Record<AiModelProvider, { modelId: string, name: string }>> = {
  ollama: { modelId: 'gemma4:31b', name: 'Gemma 4 31B' },
  openrouter: { modelId: 'openai/gpt-5.2', name: 'GPT-5.2 via OpenRouter' },
}

// Pick an example model to show in the custom-model placeholders for the given provider.
function exampleModel(provider: AiModelProvider): { modelId: string, name: string } {
  const first = Object.entries(SUGGESTED_MODELS[provider])[0]
  return first
    ? { modelId: first[0], name: first[1].name }
    : CUSTOM_MODEL_EXAMPLES[provider] ?? { modelId: 'provider/model', name: 'Custom model' }
}

// Encode a selection into a string value for the Select component.
function encodeSelection(provider: AiModelProvider, modelId?: string): string {
  return modelId ? `${provider}:${modelId}` : `other-${provider}`
}

// Decode a Select value back into a SelectionType.
function decodeSelection(value: string): SelectionType {
  if (value.startsWith('other-')) {
    return { type: 'custom', provider: value.substring(6) as AiModelProvider }
  }
  const colonIndex = value.indexOf(':')
  const provider = value.substring(0, colonIndex) as AiModelProvider
  const modelId = value.substring(colonIndex + 1)
  const displayName = SUGGESTED_MODELS[provider][modelId].name
  return { type: 'suggested', provider, modelId, displayName }
}

// Build the flat list with OpenRouter first and Workers AI last.
function buildOptions(
  gatewayMode: boolean,
  enabledProviders: Set<string> | null,
  otherProvider: (provider: string) => string,
) {
  const options: { value: string; label: string; provider: string }[] = []
  const providerOrder = (Object.keys(SUGGESTED_MODELS) as AiModelProvider[])
    .toSorted((left, right) =>
      Number(right === 'openrouter') - Number(left === 'openrouter')
      || Number(left === 'cloudflare') - Number(right === 'cloudflare'))

  for (const provider of providerOrder) {
    if (enabledProviders && !enabledProviders.has(provider)) continue

    // In gateway mode, suggested models are already built-in, so don't list them.
    if (!gatewayMode) {
      for (const [modelId, model] of Object.entries(SUGGESTED_MODELS[provider])) {
        options.push({
          value: encodeSelection(provider, modelId),
          label: model.name,
          provider,
        })
      }
    }

    options.push({
      value: encodeSelection(provider),
      label: otherProvider(PROVIDER_LABELS[provider] || provider),
      provider,
    })
  }

  return options
}

export default function AddModelModal({ visible, onCancel, onSuccess, authenticatedApi, aiConfig }: AddModelModalProps) {
  const { t } = useLocale()
  const translateRef = useRef(t)
  translateRef.current = t
  const toasts = useKumoToastManager()

  const [loading, setLoading] = useState(false)
  const [selection, setSelection] = useState<SelectionType | null>(null)
  const [selectValue, setSelectValue] = useState<string | undefined>(undefined)

  // Form fields (used for custom models)
  const [modelId, setModelId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [accountId, setAccountId] = useState('')
  const [apiUrl, setApiUrl] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Advanced settings collapsible state
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const gatewayMode = aiConfig?.enabled === true
  const enabledProviders: Set<string> | null = gatewayMode
    ? new Set(aiConfig.enabledProviders)
    : null

  // Reset all state when dialog closes
  useEffect(() => {
    if (!visible) {
      setSelection(null)
      setSelectValue(undefined)
      setModelId('')
      setDisplayName('')
      setApiToken('')
      setAccountId('')
      setApiUrl('')
      setErrors({})
      setAdvancedOpen(false)
    }
  }, [visible])

  const handleModelSelect = (value: string) => {
    setSelectValue(value)
    setErrors({})
    const sel = decodeSelection(value)
    setSelection(sel)

    if (sel.type === 'custom') {
      setModelId('')
      setDisplayName('')
    } else {
      setModelId(sel.modelId)
      setDisplayName(sel.displayName)
    }
    setApiToken('')
    setAccountId('')
    setApiUrl(sel.provider === 'ollama' ? 'http://localhost:11434' : '')
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!selection) {
      newErrors.selection = gatewayMode ? t('activityArea.models.selectProviderError') : t('activityArea.models.selectModelError')
    }

    if (selection?.type === 'custom') {
      if (!modelId.trim()) newErrors.modelId = t('activityArea.models.enterModelId')
      if (!displayName.trim()) newErrors.displayName = t('activityArea.models.enterDisplayName')
    }

    const isOllama = selection?.provider === 'ollama'
    const isCloudflare = selection?.provider === 'cloudflare'
    const showCredentials = !gatewayMode

    if (showCredentials && selection && !isOllama && !apiToken.trim()) {
      newErrors.apiToken = t('activityArea.models.enterApiToken')
    }

    if (showCredentials && isCloudflare && !accountId.trim()) {
      newErrors.accountId = t('activityArea.models.enterAccountId')
    }

    if (showCredentials && isOllama && !apiUrl.trim()) {
      newErrors.apiUrl = t('activityArea.models.enterOllamaUrl')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const isSuggested = selection!.type === 'suggested'
      const finalModelId = isSuggested ? selection!.modelId : modelId.trim()
      const finalDisplayName = isSuggested ? selection!.displayName : displayName.trim()

      const profile: AiChatAuthorInfo = {
        type: 'agent',
        id: finalModelId,
        name: finalDisplayName,
      }

      const config: AiModelConfig = {
        provider: selection!.provider,
        model: finalModelId,
        apiToken: gatewayMode ? '' : apiToken.trim(),
        ...(!gatewayMode && accountId.trim() && { accountId: accountId.trim() }),
        ...(!gatewayMode && apiUrl.trim() && { apiUrl: apiUrl.trim() }),
      }

      await authenticatedApi.addModel(profile, config)
      toasts.add({ title: translateRef.current('activityArea.models.modelAdded'), variant: 'success' })
      onSuccess()
    } catch (error: any) {
      console.error('Failed to add model:', error)
      toasts.add({ title: translateRef.current('activityArea.models.modelAddFailed'), variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const options = buildOptions(gatewayMode, enabledProviders, provider =>
    t('activityArea.models.otherProvider', { provider }))
  const showCustomFields = selection?.type === 'custom'
  const example = selection ? exampleModel(selection.provider) : null
  const isOllama = selection?.provider === 'ollama'
  const isCloudflare = selection?.provider === 'cloudflare'
  const showCredentials = !gatewayMode

  // Group options by provider for rendering with visual separators.
  const groupedOptions: { provider: string; items: typeof options }[] = []
  for (const opt of options) {
    const last = groupedOptions[groupedOptions.length - 1]
    if (last && last.provider === opt.provider) {
      last.items.push(opt)
    } else {
      groupedOptions.push({ provider: opt.provider, items: [opt] })
    }
  }

  return (
    <Dialog.Root open={visible} onOpenChange={(open) => { if (!open) onCancel() }}>
      <Dialog className="responsive-dialog overflow-y-auto p-6" size="lg">
        <Dialog.Title className="text-lg font-semibold mb-4">
          {t('activityArea.models.addTitle')}
        </Dialog.Title>

        <div className="space-y-4">
          {/* Model / Provider selection */}
          <Select
            label={gatewayMode ? t('activityArea.models.selectProvider') : t('activityArea.models.selectModel')}
            className="w-full text-sm"
            placeholder={gatewayMode ? t('activityArea.models.chooseProvider') : t('activityArea.models.chooseModel')}
            value={selectValue}
            onValueChange={(v) => handleModelSelect(v as string)}
            error={errors.selection}
            renderValue={(v) => {
              const opt = options.find(o => o.value === v)
              return opt?.label ?? String(v)
            }}
          >
            {groupedOptions.map((group, groupIndex) => (
              <div key={group.provider}>
                {groupIndex > 0 && (
                  <div className="h-px bg-kumo-line my-1 mx-2" />
                )}
                <div className="px-3 py-1.5 text-xs font-medium text-kumo-subtle select-none">
                  {PROVIDER_LABELS[group.provider as AiModelProvider] || group.provider}
                </div>
                {group.items.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </div>
            ))}
          </Select>

          {/* Custom model fields */}
          {showCustomFields && (
            <>
              <Input
                label={t('activityArea.models.modelId')}
                placeholder={`e.g., ${example!.modelId}`}
                description={t('activityArea.models.modelDescription', { model: example!.modelId })}
                value={modelId}
                onChange={(e) => { setModelId(e.target.value); setErrors(prev => ({ ...prev, modelId: '' })) }}
                error={errors.modelId}
                variant={errors.modelId ? 'error' : 'default'}
              />

              <Input
                label={t('activityArea.models.displayName')}
                placeholder={`e.g., ${example!.name}`}
                description={t('activityArea.models.displayNameDescription')}
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setErrors(prev => ({ ...prev, displayName: '' })) }}
                error={errors.displayName}
                variant={errors.displayName ? 'error' : 'default'}
              />
            </>
          )}

          {/* Cloudflare account ID (the Workers AI REST endpoint is account-scoped) */}
          {showCredentials && isCloudflare && (
            <Input
              label={t('activityArea.models.cloudflareAccountId')}
              placeholder="e.g., 0123456789abcdef0123456789abcdef"
              description={t('activityArea.models.cloudflareAccountDescription')}
              value={accountId}
              onChange={(e) => { setAccountId(e.target.value); setErrors(prev => ({ ...prev, accountId: '' })) }}
              error={errors.accountId}
              variant={errors.accountId ? 'error' : 'default'}
            />
          )}

          {/* API Token */}
          {showCredentials && selection && (
            <SensitiveInput
              label={t('activityArea.models.apiToken')}
              placeholder={API_TOKEN_PLACEHOLDERS[selection.provider]}
              description={
                isOllama
                  ? t('activityArea.models.ollamaTokenDescription')
                  : isCloudflare
                  ? t('activityArea.models.cloudflareTokenDescription')
                  : t('activityArea.models.providerTokenDescription', { provider: PROVIDER_LABELS[selection.provider] })
              }
              value={apiToken}
              onValueChange={(v) => { setApiToken(v); setErrors(prev => ({ ...prev, apiToken: '' })) }}
              error={errors.apiToken}
              variant={errors.apiToken ? 'error' : 'default'}
            />
          )}

          {/* Ollama API URL (always visible for Ollama) */}
          {showCredentials && isOllama && (
            <Input
              label={t('activityArea.models.apiUrl')}
              placeholder="http://localhost:11434"
              description={t('activityArea.models.ollamaUrlDescription')}
              value={apiUrl}
              onChange={(e) => { setApiUrl(e.target.value); setErrors(prev => ({ ...prev, apiUrl: '' })) }}
              error={errors.apiUrl}
              variant={errors.apiUrl ? 'error' : 'default'}
            />
          )}

          {/* Advanced Settings for non-Ollama, non-Cloudflare providers */}
          {showCredentials && selection && !isOllama && !isCloudflare && (
            <Collapsible.Root
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
            >
              <Collapsible.DefaultTrigger>{t('activityArea.models.advanced')}</Collapsible.DefaultTrigger>
              <Collapsible.DefaultPanel>
                <Input
                  label={t('activityArea.models.apiUrl')}
                  placeholder="https://..."
                  description={t('activityArea.models.apiOverrideDescription')}
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
              </Collapsible.DefaultPanel>
            </Collapsible.Root>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close render={(props) => (
            <Button variant="secondary" {...props} disabled={loading}>
              {t('activityArea.common.cancel')}
            </Button>
          )} />
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!selection}
          >
            {t('activityArea.models.addModel')}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
