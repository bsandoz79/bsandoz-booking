<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Application\EstimerDeplacement;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Shared\Domain\DomainError;
use PHPUnit\Framework\TestCase;

final class EstimerDeplacementTest extends TestCase
{
    private const REGLES = [
        'min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 0, 'slot_step_min' => 30,
        'free_cancel_hours' => 48, 'deposit_percent' => 30, 'deposit_fixed_cents' => null, 'hold_minutes' => 10,
    ];

    private function estimer(bool $surPlace = false): EstimerDeplacement
    {
        $zone = $surPlace ? null : [
            'origin_lat' => 50.1054, 'origin_lng' => 1.8357, 'free_radius_km' => 5.0, 'price_per_km_cents' => 0,
            'max_distance_km' => 50.0, 'road_factor' => 1.3, 'average_speed_kmh' => 50.0,
            'paliers' => [['jusqua_km' => 15.0, 'prix_cents' => 500], ['jusqua_km' => 30.0, 'prix_cents' => 1000], ['jusqua_km' => 50.0, 'prix_cents' => 2000]],
        ];

        return new EstimerDeplacement(new ConfiguredSettingsProvider(self::REGLES, $zone, 'Europe/Paris'), new ZoneCalculator());
    }

    public function testFraisSelonLaDistanceDepuisLePointDeDepart(): void
    {
        $surPlace = ($this->estimer())(50.1054, 1.8357);
        self::assertNotNull($surPlace);
        self::assertSame(0, $surPlace->travelFee->cents);

        // Saint-Valery-sur-Somme : environ 16 km à vol d'oiseau, soit environ 21 km de route → tranche 15-30 km.
        $saintValery = ($this->estimer())(50.1858, 1.6328);
        self::assertNotNull($saintValery);
        self::assertTrue($saintValery->inZone);
        self::assertSame(1000, $saintValery->travelFee->cents);

        // Amiens : hors zone.
        $amiens = ($this->estimer())(49.8941, 2.2958);
        self::assertNotNull($amiens);
        self::assertFalse($amiens->inZone);
    }

    public function testRienAEstimerSurPlaceEtPositionInvalideRefusee(): void
    {
        self::assertNull(($this->estimer(true))(50.1, 1.8));
        $this->expectException(DomainError::class);
        ($this->estimer())(120.0, 1.8);
    }
}
