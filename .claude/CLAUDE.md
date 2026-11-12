# Règles du projet bsandoz-booking

À relire au début de chaque session et avant chaque tâche.

## Le projet
Plateforme de réservation 100 % maison, sans abonnement : un **kit réutilisable** (back + front) et un **premier site client**, un artisan de detailing auto à domicile (marque de démo « Perfect Clean », Abbeville). Hébergement o2switch.
- `packages/core` : bundle Symfony `bsandoz/core` (Auth, Catalog, Booking, Payment, Notification, Admin, Shared). NE CONNAÎT AUCUN MÉTIER.
- `packages/ui` : blocs React `@bsandoz/ui` (Calendar, SlotPicker, OptionCard, ChoiceChips, PriceSummary, Stepper…). NE CONNAÎT AUCUN MÉTIER.
- `apps/detailing/api` : application Symfony du client, installe `bsandoz/core` + module `Metier/Detailing`.
- `apps/detailing/front` : site React du client, installe `@bsandoz/ui`.
Un nouveau client = un nouveau dossier `apps/<client>` avec sa propre base de données.

## Architecture back : monolithe modulaire, cœur hexagonal
Dans chaque module :
- `Domain/` : entités, objets valeur, règles, interfaces (ports). PHP pur : ni Symfony, ni Doctrine, ni Stripe.
- `Application/` : cas d'usage (une classe = une action, méthode `__invoke`), qui orchestrent le domaine via les ports.
- `Infrastructure/` : adaptateurs (Doctrine, contrôleurs HTTP, Stripe, Mailer, géocodage).
Les dépendances vont vers le centre : Infrastructure → Application → Domain, jamais l'inverse. Un contrôleur n'appelle jamais Doctrine : il appelle un cas d'usage.
Montants en centimes (`Money`), dates en `DateTimeImmutable` UTC, horloge via `Clock` (testable).

## Méthode de travail
1. Suivre `docs/plan.md` dans l'ordre : une case = une branche `feature/<nom>` depuis `main` à jour.
2. Un ajout = un commit, Conventional Commits en français (`feat:`, `test:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`, `ci:`).
3. Avant CHAQUE commit : documentation concernée et `docs/CHANGELOG.md` à jour.
4. Avant de pousser : tests, analyse statique et build verts (`composer test`, `composer stan` dans les dossiers PHP ; `npm run lint`, `npm run test`, `npm run build` dans les dossiers JS).
5. Branche terminée : push, fusion dans `main`, case cochée dans `docs/plan.md`, court résumé à l'utilisateur, branche suivante.
6. Ne jamais lancer de commande qui ne se termine pas (`npm run dev`, `symfony serve`) : utiliser build et tests.
7. Jamais de secret dans le code : `.env.local` (non versionné) et secrets GitHub.
8. Les méthodes marquées `@todo` lèvent `\LogicException('À implémenter')` : les implémenter avec leurs tests, retirer le `@todo`.

## Front
- Blocs réutilisables dans `packages/ui/src/blocks/<Bloc>/` : `Bloc.tsx`, `Bloc.module.css`, `Bloc.test.tsx`, `index.ts`, `README.md`. Tout passe par les props, aucun texte métier en dur.
- CSS segmenté : variables dans `tokens.css` (thème surchargeable par client), un `*.module.css` par composant, animations coupées si `prefers-reduced-motion`.
- Accessibilité AA, mobile d'abord, textes en français (vouvoiement).

## Ne jamais
- Inventer des avis, chiffres ou résultats : mettre `[à compléter]`.
- Mettre du métier (véhicule, SUV, surface…) dans `packages/`.
