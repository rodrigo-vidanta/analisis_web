#!/bin/bash
# Script para verificar y diagnosticar la instalación de Supabase
# Se ejecuta en la instancia EC2

INSTANCE_ID="${1:-i-0cb835f19992a0fb2}"

echo "=== Verificación de Instalación de Supabase ==="
echo "Instancia: $INSTANCE_ID"
echo "Fecha: $(date)"
echo ""

# Verificar acceso SSH primero
echo "Para ejecutar este diagnóstico, necesitas acceso SSH a la instancia:"
echo ""
echo "1. Crear key pair:"
echo "   aws ec2 create-key-pair --key-name supabase-key --query 'KeyMaterial' --output text > supabase-key.pem"
echo "   chmod 400 supabase-key.pem"
echo ""
echo "2. Conectar vía SSH:"
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region us-west-2 --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null)
echo "   ssh -i supabase-key.pem ubuntu@$PUBLIC_IP"
echo ""
echo "3. Una vez conectado, ejecutar:"
echo "   sudo bash /var/log/user-data.log"
echo "   o"
echo "   tail -f /var/log/cloud-init-output.log"
echo ""
echo "=== Comandos para ejecutar en la instancia ==="
echo ""
echo "Verificar Docker:"
echo "  sudo docker ps -a"
echo ""
echo "Verificar Supabase:"
echo "  cd /home/ubuntu/supabase/docker && sudo docker-compose ps"
echo ""
echo "Ver logs de Supabase:"
echo "  cd /home/ubuntu/supabase/docker && sudo docker-compose logs"
echo ""
echo "Verificar puertos:"
echo "  sudo netstat -tlnp | grep 3000"
echo ""
echo "Verificar user-data:"
echo "  sudo tail -100 /var/log/user-data.log"
echo ""
echo "Verificar cloud-init:"
echo "  sudo tail -100 /var/log/cloud-init-output.log"











