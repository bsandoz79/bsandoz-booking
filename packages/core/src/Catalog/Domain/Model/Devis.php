<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/** Résultat d'un calcul de prix. */
final class Devis
{
    /**
     * @param list<array{label: string, price: Money}> $lines
     */
    public function __construct(
        public readonly array $lines,
        public readonly Money $travelFee,
        public readonly Money $total,
        public readonly Money $deposit,
        public readonly int $durationMin,
    ) {
    }
}
