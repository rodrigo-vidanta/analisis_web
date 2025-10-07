#!/bin/bash
echo "🔍 Verificando delegación DNS para ai.vidanta.com..."
echo "================================================="

echo -e "\n1. Verificando servidores NS desde el dominio padre:"
dig NS ai.vidanta.com @8.8.8.8 +short

echo -e "\n2. Verificando que Route 53 responde:"
dig NS ai.vidanta.com @ns-1720.awsdns-23.co.uk +short

echo -e "\n3. Test de resolución completa:"
dig ai.vidanta.com @8.8.8.8

echo -e "\n4. Verificando propagación global:"
for server in 8.8.8.8 1.1.1.1 208.67.222.222; do
    echo "Servidor $server:"
    dig NS ai.vidanta.com @$server +short | head -4
    echo
done

echo "✅ Verificación completada"
