# Atelier Brillance – API

Application Symfony du client detailing. Elle installe le kit `bsandoz/core` et ajoute le module métier `src/Metier/Detailing`.

## Installation
```bash
composer install
cp .env .env.local                          # puis renseigner les valeurs ci-dessous
php bin/console lexik:jwt:generate-keypair  # clés JWT dans config/jwt/ (non versionnées)
```
Le kit `bsandoz/core` est installé depuis `../../../packages/core` (dépôt Composer `path`, lien symbolique) ; `BsandozCoreBundle` est enregistré dans `config/bundles.php`.

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
JWT_PASSPHRASE=  # php -r "echo bin2hex(random_bytes(32));"
DATABASE_URL="mysql://utilisateur:motdepasse@127.0.0.1:3306/detailing?serverVersion=8.0"
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
