<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Catalog\Domain\Service\PrixCalculator;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class PrixCalculatorTest extends TestCase
{
    public function testPrixParVarianteOptionsFraisEtAcompte(): void
    {
        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1500), 30);
        $p = new Prestation('int', 'Nettoyage intérieur', Money::cents(7900), 120);
        $p->addTarif(new Tarif('suv', Money::cents(9900), 150));
        $p->addOption($poils);

        $devis = (new PrixCalculator())->calculer($p, 'suv', [$poils], Money::cents(1200), 30, null);

        self::assertSame(12600, $devis->total->cents);
        self::assertSame(3780, $devis->deposit->cents);
        self::assertSame(180, $devis->durationMin);
        self::assertCount(3, $devis->lines);
    }

    public function testRefuseUneOptionNonAutorisee(): void
    {
        $p = new Prestation('ext', 'Extérieur', Money::cents(5900), 90);
        $this->expectException(DomainError::class);
        (new PrixCalculator())->calculer($p, null, [new Option('x', 'Moteur', Money::cents(2000), 30)], Money::zero(), 30, null);
    }

    public function testPlusieursVehiculesMemeFormuleEtOptionsParVehicule(): void
    {
        $poils = new Option('poils', 'Poils d\'animaux', Money::cents(1000), 30);
        $sale = new Option('sale', 'Très sale', Money::cents(1000), 20);
        $p = new Prestation('int', 'Éclat', Money::cents(2900), 90);
        $p->addOption($poils);
        $p->addOption($sale);

        // 3 véhicules : poils sur 2 d'entre eux, très sale sur 1 ; déplacement compté une fois.
        $devis = (new PrixCalculator())->calculer($p, null, [$poils, $sale, $poils], Money::cents(500), 30, null, 3);

        self::assertSame([['Éclat × 3', 8700], ['Poils d\'animaux × 2', 2000], ['Très sale', 1000], ['Frais de déplacement', 500]],
            array_map(static fn (array $l): array => [$l['label'], $l['price']->cents], $devis->lines));
        self::assertSame(12200, $devis->total->cents);
        self::assertSame(90 * 3 + 30 * 2 + 20, $devis->durationMin);
    }

    public function testUneOptionAuPlusUneFoisParVehicule(): void
    {
        $poils = new Option('poils', 'Poils', Money::cents(1000), 30);
        $p = new Prestation('int', 'Éclat', Money::cents(2900), 90);
        $p->addOption($poils);
        $this->expectException(DomainError::class);
        (new PrixCalculator())->calculer($p, null, [$poils, $poils], Money::zero(), 30, null, 1);
    }

    public function testQuantiteLimitee(): void
    {
        $this->expectException(DomainError::class);
        (new PrixCalculator())->calculer(new Prestation('int', 'Éclat', Money::cents(2900), 90), null, [], Money::zero(), 30, null, 6);
    }
}
