#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
docker compose config --quiet
trap 'docker compose stop' EXIT
docker compose up --build -d --wait
port="$(docker compose port web 8080)"
curl -fsS "http://$port/" | python3 -c 'import sys; assert "Carnet de chantier" in sys.stdin.read()'
curl -fsS "http://$port/api/hello" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["service"]=="back" and d["message"]'
for service in front back web; do
 id="$(docker compose ps -q "$service")"
 docker inspect "$id" --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}' | python3 -c 'import sys; m,c=map(int,sys.stdin.read().split()); assert m>0 and c>0'
done
docker compose stop
trap - EXIT
for service in front back web; do
 id="$(docker compose ps -aq "$service")"
 test "$(docker inspect "$id" --format '{{.State.ExitCode}}')" = 0
 docker compose logs "$service" | python3 -c 'import sys; assert "Arrêt terminé" in sys.stdin.read()'
done
printf 'Validation HTTP, ressources et SIGTERM : OK\n'
