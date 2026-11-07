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
