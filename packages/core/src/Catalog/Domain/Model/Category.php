<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

// Pas « final » : Doctrine génère un proxy de chargement différé (lazy ghost) pour chaque entité.
class Category
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly int $position = 0,
    ) {
    }
}
