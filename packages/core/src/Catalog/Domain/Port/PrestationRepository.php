<?php

declare(strict_types=1);

namespace Bsandoz\Core\Catalog\Domain\Port;

use Bsandoz\Core\Catalog\Domain\Model\Prestation;

interface PrestationRepository
{
    public function get(string $id): Prestation;

    /** @return list<Prestation> prestations actives, triées */
    public function allActive(): array;

    public function save(Prestation $prestation): void;

    public function remove(Prestation $prestation): void;
}
