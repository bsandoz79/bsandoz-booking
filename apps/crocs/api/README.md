# API de Croc's

Application Symfony du deuxième client : elle installe le kit `bsandoz/core` et ne se sert que de la carte (module `Carte`), du contenu du site (`/site` : annonce, phrase d'accueil, horaires), des photos et de l'espace pro. Pas de module métier : tout vient du kit. Sa propre base MySQL (`crocs`).

- Carte de départ : `data/carte-initiale.json` (relevée sur la photo de la carte, prix à faire valider), chargée une seule fois par `php bin/console crocs:carte:charger`, sans la mention « Nouveau ».
- Espace du patron : `https://crocs.demo.bsandoz.fr/pro` (site `apps/crocs/front`, bloc `EditeurCarte`).
- Tests : `composer test` (base SQLite jetable), `composer stan`.

## Mise en ligne (une seule fois)

1. **cPanel → Domaines** : créer `api.crocs.demo.bsandoz.fr`, racine `api.crocs.demo.bsandoz.fr/public`. PHP 8.3 avec `pdo_mysql`, `sodium`, `mbstring`, `intl` (cPanel → Sélectionner une version de PHP).
2. **cPanel → Bases de données MySQL** : créer une base (ex. `xxx_crocs`) et un utilisateur avec tous les droits sur cette base.
3. **GitHub → Settings → Environments → demo** : ajouter le secret `FTP_SERVER_DIR_CROCS_API` = `api.crocs.demo.bsandoz.fr/` (chemin relatif au compte FTP, terminé par `/`). Le prochain envoi sur `main` (ou Actions → Déploiement → « crocs ») y dépose `api.zip`.
4. **Fichier `~/api.crocs.demo.bsandoz.fr/.env.local`** (gestionnaire de fichiers, droits 600, jamais dans le dépôt) :
   ```dotenv
   APP_ENV=prod
   APP_SECRET=                 # php -r "echo bin2hex(random_bytes(16));"
   DATABASE_URL="mysql://UTILISATEUR:MOTDEPASSE@localhost:3306/BASE?serverVersion=10.6.0-MariaDB&charset=utf8mb4"
   JWT_SECRET=                 # php -r "echo bin2hex(random_bytes(32));"
   BSANDOZ_ENCRYPTION_KEY=     # php bin/console bsandoz:cle-chiffrement (à sauvegarder à part)
   BSANDOZ_ICAL_SECRET=        # php -r "echo bin2hex(random_bytes(24));"
   FRONT_URL=https://crocs.demo.bsandoz.fr
   CORS_ALLOW_ORIGIN='^https://crocs\.demo\.bsandoz\.fr$'
   MAILER_DSN=null://null      # pas de mails pour l'instant
   ```
5. **cPanel → Terminal** :
   ```sh
   cd ~/api.crocs.demo.bsandoz.fr
   sh deploy/apres-envoi.sh                               # décompresse, crée les tables
   php bin/console crocs:carte:charger                    # la carte relevée, une seule fois
   php bin/console bsandoz:pro:creer EMAIL Prénom Nom     # compte du patron (mot de passe demandé)
   ```
6. Envoyer le site (`apps/crocs/front/README.md`) : il lit la carte sur cette API ; le patron se connecte sur `/pro`.

Ensuite, à chaque changement de l'API : envoi automatique par GitHub, puis `sh deploy/apres-envoi.sh` dans le terminal.
