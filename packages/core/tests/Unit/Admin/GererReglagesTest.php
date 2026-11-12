<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Admin;

use Bsandoz\Core\Admin\Application\GererReglages;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Booking\Infrastructure\Settings\DatabaseSettingsProvider;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Tests\Double\InMemorySettingRepository;
use PHPUnit\Framework\TestCase;

final class GererReglagesTest extends TestCase
{
    private DatabaseSettingsProvider $settings;
    private GererReglages $reglages;

    protected function setUp(): void
    {
        $repository = new InMemorySettingRepository();
        $defaut = new ConfiguredSettingsProvider(
            ['min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 15, 'slot_step_min' => 30, 'free_cancel_hours' => 48, 'deposit_percent' => 30, 'deposit_fixed_cents' => null, 'hold_minutes' => 10],
            ['origin_lat' => 49.89, 'origin_lng' => 2.29, 'free_radius_km' => 15.0, 'price_per_km_cents' => 50, 'max_distance_km' => 60.0, 'road_factor' => 1.3, 'average_speed_kmh' => 50.0],
            'Europe/Paris',
        );
        $this->settings = new DatabaseSettingsProvider($repository, $defaut);
        $this->reglages = new GererReglages($this->settings, $repository);
    }

    /** @return array<string, int|null> */
    private static function regles(): array
    {
        return ['minNoticeHours' => 12, 'horizonDays' => 30, 'bufferMin' => 0, 'slotStepMin' => 15, 'freeCancelHours' => 24, 'depositPercent' => null, 'depositFixedCents' => 2000, 'holdMinutes' => 15];
    }

    public function testValeursDeLaConfigurationTantQueRienNEstRegle(): void
    {
        $lu = $this->reglages->lire();

        self::assertSame(24, $lu['rules']['minNoticeHours']);
        self::assertSame(30, $lu['rules']['depositPercent']);
        self::assertSame(49.89, $lu['zone']['originLat'] ?? null);
        self::assertSame('Europe/Paris', $lu['timezone']);
    }

    public function testReglesModifieesParLePro(): void
    {
        $this->reglages->modifierRegles(self::regles());

        self::assertSame(self::regles(), $this->reglages->lire()['rules']);
        self::assertSame(2000, $this->settings->rules()->depositFixedCents, 'pris en compte par les réservations');
        self::assertSame(15, $this->settings->rules()->slotStepMin);
    }

    public function testReglesIncoherentesRefusees(): void
    {
        $regles = self::regles();
        $regles['depositPercent'] = 150;

        $this->expectException(DomainError::class);
        $this->reglages->modifierRegles($regles);
    }

    public function testValeurManquanteRefusee(): void
    {
        $regles = self::regles();
        unset($regles['holdMinutes']);

        $this->expectException(DomainError::class);
        $this->reglages->modifierRegles($regles);
    }

    public function testZoneModifiee(): void
    {
        $this->reglages->modifierZone(['originLat' => 48.85, 'originLng' => 2.35, 'freeRadiusKm' => 10, 'pricePerKmCents' => 40, 'maxDistanceKm' => 40]);

        $zone = $this->settings->zone();
        self::assertNotNull($zone);
        self::assertSame(48.85, $zone->originLat);
        self::assertSame(40, $zone->pricePerKm->cents);
        self::assertSame(1.3, $zone->roadFactor, 'valeur par défaut');
    }

    public function testPassageEnActiviteSurPlace(): void
    {
        $this->reglages->modifierZone(null);

        self::assertNull($this->settings->zone());
        self::assertNull($this->reglages->lire()['zone']);
    }

    public function testZoneIncoherenteRefusee(): void
    {
        $this->expectException(DomainError::class);
        $this->reglages->modifierZone(['originLat' => 120, 'originLng' => 2.35, 'freeRadiusKm' => 10, 'pricePerKmCents' => 40, 'maxDistanceKm' => 40]);
    }
}
