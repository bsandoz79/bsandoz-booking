<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Port;

use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Shared\Domain\NotFound;

interface ProduitRepository
{
    /** @throws NotFound */
    public function get(string $id): Produit;

    /** @return list<Produit> tous les produits (espace pro), triés par position puis nom */
    public function all(): array;

    /** @return list<Produit> produits actifs et en stock, triés par position puis nom */
    public function enVente(): array;

    public function save(Produit $produit): void;
}
