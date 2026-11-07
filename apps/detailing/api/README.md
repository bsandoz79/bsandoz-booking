# Atelier Brillance – API

Application Symfony du client detailing. Elle installe le kit `bsandoz/core` et ajoute le module métier `src/Metier/Detailing`.

## Créer le squelette Symfony (branche `chore/installation`)
Le dossier contient déjà le code métier : créer le squelette à côté puis le copier sans rien écraser.
```bash
composer create-project symfony/skeleton:"7.3.*" /tmp/detailing-api
cp -rn /tmp/detailing-api/. apps/detailing/api/
cd apps/detailing/api
composer config repositories.core path ../../../packages/core
composer require bsandoz/core:@dev symfony/orm-pack symfony/twig-bundle symfony/mailer symfony/security-bundle lexik/jwt-authentication-bundle stripe/stripe-php nelmio/cors-bundle
composer require --dev phpunit/phpunit phpstan/phpstan symfony/maker-bundle
```
Puis ajouter dans `composer.json` : `"autoload": {"psr-4": {"App\\": "src/"}}` (déjà présent dans le squelette) et les scripts `test` / `stan` comme dans `packages/core`.

## Configuration (`.env.local`, jamais versionné)
```
DATABASE_URL="mysql://utilisateur:motdepasse@127.0.0.1:3306/detailing?serverVersion=8.0"
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAILER_DSN=smtp://contact%40domaine.fr:motdepasse@mail.domaine.fr:465
CORS_ALLOW_ORIGIN='^https://demo\.bsandoz\.fr$'
```

## Brancher le métier sur le kit
Dans `config/services.yaml` :
```yaml
Bsandoz\Core\Catalog\Domain\Port\VarianteResolver: '@App\Metier\Detailing\Domain\DetailingVarianteResolver'
```
