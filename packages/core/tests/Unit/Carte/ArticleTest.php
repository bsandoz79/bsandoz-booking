<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Carte;

use Bsandoz\Core\Carte\Domain\Model\Article;
use Bsandoz\Core\Carte\Domain\Model\Categorie;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

final class ArticleTest extends TestCase
{
    private static function le(string $instant): \DateTimeImmutable
    {
        return new \DateTimeImmutable($instant, new \DateTimeZone('UTC'));
    }

    private function article(string $creeLe = '2026-01-01 10:00:00'): Article
    {
        return new Article('a-1', 'c-1', '  Kebab classique ', Money::cents(750), self::le($creeLe), 'Viande, salade, tomate');
    }

    public function testUnPrixChangeEstBarrePendantUnMoisPuisDisparait(): void
    {
        $article = $this->article();
        $article->changerPrix(Money::cents(800), self::le('2026-03-10 12:00:00'));

        self::assertSame(800, $article->prix()->cents);
        self::assertSame(750, $article->prixBarre(self::le('2026-03-10 12:00:01'))?->cents);
        self::assertSame(750, $article->prixBarre(self::le('2026-04-10 11:59:59'))?->cents);
        self::assertNull($article->prixBarre(self::le('2026-04-10 12:00:00')), 'un mois après, plus de prix barré');
    }

    public function testUnPrixInchangeNeBarreRien(): void
    {
        $article = $this->article();
        $article->changerPrix(Money::cents(750), self::le('2026-03-10 12:00:00'));

        self::assertNull($article->prixBarre(self::le('2026-03-10 12:00:01')));
    }

    public function testDeuxChangementsBarrentLePrixDAvantLeDernier(): void
    {
        $article = $this->article();
        $article->changerPrix(Money::cents(800), self::le('2026-03-10 12:00:00'));
        $article->changerPrix(Money::cents(850), self::le('2026-03-20 12:00:00'));

        self::assertSame(800, $article->prixBarre(self::le('2026-04-15 12:00:00'))?->cents, 'le mois repart du dernier changement');
    }

    public function testUnPrixPeutChangerSansBarrerLAncien(): void
    {
        $article = $this->article();
        $article->changerPrix(Money::cents(800), self::le('2026-03-10 12:00:00'), barrer: false);

        self::assertSame(800, $article->prix()->cents);
        self::assertNull($article->prixBarre(self::le('2026-03-10 12:00:01')));
    }

    public function testNePlusBarrerRetireUnPrixBarreDejaAffiche(): void
    {
        $article = $this->article();
        $article->changerPrix(Money::cents(800), self::le('2026-03-10 12:00:00'));
        $article->changerPrix(Money::cents(800), self::le('2026-03-11 12:00:00'), barrer: false);

        self::assertSame(800, $article->prix()->cents);
        self::assertNull($article->prixBarre(self::le('2026-03-11 12:00:01')), 'prix inchangé, mais plus barré');
    }

    public function testUnArticleAjouteEstNouveauPendantUnMois(): void
    {
        $article = $this->article('2026-02-01 09:00:00');

        self::assertTrue($article->estNouveau(self::le('2026-02-15 09:00:00')));
        self::assertFalse($article->estNouveau(self::le('2026-03-01 09:00:00')));
    }

    public function testEpuiseJusquAuLendemainALHeureDuCommerce(): void
    {
        $article = $this->article();
        $paris = new \DateTimeZone('Europe/Paris');
        // 22 h 30 UTC = 23 h 30 à Paris (heure d'hiver) : épuisé jusqu'à minuit à Paris, soit 23 h UTC.
        $article->marquerEpuise(self::le('2026-01-15 22:30:00'), $paris);

        self::assertTrue($article->estEpuise(self::le('2026-01-15 22:59:59')));
        self::assertFalse($article->estEpuise(self::le('2026-01-15 23:00:00')), 'revient tout seul le lendemain');

        $article->marquerEpuise(self::le('2026-01-16 10:00:00'), $paris);
        $article->remettreEnVente();
        self::assertFalse($article->estEpuise(self::le('2026-01-16 10:00:01')));
    }

    public function testTextesNettoyesEtVerifies(): void
    {
        $article = $this->article();
        self::assertSame('Kebab classique', $article->nom());

        $article->modifier('Kebab galette', '', 'c-2', false);
        self::assertSame(['Kebab galette', 'c-2', false], [$article->nom(), $article->categorieId(), $article->estVisible()]);

        $this->expectException(DomainError::class);
        $article->modifier('   ', '', 'c-2', true);
    }

    public function testDescriptionTropLongueRefusee(): void
    {
        $this->expectException(DomainError::class);
        new Article('a-2', 'c-1', 'Assiette', Money::cents(1100), self::le('2026-01-01'), str_repeat('x', Article::DESCRIPTION_MAX + 1));
    }

    public function testRubriqueNommeeObligatoirement(): void
    {
        self::assertSame('Sandwichs', (new Categorie('c-1', ' Sandwichs '))->nom());
        $this->expectException(DomainError::class);
        new Categorie('c-2', '');
    }
}
