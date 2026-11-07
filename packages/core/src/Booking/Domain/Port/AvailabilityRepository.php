<?php

declare(strict_types=1);

namespace Bsandoz\Core\Booking\Domain\Port;

use Bsandoz\Core\Booking\Domain\Model\OpeningHour;
use Bsandoz\Core\Shared\Domain\TimeRange;

interface AvailabilityRepository
{
    /** @return list<OpeningHour> */
    public function openingHours(): array;

    /** @return list<TimeRange> congés et blocages qui chevauchent [from, to[ */
    public function unavailabilities(\DateTimeImmutable $from, \DateTimeImmutable $to): array;
}
