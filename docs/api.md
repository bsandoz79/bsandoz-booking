# API REST (`/api/v1`)

| Méthode | Route | Accès | Cas d'usage |
| --- | --- | --- | --- |
| GET | /catalog | public | ListerCatalogue |
| POST | /booking/quote | public | CalculerDevis (+ zone) |
| GET | /booking/days?month=YYYY-MM&duration=&lat=&lng=&prestation= | public | ListerJoursDisponibles |
| GET | /booking/slots?date=YYYY-MM-DD&duration=&lat=&lng=&prestation= | public | ListerCreneaux |
| POST | /booking/reservations | public, rate limit | ReserverCreneau → URL Stripe |
| POST | /payment/stripe/webhook | signature Stripe | ConfirmerPaiement |
| GET/PATCH/DELETE | /booking/manage/{token} | jeton | voir / déplacer / annuler sans compte |
| POST | /auth/activate | jeton | ActiverCompte |
| POST | /auth/login, /auth/refresh, /auth/logout | public / cookie | session |
| POST | /auth/forgot, /auth/reset | public, rate limit | mot de passe |
| GET/PATCH/DELETE | /me, /me/reservations, /me/export | ROLE_CLIENT | espace client |
| CRUD | /admin/catalog/*, /admin/availability/*, /admin/rules, /admin/zone, /admin/settings | ROLE_PRO | espace pro |
| GET/POST/PATCH | /admin/reservations | ROLE_PRO | planning, ajout manuel, statut, remboursement |
| GET | /ical/{secret}.ics | jeton | flux agenda |
| GET | /geo/search?q= | public | autocomplétion d'adresse |

Erreurs en `application/problem+json`, montants en centimes, dates ISO 8601 UTC.

## Erreurs
`{"type": "about:blank", "title": "Not Found", "status": 404, "detail": "Prestation introuvable."}` — 400 requête invalide, 404 introuvable, 422 règle métier non respectée. Le front affiche `detail`.

## GET /catalog
```json
{
  "formules": [{"id": "interieur", "category": "auto", "name": "Intérieur", "description": "…",
                "basePriceCents": 6900, "baseDurationMin": 90, "occupePlage": false,
                "tarifs": {"suv": {"priceCents": 8900, "durationMin": 120}}, "optionIds": ["poils"]}],
  "options": [{"id": "poils", "name": "Poils d'animaux", "description": "…", "priceCents": 1500, "durationMin": 30}]
}
```
Prestations actives triées par position ; seules les options actives proposées par une prestation sont listées.

## POST /booking/quote
Corps : `{"prestationId": "interieur", "optionIds": ["poils"], "metierData": {"vehicleType": "suv"}, "variante": "suv", "lat": 49.89, "lng": 2.29}` — seul `prestationId` est obligatoire, `lat` et `lng` vont ensemble.
Variante : celle que le module métier déduit de `metierData`, sinon `variante`.
```json
{"lines": [{"label": "Intérieur", "amountCents": 8900}], "totalCents": 8900, "depositCents": 2670, "durationMin": 120,
 "travelFeeCents": 0, "inZone": true, "distanceKm": 3.2, "travelMinutes": 5, "variante": "suv"}
```
Adresse hors zone : `inZone: false`, pas de frais de déplacement (la réservation sera refusée).

## GET /booking/days et /booking/slots
Paramètres : `duration` (minutes, devis compris options), `lat` / `lng` (obligatoires pour une activité à domicile, contrôle de zone), `prestation` (facultatif : si elle est à durée incertaine, seuls les débuts de demi-journée libres sont proposés).
- `/booking/days?month=2026-11&duration=150&lat=49.89&lng=2.29` → `["2026-11-03", "2026-11-10"]`
- `/booking/slots?date=2026-11-10&duration=150&lat=49.89&lng=2.29` → `[{"start": "2026-11-10T07:30:00+00:00", "end": "2026-11-10T10:00:00+00:00", "label": "08:30"}]` (`start` / `end` en UTC, `label` en heure locale du pro)

Les créneaux tiennent compte du trajet, des congés, et des réservations confirmées ou en cours de paiement (chacune étendue de son propre trajet). Adresse hors zone ou manquante : 422 ; paramètre invalide : 400.

## POST /booking/reservations
Corps : `{"prestationId", "optionIds": [], "metierData": {}, "variante"?, "start": "2026-11-10T08:00:00+00:00", "address": {"label", "lat", "lng"} | null, "firstname", "lastname", "email", "phone", "notes"?, "acceptedTerms": true}` — `start` tel que renvoyé par `/booking/slots` ; `address` null pour une activité sur place.

Réponse 201 : `{"reservationId", "status": "pending_payment" | "confirmed", "totalCents", "depositCents", "holdExpiresAt", "paymentUrl": null}`.
Sous verrou d'agenda : devis recalculé côté serveur, créneau revérifié, compte client créé (ou compte existant réutilisé), réservation bloquée `holdMinutes` (10 min) en attente de l'acompte, ou confirmée directement sans acompte. `paymentUrl` sera rempli à partir de `feature/core-payment`. Créneau déjà pris, CGV non acceptées, adresse hors zone : 422.

Cron : `php bin/console bsandoz:reservations:expirer` passe en « expirée » les réservations dont le blocage est dépassé.

## GET /geo/search
`/geo/search?q=12 rue de&limit=5` → `[{"label": "12 Rue … 80000 Amiens", "lat": 49.89, "lng": 2.29}]`. Base Adresse Nationale (api-adresse.data.gouv.fr, gratuite, sans clé), au moins 3 caractères, 10 résultats maximum, cache 1 jour (30 jours pour le géocodage d'une adresse complète). API indisponible : liste vide, jamais d'erreur.

## Comptes par lien (`/auth`)
- `POST /auth/activate` `{"token", "password"}` → 204 (lien d'activation de 7 jours reçu après la première réservation).
- `POST /auth/forgot` `{"email"}` → 202, même réponse que l'e-mail soit connu ou non (lien de 1 h).
- `POST /auth/reset` `{"token", "password"}` → 204 (active aussi un compte encore en attente).
Mot de passe : 10 caractères minimum, au moins une lettre et un chiffre (sinon 422). Lien invalide ou expiré : 422.

## Gérer mon rendez-vous (`/booking/manage/{token}`)
`manageToken` est renvoyé par `POST /booking/reservations` (et sera mis dans les mails). Valable jusqu'à la fin du rendez-vous.
- `GET` → `{"id", "status", "prestationId", "optionIds", "start", "end", "address", "totalCents", "depositCents", "freeCancelUntil"}`
- `PATCH` `{"start"}` → déplace vers un créneau libre (réservation confirmée, au moins 48 h avant) et renvoie la réservation.
- `DELETE` → annule et renvoie `{"refundable": bool}` (acompte remboursable si annulation gratuite).
Lien inconnu ou expiré : 404.

## Limitation des tentatives
Par adresse IP et par heure (fenêtre glissante) : réservation 10, activation / nouveau mot de passe 10, mot de passe oublié 5, gestion par lien 30. Au-delà : 429 avec l'en-tête `Retry-After`.

## Session (`/auth/login`, `/auth/refresh`, `/auth/logout`)
- `POST /auth/login` `{"email", "password"}` → `{"token", "expiresIn": 900, "roles"}` et cookie `bsandoz_refresh` (httpOnly, Secure, SameSite=Strict, chemin `/api/v1/auth`, 30 jours). Identifiants refusés : 401, même message dans tous les cas. Limite : 10 tentatives par heure et par IP.
- `POST /auth/refresh` (cookie) → nouveau jeton d'accès et nouveau cookie ; l'ancien cookie ne sert plus (rotation). Session expirée : 401.
- `POST /auth/logout` (cookie) → 204, cookie effacé.
Le jeton d'accès s'envoie en `Authorization: Bearer …`. Plusieurs appareils peuvent être connectés ; un nouveau mot de passe les déconnecte tous.

## Espace client (`/me`, rôle client)
- `GET /me` → `{"id", "email", "firstname", "lastname", "phone", "roles"}`
- `GET /me/reservations` → mes réservations (de la plus récente à la plus ancienne)
- `PATCH /me/reservations/{id}` `{"start"}` → 204 (déplacement, mêmes règles que le lien de gestion) ; `DELETE /me/reservations/{id}` → `{"refundable"}`
- `GET /me/export` → toutes mes données en JSON (fichier `mes-donnees.json`)
- `DELETE /me` → 204 : compte anonymisé, sessions fermées, accès coupé immédiatement ; refusé (422) s'il reste un rendez-vous à venir.
Réservation d'un autre client : 404. Sans jeton : 401.

## Paiement de l'acompte (Stripe Checkout)
- `POST /booking/reservations` renvoie maintenant `paymentUrl` (page de paiement Stripe : carte, Apple Pay, Google Pay selon le tableau de bord Stripe). Paiement indisponible ou non configuré : la réservation est créée quand même, `paymentUrl` vaut `null` et `paymentError` explique pourquoi.
- Après paiement, Stripe renvoie le client sur `success_url` (`/confirmation?reservation=…`), ou sur `cancel_url` s'il abandonne.
- `POST /payment/stripe/webhook` (appelé par Stripe, évènement `checkout.session.completed`) : signature vérifiée (`STRIPE_WEBHOOK_SECRET`, tolérance 5 min, sinon 400), traitement idempotent. Créneau toujours libre : réservation confirmée et mail avec le lien de gestion. Paiement arrivé trop tard pour un créneau repris : acompte remboursé automatiquement.
- Annulation gratuite (lien de gestion ou espace client) : l'acompte est remboursé aussitôt sur le moyen de paiement d'origine.

## Mails et agenda
- Mails envoyés (modèles Twig du kit, en français, surchargeables dans `templates/bsandoz/emails/` de l'application) : activation du compte, mot de passe oublié, confirmation (avec le rendez-vous en pièce jointe `.ics` et le lien « gérer mon rendez-vous »), annulation, déplacement, rappel de la veille, remboursement ; au pro (`PRO_EMAIL`) : nouveau rendez-vous, annulation, déplacement.
- Liens des mails vers le site (`FRONT_URL`) : `/compte/activer?jeton=…`, `/compte/mot-de-passe?jeton=…`, `/rendez-vous?jeton=…` (lien de gestion), `/reserver`. Le site doit proposer ces pages et appeler respectivement `/auth/activate`, `/auth/reset` et `/booking/manage/{token}`.
- `GET /ical/{secret}.ics` : flux d'agenda du pro (rendez-vous confirmés, des 30 derniers jours à l'année à venir) à ajouter dans Google Agenda ou Apple Calendrier (« s'abonner par URL »). Secret faux : 404.
- Cron toutes les 15 min : `php bin/console bsandoz:notifications:send` (expire les blocages de paiement dépassés et envoie les rappels de la veille, une seule fois par rendez-vous).
