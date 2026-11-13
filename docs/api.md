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
                "basePriceCents": 6900, "baseDurationMin": 90, "occupePlage": false, "badge": "Le plus choisi",
                "tarifs": {"suv": {"priceCents": 8900, "durationMin": 120}}, "optionIds": ["poils"]}],
  "options": [{"id": "poils", "name": "Poils d'animaux", "description": "…", "priceCents": 1500, "durationMin": 30}],
  "produits": [{"id": "…", "name": "Microfibre", "description": "…", "priceCents": 600, "stock": 3, "photo": null}]
}
```
Prestations actives triées par position ; seules les options actives proposées par une prestation sont listées. `produits` : produits vendus avec la réservation, actifs et en stock (`stock` plafonné à 10 : quantité maximale à proposer).

## POST /booking/quote
Corps : `{"prestationId": "interieur", "optionIds": ["poils"], "metierData": {"vehicleType": "suv"}, "variante": "suv", "lat": 49.89, "lng": 2.29, "quantite": 1}` — seul `prestationId` est obligatoire, `lat` et `lng` vont ensemble. `quantite` (1 à 5, ex. nombre de véhicules) : la même prestation pour toutes les unités, prix et durée multipliés ; `optionIds` contient les options de chaque unité mises bout à bout (une option au plus une fois par unité, ex. `["poils", "poils"]` pour 2 véhicules sur 3), chacune comptée autant de fois ; déplacement compté une fois. Lignes du devis : « Éclat × 3 », « Poils d'animaux × 2 ».
Variante : celle que le module métier déduit de `metierData`, sinon `variante`.
```json
{"lines": [{"label": "Intérieur", "amountCents": 8900}], "totalCents": 8900, "depositCents": 2670, "durationMin": 120,
 "travelFeeCents": 0, "inZone": true, "distanceKm": 3.2, "travelMinutes": 5, "variante": "suv"}
