<?php

declare(strict_types=1);

namespace Bsandoz\Core\Abonnement\Domain\Port;

use Bsandoz\Core\Abonnement\Domain\Model\FormuleAbonnement;
use Bsandoz\Core\Shared\Domain\NotFound;

interface FormulesAbonnement
{
    /** @throws NotFound */
    public function get(string $id): FormuleAbonnement;

    /** @return list<FormuleAbonnement> par position */
    public function toutes(): array;

    public function save(FormuleAbonnement $formule): void;
}
