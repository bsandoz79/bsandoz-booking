<?php

declare(strict_types=1);

namespace Bsandoz\Core\Carte\Domain\Port;

use Bsandoz\Core\Carte\Domain\Model\Categorie;
use Bsandoz\Core\Shared\Domain\NotFound;

interface Categories
{
    /** @throws NotFound */
    public function get(string $id): Categorie;

    /** @return list<Categorie> dans l'ordre */
    public function all(): array;

    public function save(Categorie $categorie): void;

    public function remove(Categorie $categorie): void;
}
