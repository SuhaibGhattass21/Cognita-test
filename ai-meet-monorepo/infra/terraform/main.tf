resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Storage account
resource "azurerm_storage_account" "sa" {
  name                     = lower("${var.prefix}sa${random_id.suffix.hex}")
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  allow_blob_public_access = false
}

resource "azurerm_storage_container" "blob_container" {
  name                  = "aimeet-objects"
  storage_account_name  = azurerm_storage_account.sa.name
  container_access_type = "private"
}

# Postgres - Flexible Server (Basic)
resource "azurerm_postgresql_flexible_server" "pg" {
  name                = "${var.prefix}-pg"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku_name            = "Standard_B1ms"
  administrator_login = "pgadmin"
  administrator_password = random_password.pg_admin.result
  storage_mb = 32768
  version = "14"
}

# AKS cluster minimal (for dev/staging)
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${var.prefix}-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "${var.prefix}aks"

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_DS2_v2"
  }

  identity {
    type = "SystemAssigned"
  }
}

# random suffix
resource "random_id" "suffix" {
  byte_length = 2
}

resource "random_password" "pg_admin" {
  length  = 16
  special = true
}

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  required_version = ">= 1.0.0"
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}