```
Adresse hors zone : `inZone: false`, pas de frais de déplacement (la réservation sera refusée).

## GET /booking/hours
Public, mis en cache 5 min. Horaires d'ouverture à afficher sur le site : `[{"weekday": 1, "startsAt": "08:00", "endsAt": "19:00"}, …]` (1 = lundi … 7 = dimanche ; un jour absent = fermé). Modifiés par le pro via `PUT /admin/availability/hours`.

## GET /booking/zone/estimation?lat=&lng=
Public. Frais de déplacement estimés pour une position (carte de la zone sur le site), même calcul que le devis : `{"distanceKm": 19.9, "dansZone": true, "fraisCents": 1000}`, ou `{"surPlace": true}`. 400 si `lat` / `lng` manquent. La position n'est pas enregistrée et le point de départ du pro n'est jamais renvoyé.

## GET /booking/zone
Public, conditions de déplacement à afficher : `{"surPlace": false, "freeRadiusKm", "maxDistanceKm", "pricePerKmCents", "roadFactor", "paliers": [{"jusquaKm", "prixCents"}]}` ou `{"surPlace": true}`. Le point de départ n'est pas publié.

## GET /booking/days et /booking/slots
Paramètres : `duration` (minutes, devis compris options), `lat` / `lng` (obligatoires pour une activité à domicile, contrôle de zone), `prestation` (facultatif : si elle est à durée incertaine, seuls les débuts de demi-journée libres sont proposés).
- `/booking/days?month=2026-11&duration=150&lat=49.89&lng=2.29` → `["2026-11-03", "2026-11-10"]`
- `/booking/slots?date=2026-11-10&duration=150&lat=49.89&lng=2.29` → `[{"start": "2026-11-10T07:30:00+00:00", "end": "2026-11-10T10:00:00+00:00", "label": "08:30"}]` (`start` / `end` en UTC, `label` en heure locale du pro)

Les créneaux tiennent compte du trajet, des congés, et des réservations confirmées ou en cours de paiement (chacune étendue de son propre trajet). Adresse hors zone ou manquante : 422 ; paramètre invalide : 400.

## POST /booking/reservations
Corps : `{"prestationId", "optionIds": [], "metierData": {}, "variante"?, "start": "2026-11-10T08:00:00+00:00", "address": {"label", "lat", "lng"} | null, "firstname", "lastname", "email", "phone", "notes"?, "acceptedTerms": true, "produits"?: [{"id", "quantite"}], "quantite"?: 1, "paiement"?: "en_ligne" | "sur_place"}` — `start` tel que renvoyé par `/booking/slots` ; `address` null pour une activité sur place ; `produits` : produits ajoutés, payés en entier en ligne avec l'acompte et remis le jour du rendez-vous.

Réponse 201 : `{"reservationId", "status": "pending_payment" | "confirmed", "totalCents", "depositCents", "produitsCents", "holdExpiresAt", "paymentUrl": null}` (`totalCents` : prestation seule ; payé en ligne : `depositCents` + `produitsCents`).
Paiement : `en_ligne` = tout payer maintenant (prestation et produits), réservation en attente du paiement ; `sur_place` = seul l'acompte éventuel (réglage du pro, 0 par défaut) se paie en ligne, sinon réservation confirmée aussitôt et tout se règle sur place ; absent = ancien fonctionnement (acompte et produits en ligne). Le nom de famille est facultatif (`firstname` peut contenir « Nom et prénom »). Vues de réservation (client et pro) : `paiementEnLigne`, `enLigneCents`, `surPlaceCents`.
Produits : retirés du stock à la réservation (stock insuffisant, produit retiré : 422), remis en stock si la réservation est annulée (client ou pro) ou expire sans paiement, repris si le paiement arrive après l'expiration. Avec des produits, la réservation attend le paiement même sans acompte.
Sous verrou d'agenda : devis recalculé côté serveur, créneau revérifié, compte client créé (ou compte existant réutilisé), réservation bloquée `holdMinutes` (10 min) en attente de l'acompte, ou confirmée directement sans acompte. `paymentUrl` sera rempli à partir de `feature/core-payment`. Créneau déjà pris, CGV non acceptées, adresse hors zone : 422.

Cron : `php bin/console bsandoz:reservations:expirer` passe en « expirée » les réservations dont le blocage est dépassé.

## POST /contact
Public, 5 demandes par heure et par adresse IP. Corps : `{"nom", "email", "message", "telephone"?, "entreprise"?, "details"?: {"question": "réponse"}, "site"?}` → 204. Mail « Demande de devis » envoyé à `PRO_EMAIL` avec l'adresse du demandeur en « répondre à » ; `details` : 12 questions / réponses au plus (réponses vides ignorées). `site` : champ piège invisible, rempli = demande ignorée (robots). Champ manquant ou e-mail invalide : 422 ; `PRO_EMAIL` vide : 422 avec un message invitant à appeler ou écrire.

## GET /geo/search
`/geo/search?q=12 rue de&limit=5` → `[{"label": "12 Rue … 80000 Amiens", "lat": 49.89, "lng": 2.29}]`. Base Adresse Nationale (api-adresse.data.gouv.fr, gratuite, sans clé), au moins 3 caractères, 10 résultats maximum, cache 1 jour (30 jours pour le géocodage d'une adresse complète). API indisponible : liste vide, jamais d'erreur.

## Comptes par lien (`/auth`)
- `POST /auth/activate` `{"token", "password"}` → 204 (lien d'activation de 7 jours reçu après la première réservation).
- `POST /auth/forgot` `{"email"}` → 202, même réponse que l'e-mail soit connu ou non (lien de 1 h).
- `POST /auth/reset` `{"token", "password"}` → 204 (active aussi un compte encore en attente).
Mot de passe : 10 caractères minimum, au moins une lettre et un chiffre (sinon 422). Lien invalide ou expiré : 422.

## Gérer mon rendez-vous (`/booking/manage/{token}`)
`manageToken` est renvoyé par `POST /booking/reservations` (et sera mis dans les mails). Valable jusqu'à la fin du rendez-vous.
- `GET` → `{"id", "status", "prestationId", "optionIds", "start", "end", "address", "lat", "lng", "totalCents", "depositCents", "remiseFideliteCents", "produits", "produitsCents", "freeCancelUntil"}` (`lat` / `lng` : pour chercher un nouveau créneau avec `/booking/slots`)
- `PATCH` `{"start"}` → déplace vers un créneau libre (réservation confirmée, au moins 48 h avant ; ou pas encore payée, sans délai) et renvoie la réservation.
- `POST …/payment` → `{"paymentUrl"}` : acompte non réglé, payé plus tard. Blocage dépassé : créneau revérifié et de nouveau bloqué (produits et remise de fidélité repris) ; créneau repris entre-temps : 409, choisir un autre créneau avec `PATCH` puis payer.
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
- `GET /me/reservations` → mes réservations (de la plus récente à la plus ancienne), au même format que `GET /booking/manage/{token}`
- `PATCH /me/reservations/{id}` `{"start"}` → 204 (déplacement, mêmes règles que le lien de gestion) ; `DELETE /me/reservations/{id}` → `{"refundable"}` (réservation non payée ou expirée : annulable, rien à rembourser) ; `POST /me/reservations/{id}/payment` → `{"paymentUrl"}` (payer plus tard, mêmes règles que le lien de gestion, 409 si le créneau a été repris)
- `GET /me/export` → toutes mes données en JSON (fichier `mes-donnees.json`)
- `DELETE /me` → 204 : compte anonymisé, sessions fermées, accès coupé immédiatement ; refusé (422) s'il reste un rendez-vous à venir.
Réservation d'un autre client : 404. Sans jeton : 401.

## Paiement de l'acompte (Stripe Checkout)
- `POST /booking/reservations` renvoie maintenant `paymentUrl` (page de paiement Stripe : carte, Apple Pay, Google Pay selon le tableau de bord Stripe). Paiement indisponible ou non configuré : la réservation est créée quand même, `paymentUrl` vaut `null` et `paymentError` explique pourquoi.
- Après paiement, Stripe renvoie le client sur `success_url` (`/confirmation?reservation=…`), ou sur `cancel_url` s'il abandonne.
- `POST /payment/stripe/webhook` (appelé par Stripe, évènement `checkout.session.completed`) : signature vérifiée (`STRIPE_WEBHOOK_SECRET`, tolérance 5 min, sinon 400), traitement idempotent. Créneau toujours libre : réservation confirmée et mail avec le lien de gestion. Paiement arrivé trop tard pour un créneau repris : acompte remboursé automatiquement.
- Annulation gratuite (lien de gestion ou espace client) : l'acompte est remboursé aussitôt sur le moyen de paiement d'origine, produits compris.
- Montant de la session : acompte + produits ajoutés ; libellé « Acompte : <prestation> + 2 × <produit>, … ».

## Mails et agenda
- Mails envoyés (modèles Twig du kit, en français, surchargeables dans `templates/bsandoz/emails/` de l'application) : activation du compte, mot de passe oublié, confirmation (avec le rendez-vous en pièce jointe `.ics` et le lien « gérer mon rendez-vous »), annulation, déplacement, rappel de la veille, remboursement ; au pro (`PRO_EMAIL`) : nouveau rendez-vous, annulation, déplacement.
- Liens des mails vers le site (`FRONT_URL`) : `/compte/activer?jeton=…`, `/compte/mot-de-passe?jeton=…`, `/rendez-vous?jeton=…` (lien de gestion), `/reserver`. Le site doit proposer ces pages et appeler respectivement `/auth/activate`, `/auth/reset` et `/booking/manage/{token}`.
- `GET /ical/{secret}.ics` : flux d'agenda du pro (rendez-vous confirmés, des 30 derniers jours à l'année à venir) à ajouter dans Google Agenda ou Apple Calendrier (« s'abonner par URL »). Secret faux : 404.
- Cron toutes les 15 min : `php bin/console bsandoz:notifications:send` (expire les blocages de paiement dépassés et envoie les rappels de la veille, une seule fois par rendez-vous).

## Contenu modifiable du site
- `GET /site` (public) → objet JSON du contenu éditorial (textes, coordonnées, FAQ, avis, photos…), `{}` tant que le pro n'a rien modifié ; le site complète avec ses textes par défaut. Mis en cache 60 s.
- `PUT /admin/site` (rôle pro) : remplace tout le contenu. Objet de textes, nombres, booléens et listes ; rubriques nommées `[A-Za-z][A-Za-z0-9_]*`, 6 niveaux, 5 000 caractères par texte, 200 Ko au total (sinon 422). Le site l'affiche comme du texte, jamais comme du HTML.
- Photos (rôle pro) : `POST /admin/medias` (multipart, champ `fichier`, JPEG / PNG / WebP reconnus à leur contenu, 5 Mo maximum) → 201 `{"name", "url"}` ; `GET /admin/medias` → `[{"name", "url"}]` ; `DELETE /admin/medias/{name}` → 204. Fichiers rangés dans `public/medias` de l'API (option `bsandoz_core.medias_dir`), servis à `https://<api>/medias/<name>`.

