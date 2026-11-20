#!/bin/sh
# Lancé sur le serveur après chaque envoi de l'API : à la main (terminal cPanel) ou par la tâche cron du README,
# qui le lance toutes les 5 minutes s'il trouve un api.zip :
#   sh deploy/apres-envoi.sh
# 1. Décompresse api.zip envoyé par GitHub (remplace le code, garde .env.local et var/), s'il est complet.
# 2. Vide le cache de production, applique les migrations de base de données et vérifie la configuration.
set -eu
cd "$(dirname "$0")/.."

PHP="${PHP:-php}"

if [ -f api.zip ]; then
  # Archive renommée d'abord : un second lancement (cron) ne la traite pas en même temps.
  mv api.zip api-en-cours.zip
  # Archive incomplète ou abîmée : on s'arrête avant de toucher au code en place.
  if command -v unzip > /dev/null 2>&1 && ! unzip -tq api-en-cours.zip > /dev/null; then
    echo "api.zip illisible : code en place conservé." >&2
    rm -f api-en-cours.zip
    exit 1
  fi
  echo "Décompression de api.zip…"
  # Ancien code retiré (fichiers supprimés entre deux versions) ; .env.local, var/ et api.zip sont conservés.
  rm -rf bin config migrations src templates vendor public/index.php
  if command -v unzip > /dev/null 2>&1; then
    unzip -oq api-en-cours.zip -d .
  else
    "$PHP" -r '$z = new ZipArchive(); if ($z->open("api-en-cours.zip") !== true) { fwrite(STDERR, "Archive illisible\n"); exit(1); } $z->extractTo("."); $z->close();'
  fi
  rm -f api-en-cours.zip
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
