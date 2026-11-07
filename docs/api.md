# API REST (`/api/v1`)

| Méthode | Route | Accès | Cas d'usage |
| --- | --- | --- | --- |
| GET | /catalog | public | ListerCatalogue |
| POST | /booking/quote | public | CalculerDevis (+ zone) |
| GET | /booking/days?month=YYYY-MM&duration=&lat=&lng= | public | ListerJoursDisponibles |
| GET | /booking/slots?date=&duration=&lat=&lng= | public | ListerCreneaux |
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
