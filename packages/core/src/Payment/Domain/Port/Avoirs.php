<?php

declare(strict_types=1);

namespace Bsandoz\Core\Payment\Domain\Port;

use Bsandoz\Core\Payment\Domain\Model\Avoir;

interface Avoirs
{
    public function get(string $userId): ?Avoir;

    public function save(Avoir $avoir): void;
}
