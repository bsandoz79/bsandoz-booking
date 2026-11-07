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
