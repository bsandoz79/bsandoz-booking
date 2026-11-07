# bsandoz-booking

Plateforme de réservation 100 % maison, sans abonnement, hébergée sur o2switch :
- **kit réutilisable** : `packages/core` (Symfony) et `packages/ui` (React) ;
- **premier client** : `apps/detailing`, artisan de detailing auto à domicile (marque de démo « Atelier Brillance »).

## Prérequis
PHP 8.3+, Composer 2, Node 22, MySQL 8 (ou MariaDB 10.6+).

## Installation
```bash
# Kit back
cd packages/core && composer install && composer test
# Kit front
cd packages/ui && npm install && npm run test
# Application detailing
cd apps/detailing/api && composer install && cp .env .env.local   # renseigner DATABASE_URL, STRIPE_*, MAILER_DSN
php bin/console doctrine:migrations:migrate
cd ../front && npm install && npm run build
```

## Documentation
- [Architecture](docs/architecture.md)
- [Plan de développement](docs/plan.md)
- [Cahier des charges detailing](docs/cahier-des-charges.md)
- [Modèle de données](docs/modele-donnees.md)
- [API](docs/api.md)
- [Sécurité et RGPD](docs/securite.md)
- [Déploiement](docs/deploiement.md)
- [Journal](docs/CHANGELOG.md)
