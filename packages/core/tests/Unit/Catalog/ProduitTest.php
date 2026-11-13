<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Unit\Catalog;

use Bsandoz\Core\Catalog\Application\GererCatalogue;
use Bsandoz\Core\Catalog\Application\ListerCatalogue;
use Bsandoz\Core\Catalog\Application\StockProduits;
use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;
use Bsandoz\Core\Tests\Double\InMemoryOptionRepository;
use Bsandoz\Core\Tests\Double\InMemoryPrestationRepository;
use Bsandoz\Core\Tests\Double\InMemoryProduitRepository;
use Bsandoz\Core\Tests\Double\SequenceIdGenerator;
use PHPUnit\Framework\TestCase;

/** Produits vendus avec une réservation : stock tenu par le pro, retiré à la réservation, rendu à l'annulation. */
final class ProduitTest extends TestCase
{
    public function testStockRetireEtRemis(): void
    {
        $p = new Produit('p-1', 'Microfibre', Money::cents(600), 3);
        $p->retirerDuStock(2);
        self::assertSame(1, $p->stock());
        $p->remettreEnStock(2);
        self::assertSame(3, $p->stock());
    }

    public function testStockInsuffisantRefuse(): void
    {
        $p = new Produit('p-1', 'Microfibre', Money::cents(600), 1);
        $this->expectException(DomainError::class);
        $this->expectExceptionMessage('Il ne reste que 1 « Microfibre » en stock.');
        $p->retirerDuStock(2);
    }

    public function testProduitRetireOuEpuiseNEstPlusEnVente(): void
    {
        self::assertFalse((new Produit('p-1', 'Lave-glace', Money::cents(800), 0))->enVente());
        self::assertFalse((new Produit('p-2', 'Lave-glace', Money::cents(800), 5, actif: false))->enVente());
        self::assertTrue((new Produit('p-3', 'Lave-glace', Money::cents(800), 5))->enVente());
    }

    public function testPrixObligatoire(): void
    {
        $this->expectException(DomainError::class);
        new Produit('p-1', 'Microfibre', Money::zero(), 3);
    }

    public function testStockProduitsVerifieToutAvantDeRetirer(): void
    {
        $depot = new InMemoryProduitRepository(new Produit('a', 'Anti-buée', Money::cents(900), 5), new Produit('b', 'Microfibre', Money::cents(600), 1));
        $stock = new StockProduits($depot);

        try {
            $stock->retirer(['a' => 2, 'b' => 2]);
            self::fail('stock insuffisant attendu');
        } catch (DomainError) {
        }
        self::assertSame(5, $depot->get('a')->stock(), 'rien retiré si un produit manque');

        $lignes = $stock->retirer(['a' => 2, 'b' => 1]);
        self::assertSame([['id' => 'a', 'nom' => 'Anti-buée', 'prixCents' => 900, 'quantite' => 2], ['id' => 'b', 'nom' => 'Microfibre', 'prixCents' => 600, 'quantite' => 1]], $lignes);
        self::assertSame([3, 0], [$depot->get('a')->stock(), $depot->get('b')->stock()]);

        $stock->remettre($lignes);
        self::assertSame([5, 1], [$depot->get('a')->stock(), $depot->get('b')->stock()]);
        $stock->reprendre([['id' => 'b', 'quantite' => 3]]);
        self::assertSame(0, $depot->get('b')->stock(), 'jamais sous 0');
    }

    public function testProduitInconnu(): void
    {
        $this->expectException(DomainError::class);
        (new StockProduits(new InMemoryProduitRepository()))->retirer(['x' => 1]);
    }

    public function testEspaceProCreeModifieEtRetireUnProduit(): void
    {
        $depot = new InMemoryProduitRepository();
        $catalogue = new GererCatalogue(new InMemoryPrestationRepository(), new InMemoryOptionRepository(), new SequenceIdGenerator('p'), $depot);

        $cree = $catalogue->enregistrerProduit(['name' => 'Lave-vitres', 'description' => '500 ml', 'priceCents' => 790, 'stock' => 4]);
        self::assertSame(['id' => 'p-1', 'name' => 'Lave-vitres', 'description' => '500 ml', 'priceCents' => 790, 'stock' => 4, 'active' => true, 'position' => 0, 'photo' => null, 'category' => null], $cree);

        $catalogue->enregistrerProduit(['name' => 'Lave-vitres 1 L', 'priceCents' => 1290, 'stock' => 0, 'photo' => 'https://x.test/a.jpg', 'category' => ' Vitres '], 'p-1');
        self::assertSame(['Lave-vitres 1 L', 1290, 0, 'https://x.test/a.jpg'], [$depot->get('p-1')->nom(), $depot->get('p-1')->prix()->cents, $depot->get('p-1')->stock(), $depot->get('p-1')->photo()]);

        $public = new ListerCatalogue(new InMemoryPrestationRepository(), new InMemoryOptionRepository(), $depot);
        self::assertSame([['id' => 'p-1', 'name' => 'Lave-vitres 1 L', 'description' => '', 'priceCents' => 1290, 'stock' => 0, 'photo' => 'https://x.test/a.jpg', 'category' => 'Vitres']], $public()['produits'], 'stock à 0 : affiché épuisé, catégorie nettoyée');

        $catalogue->enregistrerProduit(['name' => 'Lave-vitres 1 L', 'priceCents' => 1290, 'stock' => 25], 'p-1');
        self::assertSame(25, $public()['produits'][0]['stock'], 'stock réel (la quantité par réservation reste plafonnée à 10)');

        $catalogue->retirerProduit('p-1');
        self::assertSame([], $public()['produits']);
        self::assertCount(1, $catalogue->lister()['produits'], 'toujours visible dans l\'espace pro');

        $catalogue->supprimerProduit('p-1');
        self::assertSame([], $catalogue->lister()['produits'], 'supprimé définitivement');
    }
}
