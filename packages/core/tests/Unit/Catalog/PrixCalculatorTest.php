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
}
