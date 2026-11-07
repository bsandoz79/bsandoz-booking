<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Port;

use Bsandoz\Core\Catalog\Domain\Model\Prestation;
use Bsandoz\Core\Shared\Domain\NotFound;

interface PrestationRepository
{
    /** @throws NotFound */
    public function get(string $id): Prestation;

    /** @return list<Prestation> prestations actives, triées par position puis nom */
    public function allActive(): array;

    public function save(Prestation $prestation): void;

    public function remove(Prestation $prestation): void;
}
