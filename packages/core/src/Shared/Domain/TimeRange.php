<?php

declare(strict_types=1);

namespace Bsandoz\Core\Shared\Domain;

/** Intervalle de temps [start, end[. */
final class TimeRange
{
    public function __construct(
        public readonly \DateTimeImmutable $start,
        public readonly \DateTimeImmutable $end,
    ) {
        if ($end <= $start) {
            throw new DomainError('La fin doit être après le début.');
        }
    }

    public function overlaps(self $other): bool
    {
        return $this->start < $other->end && $other->start < $this->end;
    }

    public function contains(self $other): bool
    {
        return $this->start <= $other->start && $other->end <= $this->end;
    }

    public function minutes(): int
    {
        return intdiv($this->end->getTimestamp() - $this->start->getTimestamp(), 60);
    }
}
