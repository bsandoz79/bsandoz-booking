# Plan de développement

Une case = une branche. Commits « un ajout = un commit », tests et docs à jour, push, fusion dans `main`, case cochée.

## 0. Socle
- [x] `chore/structure` : monorepo, règles, documentation, squelette des modules (méthodes `@todo`), logique de prix / zone / créneaux implémentée
- [x] `chore/installation` : `composer install` dans `packages/core` et `apps/detailing/api` (Symfony 7.4 LTS), `npm install` dans `packages/ui` et `apps/detailing/front`, toute la CI verte

## 1. Kit back
- [x] `feature/core-shared` : tests de `Money`, `TimeRange` et `Clock`, horloge figée `FrozenClock`
- [x] `feature/core-catalog` : mapping Doctrine XML, repositories, `ListerCatalogue`, `CalculerDevis`, contrôleur, erreurs problem+json, bundle câblé, migration, tests (unitaires, SQLite, fonctionnels)
- [x] `feature/core-booking-domain` : tests complets de `CreneauCalculator` et `ZoneCalculator`, invariants des règles / horaires / zone, créneaux sans doublon
- [x] `feature/core-booking-demi-journee` : prestations à durée incertaine (`occupePlage`) : seulement en début de demi-journée libre, qui est alors bloquée jusqu'à la fermeture
- [x] `feature/core-zone-facultative` : zone facultative (activité sur place, ex. barbier : ni trajet ni frais, rendez-vous enchaînés avec tampon 0)
- [x] `feature/core-booking-creneaux` : horaires et indisponibilités (persistance), `ListerJoursDisponibles`, `ListerCreneaux`, routes `/booking/days` et `/booking/slots`, occupations = réservations bloquantes étendues de leur propre trajet, tests
- [x] `feature/core-booking-reservation` : verrou d'agenda, `ReserverCreneau` (blocage 10 min), `AnnulerReservation`, `DeplacerReservation`, contrôleurs, tests
- [x] `feature/core-geocoding` : adaptateur api-adresse.data.gouv.fr (gratuit) + cache
- [x] `feature/core-auth-jetons` : jetons à usage unique, activation par lien, mot de passe oublié, lien « gérer mon rendez-vous » (voir / annuler / déplacer sans compte), limitation des tentatives (réservation, mot de passe oublié, gestion)
- [x] `feature/core-auth-session` : JWT + refresh token en cookie httpOnly, espace client (`/me`, mes réservations, annuler / déplacer), voters, export et suppression du compte (RGPD)
- [x] `feature/core-securite-donnees` : chiffrement de l'adresse et du téléphone en base (clé propre au client)
- [x] `feature/core-payment` : Stripe Checkout (`paymentUrl` de `POST /booking/reservations`), webhook signé et idempotent, remboursement
- [x] `feature/core-notification` : mails Twig (remplace le notifier de journal utilisé en attendant), .ics, flux iCal, commande cron des rappels
- [x] `feature/core-admin` : CRUD prestations, options, tarifs, horaires, indisponibilités, règles, zone, paramètres ; tableau de bord

## 2. Kit front
- [x] `feature/ui-calendar` : Calendar et SlotPicker écrits et testés (navigation clavier ajoutée dans `feature/ui-blocks`)
- [x] `feature/ui-blocks` : OptionCard, ChoiceChips, PriceSummary, Stepper ; Button, Field, AddressInput (autocomplétion) ; navigation clavier du calendrier
- [ ] `feature/ui-admin-blocks` : PlanningView (jour/semaine/mois), DataTable, Toggle

## 3. Application detailing
- [ ] `feature/detailing-metier` : `VehiculeType`, `Vehicule` (marque/modèle → type), `DetailingVarianteResolver`, données de démo en base (commande de chargement : prestations, options, horaires ; choix des formules à durée incertaine)
- [ ] `feature/detailing-site` : accueil (première version écrite) à enrichir : réalisations avant/après, zone, avis `[à compléter]`, pages légales
- [ ] `feature/detailing-reservation` : parcours en étapes déjà écrit avec données de démo → le brancher sur l'API réelle, compléter les tests (adresse, créneau, coordonnées, paiement)
- [ ] `feature/detailing-espace-client` : rendez-vous, annulation/déplacement, compte, mot de passe par lien, suppression
- [ ] `feature/detailing-espace-pro` : planning, rendez-vous pris par téléphone + lien d'acompte, catalogue, horaires, zone
- [ ] `feature/detailing-pwa` : manifest, service worker, notifications
- [ ] `feature/deploiement` : workflows de déploiement o2switch (API + front), cron, sous-domaines `demo.bsandoz.fr` et `api.demo.bsandoz.fr`
