output "web_public_ip" {
  description = "IP pública del servidor web"
  value       = aws_instance.web.public_ip
}

output "db_endpoint" {
  description = "Endpoint de RDS"
  value       = aws_db_instance.db.endpoint
}


