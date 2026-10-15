locals {
  db_name      = "baja_valle"
  db_admin     = "bvadmin"
  db_app_role  = "baja_valle_app"
  db_conn_opts = "sslmode=verify-full"
}

resource "random_password" "db_admin" {
  length  = 40
  special = false
}

resource "random_password" "db_app" {
  length  = 40
  special = false
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-${local.name}-${random_string.suffix.result}"
  location                      = azurerm_resource_group.main.location
  resource_group_name           = azurerm_resource_group.main.name
  version                       = "17"
  sku_name                      = "B_Standard_B1ms"
  storage_mb                    = 32768
  backup_retention_days         = 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true
  administrator_login           = local.db_admin
  administrator_password        = random_password.db_admin.result
  tags                          = local.tags

  authentication {
    password_auth_enabled         = true
    active_directory_auth_enabled = false
  }

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_configuration" "require_tls" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "min_tls" {
  name      = "ssl_min_protocol_version"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "TLSv1.2"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = local.db_name
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Accepted risk: admits any Azure IP, not only our apps (no VNet, to keep the cost at $0)
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "admin" {
  count            = var.admin_ip == "" ? 0 : 1
  name             = "AdminTemporaryAccess"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = var.admin_ip
  end_ip_address   = var.admin_ip
}

locals {
  db_host = azurerm_postgresql_flexible_server.main.fqdn
}

resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  key_vault_id = azurerm_key_vault.main.id
  value        = "postgresql://${local.db_app_role}:${random_password.db_app.result}@${local.db_host}:5432/${local.db_name}?${local.db_conn_opts}"
  depends_on   = [azurerm_role_assignment.kv_secrets_officer]
}

resource "azurerm_key_vault_secret" "migrator_database_url" {
  name         = "migrator-database-url"
  key_vault_id = azurerm_key_vault.main.id
  value        = "postgresql://${local.db_admin}:${random_password.db_admin.result}@${local.db_host}:5432/${local.db_name}?${local.db_conn_opts}"
  depends_on   = [azurerm_role_assignment.kv_secrets_officer]
}
