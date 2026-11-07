<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Booking;

use Bsandoz\Core\Booking\Domain\Model\Zone;
use Bsandoz\Core\Booking\Domain\Service\ZoneCalculator;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class ZoneCalculatorTest extends TestCase
{
    private Zone $zone;

    protected function setUp(): void
    {
        // Départ Amiens, 15 km gratuits, 0,50 €/km, 60 km maximum.
        $this->zone = new Zone(49.8941, 2.2958, 15, Money::cents(50), 60);
    }

    public function testAdresseProcheSansFrais(): void
    {
        $quote = (new ZoneCalculator())->quote($this->zone, 49.8941, 2.3100);
        self::assertTrue($quote->inZone);
        self::assertSame(0, $quote->travelFee->cents);
    }

    public function testAbbevilleAvecFraisKilometriques(): void
    {
        $quote = (new ZoneCalculator())->quote($this->zone, 50.1054, 1.8332);
        self::assertTrue($quote->inZone);
        self::assertGreaterThan(0, $quote->travelFee->cents);
        self::assertGreaterThan(30, $quote->travelMinutes);
    }

    public function testHorsZone(): void
    {
        $quote = (new ZoneCalculator())->quote($this->zone, 48.8566, 2.3522); // Paris
        self::assertFalse($quote->inZone);
        self::assertSame(0, $quote->travelFee->cents);
    }
}
