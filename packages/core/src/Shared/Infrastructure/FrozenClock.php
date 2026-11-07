<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Infrastructure;

use Bsandoz\Core\Shared\Domain\Clock;

/**
 * Horloge figée pour les tests (et les démonstrations) : renvoie toujours la même date,
 * convertie en UTC, jusqu'à ce qu'on la déplace.
 */
final class FrozenClock implements Clock
{
    private \DateTimeImmutable $now;

    public function __construct(\DateTimeImmutable|string $now = 'now')
    {
        $this->set($now);
    }

    public function now(): \DateTimeImmutable
    {
        return $this->now;
    }

    public function set(\DateTimeImmutable|string $now): void
    {
        $utc = new \DateTimeZone('UTC');
        $this->now = is_string($now) ? new \DateTimeImmutable($now, $utc) : $now->setTimezone($utc);
    }

    /** Avance (ou recule) l'horloge, ex. « +10 minutes », « -1 day ». */
    public function modify(string $modifier): void
    {
        $this->now = $this->now->modify($modifier);
    }
}
