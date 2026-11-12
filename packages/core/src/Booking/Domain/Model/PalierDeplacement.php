<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;
use Bsandoz\Core\Shared\Domain\Money;

/** Tranche de frais de déplacement : jusqu'à `jusquaKm` (distance routière estimée), le déplacement coûte `prix`. */
final class PalierDeplacement
{
    public function __construct(
        public readonly float $jusquaKm,
        public readonly Money $prix,
    ) {
        if ($jusquaKm <= 0) {
            throw new DomainError('La distance d\'une tranche de déplacement doit être positive.');
        }
    }
}
