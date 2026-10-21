# Se ejecuta dentro de un contenedor: captura el trafico y hace las peticiones a la API local
PRUEBA=$1
API=http://host.docker.internal:3000
EMAIL=prueba.ids@example.com
PASSWORD=ContrasenaPrueba2026 # gitleaks:allow (cuenta de prueba local)

apk add --quiet tcpdump curl

# Inicia la captura de trafico del puerto 3000
tcpdump -i eth0 -w /ids/resultados/$PRUEBA/trafico.pcap tcp port 3000 &
sleep 2

if [ "$PRUEBA" = "normal" ]; then
  # Registro (si ya existe responde 409), login correcto y consulta del catalogo publico
  curl -s -o /dev/null -w "POST /auth/register -> %{http_code}\n" -H "Content-Type: application/json" \
    -d "{\"firstName\":\"Prueba\",\"lastName\":\"IDS\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" $API/auth/register
  curl -s -o /dev/null -w "POST /auth/login -> %{http_code}\n" -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" $API/auth/login
  curl -s -o /dev/null -w "GET /products -> %{http_code}\n" $API/products
else
  # 8 intentos de login con contrasena incorrecta
  for i in 1 2 3 4 5 6 7 8; do
    curl -s -o /dev/null -w "POST /auth/login (intento $i) -> %{http_code}\n" -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"incorrecta$i\"}" $API/auth/login
  done
fi

# Detiene la captura
sleep 2
kill %1
sleep 1
