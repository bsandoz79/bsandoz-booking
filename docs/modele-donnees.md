# Modèle de données (une base par client)

| Table | Module | Champs principaux |
| --- | --- | --- |
| user | Auth | id UUID, email unique, password nullable, roles, status (pending/active), firstname, lastname, phone (chiffré), created_at |
| auth_token | Auth | user_id, type (activation/reset/manage), token_hash, expires_at, used_at |
| refresh_token | Auth | user_id, token_hash, expires_at |
| category | Catalog | name, position |
| prestation | Catalog | category_id, name, description, photo, base_duration_min, base_price_cents, active, position |
| option | Catalog | name, price_cents, duration_min, active |
| prestation_option | Catalog | prestation_id, option_id |
| tarif | Catalog | prestation_id, variante, price_cents, duration_min |
| opening_hour | Booking | weekday (1-7), starts_at, ends_at |
| unavailability | Booking | starts_at, ends_at, reason |
| booking_rule | Booking | min_notice_hours, horizon_days, buffer_min, slot_step_min, free_cancel_hours, deposit_percent, deposit_fixed_cents |
| zone | Booking | origin_label, origin_lat, origin_lng, free_radius_km, price_per_km_cents, max_distance_km |
| reservation | Booking | user_id, prestation_id, variante, starts_at, ends_at, address (chiffrée), lat, lng, distance_km, travel_fee_cents, total_cents, deposit_cents, status, hold_expires_at, notes, metier_data JSON |
| reservation_option | Booking | reservation_id, option_id, price_cents |
| payment | Payment | reservation_id, provider_session_id, amount_cents, status, refunded_cents |
| notification | Notification | type, recipient, reservation_id, scheduled_at, sent_at |
| push_subscription | Notification | user_id, endpoint, p256dh, auth |
| setting | Admin | key, value JSON |
| audit_log | Admin | user_id, action, target, created_at, ip |

Statuts réservation : `pending_payment` → `confirmed` → `done`, ou `cancelled`, `expired`, `no_show`.
Métier detailing (dans `apps/detailing/api`) : `vehicle_model` (brand, model, type).
