<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure;

use Bsandoz\Core\Shared\Domain\Clock;

final class SystemClock implements Clock
{
    public function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
}
