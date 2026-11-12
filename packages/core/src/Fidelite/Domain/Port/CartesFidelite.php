<?php

declare(strict_types=1);

namespace Bsandoz\Core\Fidelite\Domain\Port;

use Bsandoz\Core\Fidelite\Domain\Model\CarteFidelite;

interface CartesFidelite
{
    public function get(string $userId): ?CarteFidelite;

    public function save(CarteFidelite $carte): void;
}
