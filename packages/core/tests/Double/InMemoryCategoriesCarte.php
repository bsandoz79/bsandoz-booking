<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Carte\Domain\Model\Categorie;
use Bsandoz\Core\Carte\Domain\Port\Categories;
use Bsandoz\Core\Shared\Domain\NotFound;

final class InMemoryCategoriesCarte implements Categories
{
    /** @var array<string, Categorie> */
    private array $tous = [];

    public function get(string $id): Categorie
    {
        return $this->tous[$id] ?? throw new NotFound('Rubrique introuvable.');
    }

    public function all(): array
    {
        return array_values($this->tous);
    }

    public function save(Categorie $categorie): void
    {
        $this->tous[$categorie->id()] = $categorie;
    }

    public function remove(Categorie $categorie): void
    {
        unset($this->tous[$categorie->id()]);
    }
}