## Carte de fidélité
Règle par défaut (`bsandoz_core.fidelite`) : 4 prestations réalisées, 20 % sur la suivante ; le pro la change ou la désactive.
- `GET /fidelite` (public) → `{"actif", "tamponsRequis", "remisePercent"}`.
- `GET /me/fidelite` (client) → `{"actif", "tampons", "tamponsRequis", "remisePercent", "remiseDisponible"}`.
- `GET /admin/fidelite/{userId}`, `PATCH /admin/fidelite/{userId}` `{"delta": ±n}` (pro) : voir ou ajuster la carte d'un client (`clientId` dans le planning). Jamais sous zéro.
- `PUT /admin/settings/fidelite` `{"actif", "tamponsRequis", "remisePercent"}` (pro).
- Tampon automatique quand le pro marque un rendez-vous « done » (sauf celui qui a reçu la remise). Carte pleine : la réservation suivante (en ligne ou par téléphone) reçoit la remise sur les prestations (hors déplacement), `totalCents` et l'acompte sont recalculés, `remiseFideliteCents` est indiqué dans le planning et l'espace client ; la carte repart. Réservation remisée annulée ou expirée : la carte redevient pleine (reprise si le paiement arrive après l'expiration).

## Avoirs
Annulation tardive (après le délai d'annulation gratuite) d'un rendez-vous confirmé : rien n'est remboursé, la somme payée en ligne devient un avoir du client. L'avoir est déduit automatiquement de sa réservation suivante (après la remise de fidélité, acompte recalculé, ligne « Avoir déduit » sur la facture) et rendu si cette réservation est annulée ou expire. Mail d'annulation au client et au pro avec le montant (`avoirCents`). `GET /me` renvoie `avoirCents` (solde).

## Notifications push du pro (Web Push)
- `GET /push/key` → `{"publicKey": "…" | null}` : clé publique VAPID (null : notifications non configurées).
- `POST /admin/push` (rôle pro) : corps = `PushSubscription` du navigateur, `{"endpoint", "keys": {"p256dh", "auth"}}` → 204. Le même appareil remplace son abonnement. Endpoint non https ou clés invalides : 422 ; notifications non configurées : 422.
- `DELETE /admin/push` `{"endpoint"}` → 204.
- Envoi à tous les appareils abonnés à chaque rendez-vous confirmé, annulé ou déplacé : `{"title", "body": "prestation · client · jour à HHhMM", "url": "/pro", "tag"}`. Un appareil désabonné (réponse 404 / 410 du service push) est supprimé ; une erreur d'envoi n'empêche jamais la réservation.

## Factures
Émise automatiquement quand le pro marque un rendez-vous « fait » (`PATCH /admin/reservations/{id}` `{"status": "done"}`), ou à la demande : `POST /admin/reservations/{id}/facture` → 201 (une seule par réservation : un nouvel appel renvoie la même ; prestation pas encore faite : 422). Numéro chronologique sans trou `F-AAAA-NNNN` (sous verrou), lignes (prestation et options, déplacement, remise fidélité, produits, « Ajustement du tarif » si le prix a changé depuis la réservation), vendeur et client figés ; mail `invoice_issued` au client avec le lien `/facture/{id}`.
- Pro : `GET /admin/factures` → `[{id, numero, reservationId, emiseLe, prestationLe, client, totalCents}]` ; `GET /admin/factures/{id}` → + `{vendeur, client: {nom, email, adresse, entreprise, siret, adresseFacturation}, lignes: [{libelle, montantCents}], payeEnLigneCents, payeSurPlaceCents}` ; `GET /admin/reservations/{id}/facture` → `{id, numero}` ou `null`.
- Vendeur : `GET` / `PUT /admin/settings/facturation` `{nom, adresse, siret, mentionTva, email, telephone}` (« [à compléter] » tant que vide ; mention de TVA par défaut « TVA non applicable, art. 293 B du CGI » ; SIRET de 14 chiffres ou n° BCE de 10).
- Client : `GET /me/factures`, `GET /me/factures/{id}` (les siennes seulement, sinon 404).

## Espace pro (`/admin`, rôle pro)
Compte pro créé à l'installation : `php bin/console bsandoz:pro:creer contact@domaine.fr Prénom Nom` (mot de passe demandé), puis connexion par `/auth/login`. Client connecté : 403 ; sans jeton : 401.
- `GET /admin/dashboard` → `{today, week, monthRevenueCents, monthBookings, pendingPayments, monthCancellationRate, next: [{id, start, address, client, phone}]}`
- `GET /admin/settings` → `{rules, zone, timezone}` ; `PUT /admin/settings/rules` `{minNoticeHours, horizonDays, bufferMin, slotStepMin, freeCancelHours, depositPercent, depositFixedCents, holdMinutes}` ; `PUT /admin/settings/zone` `{"zone": {originLat, originLng, freeRadiusKm, pricePerKmCents, maxDistanceKm, roadFactor?, averageSpeedKmh?, paliers?: [{jusquaKm, prixCents}], rayonVilleKm?} | null}` (null : activité sur place ; `rayonVilleKm` : rayon de la ville de départ, toute la ville compte pour 0 km et les distances partent de sa limite ; `paliers` : frais par tranches au-delà du rayon offert, par distance croissante ; au-delà de la dernière tranche, prix de celle-ci plus `pricePerKmCents` par km). Valeurs incohérentes : 422.
- `GET /admin/catalog` → `{prestations, options}` (actives ou non) ; `POST` / `PUT /admin/catalog/prestations[/{id}]` `{name, description, basePriceCents, baseDurationMin, active, categoryId, position, occupePlage, badge (mise en avant, 40 caractères, vide : aucune), tarifs: {variante: {priceCents, durationMin}}, optionIds}` ; `DELETE /admin/catalog/prestations/{id}` (désactive) ; `POST` / `PUT /admin/catalog/options[/{id}]` `{name, description, priceCents, durationMin, active}` ; `POST` / `PUT /admin/catalog/produits[/{id}]` `{name, description, priceCents (> 0), stock, active, position, photo (URL d'un média, facultative)}` ; `DELETE /admin/catalog/produits/{id}` (retire de la vente, gardé pour l'historique). Planning et vues de réservation : `quantite`, `produits` `[{id, nom, prixCents, quantite}]` et `produitsCents`.
- `GET` / `PUT /admin/availability/hours` `{"hours": [{weekday, startsAt, endsAt}]}` (remplace la semaine) ; `GET /admin/availability/unavailabilities?from=&to=`, `POST` `{start, end, reason}`, `DELETE …/{id}`.
- `GET /admin/reservations?from=AAAA-MM-JJ&to=AAAA-MM-JJ` → planning avec le client ; `POST /admin/reservations` (même corps que `/booking/reservations`, plus `sendDepositLink`) → rendez-vous pris par téléphone, confirmé tout de suite ou lien d'acompte envoyé par mail ; `PATCH /admin/reservations/{id}` `{"status": "done" | "no_show"}` ; `POST …/{id}/cancel` `{"refund": bool}` ; `POST …/{id}/refund` `{"amountCents"?}`.
