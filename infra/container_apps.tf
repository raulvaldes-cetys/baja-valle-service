locals {
  api_secrets = {
    DATABASE_URL      = "database-url"
    ENCRYPTION_KEYS   = "encryption-keys"
    BLIND_INDEX_KEY   = "blind-index-key"
    JWT_ACCESS_SECRET = "jwt-access-secret"
    MAIL_HOST         = "mail-host"
    MAIL_PORT         = "mail-port"
    MAIL_SECURE       = "mail-secure"
    MAIL_USER         = "mail-user"
    MAIL_PASS         = "mail-pass"
    MAIL_TO           = "mail-to"
  }

  api_settings = {
    NODE_ENV        = "production"
    PORT            = "3000"
    CORS_ORIGINS    = ""
    SWAGGER_ENABLED = "false"
  }

  api_image = "${azurerm_container_registry.main.login_server}/baja-valle-api:${var.api_image_tag}"
}

# azapi because azurerm cannot set environmentMode, and new environments default to
# "Express", which rejects Key Vault secret references
resource "azapi_resource" "environment" {
  type      = "Microsoft.App/managedEnvironments@2026-07-01"
  name      = "cae-${local.name}-prod"
  location  = azurerm_resource_group.main.location
  parent_id = azurerm_resource_group.main.id
  tags      = local.tags

  # environmentMode only exists from API 2026-07-01, newer than the azapi embedded schema; Azure still validates it
  schema_validation_enabled = false

  body = {
    properties = {
      environmentMode = "ConsumptionOnly"
      appLogsConfiguration = {
        destination = "log-analytics"
        logAnalyticsConfiguration = {
          customerId = azurerm_log_analytics_workspace.main.workspace_id
        }
      }
    }
  }

  sensitive_body = {
    properties = {
      appLogsConfiguration = {
        logAnalyticsConfiguration = {
          sharedKey = azurerm_log_analytics_workspace.main.primary_shared_key
        }
      }
    }
  }
}

resource "azurerm_container_app" "api" {
  name                         = "ca-${local.name}-api"
  container_app_environment_id = azapi_resource.environment.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.api.id
  }

  # Versionless Key Vault references: values are resolved by the app, never stored in Terraform
  dynamic "secret" {
    for_each = toset(values(local.api_secrets))
    content {
      name                = secret.value
      identity            = azurerm_user_assigned_identity.api.id
      key_vault_secret_id = "${azurerm_key_vault.main.vault_uri}secrets/${secret.value}"
    }
  }

  ingress {
    external_enabled           = true
    target_port                = 3000
    allow_insecure_connections = false

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "api"
      image  = local.api_image
      cpu    = 0.25
      memory = "0.5Gi"

      dynamic "env" {
        for_each = local.api_secrets
        content {
          name        = env.key
          secret_name = env.value
        }
      }

      dynamic "env" {
        for_each = local.api_settings
        content {
          name  = env.key
          value = env.value
        }
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/"
        port      = 3000
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/"
        port      = 3000
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }

  depends_on = [
    azurerm_role_assignment.api_acr_pull,
    azurerm_role_assignment.api_kv_secrets_user,
  ]
}

resource "azurerm_container_app_job" "migrate" {
  name                         = "caj-${local.name}-migrate"
  location                     = azurerm_resource_group.main.location
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azapi_resource.environment.id
  replica_timeout_in_seconds   = 600
  replica_retry_limit          = 0
  tags                         = local.tags

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.migrate.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.migrate.id
  }

  secret {
    name                = azurerm_key_vault_secret.migrator_database_url.name
    identity            = azurerm_user_assigned_identity.migrate.id
    key_vault_secret_id = azurerm_key_vault_secret.migrator_database_url.versionless_id
  }

  template {
    container {
      name    = "migrate"
      image   = local.api_image
      cpu     = 0.25
      memory  = "0.5Gi"
      command = ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node_modules/.bin/prisma db execute --file prisma/sql/grants.sql"]

      env {
        name        = "DIRECT_URL"
        secret_name = azurerm_key_vault_secret.migrator_database_url.name
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }

  depends_on = [
    azurerm_role_assignment.migrate_acr_pull,
    azurerm_role_assignment.migrate_kv_secrets_user,
  ]
}

