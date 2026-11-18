<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Integration\Carte;

use Bsandoz\Core\Carte\Application\GererCarte;
use Bsandoz\Core\Carte\Infrastructure\Persistence\DoctrineArticles;
use Bsandoz\Core\Carte\Infrastructure\Persistence\DoctrineCategories;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use Bsandoz\Core\Tests\Integration\DoctrineTestCase;

final class DoctrineCarteTest extends DoctrineTestCase
{
    public function testPrixBarreNouveauEtEpuiseSontGardesEnBase(): void
    {
        $clock = new FrozenClock('2026-03-01 12:00:00');
        $carte = new GererCarte(new DoctrineCategories($this->em), new DoctrineArticles($this->em), $clock, new SequenceIdGenerator());
        $r = $carte->ajouterRubrique('Sandwichs');
        $a = $carte->ajouterArticle($r->id(), 'Kebab', 'Poulet-dinde', 550, true, 'kebab.webp');
        $clock->set('2026-03-05 12:00:00');
        $carte->modifierArticle($a->id(), $r->id(), 'Kebab', 'Poulet-dinde', 600, true, 'kebab.webp');
        $carte->epuiser($a->id(), true);
        $this->reload();

        $relue = (new GererCarte(new DoctrineCategories($this->em), new DoctrineArticles($this->em), $clock, new SequenceIdGenerator()))->publique();
        self::assertSame('Sandwichs', $relue[0]['nom']);
        $kebab = $relue[0]['articles'][0];
        self::assertSame([600, 550, true, true, 'kebab.webp'], [$kebab['prixCents'], $kebab['prixBarreCents'], $kebab['nouveau'], $kebab['epuise'], $kebab['photo']]);
    }
}
