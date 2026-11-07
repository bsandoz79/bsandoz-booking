# Journal des modifications

## [Non publié]
### Ajouté
- Structure du monorepo (kit back, kit front, application detailing), règles du projet et documentation.
- Kit back `packages/core` : modules Shared, Auth, Catalog, Booking, Payment, Notification, Admin (architecture hexagonale, méthodes `@todo`).
- Logique métier implémentée : `Money`, `TimeRange`, `PrixCalculator`, `ZoneCalculator`, `CreneauCalculator`.
- Tests unitaires : Money, ZoneCalculator, CreneauCalculator, PrixCalculator (10 tests).
- Kit front `packages/ui` : thème `--bs-*`, blocs Calendar et SlotPicker avec tests.
- Blocs OptionCard, ChoiceChips, PriceSummary, Stepper avec tests (15 tests front au total).
- Module métier detailing : types de véhicule, catalogue marque/modèle → type, `DetailingVarianteResolver` et ses tests.
- Site detailing (front) : thème, accueil, en-tête, pied de page, parcours de réservation en 8 étapes branché sur les blocs du kit, données de démonstration, service API (bascule vers la vraie API via `VITE_API_URL`), géocodage api-adresse.data.gouv.fr, test fonctionnel du parcours.
- Kit back : accesseurs des entités `User` (prénom, nom, téléphone, date de création) et `Reservation` (prestation, variante, options, adresse, coordonnées, frais de déplacement, données métier, notes), avec tests unitaires (5 tests).

- Kit back : configuration PHPStan `phpstan.neon.dist` (niveau 8, `src` et `tests`) ; les dépendances encore inutilisées des classes `@todo` sont ignorées classe par classe, à retirer dans la branche qui les implémente.
- Kit back : `composer.lock` non versionné (bibliothèque : les versions sont fixées par chaque application cliente).
- API detailing : squelette Symfony 7.4 LTS (la 7.3 n'est plus maintenue et ses versions sont bloquées pour failles de sécurité), PHP 8.3 minimum, `APP_SECRET` uniquement dans `.env.local`.
- API detailing : kit `bsandoz/core` (dépôt `path`), Doctrine ORM et migrations (MySQL), Twig, Mailer, Security, LexikJWT, Stripe, CORS ; `VarianteResolver` du kit branché sur `DetailingVarianteResolver`. Aucun secret dans `.env` (`JWT_PASSPHRASE` dans `.env.local`).
- API detailing : PHPUnit, PHPStan niveau 8 et MakerBundle (dev), scripts `composer test` et `composer stan`.
- Kit back : tests complets de `Money` (zéro, immuabilité, multiplication, pourcentage arrondi au centime supérieur, minimum, égalité, format français).
- CI : job « Detailing – API » (installation, `lint:container`, PHPStan, PHPUnit).

### Corrigé
- Site detailing : nom du projet synchronisé dans `package-lock.json` ; import de `vite.config.ts` avec son extension dans `vitest.config.ts` (avertissement Vite).
- Kit back : types des tableaux renvoyés précisés pour PHPStan niveau 8 (`ExporterDonnees`, `ListerCreneaux` → `list<TimeRange>`, `ListerJoursDisponibles` → dates `Y-m-d`, `PaymentGateway` → `{sessionId, url}` et événement décodé).
