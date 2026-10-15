output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "container_registry" {
  value = azurerm_container_registry.main.login_server
}

output "database_host" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "api_url" {
  value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "migrate_job" {
  value = azurerm_container_app_job.migrate.name
}
