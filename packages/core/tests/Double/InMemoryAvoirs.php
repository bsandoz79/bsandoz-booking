<?php

declare(strict_types=1);

namespace Bsandoz\Core\Tests\Double;

use Bsandoz\Core\Payment\Domain\Model\Avoir;
use Bsandoz\Core\Payment\Domain\Port\Avoirs;

final class InMemoryAvoirs implements Avoirs
{
    /** @var array<string, Avoir> */
    private array $avoirs = [];

    public function get(string $userId): ?Avoir
    {
        return $this->avoirs[$userId] ?? null;
    }

    public function save(Avoir $avoir): void
    {
        $this->avoirs[$avoir->userId()] = $avoir;
    }
}
