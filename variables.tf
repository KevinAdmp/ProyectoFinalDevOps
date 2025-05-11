variable "aws_region" {
  description = "Región AWS"
  default     = "us-east-1"
}

variable "key_name" {
  description = "Key pair EC2"
}

variable "db_name" {
  description = "Nombre de la base de datos"
  default     = "appdb"
}

variable "db_user" {
  description = "Usuario admin de la DB"
  default     = "admin"
}

variable "db_password" {
  description = "Password admin (sensitive)"
  type        = string
  sensitive   = true
}

