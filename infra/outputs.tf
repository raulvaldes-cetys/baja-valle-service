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

output "catalog_images_url" {
  value = "${azurerm_storage_account.catalog.primary_blob_endpoint}${azurerm_storage_container.catalog_images.name}/"
}

output "github_deploy" {
  description = "Repository variables for the deploy workflow"
  value = {
    AZURE_CLIENT_ID       = azurerm_user_assigned_identity.github.client_id
    AZURE_TENANT_ID       = data.azurerm_client_config.current.tenant_id
    AZURE_SUBSCRIPTION_ID = var.subscription_id
    AZURE_RESOURCE_GROUP  = azurerm_resource_group.main.name
    ACR_NAME              = azurerm_container_registry.main.name
    API_APP_NAME          = azurerm_container_app.api.name
    MIGRATE_JOB_NAME      = azurerm_container_app_job.migrate.name
  }
}
