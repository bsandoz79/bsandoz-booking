<?php

declare(strict_types=1);

namespace Bsandoz\Core\Fidelite\Domain\Model;

use Bsandoz\Core\Shared\Domain\DomainError;

/** Règle de fidélité du pro : après `tamponsRequis` prestations, `remisePercent` % sur la suivante. */
final class RegleFidelite
{
    public function __construct(
        public readonly bool $actif = true,
        public readonly int $tamponsRequis = 4,
        public readonly int $remisePercent = 20,
    ) {
        if ($tamponsRequis < 1 || $tamponsRequis > 50) {
            throw new DomainError('Le nombre de prestations avant la remise doit être compris entre 1 et 50.');
        }
        if ($remisePercent < 1 || $remisePercent > 100) {
            throw new DomainError('La remise de fidélité doit être comprise entre 1 et 100 %.');
        }
    }
}
