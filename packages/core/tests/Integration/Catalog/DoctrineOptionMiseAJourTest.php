<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Catalog;

use Bsandoz\Core\Catalog\Domain\Model\Option;
use Bsandoz\Core\Catalog\Infrastructure\Persistence\DoctrineOptionRepository;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

/** Une option (propriétés en lecture seule) est remplacée par une nouvelle instance du même identifiant. */
final class DoctrineOptionMiseAJourTest extends DoctrineTestCase
{
    public function testRemplacerUneOptionExistante(): void
    {
        $repository = new DoctrineOptionRepository($this->em);
        $repository->save(new Option('o-1', 'Avant', Money::cents(1000), 10));

        $repository->save(new Option('o-1', 'Après', Money::cents(2500), 25, false, 'Nouvelle description'));
        $this->reload();

        $option = $repository->get('o-1');
        self::assertSame('Après', $option->name);
        self::assertSame(2500, $option->price->cents);
        self::assertSame(25, $option->durationMin);
        self::assertFalse($option->active);
        self::assertSame('Nouvelle description', $option->description);
        self::assertCount(1, $repository->all());
    }

    public function testToutesLesOptionsMemeInactives(): void
    {
        $repository = new DoctrineOptionRepository($this->em);
        $repository->save(new Option('o-1', 'B', Money::cents(100), 5));
        $repository->save(new Option('o-2', 'A', Money::cents(100), 5, false));
        $this->reload();

        self::assertSame(['o-2', 'o-1'], array_map(static fn (Option $o): string => $o->id, $repository->all()));
    }
}
