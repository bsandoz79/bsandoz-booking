# Atelier Brillance – API

Application Symfony du client detailing. Elle installe le kit `bsandoz/core` et ajoute le module métier `src/Metier/Detailing`.

## Installation
```bash
composer install
cp .env .env.local                          # puis renseigner les valeurs ci-dessous
```
Le kit `bsandoz/core` est installé depuis `../../../packages/core` (dépôt Composer `path`, lien symbolique) ; `BsandozCoreBundle` est enregistré dans `config/bundles.php`.

## Qualité
- `composer test` : PHPUnit (`phpunit.dist.xml`, `tests/`).
- `composer stan` : PHPStan niveau 8 (`phpstan.neon.dist`, `src` et `tests`).

## Historique : création du squelette (branche `chore/installation`)
Squelette **Symfony 7.4 LTS** (maintenu jusqu'en 11/2029). La 7.3, prévue au départ, n'est plus maintenue et toutes ses versions sont bloquées par Composer pour failles de sécurité.
Le dossier contenait déjà le code métier : le squelette a été créé à côté puis copié sans rien écraser (sans `vendor/` ni `var/`). Le `.env.dev` généré (qui contient un `APP_SECRET`) a été supprimé : `APP_SECRET` se met dans `.env.local`.
```bash
composer create-project symfony/skeleton:"7.4.*" /tmp/detailing-api
cp -rn /tmp/detailing-api/. apps/detailing/api/
cd apps/detailing/api
composer config repositories.core path ../../../packages/core
composer require bsandoz/core:@dev symfony/orm-pack symfony/twig-bundle symfony/mailer symfony/security-bundle lexik/jwt-authentication-bundle stripe/stripe-php nelmio/cors-bundle
composer require --dev phpunit/phpunit phpstan/phpstan symfony/maker-bundle
```
Puis ajouter dans `composer.json` : `"autoload": {"psr-4": {"App\\": "src/"}}` (déjà présent dans le squelette) et les scripts `test` / `stan` comme dans `packages/core`.

## Configuration (`.env.local`, jamais versionné)
```
APP_SECRET=      # php -r "echo bin2hex(random_bytes(16));"
JWT_SECRET=      # php -r "echo bin2hex(random_bytes(32));"  (signature HS256 des jetons d'accès)
BSANDOZ_ENCRYPTION_KEY=  # php bin/console bsandoz:cle-chiffrement  (chiffre adresse et téléphone ; à sauvegarder à part)
DATABASE_URL="mysql://utilisateur:motdepasse@127.0.0.1:3306/detailing?serverVersion=8.0"
FRONT_URL=https://demo.bsandoz.fr   # adresse publique du site (retours de paiement)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAILER_DSN=smtp://contact%40domaine.fr:motdepasse@mail.domaine.fr:465
CORS_ALLOW_ORIGIN='^https://demo\.bsandoz\.fr$'
```

## Brancher le métier sur le kit
Fait dans `config/services.yaml` :
```yaml
App\Metier\Detailing\Domain\VehicleModelCatalog:
    factory: ['App\Metier\Detailing\Domain\VehicleModelCatalog', 'fromJsonFile']
    arguments: ['%kernel.project_dir%/data/vehicle_models.json']

Bsandoz\Core\Catalog\Domain\Port\VarianteResolver: '@App\Metier\Detailing\Domain\DetailingVarianteResolver'
```
Réglages du kit (zone de démonstration, règles) : `config/packages/bsandoz_core.yaml`. Routes du kit : `config/routes/bsandoz_core.yaml`.

## Tests
`composer test` lance aussi les tests fonctionnels (`tests/Functional`) : de la requête HTTP à la base, sur une base SQLite jetable (`var/test.db`, définie dans `.env.test`), avec le vrai résolveur detailing.

## Sécurité (`config/packages/security.yaml`)
Pare-feu `api` sans état : jeton d'accès JWT (15 min, HS256 avec `JWT_SECRET`) en `Authorization: Bearer …`, comptes chargés par le kit (`SecurityUserProvider`). `/api/v1/me` exige `ROLE_CLIENT`, `/api/v1/admin` `ROLE_PRO` (le pro a aussi les droits client). La session dure 30 jours grâce au cookie httpOnly renouvelé par `POST /api/v1/auth/refresh`.

## Paiement (Stripe)
1. Tableau de bord Stripe du client > Développeurs > Clés API : `STRIPE_SECRET_KEY` (`sk_test_…` pour les essais, `sk_live_…` en production).
2. Développeurs > Webhooks : ajouter `https://api.demo.bsandoz.fr/api/v1/payment/stripe/webhook`, évènement `checkout.session.completed` ; copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
3. En local : `stripe listen --forward-to localhost:8000/api/v1/payment/stripe/webhook` (Stripe CLI) donne un secret `whsec_…` temporaire.
Sans clés, la réservation fonctionne mais `paymentError` indique que le paiement en ligne n'est pas configuré (mettre `deposit_percent: 0` pour une démo sans acompte). En test, un faux Stripe est branché (`tests/Double/FauxPrestatairePaiement`).

## Mails et agenda
- `MAILER_DSN` (SMTP o2switch, ex. `smtp://contact%40domaine.fr:motdepasse@mail.domaine.fr:465`), `MAILER_FROM` (expéditeur), `PRO_EMAIL` (adresse de l'artisan, prévenue à chaque rendez-vous). En développement, `MAILER_DSN=null://null` jette les mails ; un outil comme Mailpit permet de les voir.
- Textes : modèles du kit (`packages/core/templates/emails/`), à surcharger en copiant un fichier dans `templates/bsandoz/emails/`.
- Agenda de l'artisan : `BSANDOZ_ICAL_SECRET` dans `.env.local`, puis abonnement à `https://api.demo.bsandoz.fr/api/v1/ical/<secret>.ics` depuis Google Agenda / iPhone.
- Cron cPanel (toutes les 15 min) : `php bin/console bsandoz:notifications:send`.

## Notifications push du pro
`php bin/console bsandoz:push:cles` affiche les deux clés VAPID à copier dans `.env.local` (`BSANDOZ_VAPID_PUBLIC_KEY`, `BSANDOZ_VAPID_PRIVATE_KEY`). Le pro active ensuite les notifications sur chacun de ses appareils depuis l'espace pro. Sans clés, les notifications sont désactivées (les mails au pro restent envoyés). Sous Windows, si la génération échoue : définir `OPENSSL_CONF` vers `extras/ssl/openssl.cnf` du dossier de PHP. Migration : `Version20261112100000` (table `push_subscription`).

## Compte pro
`php bin/console bsandoz:pro:creer contact@domaine.fr Prénom Nom` crée le compte de l'artisan (mot de passe demandé sans affichage). Il se connecte comme un client, et accède en plus à `/api/v1/admin` : réglages, catalogue, horaires, congés, planning, rendez-vous par téléphone, tableau de bord. Les réglages faits dans l'espace pro remplacent ceux de `config/packages/bsandoz_core.yaml`.

## Données de démonstration
`php bin/console detailing:demo:charger` charge, sur une base dont le catalogue est vide, les prestations (Intérieur, Extérieur, Complet, Nettoyage de canapé ; tarifs par type de véhicule ou nombre de places), les options et les horaires (lundi au vendredi 8h-12h et 13h30-18h, samedi 8h-12h) de démonstration, via les cas d'usage du kit. « Complet » a une durée incertaine (`occupePlage`) : elle bloque la demi-journée. Si le catalogue contient déjà des prestations, rien n'est modifié. Les valeurs sont dans `src/Metier/Detailing/Application/DonneesDemo.php` ; l'artisan les remplace ensuite dans son espace pro.
