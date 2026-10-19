#!/bin/sh
# Uso: ./ids/prueba.sh normal   o   ./ids/prueba.sh sospechosa
PRUEBA=$1
DIR=$(cd "$(dirname "$0")" && pwd)
rm -rf "$DIR/resultados/$PRUEBA"
mkdir -p "$DIR/resultados/$PRUEBA"

# Genera el trafico contra la API local y lo guarda en trafico.pcap
docker run --rm -v "$DIR:/ids" alpine:3.20 sh /ids/peticiones.sh "$PRUEBA"

# Analiza la captura con Suricata usando nuestras reglas
docker run --rm -v "$DIR:/ids" jasonish/suricata:7.0.11 \
  suricata -r /ids/resultados/$PRUEBA/trafico.pcap -S /ids/local.rules -l /ids/resultados/$PRUEBA -k none

# Muestra las alertas generadas
echo "Alertas:"
cat "$DIR/resultados/$PRUEBA/fast.log"
