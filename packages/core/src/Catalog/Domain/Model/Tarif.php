<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/** Prix et durée d'une prestation pour une variante métier (ex. variante « suv »). */
final class Tarif
{
    public function __construct(
        public readonly string $variante,
        public readonly Money $price,
        public readonly int $durationMin,
    ) {
    }
}
