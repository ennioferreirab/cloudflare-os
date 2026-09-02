import { useEffect, useState, type ReactNode } from 'react'
import { useServerConfig } from '../ServerConfigContext'

export default function SiteLogo({
  size,
  className,
  srcOverride,
  children,
}: {
  size: number
  className?: string
  srcOverride?: string | null
  children: ReactNode
}) {
  const serverConfig = useServerConfig()
  const configuredUrl = serverConfig?.siteLogo?.url
  const selectedSrc = srcOverride === undefined ? configuredUrl : srcOverride ?? undefined
  const src = selectedSrc ?? '/assets/scaleos/brand/scaleos-icon-40.png'
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src, serverConfig])

  if (failed) return children
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className ?? ''}`}
      onError={() => setFailed(true)}
    />
  )
}
