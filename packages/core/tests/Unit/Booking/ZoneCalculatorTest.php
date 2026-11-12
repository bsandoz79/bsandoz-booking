<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\PalierDeplacement;
use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\DomainError;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ZoneCalculatorTest extends TestCase
{
    // Zone fictive : 0,2° de latitude ≈ 22,24 km à vol d'oiseau, soit 28,9 km par la route (× 1,3).
    private const LAT = 45.0;
    private const LNG = 5.0;

    private Zone $zone;
    private ZoneCalculator $calculator;

    protected function setUp(): void
    {
        // Départ Amiens, 15 km gratuits, 0,50 €/km, 60 km maximum.
        $this->zone = new Zone(49.8941, 2.2958, 15, Money::cents(50), 60);
        $this->calculator = new ZoneCalculator();
    }

    private static function zone(float $freeRadiusKm = 15, int $pricePerKmCents = 50, float $maxDistanceKm = 60, float $roadFactor = 1.3, float $speed = 50): Zone
    {
        return new Zone(self::LAT, self::LNG, $freeRadiusKm, Money::cents($pricePerKmCents), $maxDistanceKm, $roadFactor, $speed);
    }

    public function testAdresseProcheSansFrais(): void
    {
        $quote = $this->calculator->quote($this->zone, 49.8941, 2.3100);
        self::assertTrue($quote->inZone);
        self::assertSame(0, $quote->travelFee->cents);
    }

    public function testAbbevilleAvecFraisKilometriques(): void
    {
        $quote = $this->calculator->quote($this->zone, 50.1054, 1.8332);
        self::assertTrue($quote->inZone);
        self::assertGreaterThan(0, $quote->travelFee->cents);
        self::assertGreaterThan(30, $quote->travelMinutes);
    }

    public function testHorsZone(): void
    {
        $quote = $this->calculator->quote($this->zone, 48.8566, 2.3522); // Paris
        self::assertFalse($quote->inZone);
        self::assertSame(0, $quote->travelFee->cents);
    }

    public function testAuPointDeDepart(): void
    {
        $quote = $this->calculator->quote(self::zone(), self::LAT, self::LNG);

        self::assertSame(0.0, $quote->distanceKm);
        self::assertTrue($quote->inZone);
        self::assertSame(0, $quote->travelFee->cents);
        self::assertSame(0, $quote->travelMinutes);
    }

    public function testDistanceRoutiereFraisEtTempsDeTrajet(): void
    {
        $quote = $this->calculator->quote(self::zone(), self::LAT + 0.2, self::LNG);

        self::assertSame(28.9, $quote->distanceKm, 'vol d\'oiseau × 1,3, arrondi à 100 m');
        self::assertSame(700, $quote->travelFee->cents, '28,9 − 15 = 13,9 → 14 km entamés × 0,50 €');
        self::assertSame(35, $quote->travelMinutes, '28,9 km à 50 km/h = 34,7 min, arrondi aux 5 min supérieures');
    }

    public function testCoefficientRoutier(): void
    {
        $quote = $this->calculator->quote(self::zone(roadFactor: 1.0), self::LAT + 0.2, self::LNG);

        self::assertSame(22.2, $quote->distanceKm);
        self::assertSame(400, $quote->travelFee->cents, '7,2 km → 8 km entamés');
        self::assertSame(30, $quote->travelMinutes);
    }

    public function testVitesseMoyenne(): void
    {
        self::assertSame(30, $this->calculator->quote(self::zone(speed: 60), self::LAT + 0.2, self::LNG)->travelMinutes);
    }

    public function testLimiteDuRayonGratuit(): void
    {
        self::assertSame(0, $this->calculator->quote(self::zone(freeRadiusKm: 28.9), self::LAT + 0.2, self::LNG)->travelFee->cents, 'pile au rayon : gratuit');
        self::assertSame(50, $this->calculator->quote(self::zone(freeRadiusKm: 28.8), self::LAT + 0.2, self::LNG)->travelFee->cents, '100 m au-delà : 1 km entamé');
    }

    public function testLimiteDeLaDistanceMaximale(): void
    {
        $pile = $this->calculator->quote(self::zone(maxDistanceKm: 28.9), self::LAT + 0.2, self::LNG);
        $audela = $this->calculator->quote(self::zone(maxDistanceKm: 28.8), self::LAT + 0.2, self::LNG);

        self::assertTrue($pile->inZone, 'pile à la distance maximale : dans la zone');
        self::assertSame(700, $pile->travelFee->cents);
        self::assertFalse($audela->inZone);
        self::assertSame(0, $audela->travelFee->cents);
        self::assertSame(28.9, $audela->distanceKm, 'distance et trajet restent renseignés hors zone');
        self::assertSame(35, $audela->travelMinutes);
    }

    public function testDeplacementGratuitSansPrixAuKilometre(): void
    {
        self::assertSame(0, $this->calculator->quote(self::zone(pricePerKmCents: 0), self::LAT + 0.2, self::LNG)->travelFee->cents);
    }

    public function testDistanceIdentiqueDansToutesLesDirections(): void
    {
        $nord = $this->calculator->quote(self::zone(), self::LAT + 0.1, self::LNG)->distanceKm;
        $sud = $this->calculator->quote(self::zone(), self::LAT - 0.1, self::LNG)->distanceKm;
        $est = $this->calculator->quote(self::zone(), self::LAT, self::LNG + 0.1)->distanceKm;
        $ouest = $this->calculator->quote(self::zone(), self::LAT, self::LNG - 0.1)->distanceKm;

        self::assertSame($nord, $sud);
        self::assertSame($est, $ouest);
        self::assertLessThan($nord, $est, 'un degré de longitude est plus court qu\'un degré de latitude à 45° N');
    }

    /** Tranches façon Abbeville : 5 km offerts, jusqu'à 15 km 5 €, 30 km 10 €, 50 km 20 €, puis 0,50 €/km jusqu'à 60 km. */
    private static function zoneParPaliers(): Zone
    {
        return new Zone(self::LAT, self::LNG, 5, Money::cents(50), 60, 1.0, 50, [
            new PalierDeplacement(15, Money::cents(500)),
            new PalierDeplacement(30, Money::cents(1000)),
            new PalierDeplacement(50, Money::cents(2000)),
        ]);
    }

    /** @return iterable<string, array{float, bool, int}> */
    public static function distancesParPaliers(): iterable
    {
        yield 'dans le rayon offert' => [3.0, true, 0];
        yield 'première tranche' => [10.0, true, 500];
        yield 'deuxième tranche' => [20.0, true, 1000];
        yield 'troisième tranche' => [40.0, true, 2000];
        yield 'au-delà de la dernière tranche : prix au km en plus' => [55.0, true, 2000 + 5 * 50];
        yield 'hors zone' => [70.0, false, 0];
    }

    #[DataProvider('distancesParPaliers')]
    public function testFraisParPaliers(float $km, bool $dansLaZone, int $fraisCents): void
    {
        $quote = $this->calculator->quote(self::zoneParPaliers(), self::LAT + $km / 111.195, self::LNG);

        self::assertEqualsWithDelta($km, $quote->distanceKm, 0.15);
        self::assertSame($dansLaZone, $quote->inZone);
        self::assertSame($fraisCents, $quote->travelFee->cents);
    }

    public function testPaliersDansLOrdreAuDelaDuRayonOffert(): void
    {
        $this->expectException(DomainError::class);
        new Zone(self::LAT, self::LNG, 5, Money::cents(0), 50, 1.0, 50, [new PalierDeplacement(30, Money::cents(1000)), new PalierDeplacement(15, Money::cents(500))]);
    }

    public function testPalierDansLeRayonOffertRefuse(): void
    {
        $this->expectException(DomainError::class);
        new Zone(self::LAT, self::LNG, 5, Money::cents(0), 50, 1.0, 50, [new PalierDeplacement(5, Money::cents(500))]);
    }
}
