resource "azurerm_storage_account" "catalog" {
  name                            = "st${local.name}${random_string.suffix.result}"
  location                        = azurerm_resource_group.main.location
  resource_group_name             = azurerm_resource_group.main.name
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  access_tier                     = "Hot"
  min_tls_version                 = "TLS1_2"
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  # Required for the blob-level public read of catalog images; listing stays private
  allow_nested_items_to_be_public = true
  tags                            = local.tags
}

resource "azurerm_role_assignment" "operator_catalog_blob" {
  scope                = azurerm_storage_account.catalog.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "time_sleep" "catalog_rbac_propagation" {
  depends_on      = [azurerm_role_assignment.operator_catalog_blob]
  create_duration = "90s"
}

resource "azurerm_storage_container" "catalog_images" {
  name                  = "catalog-images"
  storage_account_id    = azurerm_storage_account.catalog.id
  container_access_type = "blob"

  depends_on = [time_sleep.catalog_rbac_propagation]
}
