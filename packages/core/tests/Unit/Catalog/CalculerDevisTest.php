<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Booking\Infrastructure\Settings\ConfiguredSettingsProvider;
use Bsandoz\Core\Catalog\Application\CalculerDevis;
use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Catalog\Domain\Port\VarianteResolver;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use PHPUnit\Framework\TestCase;

final class CalculerDevisTest extends TestCase
{
    private const ORIGIN_LAT = 45.0;
    private const ORIGIN_LNG = 5.0;

    /**
     * @param int|null $depositPercent
     */
    private function calculer(?int $depositPercent = 30, ?int $depositFixedCents = null): CalculerDevis
    {
        $o1 = new Option('o-1', 'Option un', Money::cents(1500), 30);
        $o2 = new Option('o-2', 'Option deux', Money::cents(2000), 15);
        $horsPrestation = new Option('o-3', 'Option ailleurs', Money::cents(900), 10);

        $p = new Prestation('p-1', 'Prestation', Money::cents(6900), 90);
        $p->addTarif(new Tarif('v-grand', Money::cents(8900), 120));
        $p->addOption($o1);
        $p->addOption($o2);
        $inactive = new Prestation('p-off', 'Inactive', Money::cents(1000), 30, active: false);

        // Résolveur métier factice : la variante se lit dans metierData['taille'].
        $resolver = new class implements VarianteResolver {
            public function resolve(array $metierData): ?string
            {
                return isset($metierData['taille']) && is_string($metierData['taille']) ? 'v-' . $metierData['taille'] : null;
            }
        };

        $settings = new ConfiguredSettingsProvider(
            [
                'min_notice_hours' => 24, 'horizon_days' => 60, 'buffer_min' => 15, 'slot_step_min' => 30,
                'free_cancel_hours' => 48, 'deposit_percent' => $depositPercent, 'deposit_fixed_cents' => $depositFixedCents, 'hold_minutes' => 10,
            ],
            [
                'origin_lat' => self::ORIGIN_LAT, 'origin_lng' => self::ORIGIN_LNG, 'free_radius_km' => 15.0,
                'price_per_km_cents' => 50, 'max_distance_km' => 60.0, 'road_factor' => 1.3, 'average_speed_kmh' => 50.0,
            ],
            'Europe/Paris',
        );

        return new CalculerDevis(
            new InMemoryPrestationRepository($p, $inactive),
            new InMemoryOptionRepository($o1, $o2, $horsPrestation),
            $resolver,
            new ZoneCalculator(),
            $settings,
            new PrixCalculator(),
        );
    }

    public function testSansAdresseNiVarianteTarifDeBase(): void
    {
        $devis = ($this->calculer())('p-1', [], [], null, null);

        self::assertNull($devis->variante);
        self::assertSame(6900, $devis->total->cents);
        self::assertSame(2070, $devis->deposit->cents);
        self::assertSame(90, $devis->durationMin);
        self::assertSame(0, $devis->travelFee->cents);
        self::assertTrue($devis->inZone);
        self::assertNull($devis->distanceKm);
        self::assertSame(0, $devis->travelMinutes);
    }

    public function testVarianteDeduiteDesDonneesMetierEtOptions(): void
    {
        $devis = ($this->calculer())('p-1', ['o-1', 'o-2'], ['taille' => 'grand'], null, null);

        self::assertSame('v-grand', $devis->variante);
        self::assertSame(8900 + 1500 + 2000, $devis->total->cents);
        self::assertSame(120 + 30 + 15, $devis->durationMin);
        self::assertSame(['Prestation', 'Option un', 'Option deux'], array_column($devis->lines, 'label'));
    }

    public function testVarianteExpliciteSiLeMetierNeTranchePas(): void
    {
        $devis = ($this->calculer())('p-1', [], [], null, null, 'v-grand');

        self::assertSame('v-grand', $devis->variante);
        self::assertSame(8900, $devis->total->cents);
    }

    public function testLeMetierEstPrioritaireSurLaVarianteExplicite(): void
    {
        $devis = ($this->calculer())('p-1', [], ['taille' => 'grand'], null, null, 'v-autre');

        self::assertSame('v-grand', $devis->variante);
    }

    public function testAdresseDansLeRayonGratuit(): void
    {
        $devis = ($this->calculer())('p-1', [], [], self::ORIGIN_LAT, self::ORIGIN_LNG);

        self::assertTrue($devis->inZone);
        self::assertSame(0.0, $devis->distanceKm);
        self::assertSame(0, $devis->travelFee->cents);
        self::assertSame(6900, $devis->total->cents);
    }

    public function testAdresseAuDelaDuRayonGratuitAvecFraisKilometriques(): void
    {
        // 0,2° de latitude ≈ 22,2 km à vol d'oiseau × 1,3 = 28,9 km → 14 km facturés × 0,50 €.
        $devis = ($this->calculer())('p-1', [], [], self::ORIGIN_LAT + 0.2, self::ORIGIN_LNG);

        self::assertTrue($devis->inZone);
        self::assertSame(28.9, $devis->distanceKm);
        self::assertSame(700, $devis->travelFee->cents);
        self::assertSame(35, $devis->travelMinutes);
        self::assertSame(6900 + 700, $devis->total->cents);
        self::assertSame('Frais de déplacement', $devis->lines[1]['label']);
    }

    public function testAdresseHorsZoneSansFrais(): void
    {
        $devis = ($this->calculer())('p-1', [], [], self::ORIGIN_LAT + 1.0, self::ORIGIN_LNG);

        self::assertFalse($devis->inZone);
        self::assertSame(0, $devis->travelFee->cents);
        self::assertSame(6900, $devis->total->cents);
    }

    public function testAcompteFixePlafonneAuTotal(): void
    {
        self::assertSame(5000, ($this->calculer(null, 5000))('p-1', [], [], null, null)->deposit->cents);
        self::assertSame(6900, ($this->calculer(null, 99900))('p-1', [], [], null, null)->deposit->cents);
        self::assertSame(0, ($this->calculer(null, null))('p-1', [], [], null, null)->deposit->cents);
    }

    public function testPrestationInconnue(): void
    {
        $this->expectException(NotFound::class);
        ($this->calculer())('inconnue', [], [], null, null);
    }

    public function testPrestationInactive(): void
    {
        $this->expectException(DomainError::class);
        ($this->calculer())('p-off', [], [], null, null);
    }

    public function testOptionInconnue(): void
    {
        $this->expectException(NotFound::class);
        ($this->calculer())('p-1', ['inconnue'], [], null, null);
    }

    public function testOptionNonAutoriseePourLaPrestation(): void
    {
        $this->expectException(DomainError::class);
        ($this->calculer())('p-1', ['o-3'], [], null, null);
    }
}
