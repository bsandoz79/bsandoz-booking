<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Model;

use Bsandoz\Core\Shared\Domain\Money;

/** Option ajoutable à une prestation (prix et temps en plus). */
final class Option
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly Money $price,
        public readonly int $durationMin,
        public readonly bool $active = true,
        public readonly string $description = '',
    ) {
    }
}
