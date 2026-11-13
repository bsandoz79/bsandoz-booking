<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Catalog\Domain\Model\Produit;
use Bsandoz\Core\Catalog\Domain\Port\ProduitRepository;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryProduitRepository implements ProduitRepository
{
    /** @var array<string, Produit> */
    private array $items = [];

    public function __construct(Produit ...$produits)
    {
        foreach ($produits as $produit) {
            $this->save($produit);
        }
    }

    public function get(string $id): Produit
    {
        return $this->items[$id] ?? throw new NotFound('Produit introuvable.');
    }

    public function all(): array
    {
        $all = array_values($this->items);
        usort($all, static fn (Produit $a, Produit $b): int => [$a->position(), $a->nom()] <=> [$b->position(), $b->nom()]);

        return $all;
    }

    public function enVente(): array
    {
        return array_values(array_filter($this->all(), static fn (Produit $p): bool => $p->enVente()));
    }

    public function save(Produit $produit): void
    {
        $this->items[$produit->id()] = $produit;
    }

    public function remove(Produit $produit): void
    {
        unset($this->items[$produit->id()]);
    }
}
