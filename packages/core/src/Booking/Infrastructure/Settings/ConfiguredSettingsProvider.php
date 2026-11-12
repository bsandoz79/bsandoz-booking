<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Infrastructure\Settings;

use Bsandoz\Core\Booking\Domain\Model\BookingRules;
use Bsandoz\Core\Booking\Domain\Model\PalierDeplacement;
use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Booking\Domain\Port\SettingsProvider;
use Bsandoz\Core\Shared\Domain\Money;

/**
 * Règles et zone lues dans la configuration de l'application (config/packages/bsandoz_core.yaml).
 * Sans zone : activité sur place (ni trajet ni frais de déplacement).
 * Remplacé par des paramètres modifiables dans l'espace pro (branche feature/core-admin).
 *
 * @phpstan-type RulesConfig array{min_notice_hours: int, horizon_days: int, buffer_min: int, slot_step_min: int, free_cancel_hours: int, deposit_percent: int|null, deposit_fixed_cents: int|null, hold_minutes: int}
 * @phpstan-type ZoneConfig array{origin_lat: float, origin_lng: float, free_radius_km: float, price_per_km_cents: int, max_distance_km: float, road_factor: float, average_speed_kmh: float, paliers?: list<array{jusqua_km: float, prix_cents: int}>}
 */
final class ConfiguredSettingsProvider implements SettingsProvider
{
    private BookingRules $rules;
    private ?Zone $zone = null;
    private \DateTimeZone $timezone;

    /**
     * @param RulesConfig $rules
     * @param ZoneConfig|null $zone null : activité sur place
     */
    public function __construct(array $rules, ?array $zone, string $timezone)
    {
        $this->rules = new BookingRules(
            minNoticeHours: $rules['min_notice_hours'],
            horizonDays: $rules['horizon_days'],
            bufferMin: $rules['buffer_min'],
            slotStepMin: $rules['slot_step_min'],
            freeCancelHours: $rules['free_cancel_hours'],
            depositPercent: $rules['deposit_percent'],
            depositFixedCents: $rules['deposit_fixed_cents'],
            holdMinutes: $rules['hold_minutes'],
        );
        $this->zone = $zone === null ? null : new Zone(
            originLat: $zone['origin_lat'],
            originLng: $zone['origin_lng'],
            freeRadiusKm: $zone['free_radius_km'],
            pricePerKm: Money::cents($zone['price_per_km_cents']),
            maxDistanceKm: $zone['max_distance_km'],
            roadFactor: $zone['road_factor'],
            averageSpeedKmh: $zone['average_speed_kmh'],
            paliers: array_map(static fn (array $p): PalierDeplacement => new PalierDeplacement($p['jusqua_km'], Money::cents($p['prix_cents'])), $zone['paliers'] ?? []),
        );
        $this->timezone = new \DateTimeZone($timezone);
    }

    public function rules(): BookingRules
    {
        return $this->rules;
    }

    public function zone(): ?Zone
    {
        return $this->zone;
    }

    public function timezone(): \DateTimeZone
    {
        return $this->timezone;
    }
}
