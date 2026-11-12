#!/bin/sh
# À lancer sur le serveur après chaque envoi de l'API (terminal cPanel ou SSH), depuis le dossier de l'API :
#   sh deploy/apres-envoi.sh
# Vide le cache de production, applique les migrations de base de données et vérifie la configuration.
set -eu
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Fichier .env.local absent : le créer d'abord (voir docs/deploiement.md)." >&2
  exit 1
fi

PHP="${PHP:-php}"
export APP_ENV=prod

rm -rf var/cache/prod
"$PHP" bin/console cache:warmup --no-interaction
"$PHP" bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
"$PHP" bin/console lint:container --no-interaction
echo "API à jour."
