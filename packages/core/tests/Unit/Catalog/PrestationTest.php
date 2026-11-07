<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class PrestationTest extends TestCase
{
    public function testPrixEtDureeParVarianteAvecRepliSurLeTarifDeBase(): void
    {
        $p = new Prestation('int', 'Intérieur', Money::cents(6900), 90);
        $p->addTarif(new Tarif('v-grand', Money::cents(8900), 120));

        self::assertSame(8900, $p->priceFor('v-grand')->cents);
        self::assertSame(120, $p->durationFor('v-grand'));
        self::assertSame(6900, $p->priceFor(null)->cents, 'sans variante');
        self::assertSame(90, $p->durationFor('inconnue'), 'variante sans tarif');
        self::assertSame(['v-grand'], array_keys($p->tarifs()));
    }

    public function testUnTarifRemplaceLeTarifDeLaMemeVariante(): void
    {
        $p = new Prestation('int', 'Intérieur', Money::cents(6900), 90);
        $p->addTarif(new Tarif('v', Money::cents(8000), 100));
        $p->addTarif(new Tarif('v', Money::cents(8500), 110));

        self::assertCount(1, $p->tarifs());
        self::assertSame(8500, $p->priceFor('v')->cents);
    }

    public function testOptionsAutoriseesSansDoublon(): void
    {
        $o = new Option('o-1', 'Option', Money::cents(1500), 30);
        $p = new Prestation('int', 'Intérieur', Money::cents(6900), 90);
        $p->addOption($o);
        $p->addOption($o);

        self::assertSame(['o-1'], $p->optionIds());
        self::assertTrue($p->allowsOption('o-1'));
        self::assertFalse($p->allowsOption('o-2'));
    }

    public function testExposeSesDonnees(): void
    {
        $p = new Prestation('int', 'Intérieur', Money::cents(6900), 90, 'Description', false, 'cat-1', 3);

        self::assertSame('int', $p->id());
        self::assertSame('Intérieur', $p->name());
        self::assertSame('Description', $p->description());
        self::assertSame(6900, $p->basePrice()->cents);
        self::assertSame(90, $p->baseDurationMin());
        self::assertFalse($p->isActive());
        self::assertSame('cat-1', $p->categoryId());
        self::assertSame(3, $p->position());
    }
}
