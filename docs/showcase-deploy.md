# ScaleOS showcase deployment

This fork deploys a persistent showcase directly to Cloudflare Workers. It does not use the
Cloudflare OS release service or installation wizard.

The deployment publishes sixteen gatekeepers, the Workshop backend, and the public router. Only the
router is exposed, at the configured Custom Domain; the remaining Workers are reachable through
service bindings. Stable Worker names preserve automatically provisioned KV and R2 data across
deployments.

Before the first deployment, enable R2 in the target Cloudflare account and make sure the custom
domain's zone is active in that same account. Wrangler creates the required KV namespaces, R2
bucket, DNS record, and certificate during the first deployment.

## GitHub configuration

Set these values on `ennioferreirab/cloudflare-os`:

- Repository secret `CLOUDFLARE_API_TOKEN`: a token based on Cloudflare's **Edit Cloudflare
  Workers** template, scoped to the target account and the `scale.pro` zone.
- Repository variable `CLOUDFLARE_ACCOUNT_ID`: the target account's 32-character ID.
- Repository variable `SHOWCASE_DOMAIN`: `os.scaleos.pro`.

Every push to `main` runs `.github/workflows/deploy-showcase.yml`. A manual run is also available
through `workflow_dispatch`. Deployments are serialized and publish the router last.

The production showcase sets `DISABLE_PUBLIC_SIGNUPS=true`. The backend rejects password and OAuth
account creation, and the frontend removes the signup link and redirects `/signup` to login.
Existing accounts can still sign in.

## Local validation or deployment

With the same environment values available locally:

```sh
pnpm showcase:deploy -- --dry-run
pnpm showcase:deploy
```

Set the backend's `ACCOUNT_PROVISIONING_TOKEN` with Wrangler once. To create an account while public
signups are closed, keep that token local and pass the new password over stdin:

```sh
read -rs 'PASSWORD?Senha da nova conta: '
printf '\n'
printf '%s' "$PASSWORD" | ACCOUNT_PROVISIONING_TOKEN='<token local>' \
  pnpm account:create -- --username usuario --display-name 'Nome do usuário'
unset PASSWORD
```

The showcase uses the built-in username/password flow and BYOK models. Users can add an OpenRouter
model from the UI with their own API key. OAuth connector credentials are separate and can be added
later without changing this core deployment.
