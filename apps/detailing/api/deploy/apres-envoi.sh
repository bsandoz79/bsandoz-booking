#!/bin/sh
# À lancer sur le serveur après chaque envoi de l'API (terminal cPanel), depuis le dossier de l'API :
#   sh deploy/apres-envoi.sh
# 1. Décompresse api.zip envoyé par GitHub (remplace le code, garde .env.local et var/).
# 2. Vide le cache de production, applique les migrations de base de données et vérifie la configuration.
set -eu
cd "$(dirname "$0")/.."

PHP="${PHP:-php}"

if [ -f api.zip ]; then
  echo "Décompression de api.zip…"
  # Ancien code retiré (fichiers supprimés entre deux versions) ; .env.local, var/ et api.zip sont conservés.
  rm -rf bin config migrations src templates vendor data public/index.php
  if command -v unzip > /dev/null 2>&1; then
    unzip -oq api.zip -d .
  else
    "$PHP" -r '$z = new ZipArchive(); if ($z->open("api.zip") !== true) { fwrite(STDERR, "Archive illisible\n"); exit(1); } $z->extractTo("."); $z->close();'
  fi
  rm -f api.zip
fi

if [ ! -f .env.local ]; then
  echo "Fichier .env.local absent : le créer, puis relancer ce script (voir docs/deploiement.md)." >&2
  exit 1
fi

export APP_ENV=prod

rm -rf var/cache/prod
"$PHP" bin/console cache:warmup --no-interaction
"$PHP" bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
"$PHP" bin/console lint:container --no-interaction
echo "API à jour."
