<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use PHPUnit\Framework\TestCase;

final class ConfiguredSettingsProviderTest extends TestCase
{
    public function testConstruitReglesZoneEtFuseauDepuisLaConfiguration(): void
    {
        $settings = new ConfiguredSettingsProvider(
            [
                'min_notice_hours' => 12, 'horizon_days' => 30, 'buffer_min' => 10, 'slot_step_min' => 15,
                'free_cancel_hours' => 24, 'deposit_percent' => null, 'deposit_fixed_cents' => 3000, 'hold_minutes' => 5,
            ],
            [
                'origin_lat' => 48.85, 'origin_lng' => 2.35, 'free_radius_km' => 10.0,
                'price_per_km_cents' => 40, 'max_distance_km' => 50.0, 'road_factor' => 1.2, 'average_speed_kmh' => 40.0,
            ],
            'Europe/Paris',
        );

        $rules = $settings->rules();
        self::assertSame(12, $rules->minNoticeHours);
        self::assertSame(30, $rules->horizonDays);
        self::assertSame(10, $rules->bufferMin);
        self::assertSame(15, $rules->slotStepMin);
        self::assertSame(24, $rules->freeCancelHours);
        self::assertNull($rules->depositPercent);
        self::assertSame(3000, $rules->depositFixedCents);
        self::assertSame(5, $rules->holdMinutes);

        $zone = $settings->zone();
        self::assertSame(48.85, $zone->originLat);
        self::assertSame(2.35, $zone->originLng);
        self::assertSame(10.0, $zone->freeRadiusKm);
        self::assertSame(40, $zone->pricePerKm->cents);
        self::assertSame(50.0, $zone->maxDistanceKm);
        self::assertSame(1.2, $zone->roadFactor);
        self::assertSame(40.0, $zone->averageSpeedKmh);

        self::assertSame('Europe/Paris', $settings->timezone()->getName());
    }
}
