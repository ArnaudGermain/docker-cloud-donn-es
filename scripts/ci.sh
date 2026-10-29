#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Projet distinct : aucun accès au volume des notes de démonstration.
export COMPOSE_PROJECT_NAME=chantier-ci
export HTTP_PORT="${CI_HTTP_PORT:-18082}"
export COMPOSE_PROFILES=ci
trap 'docker compose down' EXIT
docker compose build lint tests
docker compose run --rm --no-deps lint
docker compose up --build -d --wait web
docker compose run --rm --no-deps tests
printf 'Pipeline CI local : lint et tests réussis\n'
