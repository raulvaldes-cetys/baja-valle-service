# Infrastructure

Terraform for the Azure resources of Baja Valle. Each project keeps the Terraform of what it deploys:

- **This folder** (`baja-valle-service/infra`): the shared base (resource group, Log Analytics, budget, Key Vault, Container Registry) plus PostgreSQL and the API.
- **`baja-valle-web/infra`**: only the dashboard container app; it reads the shared base with data sources.

Both use the same remote state storage with different keys (`service.tfstate`, `web.tfstate`).

## Requirements

- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.9
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), signed in with `az login`

## Layout

| Path | What it is |
|---|---|
| `bootstrap/` | Resource group and storage account for the remote state of every project. Applied once with local state. |
| `.` | Shared base, database and API. State: `service.tfstate`. |

## Usage

Each configuration reads a `terraform.tfvars` (copy `terraform.tfvars.example`; real `tfvars` files are git-ignored).

```bash
# Only the first time, or after changing the state storage
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap apply

terraform -chdir=infra init
terraform -chdir=infra plan
terraform -chdir=infra apply
```

The remote state uses Entra ID authentication (`use_azuread_auth`). The storage account has shared keys disabled, so your account needs the *Storage Blob Data Contributor* role on it (granted to whoever applies `bootstrap/`). The state contains the generated database passwords, so never copy it out of the storage account.

`bootstrap/terraform.tfstate` only holds the names of the state resources; if it is lost, they can be imported again.

## API and migrations

- The API runs on Container Apps (`ca-bajavalle-api`), scale 0–1, 0.25 vCPU / 0.5 GiB. After scaling to zero the first request takes ~30 s.
- The environment is created with the `azapi` provider in `ConsumptionOnly` mode: `azurerm` cannot set the mode, and new environments default to `Express`, which rejects Key Vault secret references.
- Secrets are Key Vault references resolved by each app's managed identity. Roles are scoped per secret: the API identity reads only its own secrets and the migrations identity only `migrator-database-url`.
- Terraform ignores the container image after the first deployment; CI deploys new images.
- Migrations and grants run in the `caj-bajavalle-migrate` job:

  ```bash
  az containerapp job start -g rg-bajavalle-prod -n caj-bajavalle-migrate
  az containerapp job execution list -g rg-bajavalle-prod -n caj-bajavalle-migrate -o table
  ```

## Continuous deployment

Every push to `master` that passes CI is deployed by the `deploy` job in `.github/workflows/ci.yml`: build the image (tagged with the commit SHA) → push to ACR → run the migrations job with that image → new API revision → wait until the API answers.

GitHub Actions signs in to Azure with OIDC through `id-bajavalle-github`, whose federated credential only accepts this repository's `master` branch. It can push images and update the API app and the migrations job, nothing else. The repository only stores identifiers as variables (`terraform -chdir=infra output github_deploy`), never secrets.

## Catalog images

Product and category images live in the `catalog-images` container of `stbajavalle7kao6` (anonymous read of individual blobs only; listing is private). `scripts/migrate-catalog-images.sh` was used once to copy them from Supabase Storage and rewrite the URLs in the database.

## Database access

The server only accepts TLS and admits Azure services plus the optional `admin_ip` variable. Set `admin_ip` to your public IP only while running migrations or importing data, then set it back to `""` and apply.

## Secrets

Application secrets live in Key Vault. The two database URLs are the only ones Terraform writes: it generates the database passwords (`random_password`), so they are already in the remote state, which is private and RBAC-only. Every other secret is loaded by hand and never touches the state. The API reads them with its managed identity (`id-bajavalle-api`, role *Key Vault Secrets User*). Whoever applies `infra/` gets *Key Vault Secrets Officer* to load them:

```bash
KV=$(terraform -chdir=infra output -raw key_vault_name)
az keyvault secret set --vault-name "$KV" --name <secret-name> --file <file-with-the-value>
```

| Secret | API variable | Value |
|---|---|---|
| `database-url` | `DATABASE_URL` | Runtime role `baja_valle_app` (written by Terraform) |
| `migrator-database-url` | `DIRECT_URL` | Database admin, only for migrations (written by Terraform) |
| `encryption-keys` | `ENCRYPTION_KEYS` | `pnpm crypto:keys` in baja-valle-service |
| `blind-index-key` | `BLIND_INDEX_KEY` | `pnpm crypto:keys` |
| `jwt-access-secret` | `JWT_ACCESS_SECRET` | `pnpm crypto:keys` |
| `mail-host`, `mail-port`, `mail-secure`, `mail-user`, `mail-pass`, `mail-to` | `MAIL_*` | SMTP account |

Use `--file` (or `--value` from a variable) so values never appear in the shell history.

## Cost controls

- Budget of `monthly_budget_usd` (default $5) on the resource group with email alerts at 50%, 80% and 100%.
- Log Analytics daily cap of 0.05 GB and 30-day retention.
