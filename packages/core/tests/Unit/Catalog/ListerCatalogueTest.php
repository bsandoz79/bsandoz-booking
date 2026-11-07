<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Catalog\Application\ListerCatalogue;
use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use PHPUnit\Framework\TestCase;

final class ListerCatalogueTest extends TestCase
{
    public function testFormulesActivesAvecTarifsEtOptionsProposees(): void
    {
        $o1 = new Option('o-1', 'Option B', Money::cents(1500), 30, true, 'Desc B');
        $o2 = new Option('o-2', 'Option A', Money::cents(2000), 15, true, 'Desc A');
        $orpheline = new Option('o-3', 'Non proposée', Money::cents(900), 10);
        $inactive = new Option('o-4', 'Inactive', Money::cents(900), 10, active: false);

        $p1 = new Prestation('p-1', 'Première', Money::cents(6900), 90, 'Description 1', true, 'cat-1', 0);
        $p1->addTarif(new Tarif('v-1', Money::cents(7900), 105));
        $p1->addOption($o1);
        $p1->addOption($inactive);
        $p2 = new Prestation('p-2', 'Deuxième', Money::cents(4900), 60, position: 1, occupePlage: true);
        $p2->addOption($o2);
        $masquee = new Prestation('p-3', 'Masquée', Money::cents(100), 10, active: false);
        $masquee->addOption($orpheline);

        $catalogue = (new ListerCatalogue(
            new InMemoryPrestationRepository($p2, $p1, $masquee),
            new InMemoryOptionRepository($o1, $o2, $orpheline, $inactive),
        ))();

        self::assertSame([
            [
                'id' => 'p-1',
                'category' => 'cat-1',
                'name' => 'Première',
                'description' => 'Description 1',
                'basePriceCents' => 6900,
                'baseDurationMin' => 90,
                'occupePlage' => false,
                'tarifs' => ['v-1' => ['priceCents' => 7900, 'durationMin' => 105]],
                'optionIds' => ['o-1'],
            ],
            [
                'id' => 'p-2',
                'category' => null,
                'name' => 'Deuxième',
                'description' => '',
                'basePriceCents' => 4900,
                'baseDurationMin' => 60,
                'occupePlage' => true,
                'tarifs' => [],
                'optionIds' => ['o-2'],
            ],
        ], $catalogue['formules']);

        self::assertSame([
            ['id' => 'o-2', 'name' => 'Option A', 'description' => 'Desc A', 'priceCents' => 2000, 'durationMin' => 15],
            ['id' => 'o-1', 'name' => 'Option B', 'description' => 'Desc B', 'priceCents' => 1500, 'durationMin' => 30],
        ], $catalogue['options'], 'options actives proposées, triées par nom');
    }

    public function testCatalogueVide(): void
    {
        self::assertSame(
            ['formules' => [], 'options' => []],
            (new ListerCatalogue(new InMemoryPrestationRepository(), new InMemoryOptionRepository()))(),
        );
    }
}
