<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Catalog;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Catalog\Domain\Model\Tarif;
use Bsandoz\Core\Catalog\Infrastructure\Persistence\DoctrineOptionRepository;
use Bsandoz\Core\Catalog\Infrastructure\Persistence\DoctrinePrestationRepository;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineCatalogRepositoriesTest extends DoctrineTestCase
{
    private DoctrinePrestationRepository $prestations;
    private DoctrineOptionRepository $options;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prestations = new DoctrinePrestationRepository($this->em);
        $this->options = new DoctrineOptionRepository($this->em);
    }

    public function testEnregistreEtRelitUnePrestationAvecTarifsEtOptions(): void
    {
        $option = new Option('o-1', 'Option A', Money::cents(1500), 30, true, 'Description A');
        $this->options->save($option);

        $p = new Prestation('p-1', 'Prestation', Money::cents(6900), 90, 'Description', true, 'cat-1', 2, true);
        $p->addTarif(new Tarif('v-1', Money::cents(7900), 105));
        $p->addTarif(new Tarif('v-2', Money::cents(8900), 120));
        $p->addOption($option);
        $this->prestations->save($p);
        $this->reload();

        $relue = $this->prestations->get('p-1');
        self::assertNotSame($p, $relue);
        self::assertSame('Prestation', $relue->name());
        self::assertSame('Description', $relue->description());
        self::assertSame(6900, $relue->basePrice()->cents);
        self::assertSame(90, $relue->baseDurationMin());
        self::assertSame('cat-1', $relue->categoryId());
        self::assertSame(2, $relue->position());
        self::assertTrue($relue->occupePlage());
        self::assertSame(['v-1', 'v-2'], array_keys($relue->tarifs()));
        self::assertSame(8900, $relue->priceFor('v-2')->cents);
        self::assertSame(120, $relue->durationFor('v-2'));
        self::assertSame(['o-1'], $relue->optionIds());

        $optionRelue = $this->options->get('o-1');
        self::assertSame('Description A', $optionRelue->description);
        self::assertSame(1500, $optionRelue->price->cents);
        self::assertSame(30, $optionRelue->durationMin);
    }

    public function testPrestationSansTarifNiOption(): void
    {
        $this->prestations->save(new Prestation('p-1', 'Simple', Money::cents(5000), 60));
        $this->reload();

        $relue = $this->prestations->get('p-1');
        self::assertSame([], $relue->tarifs());
        self::assertSame([], $relue->optionIds());
    }

    public function testPrestationsActivesTrieesParPositionPuisNom(): void
    {
        $this->prestations->save(new Prestation('c', 'Charlie', Money::cents(1000), 30, position: 1));
        $this->prestations->save(new Prestation('b', 'Bravo', Money::cents(1000), 30, position: 0));
        $this->prestations->save(new Prestation('a', 'Alpha', Money::cents(1000), 30, position: 1));
        $this->prestations->save(new Prestation('x', 'Inactive', Money::cents(1000), 30, active: false));
        $this->reload();

        $ids = array_map(static fn (Prestation $p): string => $p->id(), $this->prestations->allActive());
        self::assertSame(['b', 'a', 'c'], $ids);
    }

    public function testSuppression(): void
    {
        $this->prestations->save(new Prestation('p-1', 'Simple', Money::cents(5000), 60));
        $this->prestations->remove($this->prestations->get('p-1'));

        $this->expectException(NotFound::class);
        $this->prestations->get('p-1');
    }

    public function testPrestationIntrouvable(): void
    {
        $this->expectException(NotFound::class);
        $this->prestations->get('inconnue');
    }

    public function testOptionsDemandeesDansLeMemeOrdreSansDoublon(): void
    {
        $this->options->save(new Option('o-1', 'Un', Money::cents(100), 5));
        $this->options->save(new Option('o-2', 'Deux', Money::cents(200), 10));
        $this->reload();

        $ids = array_map(static fn (Option $o): string => $o->id, $this->options->getMany(['o-2', 'o-1', 'o-2']));
        self::assertSame(['o-2', 'o-1'], $ids);
        self::assertSame([], $this->options->getMany([]));
    }

    public function testOptionInconnueDansUneListe(): void
    {
        $this->options->save(new Option('o-1', 'Un', Money::cents(100), 5));

        $this->expectException(NotFound::class);
        $this->options->getMany(['o-1', 'inconnue']);
    }

    public function testOptionsActivesTrieesParNom(): void
    {
        $this->options->save(new Option('o-1', 'Zeta', Money::cents(100), 5));
        $this->options->save(new Option('o-2', 'Alpha', Money::cents(100), 5));
        $this->options->save(new Option('o-3', 'Inactive', Money::cents(100), 5, active: false));
        $this->reload();

        $ids = array_map(static fn (Option $o): string => $o->id, $this->options->allActive());
        self::assertSame(['o-2', 'o-1'], $ids);
    }
}
