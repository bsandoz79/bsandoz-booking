<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Carte;

use Bsandoz\Core\Carte\Application\GererCarte;
use Bsandoz\Core\Shared\Domain\Conflit;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\NotFound;
use Bsandoz\Core\Shared\Infrastructure\FrozenClock;
use Bsandoz\Core\Tests\Double\InMemoryArticlesCarte;
use Bsandoz\Core\Tests\Double\InMemoryCategoriesCarte;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

final class GererCarteTest extends TestCase
{
    private FrozenClock $clock;
    private GererCarte $carte;

    protected function setUp(): void
    {
        $this->clock = new FrozenClock('2026-03-01 12:00:00');
        $this->carte = new GererCarte(new InMemoryCategoriesCarte(), new InMemoryArticlesCarte(), $this->clock, new SequenceIdGenerator());
    }

    public function testCartePubliqueDansLOrdreAvecPrixBarreNouveauEtEpuise(): void
    {
        $sandwichs = $this->carte->ajouterRubrique('Sandwichs');
        $boissons = $this->carte->ajouterRubrique('Boissons');
        $this->carte->ajouterRubrique('Desserts'); // vide : absente de la carte publique
        $kebab = $this->carte->ajouterArticle($sandwichs->id(), 'Kebab', 'Poulet-dinde', 550);
        $this->carte->ajouterArticle($sandwichs->id(), 'Steak', '', 500);
        $this->carte->ajouterArticle($boissons->id(), 'Canette 33 cl', '', 150);
        $this->carte->ajouterArticle($boissons->id(), 'Boisson cachée', '', 100, false);

        $this->clock->set('2026-04-15 12:00:00'); // plus « Nouveau »
        $this->carte->modifierArticle($kebab->id(), $sandwichs->id(), 'Kebab', 'Poulet-dinde', 600, true, null);
        $this->carte->epuiser($kebab->id(), true);

        $carte = $this->carte->publique();
        self::assertSame(['Sandwichs', 'Boissons'], array_column($carte, 'nom'));
        self::assertSame(['Kebab', 'Steak'], array_column($carte[0]['articles'], 'nom'));
        self::assertSame([600, 550, false, true], [$carte[0]['articles'][0]['prixCents'], $carte[0]['articles'][0]['prixBarreCents'], $carte[0]['articles'][0]['nouveau'], $carte[0]['articles'][0]['epuise']]);
        self::assertSame(['Canette 33 cl'], array_column($carte[1]['articles'], 'nom'), 'article caché absent de la carte publique');
        self::assertCount(3, $this->carte->pro(), 'l’espace pro voit toutes les rubriques');
        self::assertCount(2, $this->carte->pro()[1]['articles'], 'et les articles cachés');
    }

    public function testUnNouvelArticleEstNouveauEtEpuiseRevientLeLendemain(): void
    {
        $r = $this->carte->ajouterRubrique('Viandes');
        $a = $this->carte->ajouterArticle($r->id(), 'Agneau', '', 700);
        self::assertTrue($this->carte->vueArticle($a)['nouveau']);

        $this->clock->set('2026-03-01 21:00:00'); // 22 h à Paris
        $this->carte->epuiser($a->id(), true);
        self::assertTrue($this->carte->vueArticle($a)['epuise']);
        $this->clock->set('2026-03-01 23:00:00'); // minuit à Paris
        self::assertFalse($this->carte->vueArticle($a)['epuise']);
    }

    public function testOrdreDesRubriquesEtDesArticles(): void
    {
        $a = $this->carte->ajouterRubrique('A');
        $b = $this->carte->ajouterRubrique('B');
        $x = $this->carte->ajouterArticle($a->id(), 'X', '', 100);
        $y = $this->carte->ajouterArticle($a->id(), 'Y', '', 100);

        $this->carte->ordonnerRubriques([$b->id(), $a->id()]);
        $this->carte->ordonnerArticles([$y->id(), $x->id()]);

        self::assertSame(['B', 'A'], array_column($this->carte->pro(), 'nom'));
        self::assertSame(['Y', 'X'], array_column($this->carte->pro()[1]['articles'], 'nom'));
    }

    public function testUneRubriqueAvecDesArticlesNeSeSupprimePas(): void
    {
        $r = $this->carte->ajouterRubrique('Burgers');
        $a = $this->carte->ajouterArticle($r->id(), 'Burger simple', '', 450);
        try {
            $this->carte->supprimerRubrique($r->id());
            self::fail('Rubrique non vide supprimée.');
        } catch (Conflit) {
        }
        $this->carte->supprimerArticle($a->id());
        $this->carte->supprimerRubrique($r->id());
        self::assertSame([], $this->carte->pro());
    }

    public function testArticleDansUneRubriqueInconnueRefuse(): void
    {
        $this->expectException(NotFound::class);
        $this->carte->ajouterArticle('inconnue', 'Kebab', '', 550);
    }

    public function testPhotoLimiteeAuxNomsDeFichiersEnvoyes(): void
    {
        $r = $this->carte->ajouterRubrique('Assiettes');
        self::assertSame('assiette-1.webp', $this->carte->ajouterArticle($r->id(), 'Assiette', '', 850, true, 'assiette-1.webp')->photo());

        $this->expectException(DomainError::class);
        $this->carte->ajouterArticle($r->id(), 'Piège', '', 100, true, '../../etc/passwd');
    }
}
