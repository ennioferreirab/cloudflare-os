import { createFileRoute } from '@tanstack/react-router'
import { useRpcStub } from '../RpcContext'
import { CF_ACCESS_MODE } from '../useAuth'
import { Navigate } from '@tanstack/react-router'
import SignupPage from '../SignupPage'
import { useServerConfig } from '../ServerConfigContext'

export const Route = createFileRoute('/signup')({
  component: SignupRoute,
})

function SignupRoute() {
  const rpcStub = useRpcStub()
  const serverConfig = useServerConfig()
  // Signup is unavailable in CF Access mode and when production closes public registration.
  if (CF_ACCESS_MODE || serverConfig?.signupsEnabled === false) {
    return <Navigate to="/" replace />
  }
  return <SignupPage rpcStub={rpcStub} />
}
