# Architecture

## Vue d'ensemble
```
packages/core   bundle Symfony réutilisable (aucun métier)
packages/ui     blocs React réutilisables (aucun métier)
apps/detailing  premier client : API Symfony + site React, base MySQL dédiée
```
Chaque client a **sa propre application et sa propre base** : aucune donnée partagée entre clients. Le kit est installé par Composer (dépôt `path` dans le monorepo, dépôt Git privé plus tard) et npm (workspace).

## Modules du kit back (`packages/core/src`)
| Module | Rôle |
| --- | --- |
| Shared | `Money` (centimes), `Clock`, identifiants, exceptions de domaine |
| Auth | compte créé automatiquement à la réservation, activation par lien mail, connexion JWT + refresh token, mot de passe oublié, rôles |
| Catalog | prestations, options, catégories, tarifs par variante métier, calcul du prix |
| Booking | horaires, indisponibilités, règles, zone et frais km, calcul des créneaux, réservations, annulation, déplacement |
| Payment | acompte Stripe Checkout, webhook signé, remboursement |
| Notification | mails (confirmation, rappel veille, annulation, activation), fichier .ics, flux iCal du pro, Web Push |
| Admin | paramètres (identité, couleurs, textes de mails), tableau de bord |

Dans chaque module : `Domain/` (PHP pur) → `Application/` (cas d'usage) → `Infrastructure/` (Doctrine, HTTP, Stripe, Mailer, géocodage).

## Point d'extension métier
Le kit expose le port `Catalog\Domain\VarianteResolver` : le module métier du client (ex. `Metier/Detailing`) dit quelle variante de tarif s'applique (ex. « suv ») et ajoute ses propres champs. Le kit ne connaît que la clé `variante`.

## Front
- `packages/ui` : blocs sans texte métier, thème par variables CSS.
- `apps/detailing/front` : pages du client (accueil, prestations, réservation en étapes, confirmation, espace client, espace pro) qui assemblent les blocs.

## Flux d'une réservation
1. Le front demande le catalogue, puis un devis (`/booking/quote`) et les créneaux (`/booking/slots`).
2. Le client choisit un créneau et donne ses coordonnées : `ReserverCreneau` crée un compte `pending` (ou rattache le compte existant), une réservation `pending_payment` qui bloque le créneau 10 min, puis une session Stripe.
3. Stripe appelle le webhook : `ConfirmerPaiement` passe la réservation en `confirmed` et déclenche les mails (confirmation + lien d'activation + .ics).
4. La veille, la commande `bsandoz:notifications:send` (cron) envoie le rappel.
