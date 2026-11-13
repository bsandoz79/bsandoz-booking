# Modèle de données (une base par client)

| Table | Module | Champs principaux |
| --- | --- | --- |
| user_account | Auth | id UUID, email unique (minuscules), password_hash nullable, roles JSON, status (pending/active/deleted), firstname, lastname, phone (chiffré, LONGTEXT), created_at (UTC) |
| auth_token | Auth | id, subject_id (compte ou réservation), type (activation/reset/manage/email_change), token_hash SHA-256 unique, expires_at, used_at (UTC) |
| refresh_token | Auth | user_id, token_hash, expires_at |
| category | Catalog | id, name, position |
| prestation | Catalog | id, category_id, name, description, base_price_cents, base_duration_min, active, position, occupe_plage (durée incertaine : occupe la demi-journée), remise_unite_cents (remise par unité au-delà de la première, ex. 5 € par véhicule supplémentaire), tarifs JSON `{"<variante>": {"price_cents", "duration_min"}}`, option_ids JSON (photo : plus tard) |
| catalog_option | Catalog | id, name, description, price_cents, duration_min, active (« option » est un mot réservé MySQL) |
| opening_hour | Booking | id, weekday (1-7), starts_at, ends_at (heures locales HH:MM) |
| unavailability | Booking | id, period_start, period_end (UTC), reason |
| booking_rule | Booking | min_notice_hours, horizon_days, buffer_min, slot_step_min, free_cancel_hours, deposit_percent, deposit_fixed_cents |
| zone | Booking | origin_label, origin_lat, origin_lng, free_radius_km, price_per_km_cents, max_distance_km |
| reservation | Booking | id, user_id, prestation_id, variante, option_ids JSON, period_start, period_end (UTC), address (chiffrée), lat, lng, travel_fee_cents, total_cents (remise de fidélité déduite), deposit_cents, loyalty_discount_cents, credit_used_cents (avoir déduit), status, hold_expires_at (UTC), notes, metier_data JSON |
| reservation_option | Booking | reservation_id, option_id, price_cents |
| payment | Payment | id, reservation_id, provider_session_id (unique), amount_cents, refunded_cents, status (pending/paid/partially_refunded/refunded), paid_at, created_at (UTC) |
| notification | Notification | id, type (reminder…), reservation_id (unique par type), sent_at (UTC) : journal des notifications programmées déjà envoyées |
| push_subscription | Notification | id, user_id, endpoint (unique par appareil), public_key (p256dh), auth_token, created_at (UTC) : appareils du pro abonnés aux notifications push |
| loyalty_card | Fidelite | user_id, stamps (tampons vers la prochaine remise), updated_at (UTC) |
| customer_credit | Payment | user_id, balance_cents (avoir : somme payée non remboursée, déduite de la prochaine réservation), updated_at (UTC) |
| setting | Admin | setting_key (« rules », « zone »), value JSON, updated_at (UTC) : réglages du pro, prioritaires sur la configuration |
| audit_log | Admin | user_id, action, target, created_at, ip |

Mapping Doctrine en XML dans `packages/core/src/<Module>/Infrastructure/Persistence/Mapping/` (domaine sans attributs Doctrine), types `bsandoz_money` (centimes) et `bsandoz_tarifs` (JSON). Tarifs et options autorisées d'une prestation sont des colonnes JSON plutôt que des tables de liaison : le domaine reste en PHP pur (pas de collections Doctrine) et ils se lisent toujours avec la prestation.

Statuts réservation : `pending_payment` → `confirmed` → `done`, ou `cancelled`, `expired`, `no_show`.
Métier detailing (dans `apps/detailing/api`) : `vehicle_model` (brand, model, type).
