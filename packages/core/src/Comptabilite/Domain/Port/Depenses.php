<?php

declare(strict_types=1);

namespace Bsandoz\Core\Comptabilite\Domain\Port;

use Bsandoz\Core\Comptabilite\Domain\Model\Depense;
use Bsandoz\Core\Shared\Domain\NotFound;

interface Depenses
{
    /** @throws NotFound */
    public function get(string $id): Depense;

    /** @return list<Depense> toutes les dépenses, de la plus récente à la plus ancienne */
    public function toutes(): array;

    public function save(Depense $depense): void;

    public function supprimer(Depense $depense): void;
}
